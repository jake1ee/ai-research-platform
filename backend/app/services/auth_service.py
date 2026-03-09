"""
Auth business logic – wraps Supabase Auth operations.
All DB writes use the service-role client (bypasses RLS).

Import pattern:
    from app.services.auth_service import signup_user, login_user, logout_user, refresh_session
"""

from datetime import datetime, timezone

from fastapi import HTTPException, status
from gotrue.errors import AuthApiError

from app.core.supabase.client import _build_admin_client
from app.schemas.auth import AuthResponse, LoginRequest, SignupRequest, UserProfile


def _build_auth_response(session, profile: dict) -> AuthResponse:
    return AuthResponse(
        access_token=session.access_token,
        refresh_token=session.refresh_token,
        expires_in=session.expires_in or 3600,
        user=UserProfile(
            id=profile["id"],
            email=profile["email"],
            full_name=profile["full_name"],
            avatar_url=profile.get("avatar_url"),
            plan=profile.get("plan", "free"),
            created_at=profile["created_at"],
        ),
    )


def signup_user(body: SignupRequest) -> AuthResponse:
    """
    1. Create Supabase Auth user.
    2. Insert public.profiles row.
    3. Return session tokens + profile.
    """
    client = _build_admin_client()
    try:
        auth_resp = client.auth.admin.create_user({
            "email": body.email,
            "password": body.password,
            "user_metadata": {"full_name": body.full_name},
            "email_confirm": True,
        })
    except AuthApiError as exc:
        msg = str(exc).lower()
        if "already registered" in msg or "already exists" in msg:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists",
            )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    auth_user = auth_resp.user
    now = datetime.now(timezone.utc).isoformat()

    profile = {
        "id": str(auth_user.id),
        "email": body.email,
        "full_name": body.full_name,
        "avatar_url": None,
        "plan": "free",
        "created_at": now,
    }

    try:
        client.table("profiles").insert(profile).execute()
    except Exception as exc:
        try:
            client.auth.admin.delete_user(str(auth_user.id))
        except Exception:
            pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user profile",
        ) from exc

    sign_in = client.auth.sign_in_with_password({"email": body.email, "password": body.password})
    return _build_auth_response(sign_in.session, profile)


def login_user(body: LoginRequest) -> AuthResponse:
    """Authenticate with email/password and return session tokens."""
    client = _build_admin_client()
    try:
        auth_resp = client.auth.sign_in_with_password(
            {"email": body.email, "password": body.password}
        )
    except AuthApiError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    session = auth_resp.session
    auth_user = auth_resp.user

    profile_resp = (
        client.table("profiles")
        .select("*")
        .eq("id", str(auth_user.id))
        .single()
        .execute()
    )
    profile = profile_resp.data
    if not profile:
        raise HTTPException(status_code=404, detail="User profile not found")

    return _build_auth_response(session, profile)


def logout_user(token: str) -> None:
    """Revoke the session token in Supabase Auth."""
    try:
        _build_admin_client().auth.admin.sign_out(token)
    except Exception:
        pass


def refresh_session(refresh_token: str) -> AuthResponse:
    """Exchange a refresh token for a new session."""
    client = _build_admin_client()
    try:
        resp = client.auth.refresh_session(refresh_token)
    except AuthApiError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token is invalid or expired",
        ) from exc

    session = resp.session
    auth_user = resp.user

    profile_resp = (
        client.table("profiles")
        .select("*")
        .eq("id", str(auth_user.id))
        .single()
        .execute()
    )
    profile = profile_resp.data
    if not profile:
        raise HTTPException(status_code=404, detail="User profile not found")

    return _build_auth_response(session, profile)
