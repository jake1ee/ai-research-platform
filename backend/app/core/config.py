"""
Application settings loaded from environment variables (pydantic-settings).

    from app.core.config import settings
"""

from pathlib import Path

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

ENV_FILE = Path(__file__).parent.parent.parent / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE), env_file_encoding="utf-8", extra="ignore"
    )

    ENVIRONMENT: str = "development"  # development | staging | production
    LOG_LEVEL: str = "INFO"
    CORS_ORIGINS: str = "http://localhost:3000"  # comma-separated
    SENTRY_DSN: str = ""
    TRUST_PROXY: bool = False  # trust X-Forwarded-For (only behind a known proxy)

    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""  # enables local JWT verification (HS256)

    # LLM providers
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    COHERE_API_KEY: str = ""
    LLM_TIMEOUT_SECONDS: int = 60
    DEFAULT_JUDGE_MODEL: str = "gpt-4o"

    # Stripe
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""

    # Redis / Celery
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/1"
    CACHE_TTL_SECONDS: int = 3600

    # Plan limits (evaluations / month, -1 = unlimited)
    FREE_EVAL_LIMIT: int = 100
    PRO_EVAL_LIMIT: int = 10_000
    ENTERPRISE_EVAL_LIMIT: int = -1

    # Benchmark data: "file" (backend/data/dataset.json) or "supabase"
    BENCHMARK_DATA_SOURCE: str = "file"

    # Public API rate limit (requests per minute per client)
    PUBLIC_RATE_LIMIT_PER_MIN: int = 60

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    @model_validator(mode="after")
    def _require_secrets_in_production(self) -> "Settings":
        if self.is_production:
            missing = [
                k
                for k in ("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_JWT_SECRET")
                if not getattr(self, k)
            ]
            if missing:
                raise ValueError(f"Missing required settings in production: {', '.join(missing)}")
        return self


settings = Settings()
