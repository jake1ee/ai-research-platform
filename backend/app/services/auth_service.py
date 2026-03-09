"""
Auth business logic – wraps Supabase Auth operations.
All DB writes use the service-role client (bypasses RLS).

Import pattern:
    from app.services.auth_service import signup_user, login_user, logout_user, refresh_session
"""

from fastapi import HTTPException, status
from gotrue.errors import AuthApiError

from app.core.supabase.client import _build_admin_client, _build_anon_client
from app.schemas.auth import AuthResponse, LoginRequest, SignupRequest, UserProfile


def _build_auth_response(session, profile: dict) -> AuthResponse:
    return AuthResponse(
        access_token=session.access_token,
        refresh_token=session.refresh_token,
        expires_in=session.expires_in or 3600,
        user=UserProfile(
            id=profile["id"],
            email=profile["email"],
            full_name=profile.get("full_name", ""),
            avatar_url=profile.get("avatar_url"),
            plan=profile.get("plan", "free"),
            created_at=profile["created_at"],
        ),
    )


def _fetch_profile(client, user_id: str) -> dict:
    """Fetch a row from public.profiles by id. Raises 404 if missing."""
    resp = (
        client.table("profiles")
        .select("*")
        .eq("id", user_id)
        .single()
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="User profile not found")
    return resp.data


def signup_user(body: SignupRequest) -> AuthResponse:
    """
    1. Sign up via the standard auth endpoint (not admin) to avoid 'User not allowed'.
    2. Upsert into public.profiles.
    3. Return session tokens + profile.
    """
    anon_client = _build_anon_client()
    admin_client = _build_admin_client()

    try:
        auth_resp = anon_client.auth.sign_up({
            "email": body.email,
            "password": body.password,
            "options": {"data": {"full_name": body.full_name}},
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
    if not auth_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Signup failed")

    # Upsert so we don't fail if a DB trigger already created the row.
    profile_data = {
        "id": str(auth_user.id),
        "email": body.email,
        "full_name": body.full_name,
        "avatar_url": None,
        "plan": "free",
    }
    try:
        admin_client.table("profiles").upsert(profile_data).execute()
    except Exception as exc:
        try:
            admin_client.auth.admin.delete_user(str(auth_user.id))
        except Exception:
            pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create user profile: {exc}",
        ) from exc

    # If email confirmation is disabled, sign_up already returns a session.
    # Otherwise fall back to sign_in_with_password.
    session = auth_resp.session
    if not session:
        sign_in = admin_client.auth.sign_in_with_password({"email": body.email, "password": body.password})
        session = sign_in.session

    profile = _fetch_profile(admin_client, str(auth_user.id))
    return _build_auth_response(session, profile)


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

    profile = _fetch_profile(client, str(auth_resp.user.id))
    return _build_auth_response(auth_resp.session, profile)


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

    profile = _fetch_profile(client, str(resp.user.id))
    return _build_auth_response(resp.session, profile)
