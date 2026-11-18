"""
User routes – mounted at root (no prefix).

Endpoints
---------
  GET /users/me             – Return authenticated user profile
  GET /users/me/workspaces  – List workspaces the user belongs to
"""


from fastapi import APIRouter, Depends

from app.core.supabase.auth_dependency import AuthUser, get_current_user
from app.core.supabase.client import get_supabase
from app.schemas.auth import UserResponse
from app.services.plan_service import get_user_plan_tier
from app.services.usage_service import usage_svc

router = APIRouter(tags=["users"])


@router.get("/users/me", response_model=UserResponse)
def get_me(user: AuthUser = Depends(get_current_user)):
    """Return the authenticated user's profile."""
    row = (
        get_supabase().table("users").select("created_at").eq("id", user.id).limit(1).execute()
    ).data
    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        created_at=row[0]["created_at"] if row else None,
    )


@router.get("/users/me/workspaces")
def list_my_workspaces(user: AuthUser = Depends(get_current_user)) -> list[dict]:
    """Workspaces the user belongs to, with their role and member counts."""
    supabase = get_supabase()
    memberships = (
        supabase.table("workspace_members")
        .select("workspace_id, role")
        .eq("user_id", user.id)
        .execute()
    ).data or []
    if not memberships:
        return []

    roles = {m["workspace_id"]: m["role"] for m in memberships}
    ids = list(roles)
    workspaces = supabase.table("workspaces").select("*").in_("id", ids).execute().data or []
    members = (
        supabase.table("workspace_members").select("workspace_id").in_("workspace_id", ids).execute()
    ).data or []
    counts: dict[str, int] = {}
    for m in members:
        counts[m["workspace_id"]] = counts.get(m["workspace_id"], 0) + 1

    return [
        {
            "id": w["id"],
            "name": w["name"],
            "plan": w.get("plan_tier") or w.get("tier") or "free",
            "role": roles[w["id"]],
            "memberCount": counts.get(w["id"], 1),
            "slug": w.get("slug"),
        }
        for w in workspaces
    ]


@router.get("/users/me/usage")
def my_usage(user: AuthUser = Depends(get_current_user)) -> dict:
    """Current-month usage against the plan limits."""
    return usage_svc.get_remaining(user.id, get_user_plan_tier(user.id))
