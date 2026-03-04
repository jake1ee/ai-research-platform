"""
POST /evaluate – multi-model LLM evaluation route.

Flow
----
  1. Verify Supabase JWT → extract AuthUser (plan_tier, user_id).
  2. Enforce monthly eval limit (raises 429 if over quota).
  3. Optionally validate workspace membership (if workspace_id supplied).
  4. Create the evaluation row in Supabase (status='pending').
  5. Execute all LLM calls in parallel via LiteLLM (async).
  6. Optionally run JSON validation on each output.
  7. Optionally score outputs with LLM-as-a-Judge.
  8. Assign comparative badges (fastest / cheapest / best_quality).
  9. Persist all EvaluationResult rows.
 10. Atomically increment usage_tracking.
 11. Return the complete evaluation with all results.

Mount this router in main.py:
    from api.evaluate import router as evaluate_router
    app.include_router(evaluate_router)
"""

import json
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator

from services.llm_executor import ModelCallResult, execute_models_parallel
from services.llm_judge import score_with_judge
from services.supabase_db import EvaluationService, evaluation_svc
from services.usage_service import PlanLimitError, usage_svc
from supabase.auth_dependency import AuthUser, get_current_user
from utils.badge_assigner import assign_badges
from utils.json_validator import validate_json_output

router = APIRouter(prefix="/evaluate", tags=["evaluations"])


# ─────────────────────────────────────────────────────────────────────────────
# Request / Response models
# ─────────────────────────────────────────────────────────────────────────────

class EvaluateRequest(BaseModel):
    """Body for POST /evaluate."""

    prompt: str = Field(..., min_length=1, description="User prompt sent to all models")
    system_prompt: Optional[str] = Field(None, description="Optional system instruction")

    # LiteLLM model strings, e.g. ["openai/gpt-4o", "anthropic/claude-3-5-sonnet-20241022"]
    model_ids: List[str] = Field(..., min_length=1)

    workspace_id: Optional[str] = Field(
        None, description="Omit for personal evaluation"
    )
    prompt_id: Optional[str] = Field(
        None, description="ID of a saved prompt template (optional)"
    )

    # ── Execution settings ────────────────────────────────────────────────────
    temperature: float = Field(1.0, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(None, gt=0)

    # Setting deterministic_seed forces temperature=0 and fixes the random seed
    deterministic_seed: Optional[int] = None

    # ── Output validation ─────────────────────────────────────────────────────
    require_json_output: bool = False
    json_schema: Optional[Dict[str, Any]] = Field(
        None, description="JSON Schema the output must conform to"
    )

    # ── LLM-as-a-Judge ────────────────────────────────────────────────────────
    judge_model: Optional[str] = Field(
        None,
        description="LiteLLM model string for the judge, e.g. 'openai/gpt-4o'",
    )

    @field_validator("model_ids")
    @classmethod
    def at_least_one_model(cls, v: list[str]) -> list[str]:
        if len(v) < 1:
            raise ValueError("Provide at least one model_id")
        return v


class ModelResultOut(BaseModel):
    """Per-model result returned to the caller."""
    model_id: str
    output_text: Optional[str]
    input_tokens: int
    output_tokens: int
    latency_ms: float
    total_cost: float
    quality_score: Optional[float]
    judge_reasoning: Optional[str]
    is_valid_json: Optional[bool]
    json_validation_error: Optional[str]
    error: Optional[str]
    badges: List[str] = []


class EvaluateResponse(BaseModel):
    """Full evaluation response returned after all models complete."""
    evaluation_id: str
    status: str
    prompt: str
    model_ids: List[str]
    results: List[ModelResultOut]
    total_cost_usd: float
    total_input_tokens: int
    total_output_tokens: int


# ─────────────────────────────────────────────────────────────────────────────
# Route
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "",
    response_model=EvaluateResponse,
    status_code=status.HTTP_200_OK,
    summary="Run a multi-model evaluation",
    description=(
        "Submit a prompt to multiple LLMs simultaneously. "
        "Results are returned synchronously (use Celery for long-running jobs). "
        "Requires a valid Supabase JWT in the Authorization header."
    ),
)
async def run_evaluate(
    body: EvaluateRequest,
    current_user: AuthUser = Depends(get_current_user),
) -> EvaluateResponse:
    """
    Execute a full multi-model comparison and return results.

    This route is synchronous (waits for all LLM calls to finish).
    For very long prompts or many models, prefer the async Celery pipeline
    (POST /workspaces/{id}/evaluations → poll GET /evaluations/{id}).
    """

    # ── 1. Plan limit check ───────────────────────────────────────────────────
    try:
        usage_svc.enforce_plan_limit(
            user_id=current_user.id,
            plan_tier=current_user.plan_tier,
        )
    except PlanLimitError as exc:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=str(exc),
        )

    # ── 2. Workspace membership check ─────────────────────────────────────────
    if body.workspace_id:
        from services.supabase_db import workspace_svc
        try:
            workspace_svc.require_role(
                workspace_id=body.workspace_id,
                user_id=current_user.id,
                allowed_roles=["admin", "engineer"],
            )
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=str(exc),
            )

    # ── 3. Build evaluation settings dict for storage ─────────────────────────
    eval_settings: Dict[str, Any] = {
        "temperature": body.temperature if body.deterministic_seed is None else 0.0,
        "max_tokens": body.max_tokens,
        "deterministic_seed": body.deterministic_seed,
        "require_json_output": body.require_json_output,
        "json_schema": body.json_schema,
        "judge_model": body.judge_model,
    }

    # ── 4. Create evaluation row in Supabase ──────────────────────────────────
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

    # Mark as running now that we're about to call the LLMs
    evaluation_svc.mark_running(evaluation_id)

    # ── 5. Execute all LLMs in parallel ──────────────────────────────────────
    llm_results: list[ModelCallResult] = await execute_models_parallel(
        prompt=body.prompt,
        model_ids=body.model_ids,
        system_prompt=body.system_prompt,
        deterministic_seed=body.deterministic_seed,
    )

    # ── 6. JSON validation ────────────────────────────────────────────────────
    json_schema_dict = body.json_schema if body.require_json_output else None
    for r in llm_results:
        if body.require_json_output and r.output:
            val = validate_json_output(r.output, schema=json_schema_dict)
            r._is_valid_json = val.is_valid
            r._json_validation_error = val.error
        else:
            r._is_valid_json = None
            r._json_validation_error = None

    # ── 7. LLM-as-a-Judge scoring ─────────────────────────────────────────────
    judge_scores: dict = {}
    if body.judge_model:
        outputs_map = {
            r.model_id: r.output
            for r in llm_results
            if r.output and not r.error
        }
        if outputs_map:
            judge_scores = await score_with_judge(
                prompt=body.prompt,
                outputs=outputs_map,
                judge_model=body.judge_model,
            )

    # ── 8. Build result dicts for badge assignment ────────────────────────────
    result_dicts: list[dict] = []
    for r in llm_results:
        js = judge_scores.get(r.model_id)
        result_dicts.append(
            {
                "evaluation_id":        evaluation_id,
                "model_id":             r.model_id,
                "output_text":          r.output,
                "input_tokens":         r.input_tokens,
                "output_tokens":        r.output_tokens,
                "latency_ms":           r.latency_ms,
                "total_cost":           r.cost_usd,
                "quality_score":        js.score         if js else None,
                "judge_reasoning":      js.reasoning     if js else None,
                "is_valid_json":        getattr(r, "_is_valid_json", None),
                "json_validation_error":getattr(r, "_json_validation_error", None),
                "error":                r.error,
            }
        )

    # assign_badges works on any list of dicts with the right keys
    assign_badges(result_dicts)  # adds "badges" key to each dict

    # ── 9. Persist results ────────────────────────────────────────────────────
    evaluation_svc.store_all_results(result_dicts)
    evaluation_svc.mark_completed(evaluation_id)

    # ── 10. Update usage_tracking (atomic upsert via PostgreSQL function) ──────
    usage_svc.increment_from_results(
        user_id=current_user.id,
        results=result_dicts,
        workspace_id=body.workspace_id,
    )

    # ── 11. Build and return response ─────────────────────────────────────────
    total_input  = sum(d["input_tokens"]  for d in result_dicts)
    total_output = sum(d["output_tokens"] for d in result_dicts)
    total_cost   = sum(d["total_cost"]    for d in result_dicts)

    model_results_out = [
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
    ]

    return EvaluateResponse(
        evaluation_id=evaluation_id,
        status="completed",
        prompt=body.prompt,
        model_ids=body.model_ids,
        results=model_results_out,
        total_cost_usd=round(total_cost, 8),
        total_input_tokens=total_input,
        total_output_tokens=total_output,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Supporting routes
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/{evaluation_id}",
    response_model=EvaluateResponse,
    summary="Fetch a stored evaluation",
)
async def get_evaluation(
    evaluation_id: str,
    current_user: AuthUser = Depends(get_current_user),
) -> EvaluateResponse:
    """Retrieve a previously run evaluation by ID."""
    row = evaluation_svc.get_evaluation(evaluation_id)
    if not row:
        raise HTTPException(status_code=404, detail="Evaluation not found")

    # Access check: must be owner or workspace member
    from services.supabase_db import workspace_svc
    is_owner  = row["user_id"] == current_user.id
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


@router.get(
    "",
    summary="List recent evaluations",
)
async def list_evaluations(
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
