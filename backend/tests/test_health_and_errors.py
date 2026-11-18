def test_live(client):
    r = client.get("/health/live")
    assert r.status_code == 200
    assert r.headers["X-Request-ID"]


def test_request_id_is_echoed(client):
    r = client.get("/health/live", headers={"X-Request-ID": "abc123"})
    assert r.headers["X-Request-ID"] == "abc123"


def test_auth_required(client):
    r = client.get("/users/me")
    assert r.status_code in (401, 403)
    assert "error" in r.json()


def test_invalid_token_rejected(client, monkeypatch):
    from app.core import config

    monkeypatch.setattr(config.settings, "SUPABASE_JWT_SECRET", "secret")
    r = client.get("/users/me", headers={"Authorization": "Bearer not.a.jwt"})
    assert r.status_code == 401
