"""
Stripe billing service for ModelCompare.

Import pattern:
    from app.services.billing_service import upgrade_plan, get_monthly_report, handle_stripe_webhook
"""

from datetime import datetime, timezone
from typing import Dict, Optional

import stripe

from app.core.config import settings
from app.core.supabase.client import get_supabase
from app.schemas.common import BillingStatus, PlanTier

stripe.api_key = settings.STRIPE_SECRET_KEY

PLAN_PRICE_IDS: Dict[PlanTier, Optional[str]] = {
    PlanTier.FREE: None,
    PlanTier.PRO: "price_pro_monthly_placeholder",
    PlanTier.ENTERPRISE: "price_enterprise_monthly_placeholder",
}


def create_stripe_customer(workspace_id: str, email: str, name: str) -> str:
    """Create a Stripe customer and persist the ID to the workspaces table."""
    customer = stripe.Customer.create(
        email=email,
        name=name,
        metadata={"workspace_id": workspace_id},
    )
    supabase = get_supabase()
    supabase.table("workspaces").update(
        {"stripe_customer_id": customer.id}
    ).eq("id", workspace_id).execute()
    return customer.id


def get_or_create_stripe_customer(workspace: dict, email: str) -> str:
    """Return existing Stripe customer ID or create one if missing."""
    if workspace.get("stripe_customer_id"):
        return workspace["stripe_customer_id"]
    return create_stripe_customer(workspace["id"], email, workspace["name"])


def report_usage_to_stripe(
    stripe_customer_id: str,
    tokens_used: int,
    timestamp: Optional[datetime] = None,
) -> None:
    """Report token usage to Stripe for metered billing."""
    ts = int((timestamp or datetime.now(timezone.utc)).timestamp())
    stripe.Customer.modify(
        stripe_customer_id,
        metadata={
            "last_usage_report_tokens": str(tokens_used),
            "last_usage_report_ts": str(ts),
        },
    )


def upgrade_plan(
    workspace: dict,
    new_tier: PlanTier,
    payment_method_id: Optional[str],
) -> None:
    """Upgrade a workspace to a new plan tier."""
    if not workspace.get("stripe_customer_id"):
        raise ValueError("Workspace has no Stripe customer ID.")

    supabase = get_supabase()
    price_id = PLAN_PRICE_IDS.get(new_tier)

    if price_id is None:
        supabase.table("workspaces").update(
            {"tier": PlanTier.FREE.value}
        ).eq("id", workspace["id"]).execute()
        return

    if payment_method_id:
        stripe.PaymentMethod.attach(
            payment_method_id,
            customer=workspace["stripe_customer_id"],
        )
        stripe.Customer.modify(
            workspace["stripe_customer_id"],
            invoice_settings={"default_payment_method": payment_method_id},
        )

    stripe.Subscription.create(
        customer=workspace["stripe_customer_id"],
        items=[{"price": price_id}],
        metadata={"workspace_id": workspace["id"]},
    )

    supabase.table("workspaces").update(
        {"tier": new_tier.value}
    ).eq("id", workspace["id"]).execute()


def get_monthly_report(workspace_id: str, year: int, month: int) -> Dict:
    """Generate a billing report from usage_logs for one calendar month."""
    start = datetime(year, month, 1, tzinfo=timezone.utc)
    end = datetime(year + 1, 1, 1, tzinfo=timezone.utc) if month == 12 \
        else datetime(year, month + 1, 1, tzinfo=timezone.utc)

    supabase = get_supabase()
    response = (
        supabase.table("usage_logs")
        .select("model_id, input_tokens, output_tokens, cost_usd")
        .eq("workspace_id", workspace_id)
        .gte("timestamp", start.isoformat())
        .lt("timestamp", end.isoformat())
        .execute()
    )
    logs = response.data or []

    total_cost = sum(r["cost_usd"] for r in logs)
    total_tokens = sum(r["input_tokens"] + r["output_tokens"] for r in logs)

    cost_by_model: Dict[str, float] = {}
    tokens_by_model: Dict[str, int] = {}
    for log in logs:
        mid = log["model_id"]
        cost_by_model[mid] = cost_by_model.get(mid, 0.0) + log["cost_usd"]
        tokens_by_model[mid] = tokens_by_model.get(mid, 0) + log["input_tokens"] + log["output_tokens"]

    return {
        "workspace_id": workspace_id,
        "period": f"{year}-{month:02d}",
        "total_cost_usd": round(total_cost, 6),
        "total_tokens": total_tokens,
        "total_calls": len(logs),
        "cost_by_model": {k: round(v, 6) for k, v in cost_by_model.items()},
        "tokens_by_model": tokens_by_model,
    }


def handle_stripe_webhook(payload: bytes, sig_header: str) -> Dict:
    """Verify and dispatch an incoming Stripe webhook event."""
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
        new_status = BillingStatus.PAID.value if event_type == "invoice.paid" \
            else BillingStatus.FAILED.value

        supabase = get_supabase()
        supabase.table("billing_records").update(
            {"status": new_status}
        ).eq("stripe_invoice_id", invoice["id"]).execute()

    return {"status": "handled", "event_type": event_type}
