"""
Pydantic v2 schemas for request validation and response serialisation.

Naming convention
-----------------
  <Entity>Create   – POST body
  <Entity>Update   – PATCH body (all fields optional)
  <Entity>Response – what the API returns (never exposes secrets)
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator

from models import BillingStatus, EvaluationStatus, PlanTier, Role


# ─────────────────────────────────────────────────────────────────────────────
# Auth
# ─────────────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(..., min_length=8)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Decoded payload carried inside a JWT."""
    user_id: Optional[str] = None


# ─────────────────────────────────────────────────────────────────────────────
# Users
# ─────────────────────────────────────────────────────────────────────────────

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ─────────────────────────────────────────────────────────────────────────────
# Workspaces & Members
# ─────────────────────────────────────────────────────────────────────────────

class WorkspaceCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)


class WorkspaceResponse(BaseModel):
    id: str
    name: str
    tier: PlanTier
    stripe_customer_id: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class WorkspaceMemberInvite(BaseModel):
    email: EmailStr
    role: Role = Role.VIEWER


class WorkspaceMemberResponse(BaseModel):
    user_id: str
    workspace_id: str
    role: Role
    joined_at: datetime

    model_config = {"from_attributes": True}


# ─────────────────────────────────────────────────────────────────────────────
# Usage / Dashboard
# ─────────────────────────────────────────────────────────────────────────────

class UsageStats(BaseModel):
    total_evaluations: int
    total_cost_usd: float
    total_tokens: int
    plan_limit: int          # -1 = unlimited
    remaining_evals: int     # -1 = unlimited


class UsageLogResponse(BaseModel):
    id: int
    model_id: str
    input_tokens: int
    output_tokens: int
    cost_usd: float
    latency_ms: float
    timestamp: datetime

    model_config = {"from_attributes": True}


# ─────────────────────────────────────────────────────────────────────────────
# Evaluations
# ─────────────────────────────────────────────────────────────────────────────

class EvaluationCreate(BaseModel):
    """Body for POST /evaluations."""
    prompt: str = Field(..., min_length=1)
    system_prompt: Optional[str] = None

    # List of LiteLLM model strings, e.g. ["openai/gpt-4o", "anthropic/claude-3-5-sonnet-20241022"]
    model_ids: List[str] = Field(..., min_length=1)

    # Deterministic mode: set temperature=0 and fix the random seed
    deterministic_seed: Optional[int] = None

    # LLM-as-a-Judge: which model grades the outputs
    judge_model: Optional[str] = None

    # Structured output validation
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
    output: Optional[str]
    input_tokens: int
    output_tokens: int
    latency_ms: float
    cost_usd: float
    judge_score: Optional[float]
    judge_reasoning: Optional[str]
    is_valid_json: Optional[bool]
    json_validation_error: Optional[str]
    error: Optional[str]
    created_at: datetime

    # Computed badge fields (populated by badge_assigner utility)
    badges: List[str] = []

    model_config = {"from_attributes": True}


class EvaluationResponse(BaseModel):
    id: str
    workspace_id: str
    user_id: str
    prompt: str
    system_prompt: Optional[str]
    model_ids: List[str]
    status: EvaluationStatus
    deterministic_seed: Optional[int]
    judge_model: Optional[str]
    require_json_output: bool
    created_at: datetime
    completed_at: Optional[datetime]
    results: List[EvaluationResultResponse] = []

    model_config = {"from_attributes": True}

    @field_validator("model_ids", mode="before")
    @classmethod
    def split_model_ids(cls, v):
        """DB stores model_ids as comma-separated string; convert to list."""
        if isinstance(v, str):
            return [m.strip() for m in v.split(",")]
        return v


# ─────────────────────────────────────────────────────────────────────────────
# Billing
# ─────────────────────────────────────────────────────────────────────────────

class BillingRecordResponse(BaseModel):
    id: str
    workspace_id: str
    stripe_invoice_id: Optional[str]
    amount_usd: float
    period_start: datetime
    period_end: datetime
    status: BillingStatus
    created_at: datetime

    model_config = {"from_attributes": True}


class UpgradePlanRequest(BaseModel):
    tier: PlanTier
    # Stripe payment method id (collected from frontend Stripe.js)
    payment_method_id: Optional[str] = None


# ─────────────────────────────────────────────────────────────────────────────
# Analytics
# ─────────────────────────────────────────────────────────────────────────────

class ModelMetricPoint(BaseModel):
    """A single data point in a time-series chart."""
    date: str               # ISO date string, e.g. "2025-03-01"
    model_id: str
    value: float


class AnalyticsSummary(BaseModel):
    """High-level analytics for the workspace dashboard."""
    total_evaluations: int
    total_cost_usd: float
    total_tokens: int
    avg_latency_ms: float
    model_call_counts: Dict[str, int]         # { model_id: count }
    model_avg_latency_ms: Dict[str, float]    # { model_id: avg_ms }
    model_avg_cost_usd: Dict[str, float]      # { model_id: avg_cost }
    model_avg_judge_score: Dict[str, float]   # { model_id: avg_score }
    latency_trend: List[ModelMetricPoint]     # daily p50 latency per model
    cost_trend: List[ModelMetricPoint]        # daily cost per model
    token_usage_trend: List[ModelMetricPoint] # daily token count per model
