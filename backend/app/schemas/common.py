"""
Shared enumerations used across multiple domain schemas.

Import pattern:
    from app.schemas.common import PlanTier, Role, EvaluationStatus, BillingStatus
"""

from enum import Enum


class PlanTier(str, Enum):
    FREE = "free"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class Role(str, Enum):
    ADMIN = "admin"
    ENGINEER = "engineer"
    VIEWER = "viewer"


class EvaluationStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class BillingStatus(str, Enum):
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"
