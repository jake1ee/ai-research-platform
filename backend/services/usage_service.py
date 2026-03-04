"""
Usage tracking and plan-limit enforcement for ModelCompare.

Architecture
------------
  • usage_tracking table has one row per (user_id, year, month).
  • The database function increment_usage() does an atomic UPSERT so concurrent
    evaluation completions never produce duplicate rows or race conditions.
  • Plan limits are enforced BEFORE the evaluation is queued; the check reads
    the current monthly eval_count and compares against the plan's ceiling.

Plan limits (configurable via config.py / .env)
-------------------------------------------------
  Free       : 100 evals/month,  500 000 tokens/month
  Pro        : 10 000 evals,     50 000 000 tokens
  Enterprise : unlimited (-1)

Example
-------
    from services.usage_service import UsageService

    svc = UsageService()

    # Check before queuing
    svc.enforce_plan_limit(user_id="uuid", plan_tier="free")

    # Record after evaluation completes
    svc.increment(
        user_id="uuid",
        workspace_id=None,
        input_tokens=1500,
        output_tokens=300,
        total_cost=0.0045,
    )
"""

from datetime import datetime, timezone
from typing import Optional

from config import settings
from supabase.client import supabase_admin


# ─────────────────────────────────────────────────────────────────────────────
# Plan limit constants
# ─────────────────────────────────────────────────────────────────────────────

class PlanLimits:
    """
    Monthly limits per plan tier.
    -1 means unlimited.
    """
    LIMITS: dict[str, dict[str, int]] = {
        "free": {
            "evals_per_month":  settings.FREE_EVAL_LIMIT,          # default 100
            "tokens_per_month": 500_000,
        },
        "pro": {
            "evals_per_month":  settings.PRO_EVAL_LIMIT,           # default 10 000
            "tokens_per_month": 50_000_000,
        },
        "enterprise": {
            "evals_per_month":  settings.ENTERPRISE_EVAL_LIMIT,    # default -1
            "tokens_per_month": -1,
        },
    }

    @classmethod
    def get(cls, plan_tier: str) -> dict[str, int]:
        """Return limits for a plan, defaulting to free if unrecognised."""
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


# ─────────────────────────────────────────────────────────────────────────────
# Usage service
# ─────────────────────────────────────────────────────────────────────────────

class UsageService:
    """
    All usage-tracking operations in one place.

    Uses supabase_admin (service role) for all queries so RLS doesn't block
    the backend's internal reads / writes.
    """

    # ── Read current usage ────────────────────────────────────────────────────

    def get_current_month_usage(
        self,
        user_id: str,
        year: Optional[int] = None,
        month: Optional[int] = None,
    ) -> dict:
        """
        Return the usage_tracking row for the user in the given month.

        Defaults to the current calendar month.
        Returns a zeroed dict if no row exists yet (first evaluation of the month).
        """
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

        # No row yet → return zeroed defaults
        return {
            "user_id": user_id,
            "year": year,
            "month": month,
            "eval_count": 0,
            "input_tokens": 0,
            "output_tokens": 0,
            "total_cost": 0.0,
        }

    def get_usage_history(
        self,
        user_id: str,
        months: int = 12,
    ) -> list[dict]:
        """
        Return the last N months of usage records for a user.
        Useful for the billing / analytics dashboard.
        """
        resp = (
            supabase_admin
            .table("usage_tracking")
            .select("*")
            .eq("user_id", user_id)
            .order("year", desc=True)
            .order("month", desc=True)
            .limit(months)
            .execute()
        )
        return resp.data or []

    # ── Enforce limits ────────────────────────────────────────────────────────

    def enforce_plan_limit(
        self,
        user_id: str,
        plan_tier: str,
    ) -> None:
        """
        Check if the user has remaining evaluations for this calendar month.

        Raises PlanLimitError if the limit is exceeded.
        Call this BEFORE creating the evaluation row to give a clean 429 error.
        """
        limits = PlanLimits.get(plan_tier)
        eval_limit = limits["evals_per_month"]

        # Unlimited plan – skip DB query
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

    def enforce_token_limit(
        self,
        user_id: str,
        plan_tier: str,
        additional_tokens: int,
    ) -> None:
        """
        Check if processing *additional_tokens* would exceed the monthly token budget.
        Called before queuing (estimated tokens) or after (actual tokens).

        Raises PlanLimitError if the limit would be exceeded.
        """
        limits = PlanLimits.get(plan_tier)
        token_limit = limits["tokens_per_month"]

        if PlanLimits.is_unlimited(token_limit):
            return

        usage = self.get_current_month_usage(user_id)
        used_tokens = (
            usage.get("input_tokens", 0) + usage.get("output_tokens", 0)
        )

        if used_tokens + additional_tokens > token_limit:
            raise PlanLimitError(
                resource="tokens",
                used=used_tokens,
                limit=token_limit,
                plan=plan_tier,
            )

    # ── Increment usage ───────────────────────────────────────────────────────

    def increment(
        self,
        user_id: str,
        input_tokens: int,
        output_tokens: int,
        total_cost: float,
        workspace_id: Optional[str] = None,
        eval_count: int = 1,
    ) -> None:
        """
        Atomically increment the monthly usage totals for a user.

        Calls the PostgreSQL function increment_usage() which does an
        INSERT ... ON CONFLICT ... DO UPDATE in a single statement, making
        it safe under concurrent load.

        Parameters
        ----------
        user_id       : The evaluated user's UUID.
        input_tokens  : Prompt tokens consumed across ALL models in this evaluation.
        output_tokens : Completion tokens generated across ALL models.
        total_cost    : Total USD cost for this evaluation.
        workspace_id  : Set for team evaluations.
        eval_count    : Number of evaluations to record (always 1 for normal flow).
        """
        now = datetime.now(timezone.utc)

        # Call the SECURITY DEFINER PostgreSQL function – safe from RLS
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
        """
        Convenience wrapper that sums tokens/cost across all model results
        and calls increment() once.

        Parameters
        ----------
        results : List of model result dicts, each with keys:
                  input_tokens, output_tokens, total_cost.
        """
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

    # ── Dashboard summaries ───────────────────────────────────────────────────

    def get_remaining(self, user_id: str, plan_tier: str) -> dict:
        """
        Return a summary of remaining resources for the dashboard.

        Returns
        -------
        {
          "evals_used":    int,
          "evals_limit":   int (-1 = unlimited),
          "evals_remaining": int (-1 = unlimited),
          "tokens_used":   int,
          "tokens_limit":  int (-1 = unlimited),
          "cost_this_month_usd": float,
          "plan": str,
        }
        """
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


# ─────────────────────────────────────────────────────────────────────────────
# Singleton – import and use directly in routes / tasks
# ─────────────────────────────────────────────────────────────────────────────

usage_svc = UsageService()
