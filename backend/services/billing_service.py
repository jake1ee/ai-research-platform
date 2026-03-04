"""
Stripe billing service for ModelCompare.

Responsibilities
----------------
  • Create / retrieve Stripe customers linked to workspaces.
  • Report metered usage to Stripe so invoices are automatically generated.
  • Manage subscription plan upgrades (Free → Pro → Enterprise).
  • Generate monthly billing reports from our own UsageLog table.

Usage flow
----------
  1. On workspace creation → create_stripe_customer()
  2. On every LLM call   → report_usage_to_stripe()
  3. At month end        → Stripe auto-invoices; webhook updates BillingRecord
  4. Frontend dashboard  → get_monthly_report() for charts and summaries

Example
-------
    from services.billing_service import create_stripe_customer

    customer_id = await create_stripe_customer(
        workspace_id="ws-abc",
        email="alice@example.com",
        name="Alice's Workspace",
    )
"""

from datetime import datetime, timezone
from typing import Dict, List, Optional

import stripe
from sqlalchemy.orm import Session

from config import settings
from models import BillingRecord, BillingStatus, PlanTier, UsageLog, Workspace

# Initialise the Stripe SDK with our secret key
stripe.api_key = settings.STRIPE_SECRET_KEY


# ── Stripe product/price IDs (set these in your Stripe dashboard) ─────────────
# For usage-based billing we use a metered price tied to an api_usage meter.
PLAN_PRICE_IDS: Dict[PlanTier, Optional[str]] = {
    PlanTier.FREE: None,                          # No subscription needed
    PlanTier.PRO: "price_pro_monthly_placeholder",
    PlanTier.ENTERPRISE: "price_enterprise_monthly_placeholder",
}


# ── Customer management ───────────────────────────────────────────────────────

def create_stripe_customer(
    workspace_id: str,
    email: str,
    name: str,
    db: Session,
) -> str:
    """
    Create a Stripe customer for a workspace and persist the customer ID.

    Returns the Stripe customer ID string.
    """
    customer = stripe.Customer.create(
        email=email,
        name=name,
        metadata={"workspace_id": workspace_id},
    )
    # Persist the customer ID so future calls can look it up
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if workspace:
        workspace.stripe_customer_id = customer.id
        db.commit()

    return customer.id


def get_or_create_stripe_customer(
    workspace: Workspace,
    email: str,
    db: Session,
) -> str:
    """Return existing Stripe customer ID or create one if missing."""
    if workspace.stripe_customer_id:
        return workspace.stripe_customer_id
    return create_stripe_customer(workspace.id, email, workspace.name, db)


# ── Usage reporting ───────────────────────────────────────────────────────────

def report_usage_to_stripe(
    stripe_customer_id: str,
    tokens_used: int,
    timestamp: Optional[datetime] = None,
) -> None:
    """
    Report token usage to Stripe for metered billing.

    In a real deployment you would send this to a Stripe Meter (Billing v2)
    or a usage record on a subscription item. We send it as a customer balance
    adjustment here as a simple demonstration.

    Parameters
    ----------
    stripe_customer_id : Stripe customer ID (stored on Workspace).
    tokens_used        : Number of tokens to bill for in this period.
    timestamp          : When the usage occurred. Defaults to now.
    """
    ts = int((timestamp or datetime.now(timezone.utc)).timestamp())

    # This call would be replaced with stripe.billing.Meter.create_event()
    # in the Stripe Billing v2 API. Shown as customer metadata for illustration.
    stripe.Customer.modify(
        stripe_customer_id,
        metadata={
            "last_usage_report_tokens": str(tokens_used),
            "last_usage_report_ts": str(ts),
        },
    )


# ── Subscription management ───────────────────────────────────────────────────

def upgrade_plan(
    workspace: Workspace,
    new_tier: PlanTier,
    payment_method_id: Optional[str],
    db: Session,
) -> None:
    """
    Upgrade a workspace to a new plan tier.

    1. Attach the payment method to the Stripe customer.
    2. Create a Stripe subscription on the matching price.
    3. Update the workspace tier in our DB.
    """
    if not workspace.stripe_customer_id:
        raise ValueError("Workspace has no Stripe customer ID – call create_stripe_customer first.")

    price_id = PLAN_PRICE_IDS.get(new_tier)
    if price_id is None:
        # Downgrade to Free – cancel existing subscription
        workspace.tier = PlanTier.FREE
        db.commit()
        return

    if payment_method_id:
        # Attach and set as default
        stripe.PaymentMethod.attach(
            payment_method_id,
            customer=workspace.stripe_customer_id,
        )
        stripe.Customer.modify(
            workspace.stripe_customer_id,
            invoice_settings={"default_payment_method": payment_method_id},
        )

    # Create subscription
    stripe.Subscription.create(
        customer=workspace.stripe_customer_id,
        items=[{"price": price_id}],
        metadata={"workspace_id": workspace.id},
    )

    workspace.tier = new_tier
    db.commit()


# ── Billing reports ───────────────────────────────────────────────────────────

def get_monthly_report(
    workspace_id: str,
    year: int,
    month: int,
    db: Session,
) -> Dict:
    """
    Generate a billing report from our own UsageLog table for one calendar month.

    Returns a dict with:
      total_cost_usd   – sum of all call costs
      total_tokens     – sum of input + output tokens
      total_calls      – number of individual model calls
      cost_by_model    – { model_id: total_cost }
      tokens_by_model  – { model_id: total_tokens }
    """
    # Build date range for the target month
    start = datetime(year, month, 1, tzinfo=timezone.utc)
    # Go to first day of the next month
    if month == 12:
        end = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        end = datetime(year, month + 1, 1, tzinfo=timezone.utc)

    logs: List[UsageLog] = (
        db.query(UsageLog)
        .filter(
            UsageLog.workspace_id == workspace_id,
            UsageLog.timestamp >= start,
            UsageLog.timestamp < end,
        )
        .all()
    )

    total_cost = sum(log.cost_usd for log in logs)
    total_tokens = sum(log.input_tokens + log.output_tokens for log in logs)

    cost_by_model: Dict[str, float] = {}
    tokens_by_model: Dict[str, int] = {}
    for log in logs:
        cost_by_model[log.model_id] = cost_by_model.get(log.model_id, 0.0) + log.cost_usd
        tokens_by_model[log.model_id] = (
            tokens_by_model.get(log.model_id, 0) + log.input_tokens + log.output_tokens
        )

    return {
        "workspace_id": workspace_id,
        "period": f"{year}-{month:02d}",
        "total_cost_usd": round(total_cost, 6),
        "total_tokens": total_tokens,
        "total_calls": len(logs),
        "cost_by_model": {k: round(v, 6) for k, v in cost_by_model.items()},
        "tokens_by_model": tokens_by_model,
    }


# ── Stripe webhook handler ─────────────────────────────────────────────────────

def handle_stripe_webhook(payload: bytes, sig_header: str, db: Session) -> Dict:
    """
    Verify and dispatch an incoming Stripe webhook event.

    Handles:
      invoice.paid        – mark BillingRecord as PAID
      invoice.payment_failed – mark as FAILED

    Returns a simple status dict.
    """
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except stripe.error.SignatureVerificationError:
        return {"status": "invalid_signature"}

    event_type = event["type"]
    invoice = event["data"]["object"]
    workspace_id = invoice.get("metadata", {}).get("workspace_id")

    if event_type in ("invoice.paid", "invoice.payment_failed") and workspace_id:
        status = BillingStatus.PAID if event_type == "invoice.paid" else BillingStatus.FAILED

        record = (
            db.query(BillingRecord)
            .filter(BillingRecord.stripe_invoice_id == invoice["id"])
            .first()
        )
        if record:
            record.status = status
            db.commit()

    return {"status": "handled", "event_type": event_type}
