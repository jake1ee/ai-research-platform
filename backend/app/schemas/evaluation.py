"""
Pydantic v2 schemas for evaluation endpoints.

Import pattern:
    from app.schemas.evaluation import EvaluationCreate, EvaluationResponse, ...
"""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator

from app.schemas.common import EvaluationStatus


class EvaluationCreate(BaseModel):
    """Body for POST /workspaces/{id}/evaluations."""
    prompt: str = Field(..., min_length=1)
    system_prompt: str | None = None
    model_ids: list[str] = Field(..., min_length=1)
    deterministic_seed: int | None = None
    judge_model: str | None = None
    require_json_output: bool = False
    json_schema: dict[str, Any] | None = None

    @field_validator("model_ids")
    @classmethod
    def at_least_one_model(cls, v):
        if len(v) < 1:
            raise ValueError("Provide at least one model_id")
        return v


class EvaluationResultResponse(BaseModel):
    id: str
    model_id: str
    output: str | None = None
    input_tokens: int
    output_tokens: int
    latency_ms: float
    cost_usd: float
    judge_score: float | None = None
    judge_reasoning: str | None = None
    is_valid_json: bool | None = None
    json_validation_error: str | None = None
    error: str | None = None
    created_at: datetime
    badges: list[str] = []


class EvaluationResponse(BaseModel):
    id: str
    workspace_id: str
    user_id: str
    prompt: str
    system_prompt: str | None = None
    model_ids: list[str]
    status: EvaluationStatus
    deterministic_seed: int | None = None
    judge_model: str | None = None
    require_json_output: bool
    created_at: datetime
    completed_at: datetime | None = None
    results: list[EvaluationResultResponse] = []

    @field_validator("model_ids", mode="before")
    @classmethod
    def split_model_ids(cls, v):
        """DB stores model_ids as comma-separated string; convert to list."""
        if isinstance(v, str):
            return [m.strip() for m in v.split(",")]
        return v


# ── Synchronous evaluate endpoint schemas ─────────────────────────────────────

class EvaluateRequest(BaseModel):
    """Body for POST /evaluate (synchronous, returns results immediately)."""
    prompt: str = Field(..., min_length=1, max_length=20_000, description="User prompt sent to all models")
    system_prompt: str | None = Field(None, description="Optional system instruction")
    model_ids: list[str] = Field(..., min_length=1, max_length=6)
    workspace_id: str | None = Field(None, description="Omit for personal evaluation")
    prompt_id: str | None = Field(None, description="ID of a saved prompt template")

    temperature: float = Field(1.0, ge=0.0, le=2.0)
    max_tokens: int | None = Field(None, gt=0)
    deterministic_seed: int | None = None
    require_json_output: bool = False
    json_schema: dict[str, Any] | None = Field(None)
    judge_model: str | None = Field(None)

    @field_validator("model_ids")
    @classmethod
    def at_least_one_model(cls, v: list[str]) -> list[str]:
        if len(v) < 1:
            raise ValueError("Provide at least one model_id")
        return v


class ModelResultOut(BaseModel):
    """Per-model result returned by the synchronous /evaluate endpoint."""
    model_id: str
    output_text: str | None
    input_tokens: int
    output_tokens: int
    latency_ms: float
    total_cost: float
    quality_score: float | None
    judge_reasoning: str | None
    is_valid_json: bool | None
    json_validation_error: str | None
    error: str | None
    badges: list[str] = []


class EvaluateResponse(BaseModel):
    """Full response for the synchronous /evaluate endpoint."""
    evaluation_id: str
    status: str
    prompt: str
    model_ids: list[str]
    results: list[ModelResultOut]
    total_cost_usd: float
    total_input_tokens: int
    total_output_tokens: int
