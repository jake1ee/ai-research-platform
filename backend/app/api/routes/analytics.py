"""
Analytics routes.

  GET /analytics?days=30[&workspace_id=...]  – personal (default) or workspace analytics
  GET /workspaces/{id}/analytics             – same, workspace-scoped (kept for compatibility)

Rows are filtered in SQL (owner / workspace + date window) and aggregated in
app.services.analytics_service; no cross-tenant data is ever loaded.
"""

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, Query

from app.core.supabase.auth_dependency import AuthUser, get_current_user
from app.core.supabase.client import get_supabase
from app.dependencies.workspace import require_workspace_role
from app.schemas.analytics import AnalyticsSummary
from app.services.analytics_service import summarise

router = APIRouter(tags=["analytics"])

MAX_ROWS = 2000
RESULT_COLS = "model_id, latency_ms, total_cost, input_tokens, output_tokens, quality_score, error"


def _load(scope_col: str, scope_val: str, days: int) -> AnalyticsSummary:
    window_start = (datetime.now(UTC) - timedelta(days=days * 2)).isoformat()  # 2x: previous period
    rows = (
        get_supabase()
        .table("evaluations")
        .select(f"id, created_at, prompt, status, model_ids, evaluation_results({RESULT_COLS})")
        .eq(scope_col, scope_val)
        .gte("created_at", window_start)
        .order("created_at", desc=True)
        .limit(MAX_ROWS)
        .execute()
    ).data or []
    return AnalyticsSummary(**summarise(rows, days))


@router.get("/analytics", response_model=AnalyticsSummary)
def get_my_analytics(
    days: int = Query(30, ge=1, le=365),
    workspace_id: str | None = None,
    user: AuthUser = Depends(get_current_user),
):
    if workspace_id:
        require_workspace_role(workspace_id, user.id, ["admin", "engineer", "viewer"])
        return _load("workspace_id", workspace_id, days)
    return _load("user_id", user.id, days)


@router.get("/workspaces/{workspace_id}/analytics", response_model=AnalyticsSummary)
def get_workspace_analytics(
    workspace_id: str,
    days: int = Query(30, ge=1, le=365),
    user: AuthUser = Depends(get_current_user),
):
    require_workspace_role(workspace_id, user.id, ["admin", "engineer", "viewer"])
    return _load("workspace_id", workspace_id, days)
