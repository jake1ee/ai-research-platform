from datetime import UTC, datetime, timedelta

import pytest

from app.api.routes import analytics as analytics_routes
from app.api.routes import evaluations as eval_routes
from app.api.routes import lab as lab_routes
from app.core.supabase.auth_dependency import AuthUser, get_current_user
from app.services import model_catalog
from app.services.analytics_service import summarise
from app.services.llm_executor import ModelCallResult
from main import app

NOW = datetime(2026, 11, 18, 12, tzinfo=UTC)


def _row(i: int, days_ago: float, results: list[dict], prompt: str = "hello") -> dict:
    return {
        "id": f"e{i}",
        "created_at": (NOW - timedelta(days=days_ago)).isoformat(),
        "prompt": prompt,
        "status": "completed",
        "model_ids": [r["model_id"] for r in results],
        "evaluation_results": results,
    }


def _res(model: str, lat: float, cost: float, score: float | None = None, error=None) -> dict:
    return {"model_id": model, "latency_ms": lat, "total_cost": cost, "input_tokens": 100,
            "output_tokens": 50, "quality_score": score, "error": error}


def test_summarise_totals_deltas_and_badges():
    rows = [
        _row(1, 1, [_res("a", 400, 0.02, 7), _res("b", 900, 0.01, 9)]),
        _row(2, 2, [_res("a", 500, 0.02, 8), _res("b", 700, 0.01, None, error="boom")]),
        _row(3, 40, [_res("a", 600, 0.01)]),  # previous period (days=30 -> 30..60 days ago)
    ]
    s = summarise(rows, days=30, now=NOW)
    assert s["total_evaluations"] == 2
    assert s["total_cost_usd"] == pytest.approx(0.05)  # errored result excluded
    assert s["total_tokens"] == 450
    assert s["top_model"] == "a" and s["model_call_counts"] == {"a": 2, "b": 1}
    assert s["deltas"]["evaluations"] == 100.0  # 2 vs 1
    assert s["model_avg_judge_score"] == {"a": 7.5, "b": 9.0}
    newest = s["recent"][0]
    assert newest["id"] == "e1" and newest["fastest_model"] == "a"
    assert newest["cheapest_model"] == "b" and newest["best_quality_model"] == "b"
    assert s["token_usage_trend"][0]["input"] > 0


def test_summarise_empty_has_no_baseline():
    s = summarise([], days=7, now=NOW)
    assert s["total_evaluations"] == 0 and s["top_model"] is None
    assert s["deltas"] == {"cost": None, "tokens": None, "evaluations": None, "latency": None}


@pytest.fixture
def authed(client):
    app.dependency_overrides[get_current_user] = lambda: AuthUser(id="u1", email="a@b.co")
    yield client
    app.dependency_overrides.clear()


@pytest.fixture
def catalog(monkeypatch):
    rows = [{"litellm_id": "openai/gpt-4o", "name": "GPT-4o", "provider": "OpenAI",
             "context_window": 128000, "cost_per_1k_input": 0.005, "cost_per_1k_output": 0.015}]
    monkeypatch.setattr(model_catalog, "list_active_models", lambda: rows)
    monkeypatch.setattr(lab_routes, "list_active_models", lambda: rows)


def test_lab_models_catalog(client, catalog):
    data = client.get("/lab/models").json()
    assert data[0]["id"] == "openai/gpt-4o" and data[0]["costTier"] == "mid"


def test_evaluate_rejects_models_outside_catalog(authed, catalog):
    r = authed.post("/evaluate", json={"prompt": "hi", "model_ids": ["evil/expensive-model"]})
    assert r.status_code == 422 and "Unsupported" in r.json()["error"]["message"]


def test_evaluate_rejects_too_many_models(authed, catalog):
    r = authed.post("/evaluate", json={"prompt": "hi", "model_ids": [f"m{i}" for i in range(7)]})
    assert r.status_code == 422


def test_evaluate_passes_temperature_and_max_tokens(authed, catalog, monkeypatch):
    seen = {}

    async def fake_execute(**kw):
        seen.update(kw)
        return [ModelCallResult(model_id="openai/gpt-4o", output="ok", input_tokens=5,
                                output_tokens=7, latency_ms=100.0, cost_usd=0.001)]

    class FakeSvc:
        def create_evaluation(self, **kw):
            return {"id": "ev1"}

        def mark_running(self, _): ...
        def mark_completed(self, _): ...
        def store_all_results(self, rows):
            return rows

    monkeypatch.setattr(eval_routes, "execute_models_parallel", fake_execute)
    monkeypatch.setattr(eval_routes, "evaluation_svc", FakeSvc())
    monkeypatch.setattr(eval_routes, "get_user_plan_tier", lambda _: "free")
    monkeypatch.setattr(eval_routes.usage_svc, "enforce_plan_limit", lambda **kw: None)
    monkeypatch.setattr(eval_routes.usage_svc, "increment_from_results", lambda **kw: None)

    r = authed.post("/evaluate", json={"prompt": "hi", "model_ids": ["openai/gpt-4o"],
                                       "temperature": 0.3, "max_tokens": 256})
    assert r.status_code == 200, r.text
    assert seen["temperature"] == 0.3 and seen["max_tokens"] == 256
    assert r.json()["results"][0]["badges"]


def test_personal_analytics_is_scoped_to_user(authed, monkeypatch):
    captured = {}

    def fake_load(col, val, days):
        captured.update(col=col, val=val, days=days)
        return analytics_routes.AnalyticsSummary(**summarise([], days))

    monkeypatch.setattr(analytics_routes, "_load", fake_load)
    assert authed.get("/analytics?days=14").status_code == 200
    assert captured == {"col": "user_id", "val": "u1", "days": 14}
    assert authed.get("/analytics?days=0").status_code == 422


def test_workspace_analytics_requires_membership(authed, monkeypatch):
    from fastapi import HTTPException

    def deny(*a, **k):
        raise HTTPException(status_code=403, detail="Not a member")

    monkeypatch.setattr(analytics_routes, "require_workspace_role", deny)
    assert authed.get("/analytics?workspace_id=w1").status_code == 403
    assert authed.get("/workspaces/w1/analytics").status_code == 403
