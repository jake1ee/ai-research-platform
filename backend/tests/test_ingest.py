import json

from app.benchmarks import dataset
from app.ingest import pipeline, sources, store
from app.ingest.probe import summarise

OPENROUTER = {
    "data": [
        {"id": "acme/alpha", "created": 1_780_000_000, "context_length": 200_000,
         "pricing": {"prompt": "0.000003", "completion": "0.000015"}},
        {"id": "acme/free", "context_length": 8000, "pricing": {"prompt": "0", "completion": "0"}},
        {"id": "acme/broken", "pricing": {"prompt": "n/a"}},
    ]
}
LITELLM = {
    "sample_spec": "not-a-model",
    "alpha": {"input_cost_per_token": 2e-6, "output_cost_per_token": 1e-5, "max_input_tokens": 100_000},
    "beta": {"input_cost_per_token": 1e-7, "output_cost_per_token": 4e-7, "max_tokens": 32_000},
}


def test_parse_openrouter_converts_to_per_million():
    out = sources.parse_openrouter(OPENROUTER)
    assert out["acme/alpha"]["input_price"] == 3.0
    assert out["acme/alpha"]["output_price"] == 15.0
    assert out["acme/alpha"]["context_window"] == 200_000
    assert out["acme/alpha"]["release_date"].startswith("2026-")
    assert out["acme/free"]["output_price"] == 0.0
    assert "acme/broken" not in out


def test_parse_litellm_skips_non_models():
    out = sources.parse_litellm(LITELLM)
    assert "sample_spec" not in out
    assert out["beta"]["context_window"] == 32_000


def test_openrouter_wins_litellm_fills_gaps():
    aliases = {"m1": {"openrouter": "acme/alpha", "litellm": "alpha"}, "m2": {"openrouter": "nope"}}
    report = pipeline.Report()
    ups = pipeline.build_metadata_updates(
        aliases, sources.parse_openrouter(OPENROUTER), sources.parse_litellm(LITELLM), report
    )
    assert ups["m1"]["input_price"] == 3.0  # not LiteLLM's 2.0
    assert "m2" not in ups and report.unmatched == ["m2"]


def test_store_drops_unknown_fields_and_merges(tmp_path, monkeypatch):
    monkeypatch.setattr(store.settings, "BENCHMARK_DATA_SOURCE", "file")
    path = tmp_path / "overlay.json"
    assert store.apply_updates({"m1": {"input_price": 1.0, "name": "HACK"}}, path) == 1
    assert store.apply_updates({"m1": {"tokens_per_sec": 90}, "m2": {"bogus": 1}}, path) == 1
    data = json.loads(path.read_text())
    assert data["m1"]["input_price"] == 1.0 and data["m1"]["tokens_per_sec"] == 90
    assert "name" not in data["m1"] and "m2" not in data and data["m1"]["live_updated_at"]


def test_overlay_is_applied_to_dataset(tmp_path, monkeypatch):
    path = tmp_path / "overlay.json"
    slug = next(iter(dataset.load_from_file().models))
    path.write_text(json.dumps({slug: {"output_price": 123.0}}))
    monkeypatch.setattr(store, "OVERLAY_FILE", path)
    monkeypatch.setattr(store, "read_overlay", lambda p=path: json.loads(p.read_text()))
    merged = dataset._with_overlay(dataset.load_from_file())
    assert merged.models[slug]["output_price"] == 123.0


def test_refresh_metadata_survives_a_dead_source(tmp_path, monkeypatch):
    monkeypatch.setattr(pipeline, "load_aliases", lambda: {"m1": {"openrouter": "acme/alpha"}})
    monkeypatch.setattr(pipeline.sources, "fetch_openrouter", lambda: sources.parse_openrouter(OPENROUTER))

    def dead():
        raise ConnectionError("down")

    monkeypatch.setattr(pipeline.sources, "fetch_litellm", dead)
    captured = {}
    monkeypatch.setattr(pipeline.store, "apply_updates", lambda u: captured.update(u) or len(u))
    report = pipeline.refresh_metadata()
    assert report.updated == 1 and captured["m1"]["output_price"] == 15.0
    assert report.errors == ["litellm: ConnectionError"]


def test_refresh_metadata_without_aliases_reports_it(monkeypatch):
    monkeypatch.setattr(pipeline, "load_aliases", lambda: {})
    assert "no aliases" in pipeline.refresh_metadata().errors[0]


def test_probe_summary_uses_median_and_ignores_failures():
    s = summarise([
        {"first_token_ms": 300.0, "tokens_per_sec": 100.0},
        {"first_token_ms": 0.0, "tokens_per_sec": 0.0},
        {"first_token_ms": 500.0, "tokens_per_sec": 60.0},
    ])
    assert s["first_token_ms"] in (300, 500) and s["tokens_per_sec"] in (60.0, 100.0)
    assert summarise([{"first_token_ms": 0.0, "tokens_per_sec": 0.0}]) == {}
