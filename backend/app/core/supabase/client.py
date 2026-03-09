"""
Supabase client singletons for ModelCompare.

Two clients are exposed:
  supabase_admin   – uses the service-role key; bypasses RLS.
                     Used for all backend-internal reads and writes.
  supabase_anon    – uses the anon key; RLS is enforced.
                     Only needed if you want user-scoped queries.

Import pattern:
    from app.core.supabase.client import supabase_admin, get_supabase
"""

from functools import lru_cache

from supabase import Client, create_client

from app.core.config import settings


@lru_cache(maxsize=1)
def _build_admin_client() -> Client:
    """
    Service-role client – singleton, created once per process.
    Bypasses RLS: use only for trusted backend writes (results, usage tracking).
    Never expose this client or its key to the frontend.
    """
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in your .env"
        )
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


@lru_cache(maxsize=1)
def _build_anon_client() -> Client:
    """
    Anon-key client – singleton.
    Only used when you explicitly need RLS-enforced queries.
    """
    if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_ANON_KEY must be set in your .env"
        )
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)


# Convenience singletons
supabase_admin: Client = _build_admin_client()
supabase_anon: Client = _build_anon_client()


def get_supabase() -> Client:
    """
    Returns the admin (service-role) client.

    This is the standard accessor used across the codebase.
    The service-role key bypasses RLS, which is correct for backend operations
    since access control is enforced at the FastAPI route level via JWT verification.
    """
    return supabase_admin


def get_user_client(jwt: str) -> Client:
    """
    Return a Supabase client that sends the user's JWT as the Authorization header.

    Use this only when you explicitly need RLS enforced at the DB level
    (e.g. direct storage access). For normal API routes, prefer get_supabase()
    and enforce access control in FastAPI instead.
    """
    client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    client.postgrest.auth(jwt)
    return client
