"""
Billing routes – mounted at root (no prefix).

Endpoints
---------
  GET  /workspaces/{id}/billing/report    – Monthly billing report (ADMIN)
  GET  /workspaces/{id}/billing/history   – All billing records (ADMIN)
  POST /billing/webhook                   – Stripe webhook (no auth)
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request

from app.core.supabase.auth_dependency import get_current_user
from app.core.supabase.client import get_supabase
from app.dependencies.workspace import require_workspace_role
from app.schemas.billing import BillingRecordResponse
from app.services.billing_service import get_monthly_report, handle_stripe_webhook, upgrade_plan

router = APIRouter(tags=["billing"])


@router.get("/workspaces/{workspace_id}/billing/report")
def get_billing_report(
    workspace_id: str,
    year: int,
    month: int,
    user: dict = Depends(get_current_user),
):
    """Generate a monthly billing report (ADMIN only)."""
    require_workspace_role(workspace_id, user["id"], ["admin"])
    if not (1 <= month <= 12):
        raise HTTPException(status_code=400, detail="month must be between 1 and 12")
    return get_monthly_report(workspace_id, year, month)


@router.get(
    "/workspaces/{workspace_id}/billing/history",
    response_model=List[BillingRecordResponse],
)
def list_billing_records(workspace_id: str, user: dict = Depends(get_current_user)):
    """Return all billing records for a workspace (ADMIN only)."""
    require_workspace_role(workspace_id, user["id"], ["admin"])
    supabase = get_supabase()
    rows = (
        supabase.table("billing_records")
        .select("*")
        .eq("workspace_id", workspace_id)
        .order("created_at", desc=True)
        .execute()
    ).data or []
    return [BillingRecordResponse(**r) for r in rows]


@router.post("/billing/webhook")
async def stripe_webhook(request: Request):
    """
    Stripe webhook endpoint – no auth header required.
    Stripe signs the payload; we verify with STRIPE_WEBHOOK_SECRET.
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")
    result = handle_stripe_webhook(payload, sig_header)
    if result.get("status") == "invalid_signature":
        raise HTTPException(status_code=400, detail="Invalid Stripe signature")
    return result
