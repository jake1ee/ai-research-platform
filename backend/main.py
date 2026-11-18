"""
Inferra API – FastAPI entry point.

    uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.api.routes import analytics, auth, billing, evaluations, health, users, workspaces
from app.core.config import settings
from app.core.observability import (
    RequestContextMiddleware,
    configure_logging,
    register_exception_handlers,
)

configure_logging()

if settings.SENTRY_DSN:
    import sentry_sdk

    sentry_sdk.init(dsn=settings.SENTRY_DSN, environment=settings.ENVIRONMENT)

app = FastAPI(
    title="Inferra API",
    description="LLM benchmark leaderboard, comparison data and evaluation lab.",
    version="3.0.0",
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None if settings.is_production else "/redoc",
)

app.add_middleware(GZipMiddleware, minimum_size=1024)
app.add_middleware(RequestContextMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
    expose_headers=["X-Request-ID", "ETag"],
)
register_exception_handlers(app)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(workspaces.router)
app.include_router(evaluations.router)
app.include_router(evaluations.evaluate_router)
app.include_router(billing.router)
app.include_router(analytics.router)


@app.get("/health", include_in_schema=False)
def legacy_health() -> dict[str, str]:
    return {"status": "ok", "version": app.version}
