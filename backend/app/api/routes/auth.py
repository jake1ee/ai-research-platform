"""
Auth router – mounted at /auth.

Endpoints
---------
  POST /auth/signup   – Register a new user
  POST /auth/login    – Sign in with email + password
  POST /auth/logout   – Revoke current session
  GET  /auth/me       – Return authenticated user profile
  POST /auth/refresh  – Exchange refresh token for new access token
"""

from fastapi import APIRouter, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.supabase.auth_dependency import CurrentUser
from app.schemas.auth import (
    AuthResponse,
    LoginRequest,
    MessageResponse,
    RefreshRequest,
    SignupRequest,
    UserProfile,
)
from app.services.auth_service import login_user, logout_user, refresh_session, signup_user
from app.utils.rate_limiter import rate_limit

router = APIRouter(prefix="/auth", tags=["auth"])
bearer_scheme = HTTPBearer(auto_error=True)


@router.post("/signup", response_model=AuthResponse, status_code=201)
async def signup(body: SignupRequest, request: Request):
    """
    Register a new user.
    - Creates Supabase Auth user
    - Creates public.profiles row
    - Returns session tokens immediately
    """
    await rate_limit(request, limit=5, window=60)
    return signup_user(body)


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest, request: Request):
    """
    Authenticate with email + password.
    Returns access_token, refresh_token, and user profile.
    """
    await rate_limit(request, limit=10, window=60)
    return login_user(body)


@router.post("/logout", response_model=MessageResponse)
async def logout(
    credentials: HTTPAuthorizationCredentials = bearer_scheme,
):
    """Revoke the current session token."""
    logout_user(credentials.credentials)
    return MessageResponse(message="Successfully logged out")


@router.get("/me", response_model=UserProfile)
async def get_me(user: CurrentUser):
    """Return the authenticated user's profile."""
    return user


@router.post("/refresh", response_model=AuthResponse)
async def refresh(body: RefreshRequest):
    """Exchange a refresh token for a new access token."""
    return refresh_session(body.refresh_token)
