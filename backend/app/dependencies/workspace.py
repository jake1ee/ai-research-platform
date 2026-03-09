"""
Reusable FastAPI dependencies for workspace-level access control.

These replace the inline helper functions that were in api/main.py.

Import pattern:
    from app.dependencies.workspace import require_workspace_role, get_workspace_or_404
"""

from fastapi import Depends, HTTPException, status

from app.core.supabase.auth_dependency import AuthUser, get_current_user
from app.core.supabase.client import get_supabase


def get_workspace_or_404(workspace_id: str) -> dict:
    """Fetch a workspace by ID or raise 404."""
    supabase = get_supabase()
    resp = (
        supabase.table("workspaces")
        .select("*")
        .eq("id", workspace_id)
        .single()
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return resp.data


def require_workspace_role(
    workspace_id: str,
    user_id: str,
    allowed_roles: list[str],
) -> dict:
    """
    Fetch the workspace_members row for this user and enforce role.
    Returns the member dict. Raises 403 if not a member or wrong role.
    """
    supabase = get_supabase()
    resp = (
        supabase.table("workspace_members")
        .select("*")
        .eq("workspace_id", workspace_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    member = resp.data
    if not member or member["role"] not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions for this workspace",
        )
    return member
