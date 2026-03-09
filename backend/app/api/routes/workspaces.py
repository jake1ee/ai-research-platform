"""
Workspace routes – mounted at root (no prefix).

Endpoints
---------
  POST /workspaces                          – Create workspace
  GET  /workspaces/{id}                     – Get workspace details
  GET  /workspaces/{id}/members             – List members
  POST /workspaces/{id}/members             – Invite member (ADMIN only)
  GET  /workspaces/{id}/usage               – Monthly usage stats
  POST /workspaces/{id}/upgrade             – Upgrade plan (ADMIN only)
"""

import uuid
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.supabase.auth_dependency import get_current_user
from app.core.supabase.client import get_supabase
from app.core.config import settings
from app.dependencies.workspace import get_workspace_or_404, require_workspace_role
from app.schemas.common import PlanTier, Role
from app.schemas.workspace import (
    UpgradePlanRequest,
    UsageStats,
    WorkspaceCreate,
    WorkspaceMemberInvite,
    WorkspaceMemberResponse,
    WorkspaceResponse,
)
from app.services.billing_service import upgrade_plan

router = APIRouter(tags=["workspaces"])


def _plan_eval_limit(tier: str) -> int:
    return {
        "free": settings.FREE_EVAL_LIMIT,
        "pro": settings.PRO_EVAL_LIMIT,
        "enterprise": settings.ENTERPRISE_EVAL_LIMIT,
    }.get(tier, settings.FREE_EVAL_LIMIT)


@router.post("/workspaces", response_model=WorkspaceResponse)
def create_workspace(
    workspace_in: WorkspaceCreate,
    user: dict = Depends(get_current_user),
):
    """Create a new workspace. Creator is automatically assigned ADMIN."""
    supabase = get_supabase()
    workspace_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    workspace = {
        "id": workspace_id,
        "name": workspace_in.name,
        "tier": PlanTier.FREE.value,
        "stripe_customer_id": None,
        "created_at": now,
    }
    supabase.table("workspaces").insert(workspace).execute()
    supabase.table("workspace_members").insert({
        "workspace_id": workspace_id,
        "user_id": user["id"],
        "role": Role.ADMIN.value,
        "joined_at": now,
    }).execute()

    return WorkspaceResponse(**workspace)


@router.get("/workspaces/{workspace_id}", response_model=WorkspaceResponse)
def get_workspace(workspace_id: str, user: dict = Depends(get_current_user)):
    """Get workspace details. Requires membership."""
    require_workspace_role(workspace_id, user["id"], ["admin", "engineer", "viewer"])
    return WorkspaceResponse(**get_workspace_or_404(workspace_id))


@router.get("/workspaces/{workspace_id}/members", response_model=List[WorkspaceMemberResponse])
def list_workspace_members(workspace_id: str, user: dict = Depends(get_current_user)):
    """List all members of a workspace."""
    require_workspace_role(workspace_id, user["id"], ["admin", "engineer", "viewer"])
    supabase = get_supabase()
    members = (
        supabase.table("workspace_members")
        .select("*")
        .eq("workspace_id", workspace_id)
        .execute()
    ).data or []
    return [WorkspaceMemberResponse(**m) for m in members]


@router.post("/workspaces/{workspace_id}/members", response_model=WorkspaceMemberResponse)
def invite_member(
    workspace_id: str,
    invite: WorkspaceMemberInvite,
    user: dict = Depends(get_current_user),
):
    """Invite an existing user to the workspace by email (ADMIN only)."""
    require_workspace_role(workspace_id, user["id"], ["admin"])
    workspace = get_workspace_or_404(workspace_id)

    if workspace["tier"] == "free":
        raise HTTPException(
            status_code=403,
            detail="Team workspaces require Pro or Enterprise plan",
        )

    supabase = get_supabase()
    target_resp = supabase.auth.admin.list_users()
    target_user = next(
        (u for u in (target_resp or []) if u.email == invite.email), None
    )
    if not target_user:
        raise HTTPException(status_code=404, detail="No user found with that email")

    existing = (
        supabase.table("workspace_members")
        .select("user_id")
        .eq("workspace_id", workspace_id)
        .eq("user_id", target_user.id)
        .execute()
    ).data
    if existing:
        raise HTTPException(status_code=409, detail="User is already a member")

    now = datetime.now(timezone.utc).isoformat()
    member = {
        "workspace_id": workspace_id,
        "user_id": target_user.id,
        "role": invite.role.value,
        "joined_at": now,
    }
    supabase.table("workspace_members").insert(member).execute()
    return WorkspaceMemberResponse(**member)


@router.get("/workspaces/{workspace_id}/usage", response_model=UsageStats)
def get_workspace_usage(workspace_id: str, user: dict = Depends(get_current_user)):
    """Return monthly usage statistics for the workspace."""
    require_workspace_role(workspace_id, user["id"], ["admin", "engineer", "viewer"])
    workspace = get_workspace_or_404(workspace_id)

    supabase = get_supabase()
    now = datetime.now(timezone.utc)
    month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc).isoformat()

    logs = (
        supabase.table("usage_logs")
        .select("input_tokens, output_tokens, cost_usd")
        .eq("workspace_id", workspace_id)
        .gte("timestamp", month_start)
        .execute()
    ).data or []

    eval_resp = (
        supabase.table("evaluations")
        .select("id", count="exact")
        .eq("workspace_id", workspace_id)
        .gte("created_at", month_start)
        .execute()
    )
    eval_count = eval_resp.count or 0
    total_cost = sum(r["cost_usd"] for r in logs)
    total_tokens = sum(r["input_tokens"] + r["output_tokens"] for r in logs)
    limit = _plan_eval_limit(workspace["tier"])
    remaining = -1 if limit == -1 else max(0, limit - eval_count)

    return UsageStats(
        total_evaluations=eval_count,
        total_cost_usd=round(total_cost, 6),
        total_tokens=total_tokens,
        plan_limit=limit,
        remaining_evals=remaining,
    )


@router.post("/workspaces/{workspace_id}/upgrade")
def upgrade_workspace_plan(
    workspace_id: str,
    body: UpgradePlanRequest,
    user: dict = Depends(get_current_user),
):
    """Upgrade the workspace plan (ADMIN only)."""
    require_workspace_role(workspace_id, user["id"], ["admin"])
    workspace = get_workspace_or_404(workspace_id)

    try:
        upgrade_plan(workspace, body.tier, body.payment_method_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return {"message": f"Plan upgraded to {body.tier.value}", "workspace_id": workspace_id}
