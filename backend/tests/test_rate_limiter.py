import pytest
from fastapi import HTTPException

from app.utils import rate_limiter


class _Req:
    client = type("C", (), {"host": "1.2.3.4"})()
    headers: dict = {}


async def test_limit_enforced_with_local_fallback(monkeypatch):
    async def boom(*a, **k):
        raise ConnectionError

    monkeypatch.setattr(rate_limiter, "_hit_redis", boom)
    rate_limiter._local.clear()
    for _ in range(3):
        await rate_limiter.rate_limit(_Req(), limit=3, window=60, scope="t")
    with pytest.raises(HTTPException) as e:
        await rate_limiter.rate_limit(_Req(), limit=3, window=60, scope="t")
    assert e.value.status_code == 429
