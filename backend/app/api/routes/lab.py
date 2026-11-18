"""Evaluation Lab support routes."""

from typing import Any

from fastapi import APIRouter, Response

from app.services.model_catalog import cost_tier, list_active_models

router = APIRouter(prefix="/lab", tags=["lab"])


@router.get("/models")
def lab_models(response: Response) -> list[dict[str, Any]]:
    """Active models selectable in the Lab (public catalog, no secrets)."""
    response.headers["Cache-Control"] = "public, max-age=60"
    return [
        {
            "id": m["litellm_id"],
            "name": m["name"],
            "provider": m["provider"],
            "contextWindow": m["context_window"],
            "costTier": cost_tier(float(m["cost_per_1k_output"])),
            "costPer1kInput": float(m["cost_per_1k_input"]),
            "costPer1kOutput": float(m["cost_per_1k_output"]),
            "isActive": True,
        }
        for m in list_active_models()
    ]
