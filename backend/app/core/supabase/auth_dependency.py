"""
FastAPI dependency for Supabase JWT verification.

When SUPABASE_JWT_SECRET is set the token is verified locally (no network
round-trip per request); otherwise it falls back to Supabase's get_user.
The plan tier is NOT read from user-writable metadata – it lives on the
workspace row.
"""

from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from app.core.config import settings
from app.core.supabase.client import supabase_admin

bearer_scheme = HTTPBearer(auto_error=True)

_UNAUTHORIZED = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Invalid or expired token",
    headers={"WWW-Authenticate": "Bearer"},
)


class AuthUser(BaseModel):
    id: str
    email: str
    name: str = ""


def _verify_locally(token: str) -> AuthUser:
    try:
        claims = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except jwt.PyJWTError as exc:
        raise _UNAUTHORIZED from exc
    meta = claims.get("user_metadata") or {}
    return AuthUser(
        id=str(claims["sub"]),
        email=claims.get("email", ""),
        name=meta.get("name", meta.get("full_name", "")),
    )


def _verify_remotely(token: str) -> AuthUser:
    try:
        user = supabase_admin.auth.get_user(token).user
    except Exception as exc:  # noqa: BLE001 - upstream auth failure
        raise _UNAUTHORIZED from exc
    if user is None:
        raise _UNAUTHORIZED
    meta = user.user_metadata or {}
    return AuthUser(
        id=str(user.id),
        email=user.email or "",
        name=meta.get("name", meta.get("full_name", "")),
    )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> AuthUser:
    token = credentials.credentials
    if settings.SUPABASE_JWT_SECRET:
        return _verify_locally(token)
    return _verify_remotely(token)


CurrentUser = Annotated[AuthUser, Depends(get_current_user)]
