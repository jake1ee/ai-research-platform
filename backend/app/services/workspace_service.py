"""
Workspace database service – Supabase edition.

Import pattern:
    from app.services.workspace_service import workspace_svc
"""

from typing import Optional

from app.core.supabase.client import supabase_admin


class WorkspaceService:
    """Helpers for workspace membership and access checks."""

    def is_member(self, workspace_id: str, user_id: str) -> bool:
        """Return True if user_id is a member of workspace_id."""
        resp = (
            supabase_admin.table("workspace_members")
            .select("user_id")
            .eq("workspace_id", workspace_id)
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )
        return resp.data is not None

    def get_role(self, workspace_id: str, user_id: str) -> Optional[str]:
        """Return the user's role in the workspace, or None if not a member."""
        resp = (
            supabase_admin.table("workspace_members")
            .select("role")
            .eq("workspace_id", workspace_id)
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )
        return resp.data["role"] if resp.data else None

    def get_workspace(self, workspace_id: str) -> Optional[dict]:
        """Fetch workspace row by ID."""
        resp = (
            supabase_admin.table("workspaces")
            .select("*")
            .eq("id", workspace_id)
            .maybe_single()
            .execute()
        )
        return resp.data

    def require_role(
        self,
        workspace_id: str,
        user_id: str,
        allowed_roles: list[str],
    ) -> None:
        """Raise ValueError if the user's role is not in allowed_roles."""
        role = self.get_role(workspace_id, user_id)
        if role not in allowed_roles:
            raise ValueError(
                f"Requires one of {allowed_roles} but user has role '{role}'"
            )


# Singleton
workspace_svc = WorkspaceService()
