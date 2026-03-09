"""
Evaluation database service – Supabase edition.

All DB interactions go through this module so routes stay thin.

Import pattern:
    from app.services.evaluation_service import evaluation_svc
"""

import uuid
from datetime import datetime, timezone
from typing import Optional

from supabase import Client

from app.core.supabase.client import supabase_admin


class EvaluationService:
    """Handles all DB operations for evaluations and their per-model results."""

    def __init__(self, read_client: Optional[Client] = None):
        self._read = read_client or supabase_admin
        self._write = supabase_admin

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
        """Insert a new evaluation row with status='pending'. Returns the inserted row."""
        row = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "workspace_id": workspace_id,
            "prompt_id": prompt_id,
            "prompt": prompt,
            "system_prompt": system_prompt,
            "settings": settings or {},
            "model_ids": model_ids,
            "status": "pending",
        }
        response = self._write.table("evaluations").insert(row).execute()
        return response.data[0]

    def mark_running(self, evaluation_id: str) -> None:
        self._write.table("evaluations").update({"status": "running"}).eq(
            "id", evaluation_id
        ).execute()

    def mark_completed(self, evaluation_id: str) -> None:
        self._write.table("evaluations").update({
            "status": "completed",
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", evaluation_id).execute()

    def mark_failed(self, evaluation_id: str) -> None:
        self._write.table("evaluations").update({"status": "failed"}).eq(
            "id", evaluation_id
        ).execute()

    def store_all_results(self, results: list[dict]) -> list[dict]:
        """Bulk-insert all model results in a single API call."""
        rows = [
            {
                "id": str(uuid.uuid4()),
                **r,
                "latency_ms": float(r.get("latency_ms", 0)),
                "total_cost": float(r.get("total_cost", 0)),
            }
            for r in results
        ]
        response = self._write.table("evaluation_results").insert(rows).execute()
        return response.data

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


# Singleton
evaluation_svc = EvaluationService()
