"""
Supabase client accessors.

Clients are created lazily so the app (and tests) can be imported without
credentials. `supabase_admin` / `supabase_anon` are thin proxies that build
the real client on first attribute access, keeping existing imports working.

  supabase_admin – service-role key, bypasses RLS. Use only for trusted
                   backend work (workers, webhooks, system writes).
  get_user_client(jwt) – anon key + user JWT, so Postgres RLS is enforced.
"""

from functools import lru_cache
from typing import Any

from supabase import Client, create_client

from app.core.config import settings


@lru_cache(maxsize=1)
def _build_admin_client() -> Client:
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


@lru_cache(maxsize=1)
def _build_anon_client() -> Client:
    if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
        raise RuntimeError("SUPABASE_URL and SUPABASE_ANON_KEY must be set")
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)


class _LazyClient:
    """Defers client construction until first use."""

    def __init__(self, factory: Any) -> None:
        self._factory = factory

    def __getattr__(self, name: str) -> Any:
        return getattr(self._factory(), name)


supabase_admin: Client = _LazyClient(_build_admin_client)  # type: ignore[assignment]
supabase_anon: Client = _LazyClient(_build_anon_client)  # type: ignore[assignment]


def get_supabase() -> Client:
    """Service-role client (bypasses RLS)."""
    return _build_admin_client()


def get_user_client(jwt: str) -> Client:
    """Client acting as the user: RLS is enforced by Postgres."""
    client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    client.postgrest.auth(jwt)
    return client
