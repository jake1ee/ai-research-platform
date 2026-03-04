"""
Database service layer – Supabase edition.

All DB interactions go through this module so routes stay thin.
The admin client is used for writes (bypasses RLS safely); the user-scoped
client can be passed in for reads so RLS is enforced at the DB level.

Classes
-------
  EvaluationService  – create, update, read evaluations and their results
  WorkspaceService   – membership checks, workspace lookup
"""

import json
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from supabase import Client

from supabase.client import supabase_admin


# ─────────────────────────────────────────────────────────────────────────────
# Evaluation Service
# ─────────────────────────────────────────────────────────────────────────────

class EvaluationService:
    """
    Handles all DB operations for evaluations and their per-model results.

    All writes use supabase_admin (service role) so RLS doesn't block the
    backend from updating status or inserting results.
    Reads can optionally use a user-scoped client for RLS enforcement.
    """

    def __init__(self, read_client: Optional[Client] = None):
        # Use the provided user-scoped client for reads, admin for writes.
        self._read = read_client or supabase_admin
        self._write = supabase_admin

    # ── Create ───────────────────────────────────────────────────────────────

    def create_evaluation(
        self,
        user_id: str,
        prompt: str,
        model_ids: list[str],
        workspace_id: Optional[str] = None,
        system_prompt: Optional[str] = None,
        settings: Optional[dict] = None,
        prompt_id: Optional[str] = None,
    ) -> dict:
        """
        Insert a new evaluation row with status='pending'.

        Returns the full inserted row as a dict.
        """
        row = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "workspace_id": workspace_id,
            "prompt_id": prompt_id,
            "prompt": prompt,
            "system_prompt": system_prompt,
            "settings": settings or {},
            # PostgreSQL text[] – supabase-py sends Python lists natively
            "model_ids": model_ids,
            "status": "pending",
        }
        response = self._write.table("evaluations").insert(row).execute()
        return response.data[0]

    # ── Status updates ────────────────────────────────────────────────────────

    def mark_running(self, evaluation_id: str) -> None:
        """Set status → 'running' when the Celery task picks it up."""
        self._write.table("evaluations").update({"status": "running"}).eq(
            "id", evaluation_id
        ).execute()

    def mark_completed(self, evaluation_id: str) -> None:
        """Set status → 'completed' and record the completion timestamp."""
        self._write.table("evaluations").update(
            {
                "status": "completed",
                "completed_at": datetime.now(timezone.utc).isoformat(),
            }
        ).eq("id", evaluation_id).execute()

    def mark_failed(self, evaluation_id: str) -> None:
        """Set status → 'failed' (called on unrecoverable Celery error)."""
        self._write.table("evaluations").update({"status": "failed"}).eq(
            "id", evaluation_id
        ).execute()

    # ── Results ───────────────────────────────────────────────────────────────

    def store_result(
        self,
        evaluation_id: str,
        model_id: str,
        output_text: Optional[str],
        input_tokens: int,
        output_tokens: int,
        latency_ms: float,
        total_cost: float,
        quality_score: Optional[float] = None,
        judge_reasoning: Optional[str] = None,
        is_valid_json: Optional[bool] = None,
        json_validation_error: Optional[str] = None,
        error: Optional[str] = None,
    ) -> dict:
        """
        Insert one EvaluationResult row.

        Called once per model after the LLM call completes (or fails).
        Uses the admin client so the backend can always write results
        regardless of the user's JWT.
        """
        row = {
            "id": str(uuid.uuid4()),
            "evaluation_id": evaluation_id,
            "model_id": model_id,
            "output_text": output_text,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "latency_ms": float(latency_ms),
            "total_cost": float(total_cost),
            "quality_score": quality_score,
            "judge_reasoning": judge_reasoning,
            "is_valid_json": is_valid_json,
            "json_validation_error": json_validation_error,
            "error": error,
        }
        response = self._write.table("evaluation_results").insert(row).execute()
        return response.data[0]

    def store_all_results(self, results: list[dict]) -> list[dict]:
        """
        Bulk-insert all model results in a single API call.

        Parameters
        ----------
        results : List of dicts accepted by store_result() (minus evaluation_id
                  which should already be set on each dict as 'evaluation_id').
        """
        rows = [
            {
                "id": str(uuid.uuid4()),
                **r,
                # Ensure numeric types are correct for Supabase
                "latency_ms": float(r.get("latency_ms", 0)),
                "total_cost": float(r.get("total_cost", 0)),
            }
            for r in results
        ]
        response = self._write.table("evaluation_results").insert(rows).execute()
        return response.data

    # ── Reads ─────────────────────────────────────────────────────────────────

    def get_evaluation(self, evaluation_id: str) -> Optional[dict]:
        """Fetch a single evaluation with its results embedded."""
        resp = (
            self._read.table("evaluations")
            .select("*, evaluation_results(*)")
            .eq("id", evaluation_id)
            .maybe_single()
            .execute()
        )
        return resp.data

    def list_evaluations(
        self,
        user_id: str,
        workspace_id: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> list[dict]:
        """List evaluations for a user (or workspace), newest first."""
        query = (
            self._read.table("evaluations")
            .select("*")
            .order("created_at", desc=True)
            .limit(limit)
            .offset(offset)
        )
        if workspace_id:
            query = query.eq("workspace_id", workspace_id)
        else:
            query = query.eq("user_id", user_id)

        return query.execute().data or []


# ─────────────────────────────────────────────────────────────────────────────
# Workspace Service
# ─────────────────────────────────────────────────────────────────────────────

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
        """
        Raise a ValueError if the user's role is not in allowed_roles.
        Routes catch ValueError and convert it to a 403 response.
        """
        role = self.get_role(workspace_id, user_id)
        if role not in allowed_roles:
            raise ValueError(
                f"Requires one of {allowed_roles} but user has role '{role}'"
            )


# ─────────────────────────────────────────────────────────────────────────────
# Singleton accessors (import and use directly in routes)
# ─────────────────────────────────────────────────────────────────────────────

evaluation_svc  = EvaluationService()
workspace_svc   = WorkspaceService()
