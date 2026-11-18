import time

import jwt
import pytest
from fastapi import HTTPException

from app.core import config
from app.core.supabase.auth_dependency import _verify_locally


def _token(secret: str, **over) -> str:
    claims = {"sub": "u1", "email": "a@b.co", "aud": "authenticated", "exp": time.time() + 60}
    claims.update(over)
    return jwt.encode(claims, secret, algorithm="HS256")


@pytest.fixture(autouse=True)
def _secret(monkeypatch):
    monkeypatch.setattr(config.settings, "SUPABASE_JWT_SECRET", "s" * 32)


def test_valid_token():
    user = _verify_locally(_token("s" * 32))
    assert user.id == "u1" and user.email == "a@b.co"


def test_wrong_secret_rejected():
    with pytest.raises(HTTPException):
        _verify_locally(_token("x" * 32))


def test_expired_rejected():
    with pytest.raises(HTTPException):
        _verify_locally(_token("s" * 32, exp=time.time() - 10))
