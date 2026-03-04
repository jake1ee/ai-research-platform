"""
Supabase client singletons for ModelCompare.

Two clients are exposed:
  supabase_anon    – uses the anon key; RLS is enforced.
                     Set the Authorization header before each request.
  supabase_admin   – uses the service-role key; bypasses RLS.
                     Used only by backend-internal writes (results, usage).

Usage
-----
    from supabase.client import supabase_admin, supabase_anon

    # Admin write (bypasses RLS)
    supabase_admin.table("evaluation_results").insert({...}).execute()

    # User-scoped read (RLS enforced via JWT)
    client = get_user_client(token)
    client.table("evaluations").select("*").execute()
"""

from functools import lru_cache

from supabase import Client, create_client

from config import settings


@lru_cache(maxsize=1)
def _build_admin_client() -> Client:
    """
    Service-role client – singleton, created once per process.
    Bypasses RLS: use only for trusted backend writes (results, usage tracking).
    Never expose this client or its key to the frontend.
    """
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


@lru_cache(maxsize=1)
def _build_anon_client() -> Client:
    """
    Anon-key client – singleton used as a base for per-request user clients.
    """
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)


# Convenience singletons
supabase_admin: Client = _build_admin_client()
supabase_anon: Client  = _build_anon_client()


def get_user_client(jwt: str) -> Client:
    """
    Return a Supabase client scoped to the authenticated user's JWT.

    This causes all queries to run with RLS applied as if the user made them
    directly from the frontend.  Each FastAPI request that needs user-scoped
    reads should call this with the bearer token extracted from the header.

    Parameters
    ----------
    jwt : The raw JWT string (without "Bearer " prefix).
    """
    # supabase-py v2: set the session on a fresh client so it's thread-safe
    client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    client.auth.set_session(access_token=jwt, refresh_token="")
    return client
