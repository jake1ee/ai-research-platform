"""
Usage tracking and plan-limit enforcement for ModelCompare.

Import pattern:
    from app.services.usage_service import usage_svc, PlanLimitError
"""

from datetime import datetime, timezone
from typing import Optional

from app.core.config import settings
from app.core.supabase.client import supabase_admin


class PlanLimits:
    """Monthly limits per plan tier. -1 means unlimited."""
    LIMITS: dict[str, dict[str, int]] = {
        "free": {
            "evals_per_month":  settings.FREE_EVAL_LIMIT,
            "tokens_per_month": 500_000,
        },
        "pro": {
            "evals_per_month":  settings.PRO_EVAL_LIMIT,
            "tokens_per_month": 50_000_000,
        },
        "enterprise": {
            "evals_per_month":  settings.ENTERPRISE_EVAL_LIMIT,
            "tokens_per_month": -1,
        },
    }

    @classmethod
    def get(cls, plan_tier: str) -> dict[str, int]:
        return cls.LIMITS.get(plan_tier.lower(), cls.LIMITS["free"])

    @classmethod
    def is_unlimited(cls, limit: int) -> bool:
        return limit == -1


class PlanLimitError(Exception):
    """Raised when a user has exceeded their plan's monthly limit."""

    def __init__(self, resource: str, used: int, limit: int, plan: str):
        self.resource = resource
        self.used = used
        self.limit = limit
        self.plan = plan
        super().__init__(
            f"{plan.capitalize()} plan limit reached: "
            f"{used}/{limit} {resource} this month. Upgrade to continue."
        )


class UsageService:
    """All usage-tracking operations in one place."""

    def get_current_month_usage(
        self,
        user_id: str,
        year: Optional[int] = None,
        month: Optional[int] = None,
    ) -> dict:
        now = datetime.now(timezone.utc)
        year  = year  or now.year
        month = month or now.month

        resp = (
            supabase_admin
            .table("usage_tracking")
            .select("*")
            .eq("user_id", user_id)
            .eq("year", year)
            .eq("month", month)
            .maybe_single()
            .execute()
        )

        if resp.data:
            return resp.data

        return {
            "user_id": user_id,
            "year": year,
            "month": month,
            "eval_count": 0,
            "input_tokens": 0,
            "output_tokens": 0,
            "total_cost": 0.0,
        }

    def enforce_plan_limit(self, user_id: str, plan_tier: str) -> None:
        """Raise PlanLimitError if the user has exceeded their monthly evaluation limit."""
        limits = PlanLimits.get(plan_tier)
        eval_limit = limits["evals_per_month"]

        if PlanLimits.is_unlimited(eval_limit):
            return

        usage = self.get_current_month_usage(user_id)
        used = usage.get("eval_count", 0)

        if used >= eval_limit:
            raise PlanLimitError(
                resource="evaluations",
                used=used,
                limit=eval_limit,
                plan=plan_tier,
            )

    def increment(
        self,
        user_id: str,
        input_tokens: int,
        output_tokens: int,
        total_cost: float,
        workspace_id: Optional[str] = None,
        eval_count: int = 1,
    ) -> None:
        """Atomically increment the monthly usage totals via PostgreSQL function."""
        now = datetime.now(timezone.utc)
        supabase_admin.rpc(
            "increment_usage",
            {
                "p_user_id":       user_id,
                "p_workspace_id":  workspace_id,
                "p_year":          now.year,
                "p_month":         now.month,
                "p_eval_count":    eval_count,
                "p_input_tokens":  input_tokens,
                "p_output_tokens": output_tokens,
                "p_total_cost":    total_cost,
            },
        ).execute()

    def increment_from_results(
        self,
        user_id: str,
        results: list[dict],
        workspace_id: Optional[str] = None,
    ) -> None:
        """Sum tokens/cost across all model results and call increment() once."""
        total_input  = sum(r.get("input_tokens", 0)  for r in results)
        total_output = sum(r.get("output_tokens", 0) for r in results)
        total_cost   = sum(r.get("total_cost", 0.0)  for r in results)

        self.increment(
            user_id=user_id,
            input_tokens=total_input,
            output_tokens=total_output,
            total_cost=total_cost,
            workspace_id=workspace_id,
        )

    def get_remaining(self, user_id: str, plan_tier: str) -> dict:
        """Return a summary of remaining resources for the dashboard."""
        limits = PlanLimits.get(plan_tier)
        usage  = self.get_current_month_usage(user_id)

        evals_used   = usage.get("eval_count", 0)
        tokens_used  = usage.get("input_tokens", 0) + usage.get("output_tokens", 0)
        eval_limit   = limits["evals_per_month"]
        token_limit  = limits["tokens_per_month"]

        return {
            "plan":               plan_tier,
            "evals_used":         evals_used,
            "evals_limit":        eval_limit,
            "evals_remaining":    -1 if eval_limit == -1 else max(0, eval_limit - evals_used),
            "tokens_used":        tokens_used,
            "tokens_limit":       token_limit,
            "tokens_remaining":   -1 if token_limit == -1 else max(0, token_limit - tokens_used),
            "cost_this_month_usd": float(usage.get("total_cost", 0)),
        }


# Singleton
usage_svc = UsageService()
