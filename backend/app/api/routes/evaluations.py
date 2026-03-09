"""
Evaluation routes – both async (Celery) and sync endpoints.

Async endpoints (Celery pipeline):
  POST /workspaces/{id}/evaluations  – Submit evaluation (202 Accepted)
  GET  /workspaces/{id}/evaluations  – List evaluation history
  GET  /evaluations/{id}             – Get evaluation with results

Sync endpoint (direct LLM call):
  POST /evaluate                     – Run evaluation immediately (blocks until done)
  GET  /evaluate                     – List recent evaluations
  GET  /evaluate/{id}                – Fetch a stored evaluation
"""

import json
import uuid
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status

from app.core.supabase.auth_dependency import AuthUser, get_current_user
from app.core.supabase.client import get_supabase
from app.dependencies.workspace import get_workspace_or_404, require_workspace_role
from app.core.config import settings
from app.schemas.evaluation import (
    EvaluateRequest,
    EvaluateResponse,
    EvaluationCreate,
    EvaluationResponse,
    ModelResultOut,
)
from app.services.evaluation_service import evaluation_svc
from app.services.llm_executor import execute_models_parallel
from app.services.llm_judge import score_with_judge
from app.services.usage_service import PlanLimitError, usage_svc
from app.services.workspace_service import workspace_svc
from app.tasks.evaluation_tasks import run_evaluation
from app.utils.badge_assigner import assign_badges
from app.utils.json_validator import validate_json_output

router = APIRouter(tags=["evaluations"])


def _plan_eval_limit(tier: str) -> int:
    return {
        "free": settings.FREE_EVAL_LIMIT,
        "pro": settings.PRO_EVAL_LIMIT,
        "enterprise": settings.ENTERPRISE_EVAL_LIMIT,
    }.get(tier, settings.FREE_EVAL_LIMIT)


def _check_rate_limit(workspace: dict) -> None:
    limit = _plan_eval_limit(workspace["tier"])
    if limit == -1:
        return
    supabase = get_supabase()
    now = datetime.now(timezone.utc)
    month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc).isoformat()
    resp = (
        supabase.table("evaluations")
        .select("id", count="exact")
        .eq("workspace_id", workspace["id"])
        .gte("created_at", month_start)
        .execute()
    )
    count = resp.count or 0
    if count >= limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"{workspace['tier'].capitalize()} plan limit of {limit} evaluations/month reached.",
        )


# ═════════════════════════════════════════════════════════════════════════════
# ASYNC EVALUATION ROUTES (Celery pipeline)
# ═════════════════════════════════════════════════════════════════════════════

@router.post(
    "/workspaces/{workspace_id}/evaluations",
    response_model=EvaluationResponse,
    status_code=202,
)
def submit_evaluation(
    workspace_id: str,
    body: EvaluationCreate,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
):
    """Submit a new multi-model evaluation (returns 202 Accepted, Celery processes async)."""
    require_workspace_role(workspace_id, user["id"], ["admin", "engineer"])
    workspace = get_workspace_or_404(workspace_id)
    _check_rate_limit(workspace)

    supabase = get_supabase()
    evaluation_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    evaluation = {
        "id": evaluation_id,
        "workspace_id": workspace_id,
        "user_id": user["id"],
        "prompt": body.prompt,
        "system_prompt": body.system_prompt,
        "model_ids": ",".join(body.model_ids),
        "status": "pending",
        "deterministic_seed": body.deterministic_seed,
        "judge_model": body.judge_model,
        "require_json_output": body.require_json_output,
        "json_schema": json.dumps(body.json_schema) if body.json_schema else None,
        "created_at": now,
        "completed_at": None,
    }
    supabase.table("evaluations").insert(evaluation).execute()
    run_evaluation.delay(evaluation_id)

    return EvaluationResponse(**evaluation, results=[])


@router.get("/workspaces/{workspace_id}/evaluations", response_model=List[EvaluationResponse])
def list_evaluations(
    workspace_id: str,
    limit: int = 20,
    offset: int = 0,
    user: dict = Depends(get_current_user),
):
    """List evaluation history for a workspace, newest first."""
    require_workspace_role(workspace_id, user["id"], ["admin", "engineer", "viewer"])
    supabase = get_supabase()

    rows = (
        supabase.table("evaluations")
        .select("*")
        .eq("workspace_id", workspace_id)
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    ).data or []

    return [EvaluationResponse(**r, results=[]) for r in rows]


@router.get("/evaluations/{evaluation_id}", response_model=EvaluationResponse)
def get_evaluation(evaluation_id: str, user: dict = Depends(get_current_user)):
    """Get an evaluation by ID including all per-model results."""
    supabase = get_supabase()

    resp = supabase.table("evaluations").select("*").eq("id", evaluation_id).single().execute()
    evaluation = resp.data
    if not evaluation:
        raise HTTPException(status_code=404, detail="Evaluation not found")

    require_workspace_role(evaluation["workspace_id"], user["id"], ["admin", "engineer", "viewer"])

    from app.schemas.evaluation import EvaluationResultResponse
    results_resp = (
        supabase.table("evaluation_results")
        .select("*")
        .eq("evaluation_id", evaluation_id)
        .execute()
    )
    results = results_resp.data or []

    result_dicts = [
        {k: r[k] for k in ("model_id", "latency_ms", "cost_usd", "judge_score",
                            "input_tokens", "output_tokens", "is_valid_json", "error")}
        for r in results
    ]
    assign_badges(result_dicts)
    badge_map = {d["model_id"]: d.get("badges", []) for d in result_dicts}

    result_responses = [
        EvaluationResultResponse(**r, badges=badge_map.get(r["model_id"], []))
        for r in results
    ]

    return EvaluationResponse(**evaluation, results=result_responses)


# ═════════════════════════════════════════════════════════════════════════════
# SYNCHRONOUS EVALUATION ROUTES (immediate LLM execution)
# ═════════════════════════════════════════════════════════════════════════════

_evaluate_router = APIRouter(prefix="/evaluate", tags=["evaluations"])


@_evaluate_router.post(
    "",
    response_model=EvaluateResponse,
    status_code=status.HTTP_200_OK,
    summary="Run a multi-model evaluation (synchronous)",
)
async def run_evaluate(
    body: EvaluateRequest,
    current_user: AuthUser = Depends(get_current_user),
) -> EvaluateResponse:
    """Execute a full multi-model comparison and return results synchronously."""

    # Plan limit check
    try:
        usage_svc.enforce_plan_limit(
            user_id=current_user.id,
            plan_tier=current_user.plan_tier,
        )
    except PlanLimitError as exc:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=str(exc))

    # Workspace membership check
    if body.workspace_id:
        try:
            workspace_svc.require_role(
                workspace_id=body.workspace_id,
                user_id=current_user.id,
                allowed_roles=["admin", "engineer"],
            )
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))

    eval_settings: Dict[str, Any] = {
        "temperature": body.temperature if body.deterministic_seed is None else 0.0,
        "max_tokens": body.max_tokens,
        "deterministic_seed": body.deterministic_seed,
        "require_json_output": body.require_json_output,
        "json_schema": body.json_schema,
        "judge_model": body.judge_model,
    }

    eval_row = evaluation_svc.create_evaluation(
        user_id=current_user.id,
        prompt=body.prompt,
        model_ids=body.model_ids,
        workspace_id=body.workspace_id,
        system_prompt=body.system_prompt,
        settings=eval_settings,
        prompt_id=body.prompt_id,
    )
    evaluation_id: str = eval_row["id"]
    evaluation_svc.mark_running(evaluation_id)

    llm_results = await execute_models_parallel(
        prompt=body.prompt,
        model_ids=body.model_ids,
        system_prompt=body.system_prompt,
        deterministic_seed=body.deterministic_seed,
    )

    json_schema_dict = body.json_schema if body.require_json_output else None
    for r in llm_results:
        if body.require_json_output and r.output:
            val = validate_json_output(r.output, schema=json_schema_dict)
            r._is_valid_json = val.is_valid
            r._json_validation_error = val.error
        else:
            r._is_valid_json = None
            r._json_validation_error = None

    judge_scores: dict = {}
    if body.judge_model:
        outputs_map = {r.model_id: r.output for r in llm_results if r.output and not r.error}
        if outputs_map:
            judge_scores = await score_with_judge(
                prompt=body.prompt,
                outputs=outputs_map,
                judge_model=body.judge_model,
            )

    result_dicts: list[dict] = []
    for r in llm_results:
        js = judge_scores.get(r.model_id)
        result_dicts.append({
            "evaluation_id":         evaluation_id,
            "model_id":              r.model_id,
            "output_text":           r.output,
            "input_tokens":          r.input_tokens,
            "output_tokens":         r.output_tokens,
            "latency_ms":            r.latency_ms,
            "total_cost":            r.cost_usd,
            "quality_score":         js.score if js else None,
            "judge_reasoning":       js.reasoning if js else None,
            "is_valid_json":         getattr(r, "_is_valid_json", None),
            "json_validation_error": getattr(r, "_json_validation_error", None),
            "error":                 r.error,
        })

    assign_badges(result_dicts)
    evaluation_svc.store_all_results(result_dicts)
    evaluation_svc.mark_completed(evaluation_id)

    usage_svc.increment_from_results(
        user_id=current_user.id,
        results=result_dicts,
        workspace_id=body.workspace_id,
    )

    total_input  = sum(d["input_tokens"]  for d in result_dicts)
    total_output = sum(d["output_tokens"] for d in result_dicts)
    total_cost   = sum(d["total_cost"]    for d in result_dicts)

    return EvaluateResponse(
        evaluation_id=evaluation_id,
        status="completed",
        prompt=body.prompt,
        model_ids=body.model_ids,
        results=[
            ModelResultOut(
                model_id=               d["model_id"],
                output_text=            d["output_text"],
                input_tokens=           d["input_tokens"],
                output_tokens=          d["output_tokens"],
                latency_ms=             d["latency_ms"],
                total_cost=             d["total_cost"],
                quality_score=          d["quality_score"],
                judge_reasoning=        d["judge_reasoning"],
                is_valid_json=          d["is_valid_json"],
                json_validation_error=  d["json_validation_error"],
                error=                  d["error"],
                badges=                 d.get("badges", []),
            )
            for d in result_dicts
        ],
        total_cost_usd=round(total_cost, 8),
        total_input_tokens=total_input,
        total_output_tokens=total_output,
    )


@_evaluate_router.get("/{evaluation_id}", response_model=EvaluateResponse, summary="Fetch a stored evaluation")
async def get_stored_evaluation(
    evaluation_id: str,
    current_user: AuthUser = Depends(get_current_user),
) -> EvaluateResponse:
    """Retrieve a previously run evaluation by ID."""
    row = evaluation_svc.get_evaluation(evaluation_id)
    if not row:
        raise HTTPException(status_code=404, detail="Evaluation not found")

    is_owner = row["user_id"] == current_user.id
    in_workspace = row.get("workspace_id") and workspace_svc.is_member(
        row["workspace_id"], current_user.id
    )
    if not (is_owner or in_workspace):
        raise HTTPException(status_code=403, detail="Access denied")

    results = row.get("evaluation_results", [])
    assign_badges(results)

    return EvaluateResponse(
        evaluation_id=row["id"],
        status=row["status"],
        prompt=row["prompt"],
        model_ids=row["model_ids"],
        results=[
            ModelResultOut(
                model_id=               r["model_id"],
                output_text=            r.get("output_text"),
                input_tokens=           r.get("input_tokens", 0),
                output_tokens=          r.get("output_tokens", 0),
                latency_ms=             r.get("latency_ms", 0),
                total_cost=             r.get("total_cost", 0),
                quality_score=          r.get("quality_score"),
                judge_reasoning=        r.get("judge_reasoning"),
                is_valid_json=          r.get("is_valid_json"),
                json_validation_error=  r.get("json_validation_error"),
                error=                  r.get("error"),
                badges=                 r.get("badges", []),
            )
            for r in results
        ],
        total_cost_usd=round(sum(r.get("total_cost", 0) for r in results), 8),
        total_input_tokens=sum(r.get("input_tokens", 0) for r in results),
        total_output_tokens=sum(r.get("output_tokens", 0) for r in results),
    )


@_evaluate_router.get("", summary="List recent evaluations")
async def list_user_evaluations(
    workspace_id: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
    current_user: AuthUser = Depends(get_current_user),
) -> list[dict]:
    """List evaluations for the current user (or workspace)."""
    return evaluation_svc.list_evaluations(
        user_id=current_user.id,
        workspace_id=workspace_id,
        limit=min(limit, 100),
        offset=offset,
    )


# Export both routers so main.py can include both
evaluate_router = _evaluate_router
