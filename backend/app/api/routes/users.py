"""
User routes – mounted at root (no prefix).

Endpoints
---------
  GET /users/me             – Return authenticated user profile
  GET /users/me/workspaces  – List workspaces the user belongs to
"""

from typing import List

from fastapi import APIRouter, Depends

from app.core.supabase.auth_dependency import get_current_user
from app.core.supabase.client import get_supabase
from app.schemas.auth import UserResponse
from app.schemas.workspace import WorkspaceResponse

router = APIRouter(tags=["users"])


@router.get("/users/me", response_model=UserResponse)
def get_me(user: dict = Depends(get_current_user)):
    """Return the authenticated user's profile from Supabase Auth metadata."""
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user.get("user_metadata", {}).get("name", ""),
        created_at=user["created_at"],
    )


@router.get("/users/me/workspaces", response_model=List[WorkspaceResponse])
def list_my_workspaces(user: dict = Depends(get_current_user)):
    """Return all workspaces the current user belongs to."""
    supabase = get_supabase()
    memberships = (
        supabase.table("workspace_members")
        .select("workspace_id")
        .eq("user_id", user["id"])
        .execute()
    ).data or []

    workspace_ids = [m["workspace_id"] for m in memberships]
    if not workspace_ids:
        return []

    workspaces = (
        supabase.table("workspaces")
        .select("*")
        .in_("id", workspace_ids)
        .execute()
    ).data or []

    return [WorkspaceResponse(**w) for w in workspaces]
