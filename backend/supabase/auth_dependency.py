"""
FastAPI dependency for Supabase JWT verification.

Replaces the SQLAlchemy-based auth.py for the Supabase architecture.

Usage
-----
    from supabase.auth_dependency import get_current_user, CurrentUser

    @app.get("/me")
    async def me(user: CurrentUser = Depends(get_current_user)):
        return {"id": user.id, "email": user.email}
"""

from typing import Annotated, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from gotrue.errors import AuthApiError
from pydantic import BaseModel

from supabase.client import supabase_admin

bearer_scheme = HTTPBearer(auto_error=True)


class AuthUser(BaseModel):
    """Minimal user representation extracted from the verified JWT."""
    id: str           # auth.uid() – UUID as string
    email: str
    plan_tier: str = "free"
    name: str = ""


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> AuthUser:
    """
    Verify the Supabase JWT and return the authenticated user.

    Steps
    -----
    1. Extract bearer token from the Authorization header.
    2. Call supabase.auth.get_user(token) – this hits the Supabase Auth API
       and validates the token signature + expiry.
    3. Look up the user's public profile (plan_tier, name) from public.users.
    4. Return an AuthUser dataclass for the route handler.

    Raises 401 if the token is missing, expired, or invalid.
    """
    token = credentials.credentials

    # ── Step 1: Verify JWT with Supabase Auth ─────────────────────────────
    try:
        response = supabase_admin.auth.get_user(token)
        auth_user = response.user
        if auth_user is None:
            raise ValueError("No user returned")
    except (AuthApiError, ValueError, Exception) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {exc}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = str(auth_user.id)
    email   = auth_user.email or ""

    # ── Step 2: Fetch public profile (plan_tier, name) ────────────────────
    profile_resp = (
        supabase_admin
        .table("users")
        .select("name, plan_tier")
        .eq("id", user_id)
        .maybe_single()
        .execute()
    )
    profile = profile_resp.data or {}

    return AuthUser(
        id=user_id,
        email=email,
        plan_tier=profile.get("plan_tier", "free"),
        name=profile.get("name", ""),
    )


# Convenience type alias for route signatures
CurrentUser = Annotated[AuthUser, Depends(get_current_user)]
