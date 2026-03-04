"""
Celery tasks for the async evaluation pipeline.

Architecture
------------
  FastAPI route  →  run_evaluation.delay(evaluation_id)
                         │
                         ▼  (Redis queue)
  Celery worker  →  run_evaluation(evaluation_id)
                    ├─ fetch Evaluation from DB
                    ├─ check Redis cache for each model output
                    ├─ execute_models_parallel()   (parallel async LLM calls)
                    ├─ validate JSON if required
                    ├─ score_with_judge()          (parallel async judge calls)
                    ├─ assign badges
                    ├─ persist EvaluationResult rows
                    ├─ persist UsageLog rows
                    └─ mark Evaluation as COMPLETED

Retry policy
------------
  Up to 3 retries with exponential back-off starting at 5 s.
  Individual model call errors don't trigger retries – they're stored as
  failed results so the user can see which models succeeded.

Caching
-------
  Redis is also used to cache (prompt, model_id) → output pairs so
  repeated identical prompts skip the LLM call entirely.
  TTL is set by config.CACHE_TTL_SECONDS (default 1 h).
"""

import asyncio
import hashlib
import json
import uuid
from datetime import datetime, timezone
from typing import Optional

import redis
from celery.utils.log import get_task_logger
from sqlalchemy.orm import Session

from config import settings
from database import SessionLocal
from models import (
    Evaluation,
    EvaluationResult,
    EvaluationStatus,
    UsageLog,
)
from services.llm_executor import execute_models_parallel
from services.llm_judge import score_with_judge
from tasks.celery_app import celery_app
from utils.badge_assigner import assign_badges
from utils.json_validator import validate_json_output

logger = get_task_logger(__name__)

# Redis client for output caching (separate from Celery's result backend)
_redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)


# ─────────────────────────────────────────────────────────────────────────────
# Cache helpers
# ─────────────────────────────────────────────────────────────────────────────

def _cache_key(prompt: str, system_prompt: Optional[str], model_id: str) -> str:
    """
    Deterministic cache key for a (prompt, system_prompt, model_id) triple.
    Uses SHA-256 so the key stays short even for very long prompts.
    """
    raw = json.dumps(
        {"prompt": prompt, "system": system_prompt or "", "model": model_id},
        sort_keys=True,
    )
    return "eval_cache:" + hashlib.sha256(raw.encode()).hexdigest()


def _get_cached_output(
    prompt: str, system_prompt: Optional[str], model_id: str
) -> Optional[str]:
    """Return cached model output or None if not cached."""
    return _redis_client.get(_cache_key(prompt, system_prompt, model_id))


def _set_cached_output(
    prompt: str,
    system_prompt: Optional[str],
    model_id: str,
    output: str,
) -> None:
    """Store model output in Redis with TTL."""
    _redis_client.setex(
        _cache_key(prompt, system_prompt, model_id),
        settings.CACHE_TTL_SECONDS,
        output,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Main evaluation task
# ─────────────────────────────────────────────────────────────────────────────

@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=5,    # 5 s initial back-off (doubled each retry)
    acks_late=True,
    name="tasks.evaluation_tasks.run_evaluation",
)
def run_evaluation(self, evaluation_id: str) -> dict:
    """
    Execute a full evaluation run for *evaluation_id*.

    Steps
    -----
    1. Load the Evaluation row from PostgreSQL.
    2. For each model, check Redis cache first.
    3. Call execute_models_parallel() for uncached models.
    4. Store fresh outputs in Redis cache.
    5. Validate JSON output if required.
    6. Call score_with_judge() if a judge model is configured.
    7. Assign comparative badges.
    8. Persist EvaluationResult and UsageLog rows.
    9. Mark Evaluation as COMPLETED (or FAILED on unrecoverable error).

    Returns a summary dict with counts of succeeded/failed model calls.
    """
    db: Session = SessionLocal()
    try:
        # ── 1. Load evaluation ─────────────────────────────────────────────
        evaluation: Optional[Evaluation] = (
            db.query(Evaluation).filter(Evaluation.id == evaluation_id).first()
        )
        if not evaluation:
            logger.error("Evaluation %s not found", evaluation_id)
            return {"status": "not_found"}

        evaluation.status = EvaluationStatus.RUNNING
        db.commit()

        model_ids = [m.strip() for m in evaluation.model_ids.split(",")]
        prompt = evaluation.prompt
        system_prompt = evaluation.system_prompt

        # ── 2 & 3. Cache check + parallel LLM calls ────────────────────────
        cached_outputs: dict[str, str] = {}
        uncached_models: list[str] = []

        for model_id in model_ids:
            cached = _get_cached_output(prompt, system_prompt, model_id)
            if cached is not None:
                logger.info("Cache HIT for model=%s eval=%s", model_id, evaluation_id)
                cached_outputs[model_id] = cached
            else:
                uncached_models.append(model_id)

        # Execute uncached models in parallel (runs async code inside sync Celery task)
        fresh_results = asyncio.run(
            execute_models_parallel(
                prompt=prompt,
                model_ids=uncached_models,
                system_prompt=system_prompt,
                deterministic_seed=evaluation.deterministic_seed,
            )
        )

        # Index fresh results by model_id for easy lookup
        fresh_by_model = {r.model_id: r for r in fresh_results}

        # ── 4. Store fresh outputs in cache ───────────────────────────────
        for result in fresh_results:
            if result.output and not result.error:
                _set_cached_output(prompt, system_prompt, result.model_id, result.output)

        # ── 5. JSON validation ─────────────────────────────────────────────
        json_schema = None
        if evaluation.json_schema:
            try:
                json_schema = json.loads(evaluation.json_schema)
            except json.JSONDecodeError:
                logger.warning("Invalid JSON schema on evaluation %s", evaluation_id)

        # ── 6. LLM-as-a-Judge scoring ──────────────────────────────────────
        judge_scores = {}
        if evaluation.judge_model:
            all_outputs = {}
            for model_id in model_ids:
                if model_id in cached_outputs:
                    all_outputs[model_id] = cached_outputs[model_id]
                elif model_id in fresh_by_model and fresh_by_model[model_id].output:
                    all_outputs[model_id] = fresh_by_model[model_id].output

            if all_outputs:
                judge_scores = asyncio.run(
                    score_with_judge(
                        prompt=prompt,
                        outputs=all_outputs,
                        judge_model=evaluation.judge_model,
                    )
                )

        # ── 7. Build result dicts for badge assignment ────────────────────
        result_dicts = []
        for model_id in model_ids:
            if model_id in cached_outputs:
                # Reconstruct minimal metrics for cached results
                # (no latency/cost since we skipped the call)
                r_dict = {
                    "model_id": model_id,
                    "output": cached_outputs[model_id],
                    "input_tokens": 0,
                    "output_tokens": 0,
                    "latency_ms": 0.0,
                    "cost_usd": 0.0,
                    "error": None,
                }
            elif model_id in fresh_by_model:
                fresh = fresh_by_model[model_id]
                r_dict = {
                    "model_id": fresh.model_id,
                    "output": fresh.output,
                    "input_tokens": fresh.input_tokens,
                    "output_tokens": fresh.output_tokens,
                    "latency_ms": fresh.latency_ms,
                    "cost_usd": fresh.cost_usd,
                    "error": fresh.error,
                }
            else:
                r_dict = {
                    "model_id": model_id,
                    "output": None,
                    "input_tokens": 0,
                    "output_tokens": 0,
                    "latency_ms": 0.0,
                    "cost_usd": 0.0,
                    "error": "Model not executed",
                }

            # Attach judge score
            if model_id in judge_scores:
                js = judge_scores[model_id]
                r_dict["judge_score"] = js.score
                r_dict["judge_reasoning"] = js.reasoning
            else:
                r_dict["judge_score"] = None
                r_dict["judge_reasoning"] = None

            # JSON validation
            if evaluation.require_json_output and r_dict["output"]:
                val = validate_json_output(r_dict["output"], schema=json_schema)
                r_dict["is_valid_json"] = val.is_valid
                r_dict["json_validation_error"] = val.error
            else:
                r_dict["is_valid_json"] = None
                r_dict["json_validation_error"] = None

            result_dicts.append(r_dict)

        # ── 7b. Assign badges ──────────────────────────────────────────────
        assign_badges(result_dicts)

        # ── 8. Persist results + usage logs ───────────────────────────────
        succeeded = 0
        failed = 0
        for r in result_dicts:
            result_row = EvaluationResult(
                id=str(uuid.uuid4()),
                evaluation_id=evaluation_id,
                model_id=r["model_id"],
                output=r.get("output"),
                input_tokens=r.get("input_tokens", 0),
                output_tokens=r.get("output_tokens", 0),
                latency_ms=r.get("latency_ms", 0.0),
                cost_usd=r.get("cost_usd", 0.0),
                judge_score=r.get("judge_score"),
                judge_reasoning=r.get("judge_reasoning"),
                is_valid_json=r.get("is_valid_json"),
                json_validation_error=r.get("json_validation_error"),
                error=r.get("error"),
            )
            db.add(result_row)

            # Usage log (skip for cached/failed results with no real token data)
            if not r.get("error") and r.get("input_tokens", 0) > 0:
                log = UsageLog(
                    workspace_id=evaluation.workspace_id,
                    user_id=evaluation.user_id,
                    evaluation_id=evaluation_id,
                    model_id=r["model_id"],
                    input_tokens=r["input_tokens"],
                    output_tokens=r["output_tokens"],
                    cost_usd=r["cost_usd"],
                    latency_ms=r["latency_ms"],
                )
                db.add(log)
                succeeded += 1
            else:
                if r.get("error"):
                    failed += 1

        # ── 9. Mark evaluation complete ────────────────────────────────────
        evaluation.status = EvaluationStatus.COMPLETED
        evaluation.completed_at = datetime.now(timezone.utc)
        db.commit()

        logger.info(
            "Evaluation %s completed: %d succeeded, %d failed",
            evaluation_id, succeeded, failed,
        )
        return {"status": "completed", "succeeded": succeeded, "failed": failed}

    except Exception as exc:  # noqa: BLE001
        db.rollback()
        logger.error("Evaluation %s failed: %s", evaluation_id, exc, exc_info=True)

        # Mark the evaluation as failed in the DB
        try:
            evaluation = db.query(Evaluation).filter(Evaluation.id == evaluation_id).first()
            if evaluation:
                evaluation.status = EvaluationStatus.FAILED
                db.commit()
        except Exception:  # noqa: BLE001
            pass

        # Retry with exponential back-off
        raise self.retry(exc=exc, countdown=5 * (2 ** self.request.retries))

    finally:
        db.close()


# ─────────────────────────────────────────────────────────────────────────────
# Periodic maintenance task
# ─────────────────────────────────────────────────────────────────────────────

@celery_app.task(name="tasks.evaluation_tasks.cleanup_stale_evaluations")
def cleanup_stale_evaluations() -> dict:
    """
    Scheduled task (runs hourly via Celery Beat).

    Finds evaluations stuck in RUNNING state for more than 10 minutes
    and marks them as FAILED. This handles worker crashes gracefully.
    """
    from datetime import timedelta

    db: Session = SessionLocal()
    try:
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=10)
        stale = (
            db.query(Evaluation)
            .filter(
                Evaluation.status == EvaluationStatus.RUNNING,
                Evaluation.created_at < cutoff,
            )
            .all()
        )
        for evaluation in stale:
            evaluation.status = EvaluationStatus.FAILED
            logger.warning("Marked stale evaluation %s as FAILED", evaluation.id)

        db.commit()
        return {"cleaned_up": len(stale)}
    finally:
        db.close()
