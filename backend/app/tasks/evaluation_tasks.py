"""
Celery tasks for the async evaluation pipeline.

Architecture:
  FastAPI route → run_evaluation.delay(evaluation_id)
                      │
                      ▼ (Redis queue)
  Celery worker → run_evaluation(evaluation_id)
                  ├─ fetch Evaluation from Supabase
                  ├─ check Redis cache for each model output
                  ├─ execute_models_parallel()
                  ├─ validate JSON if required
                  ├─ score_with_judge()
                  ├─ assign badges
                  ├─ persist evaluation_results + usage_logs via Supabase
                  └─ mark Evaluation as COMPLETED
"""

import asyncio
import hashlib
import json
import uuid
from datetime import datetime, timezone
from typing import Optional

import redis
from celery.utils.log import get_task_logger

from app.core.config import settings
from app.core.supabase.client import get_supabase
from app.services.llm_executor import execute_models_parallel
from app.services.llm_judge import score_with_judge
from app.tasks.celery_app import celery_app
from app.utils.badge_assigner import assign_badges
from app.utils.json_validator import validate_json_output

logger = get_task_logger(__name__)

_redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)


# ── Cache helpers ──────────────────────────────────────────────────────────────

def _cache_key(prompt: str, system_prompt: Optional[str], model_id: str) -> str:
    raw = json.dumps(
        {"prompt": prompt, "system": system_prompt or "", "model": model_id},
        sort_keys=True,
    )
    return "eval_cache:" + hashlib.sha256(raw.encode()).hexdigest()


def _get_cached_output(prompt: str, system_prompt: Optional[str], model_id: str) -> Optional[str]:
    return _redis_client.get(_cache_key(prompt, system_prompt, model_id))


def _set_cached_output(prompt: str, system_prompt: Optional[str], model_id: str, output: str) -> None:
    _redis_client.setex(
        _cache_key(prompt, system_prompt, model_id),
        settings.CACHE_TTL_SECONDS,
        output,
    )


# ── Main evaluation task ───────────────────────────────────────────────────────

@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=5,
    acks_late=True,
    name="app.tasks.evaluation_tasks.run_evaluation",
)
def run_evaluation(self, evaluation_id: str) -> dict:
    """Execute a full evaluation run for *evaluation_id*."""
    supabase = get_supabase()

    try:
        resp = supabase.table("evaluations").select("*").eq("id", evaluation_id).single().execute()
        evaluation = resp.data
        if not evaluation:
            logger.error("Evaluation %s not found", evaluation_id)
            return {"status": "not_found"}

        supabase.table("evaluations").update(
            {"status": "running"}
        ).eq("id", evaluation_id).execute()

        model_ids = [m.strip() for m in evaluation["model_ids"].split(",")]
        prompt = evaluation["prompt"]
        system_prompt = evaluation.get("system_prompt")

        cached_outputs: dict[str, str] = {}
        uncached_models: list[str] = []

        for model_id in model_ids:
            cached = _get_cached_output(prompt, system_prompt, model_id)
            if cached is not None:
                logger.info("Cache HIT for model=%s eval=%s", model_id, evaluation_id)
                cached_outputs[model_id] = cached
            else:
                uncached_models.append(model_id)

        fresh_results = asyncio.run(
            execute_models_parallel(
                prompt=prompt,
                model_ids=uncached_models,
                system_prompt=system_prompt,
                deterministic_seed=evaluation.get("deterministic_seed"),
            )
        )
        fresh_by_model = {r.model_id: r for r in fresh_results}

        for result in fresh_results:
            if result.output and not result.error:
                _set_cached_output(prompt, system_prompt, result.model_id, result.output)

        json_schema = None
        if evaluation.get("json_schema"):
            try:
                json_schema = json.loads(evaluation["json_schema"])
            except json.JSONDecodeError:
                logger.warning("Invalid JSON schema on evaluation %s", evaluation_id)

        judge_scores = {}
        if evaluation.get("judge_model"):
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
                        judge_model=evaluation["judge_model"],
                    )
                )

        result_dicts = []
        for model_id in model_ids:
            if model_id in cached_outputs:
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

            if model_id in judge_scores:
                js = judge_scores[model_id]
                r_dict["judge_score"] = js.score
                r_dict["judge_reasoning"] = js.reasoning
            else:
                r_dict["judge_score"] = None
                r_dict["judge_reasoning"] = None

            if evaluation.get("require_json_output") and r_dict["output"]:
                val = validate_json_output(r_dict["output"], schema=json_schema)
                r_dict["is_valid_json"] = val.is_valid
                r_dict["json_validation_error"] = val.error
            else:
                r_dict["is_valid_json"] = None
                r_dict["json_validation_error"] = None

            result_dicts.append(r_dict)

        assign_badges(result_dicts)

        succeeded = 0
        failed = 0
        now_iso = datetime.now(timezone.utc).isoformat()

        result_rows = []
        usage_rows = []

        for r in result_dicts:
            result_rows.append({
                "id": str(uuid.uuid4()),
                "evaluation_id": evaluation_id,
                "model_id": r["model_id"],
                "output": r.get("output"),
                "input_tokens": r.get("input_tokens", 0),
                "output_tokens": r.get("output_tokens", 0),
                "latency_ms": r.get("latency_ms", 0.0),
                "cost_usd": r.get("cost_usd", 0.0),
                "judge_score": r.get("judge_score"),
                "judge_reasoning": r.get("judge_reasoning"),
                "is_valid_json": r.get("is_valid_json"),
                "json_validation_error": r.get("json_validation_error"),
                "error": r.get("error"),
                "created_at": now_iso,
            })

            if not r.get("error") and r.get("input_tokens", 0) > 0:
                usage_rows.append({
                    "id": str(uuid.uuid4()),
                    "workspace_id": evaluation["workspace_id"],
                    "user_id": evaluation["user_id"],
                    "evaluation_id": evaluation_id,
                    "model_id": r["model_id"],
                    "input_tokens": r["input_tokens"],
                    "output_tokens": r["output_tokens"],
                    "cost_usd": r["cost_usd"],
                    "latency_ms": r["latency_ms"],
                    "timestamp": now_iso,
                })
                succeeded += 1
            elif r.get("error"):
                failed += 1

        if result_rows:
            supabase.table("evaluation_results").insert(result_rows).execute()
        if usage_rows:
            supabase.table("usage_logs").insert(usage_rows).execute()

        supabase.table("evaluations").update({
            "status": "completed",
            "completed_at": now_iso,
        }).eq("id", evaluation_id).execute()

        logger.info(
            "Evaluation %s completed: %d succeeded, %d failed",
            evaluation_id, succeeded, failed,
        )
        return {"status": "completed", "succeeded": succeeded, "failed": failed}

    except Exception as exc:
        logger.error("Evaluation %s failed: %s", evaluation_id, exc, exc_info=True)

        try:
            supabase.table("evaluations").update(
                {"status": "failed"}
            ).eq("id", evaluation_id).execute()
        except Exception:
            pass

        raise self.retry(exc=exc, countdown=5 * (2 ** self.request.retries))


# ── Periodic maintenance task ──────────────────────────────────────────────────

@celery_app.task(name="app.tasks.evaluation_tasks.cleanup_stale_evaluations")
def cleanup_stale_evaluations() -> dict:
    """Scheduled task: mark evaluations stuck in RUNNING >10 min as FAILED."""
    from datetime import timedelta

    cutoff = (datetime.now(timezone.utc) - timedelta(minutes=10)).isoformat()
    supabase = get_supabase()

    resp = (
        supabase.table("evaluations")
        .select("id")
        .eq("status", "running")
        .lt("created_at", cutoff)
        .execute()
    )
    stale = resp.data or []

    for row in stale:
        supabase.table("evaluations").update(
            {"status": "failed"}
        ).eq("id", row["id"]).execute()
        logger.warning("Marked stale evaluation %s as FAILED", row["id"])

    return {"cleaned_up": len(stale)}
