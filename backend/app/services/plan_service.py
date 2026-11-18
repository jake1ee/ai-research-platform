"""Plan tier lookup. The tier is read from the database, never from user-writable JWT metadata."""

from app.core.supabase.client import get_supabase

_VALID_TIERS = {"free", "pro", "enterprise"}


def get_user_plan_tier(user_id: str) -> str:
    rows = (
        get_supabase().table("users").select("plan_tier").eq("id", user_id).limit(1).execute()
    ).data
    tier = rows[0]["plan_tier"] if rows else "free"
    return tier if tier in _VALID_TIERS else "free"
