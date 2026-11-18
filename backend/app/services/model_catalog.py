"""Catalog of models users may run in the Evaluation Lab (the `models` table, is_active only)."""

import time
from typing import Any

from app.core.supabase.client import get_supabase

_TTL = 60.0
_cache: dict[str, Any] = {"at": 0.0, "rows": []}


def list_active_models() -> list[dict[str, Any]]:
    if time.monotonic() - _cache["at"] > _TTL:
        rows = (
            get_supabase()
            .table("models")
            .select(
                "litellm_id, name, provider, context_window, cost_per_1k_input, cost_per_1k_output"
            )
            .eq("is_active", True)
            .order("provider")
            .execute()
        ).data or []
        _cache.update(at=time.monotonic(), rows=rows)
    return _cache["rows"]


def unknown_models(model_ids: list[str]) -> list[str]:
    """Model ids not in the active catalog. Prevents spending server API keys on arbitrary models."""
    allowed = {m["litellm_id"] for m in list_active_models()}
    return [m for m in model_ids if m not in allowed]


def cost_tier(out_per_1k: float) -> str:
    return "low" if out_per_1k < 0.002 else "mid" if out_per_1k < 0.02 else "high"
