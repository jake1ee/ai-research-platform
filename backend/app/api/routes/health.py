"""Liveness and readiness probes."""

import redis.asyncio as aioredis
from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.supabase.client import get_supabase

router = APIRouter(tags=["health"])


@router.get("/health/live")
def live() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/health/ready")
async def ready() -> JSONResponse:
    checks: dict[str, bool] = {}
    try:
        await aioredis.from_url(settings.REDIS_URL, socket_timeout=1).ping()
        checks["redis"] = True
    except Exception:  # noqa: BLE001
        checks["redis"] = False
    try:
        get_supabase().table("models").select("id").limit(1).execute()
        checks["database"] = True
    except Exception:  # noqa: BLE001
        checks["database"] = False
    ok = all(checks.values())
    return JSONResponse(
        {"status": "ready" if ok else "degraded", "checks": checks},
        status_code=200 if ok else 503,
    )
