"""
Pydantic v2 schemas for workspace and membership endpoints.

Import pattern:
    from app.schemas.workspace import WorkspaceCreate, WorkspaceResponse, ...
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from app.schemas.common import PlanTier, Role


class WorkspaceCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)


class WorkspaceResponse(BaseModel):
    id: str
    name: str
    tier: PlanTier
    stripe_customer_id: Optional[str] = None
    created_at: datetime


class WorkspaceMemberInvite(BaseModel):
    email: EmailStr
    role: Role = Role.VIEWER


class WorkspaceMemberResponse(BaseModel):
    user_id: str
    workspace_id: str
    role: Role
    joined_at: datetime


class UsageStats(BaseModel):
    total_evaluations: int
    total_cost_usd: float
    total_tokens: int
    plan_limit: int       # -1 = unlimited
    remaining_evals: int  # -1 = unlimited


class UsageLogResponse(BaseModel):
    id: str
    model_id: str
    input_tokens: int
    output_tokens: int
    cost_usd: float
    latency_ms: float
    timestamp: datetime


class UpgradePlanRequest(BaseModel):
    tier: PlanTier
    payment_method_id: Optional[str] = None
