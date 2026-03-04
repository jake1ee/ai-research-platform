"""
SQLAlchemy ORM models for ModelCompare.

Tables
------
  users               – authenticated accounts
  workspaces          – team / personal project containers
  workspace_members   – many-to-many users ↔ workspaces with RBAC role
  evaluations         – a single prompt run across ≥1 models
  evaluation_results  – per-model output, metrics, and judge score
  usage_logs          – granular token / cost ledger
  billing_records     – Stripe invoice snapshots
"""

import enum
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from database import Base


# ─────────────────────────────────────────────────────────────────────────────
# Enumerations
# ─────────────────────────────────────────────────────────────────────────────

class PlanTier(str, enum.Enum):
    FREE = "free"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class Role(str, enum.Enum):
    """Workspace-level roles (RBAC)."""
    ADMIN = "admin"        # full control: billing, members, evals
    ENGINEER = "engineer"  # run evals, view results
    VIEWER = "viewer"      # read-only


class EvaluationStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class BillingStatus(str, enum.Enum):
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"


# ─────────────────────────────────────────────────────────────────────────────
# User & Workspace
# ─────────────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    workspaces = relationship("WorkspaceMember", back_populates="user")
    usage_logs = relationship("UsageLog", back_populates="user")
    evaluations = relationship("Evaluation", back_populates="created_by")


class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    # Billing plan – controls rate limits and feature access
    tier = Column(Enum(PlanTier), default=PlanTier.FREE)
    # Stripe customer ID stored so we can create invoices / usage records
    stripe_customer_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    members = relationship("WorkspaceMember", back_populates="workspace")
    usage_logs = relationship("UsageLog", back_populates="workspace")
    evaluations = relationship("Evaluation", back_populates="workspace")
    billing_records = relationship("BillingRecord", back_populates="workspace")


class WorkspaceMember(Base):
    """Junction table – stores role so a user can be ADMIN in one workspace and VIEWER in another."""
    __tablename__ = "workspace_members"

    workspace_id = Column(String, ForeignKey("workspaces.id"), primary_key=True)
    user_id = Column(String, ForeignKey("users.id"), primary_key=True)
    role = Column(Enum(Role), default=Role.VIEWER)
    joined_at = Column(DateTime, default=datetime.utcnow)

    workspace = relationship("Workspace", back_populates="members")
    user = relationship("User", back_populates="workspaces")


# ─────────────────────────────────────────────────────────────────────────────
# Evaluation (multi-model prompt run)
# ─────────────────────────────────────────────────────────────────────────────

class Evaluation(Base):
    """
    One evaluation = one user prompt sent to multiple LLMs simultaneously.
    After all models respond the optional LLM-as-a-Judge scores each result.
    """
    __tablename__ = "evaluations"

    id = Column(String, primary_key=True, index=True)
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)

    # The prompt submitted by the user
    prompt = Column(Text, nullable=False)
    # Optional system-level instruction prepended to every model call
    system_prompt = Column(Text, nullable=True)

    # Models requested (stored as comma-separated IDs, e.g. "gpt-4o,claude-3-5-sonnet")
    model_ids = Column(String, nullable=False)

    status = Column(Enum(EvaluationStatus), default=EvaluationStatus.PENDING)

    # Deterministic mode: if set, temperature=0 and seed=deterministic_seed for every call
    deterministic_seed = Column(Integer, nullable=True)

    # Model used to judge/score the results (e.g. "gpt-4o")
    judge_model = Column(String, nullable=True)

    # Whether the caller requested JSON-structured output validation
    require_json_output = Column(Boolean, default=False)
    json_schema = Column(Text, nullable=True)  # JSON string of expected schema

    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    workspace = relationship("Workspace", back_populates="evaluations")
    created_by = relationship("User", back_populates="evaluations")
    results = relationship("EvaluationResult", back_populates="evaluation")


class EvaluationResult(Base):
    """
    Per-model result within one Evaluation.
    Captures both raw performance metrics and optional judge scoring.
    """
    __tablename__ = "evaluation_results"

    id = Column(String, primary_key=True, index=True)
    evaluation_id = Column(String, ForeignKey("evaluations.id"), nullable=False)

    # LiteLLM model string, e.g. "openai/gpt-4o", "anthropic/claude-3-5-sonnet-20241022"
    model_id = Column(String, nullable=False)

    # Raw text response from the model
    output = Column(Text, nullable=True)

    # Token usage (reported by the provider)
    input_tokens = Column(Integer, default=0)
    output_tokens = Column(Integer, default=0)

    # Wall-clock time from request start to first byte of full response (ms)
    latency_ms = Column(Float, default=0.0)

    # Calculated cost in USD using provider pricing tables
    cost_usd = Column(Float, default=0.0)

    # LLM-as-a-Judge scoring (0.0 – 10.0)
    judge_score = Column(Float, nullable=True)
    judge_reasoning = Column(Text, nullable=True)

    # JSON validation result (only populated when require_json_output=True)
    is_valid_json = Column(Boolean, nullable=True)
    json_validation_error = Column(Text, nullable=True)

    # Error message if this model call failed
    error = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    evaluation = relationship("Evaluation", back_populates="results")


# ─────────────────────────────────────────────────────────────────────────────
# Usage ledger
# ─────────────────────────────────────────────────────────────────────────────

class UsageLog(Base):
    """
    Granular log entry created after every model call.
    Used for rate-limit enforcement and billing calculations.
    """
    __tablename__ = "usage_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    evaluation_id = Column(String, ForeignKey("evaluations.id"), nullable=True)

    model_id = Column(String, nullable=False)
    input_tokens = Column(Integer, default=0)
    output_tokens = Column(Integer, default=0)
    cost_usd = Column(Float, default=0.0)
    latency_ms = Column(Float, default=0.0)

    timestamp = Column(DateTime, default=datetime.utcnow)

    workspace = relationship("Workspace", back_populates="usage_logs")
    user = relationship("User", back_populates="usage_logs")


# ─────────────────────────────────────────────────────────────────────────────
# Billing
# ─────────────────────────────────────────────────────────────────────────────

class BillingRecord(Base):
    """Snapshot of a Stripe invoice – one record per billing period per workspace."""
    __tablename__ = "billing_records"

    id = Column(String, primary_key=True, index=True)
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=False)
    stripe_invoice_id = Column(String, nullable=True)

    amount_usd = Column(Float, nullable=False)
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    status = Column(Enum(BillingStatus), default=BillingStatus.PENDING)

    created_at = Column(DateTime, default=datetime.utcnow)

    workspace = relationship("Workspace", back_populates="billing_records")
