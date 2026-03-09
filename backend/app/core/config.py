"""
Application-wide configuration loaded from environment variables.
Uses pydantic-settings so every value can be overridden via .env or shell env.

Import pattern (use this everywhere):
    from app.core.config import settings
"""

from pathlib import Path
from pydantic_settings import BaseSettings

# Resolve .env relative to the backend/ root (two levels up from this file)
ENV_FILE = Path(__file__).parent.parent.parent / ".env"


class Settings(BaseSettings):
    # ── Supabase ──────────────────────────────────────────────────────────────
    # Found in Supabase Dashboard → Project Settings → API
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""   # SECRET – backend only, never expose

    # ── LLM provider API keys ─────────────────────────────────────────────────
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    COHERE_API_KEY: str = ""
    LLM_TIMEOUT_SECONDS: int = 60
    DEFAULT_JUDGE_MODEL: str = "gpt-4o"

    # ── Stripe ────────────────────────────────────────────────────────────────
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""

    # ── Redis / Celery ────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/1"
    CACHE_TTL_SECONDS: int = 3600

    # ── Rate limits per plan (evaluations per calendar month) ─────────────────
    FREE_EVAL_LIMIT: int = 100
    PRO_EVAL_LIMIT: int = 10_000
    ENTERPRISE_EVAL_LIMIT: int = -1   # -1 = unlimited

    class Config:
        env_file = str(ENV_FILE)
        env_file_encoding = "utf-8"


# Singleton – import this everywhere
settings = Settings()
