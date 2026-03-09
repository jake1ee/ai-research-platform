"""
Simple in-process rate limiter using a sliding window.

For production, replace with a Redis-backed solution (e.g. slowapi).

Import pattern:
    from app.utils.rate_limiter import rate_limit
"""

import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request, status

_buckets: dict[str, deque] = defaultdict(deque)


async def rate_limit(request: Request, limit: int = 10, window: int = 60) -> None:
    """
    Raise HTTP 429 if the caller has exceeded `limit` requests in `window` seconds.
    Uses the X-Forwarded-For header when behind a proxy, falls back to client.host.
    """
    forwarded = request.headers.get("X-Forwarded-For")
    ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host or "unknown")

    now = time.monotonic()
    bucket = _buckets[ip]

    while bucket and bucket[0] < now - window:
        bucket.popleft()

    if len(bucket) >= limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many requests. Max {limit} per {window}s.",
            headers={"Retry-After": str(window)},
        )

    bucket.append(now)
