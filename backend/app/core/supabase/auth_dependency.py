"""
FastAPI dependency for Supabase JWT verification.

Import pattern:
    from app.core.supabase.auth_dependency import get_current_user, CurrentUser
"""

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from gotrue.errors import AuthApiError
from pydantic import BaseModel

from app.core.supabase.client import supabase_admin

bearer_scheme = HTTPBearer(auto_error=True)


class AuthUser(BaseModel):
    """Minimal user representation extracted from the verified Supabase JWT."""
    id: str
    email: str
    name: str = ""
    plan_tier: str = "free"


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> AuthUser:
    token = credentials.credentials

    try:
        response = supabase_admin.auth.get_user(token)
        auth_user = response.user
        if auth_user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except AuthApiError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Auth service unavailable",
        ) from exc

    metadata: dict = auth_user.user_metadata or {}

    return AuthUser(
        id=str(auth_user.id),
        email=auth_user.email or "",
        name=metadata.get("name", metadata.get("full_name", "")),
        plan_tier=metadata.get("plan_tier", "free"),
    )


# Convenience type alias for route function signatures
CurrentUser = Annotated[AuthUser, Depends(get_current_user)]
