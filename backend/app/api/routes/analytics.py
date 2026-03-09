"""
Analytics routes – mounted at root (no prefix).

Endpoints
---------
  GET /workspaces/{id}/analytics  – Aggregated analytics summary
"""

from collections import defaultdict
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends

from app.core.supabase.auth_dependency import get_current_user
from app.core.supabase.client import get_supabase
from app.dependencies.workspace import require_workspace_role
from app.schemas.analytics import AnalyticsSummary, ModelMetricPoint

router = APIRouter(tags=["analytics"])


@router.get("/workspaces/{workspace_id}/analytics", response_model=AnalyticsSummary)
def get_analytics(
    workspace_id: str,
    days: int = 30,
    user: dict = Depends(get_current_user),
):
    """Return aggregated analytics for the workspace over the last *days* days."""
    require_workspace_role(workspace_id, user["id"], ["admin", "engineer", "viewer"])

    supabase = get_supabase()
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    logs = (
        supabase.table("usage_logs")
        .select("model_id, input_tokens, output_tokens, cost_usd, latency_ms, timestamp")
        .eq("workspace_id", workspace_id)
        .gte("timestamp", cutoff)
        .execute()
    ).data or []

    eval_ids_resp = (
        supabase.table("evaluations")
        .select("id")
        .eq("workspace_id", workspace_id)
        .gte("created_at", cutoff)
        .execute()
    ).data or []
    workspace_eval_ids = {r["id"] for r in eval_ids_resp}

    eval_results = (
        supabase.table("evaluation_results")
        .select("model_id, judge_score, evaluation_id")
        .execute()
    ).data or []
    eval_results = [r for r in eval_results if r["evaluation_id"] in workspace_eval_ids]

    total_cost = sum(l["cost_usd"] for l in logs)
    total_tokens = sum(l["input_tokens"] + l["output_tokens"] for l in logs)
    total_latency = sum(l["latency_ms"] for l in logs)
    avg_latency = total_latency / len(logs) if logs else 0.0

    model_calls: dict[str, int] = defaultdict(int)
    model_latency_sum: dict[str, float] = defaultdict(float)
    model_cost_sum: dict[str, float] = defaultdict(float)
    model_score_sum: dict[str, float] = defaultdict(float)
    model_score_count: dict[str, int] = defaultdict(int)

    for log in logs:
        model_calls[log["model_id"]] += 1
        model_latency_sum[log["model_id"]] += log["latency_ms"]
        model_cost_sum[log["model_id"]] += log["cost_usd"]

    for r in eval_results:
        if r.get("judge_score") is not None:
            model_score_sum[r["model_id"]] += r["judge_score"]
            model_score_count[r["model_id"]] += 1

    model_avg_latency = {m: round(model_latency_sum[m] / model_calls[m], 2) for m in model_calls}
    model_avg_cost = {m: round(model_cost_sum[m] / model_calls[m], 8) for m in model_calls}
    model_avg_score = {
        m: round(model_score_sum[m] / model_score_count[m], 2) for m in model_score_count
    }

    daily_latency: dict[tuple, list] = defaultdict(list)
    daily_cost: dict[tuple, float] = defaultdict(float)
    daily_tokens: dict[tuple, int] = defaultdict(int)

    for log in logs:
        date_str = log["timestamp"][:10]
        key = (date_str, log["model_id"])
        daily_latency[key].append(log["latency_ms"])
        daily_cost[key] += log["cost_usd"]
        daily_tokens[key] += log["input_tokens"] + log["output_tokens"]

    latency_trend = [
        ModelMetricPoint(date=k[0], model_id=k[1], value=round(sum(v) / len(v), 2))
        for k, v in daily_latency.items()
    ]
    cost_trend = [
        ModelMetricPoint(date=k[0], model_id=k[1], value=round(v, 8))
        for k, v in daily_cost.items()
    ]
    token_trend = [
        ModelMetricPoint(date=k[0], model_id=k[1], value=float(v))
        for k, v in daily_tokens.items()
    ]

    return AnalyticsSummary(
        total_evaluations=len(workspace_eval_ids),
        total_cost_usd=round(total_cost, 6),
        total_tokens=total_tokens,
        avg_latency_ms=round(avg_latency, 2),
        model_call_counts=dict(model_calls),
        model_avg_latency_ms=model_avg_latency,
        model_avg_cost_usd=model_avg_cost,
        model_avg_judge_score=model_avg_score,
        latency_trend=latency_trend,
        cost_trend=cost_trend,
        token_usage_trend=token_trend,
    )
