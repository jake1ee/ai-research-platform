"""
Rate limiter: Redis fixed-window counter shared across API replicas, with an
in-process fallback when Redis is unreachable (fail-open, never blocks traffic
because of infrastructure issues).

    from app.utils.rate_limiter import rate_limit, rate_limit_dependency
"""

import time
from collections import defaultdict, deque

import redis.asyncio as aioredis
from fastapi import HTTPException, Request, status

from app.core.config import settings

_redis: aioredis.Redis | None = None
_local: dict[str, deque[float]] = defaultdict(deque)
_redis_down_until = 0.0  # circuit breaker: skip Redis briefly after a failure
_BREAKER_SECONDS = 30.0


def _client() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(settings.REDIS_URL, socket_timeout=0.5)
    return _redis


def client_ip(request: Request) -> str:
    """Forwarded headers are only trusted when TRUST_PROXY is enabled."""
    if settings.TRUST_PROXY:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


async def _hit_redis(key: str, window: int) -> int:
    r = _client()
    count = int(await r.incr(key))
    if count == 1:
        await r.expire(key, window)
    return count


def _hit_local(key: str, window: int) -> int:
    now = time.monotonic()
    bucket = _local[key]
    while bucket and bucket[0] < now - window:
        bucket.popleft()
    bucket.append(now)
    return len(bucket)


async def rate_limit(
    request: Request, limit: int = 10, window: int = 60, scope: str = "default"
) -> None:
    """Raise HTTP 429 once `limit` requests per `window` seconds is exceeded."""
    bucket_id = int(time.time() // window)
    key = f"rl:{scope}:{client_ip(request)}:{bucket_id}"
    global _redis_down_until
    if time.monotonic() < _redis_down_until:
        count = _hit_local(key, window)
    else:
        try:
            count = await _hit_redis(key, window)
        except Exception:  # noqa: BLE001 - Redis down: degrade to local counting
            _redis_down_until = time.monotonic() + _BREAKER_SECONDS
            count = _hit_local(key, window)

    if count > limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests",
            headers={"Retry-After": str(window)},
        )


def rate_limit_dependency(limit: int, window: int = 60, scope: str = "default"):
    async def _dep(request: Request) -> None:
        await rate_limit(request, limit=limit, window=window, scope=scope)

    return _dep
