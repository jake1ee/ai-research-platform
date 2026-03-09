"""
Pydantic v2 schemas for billing endpoints.

Import pattern:
    from app.schemas.billing import BillingRecordResponse
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.schemas.common import BillingStatus


class BillingRecordResponse(BaseModel):
    id: str
    workspace_id: str
    stripe_invoice_id: Optional[str] = None
    amount_usd: float
    period_start: datetime
    period_end: datetime
    status: BillingStatus
    created_at: datetime
