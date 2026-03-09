"""
Pydantic v2 schemas for evaluation endpoints.

Import pattern:
    from app.schemas.evaluation import EvaluationCreate, EvaluationResponse, ...
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator

from app.schemas.common import EvaluationStatus


class EvaluationCreate(BaseModel):
    """Body for POST /workspaces/{id}/evaluations."""
    prompt: str = Field(..., min_length=1)
    system_prompt: Optional[str] = None
    model_ids: List[str] = Field(..., min_length=1)
    deterministic_seed: Optional[int] = None
    judge_model: Optional[str] = None
    require_json_output: bool = False
    json_schema: Optional[Dict[str, Any]] = None

    @field_validator("model_ids")
    @classmethod
    def at_least_one_model(cls, v):
        if len(v) < 1:
            raise ValueError("Provide at least one model_id")
        return v


class EvaluationResultResponse(BaseModel):
    id: str
    model_id: str
    output: Optional[str] = None
    input_tokens: int
    output_tokens: int
    latency_ms: float
    cost_usd: float
    judge_score: Optional[float] = None
    judge_reasoning: Optional[str] = None
    is_valid_json: Optional[bool] = None
    json_validation_error: Optional[str] = None
    error: Optional[str] = None
    created_at: datetime
    badges: List[str] = []


class EvaluationResponse(BaseModel):
    id: str
    workspace_id: str
    user_id: str
    prompt: str
    system_prompt: Optional[str] = None
    model_ids: List[str]
    status: EvaluationStatus
    deterministic_seed: Optional[int] = None
    judge_model: Optional[str] = None
    require_json_output: bool
    created_at: datetime
    completed_at: Optional[datetime] = None
    results: List[EvaluationResultResponse] = []

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
    prompt: str = Field(..., min_length=1, description="User prompt sent to all models")
    system_prompt: Optional[str] = Field(None, description="Optional system instruction")
    model_ids: List[str] = Field(..., min_length=1)
    workspace_id: Optional[str] = Field(None, description="Omit for personal evaluation")
    prompt_id: Optional[str] = Field(None, description="ID of a saved prompt template")

    temperature: float = Field(1.0, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(None, gt=0)
    deterministic_seed: Optional[int] = None
    require_json_output: bool = False
    json_schema: Optional[Dict[str, Any]] = Field(None)
    judge_model: Optional[str] = Field(None)

    @field_validator("model_ids")
    @classmethod
    def at_least_one_model(cls, v: list[str]) -> list[str]:
        if len(v) < 1:
            raise ValueError("Provide at least one model_id")
        return v


class ModelResultOut(BaseModel):
    """Per-model result returned by the synchronous /evaluate endpoint."""
    model_id: str
    output_text: Optional[str]
    input_tokens: int
    output_tokens: int
    latency_ms: float
    total_cost: float
    quality_score: Optional[float]
    judge_reasoning: Optional[str]
    is_valid_json: Optional[bool]
    json_validation_error: Optional[str]
    error: Optional[str]
    badges: List[str] = []


class EvaluateResponse(BaseModel):
    """Full response for the synchronous /evaluate endpoint."""
    evaluation_id: str
    status: str
    prompt: str
    model_ids: List[str]
    results: List[ModelResultOut]
    total_cost_usd: float
    total_input_tokens: int
    total_output_tokens: int
