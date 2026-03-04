"""
Application-wide configuration loaded from environment variables.
Uses pydantic-settings so every value can be overridden via .env or shell env.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── Supabase ──────────────────────────────────────────────────────────────
    # Found in Supabase Dashboard → Project Settings → API
    SUPABASE_URL: str = ""                   # e.g. https://xyzxyz.supabase.co
    SUPABASE_ANON_KEY: str = ""              # safe to expose to frontend
    SUPABASE_SERVICE_ROLE_KEY: str = ""      # SECRET – backend only, never expose

    # ── Database (SQLAlchemy / direct Postgres – alternative to supabase-py) ──
    # The Supabase "direct connection" string (Session mode pooler recommended).
    # Only needed if you use SQLAlchemy alongside supabase-py.
    DATABASE_URL: str = "sqlite:///./modelcompare.db"

    # ── JWT (legacy self-signed JWT – not needed when using Supabase Auth) ────
    # Keep these for any non-Supabase token flows or local dev mocks.
    SECRET_KEY: str = "change-this-in-production-please"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # ── LLM provider API keys ─────────────────────────────────────────────────
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    COHERE_API_KEY: str = ""

    # ── Stripe ────────────────────────────────────────────────────────────────
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""

    # ── Redis / Celery ────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/1"

    # Cache TTL for repeated prompt outputs (seconds)
    CACHE_TTL_SECONDS: int = 3600

    # ── Rate limits per plan (evaluations per calendar month) ─────────────────
    FREE_EVAL_LIMIT: int = 100
    PRO_EVAL_LIMIT: int = 10_000
    ENTERPRISE_EVAL_LIMIT: int = -1  # -1 = unlimited

    # LLM call timeout (seconds)
    LLM_TIMEOUT_SECONDS: int = 60

    # Judge model used for LLM-as-a-Judge scoring
    DEFAULT_JUDGE_MODEL: str = "gpt-4o"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# Singleton – import this everywhere
settings = Settings()
