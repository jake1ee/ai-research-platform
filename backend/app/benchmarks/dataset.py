"""Benchmark dataset domain objects and loaders (JSON file or Supabase tables)."""

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

DATA_FILE = Path(__file__).parent.parent.parent / "data" / "dataset.json"


@dataclass(frozen=True)
class Dataset:
    meta: dict[str, Any]
    categories: list[dict[str, Any]]
    providers: dict[str, dict[str, Any]]
    benchmarks: dict[str, dict[str, Any]]
    models: dict[str, dict[str, Any]]
    results: list[dict[str, Any]] = field(default_factory=list)


def from_dict(raw: dict[str, Any]) -> Dataset:
    return Dataset(
        meta=raw.get("meta", {}),
        categories=raw["categories"],
        providers={p["slug"]: p for p in raw["providers"]},
        benchmarks={b["slug"]: b for b in raw["benchmarks"]},
        models={m["slug"]: m for m in raw["models"]},
        results=raw["results"],
    )


def load_from_file(path: Path = DATA_FILE) -> Dataset:
    return from_dict(json.loads(path.read_text(encoding="utf-8")))


def load_from_supabase() -> Dataset:
    """Read the same shape from Supabase tables (see migrations/003_benchmarks.sql)."""
    from app.core.supabase.client import get_supabase

    sb = get_supabase()

    def rows(table: str) -> list[dict[str, Any]]:
        return sb.table(table).select("*").execute().data or []

    providers = {p["id"]: p["slug"] for p in rows("providers")}
    models_by_id = {m["id"]: m["slug"] for m in rows("benchmark_models")}
    bench_by_id = {b["id"]: b["slug"] for b in rows("benchmarks")}
    return from_dict(
        {
            "meta": {"sample": False},
            "categories": [
                {"slug": c["slug"], "name": c["name"], "weight": float(c["weight"])}
                for c in rows("benchmark_categories")
            ],
            "providers": rows("providers"),
            "benchmarks": [
                {**b, "category": b["category_slug"]} for b in rows("benchmarks")
            ],
            "models": [
                {**m, "provider": providers[m["provider_id"]], "license": m["license_type"]}
                for m in rows("benchmark_models")
            ],
            "results": [
                {
                    **r,
                    "model": models_by_id[r["model_id"]],
                    "benchmark": bench_by_id[r["benchmark_id"]],
                }
                for r in rows("benchmark_results")
            ],
        }
    )


_cache: dict[str, Any] = {"ds": None, "loaded": 0.0, "mtime": None}


def _with_overlay(ds: Dataset) -> Dataset:
    """Merge live updates (data/live_overlay.json) over the base dataset."""
    from app.ingest.store import read_overlay

    overlay = read_overlay()
    if not overlay:
        return ds
    models = {
        slug: {**m, **{k: v for k, v in overlay.get(slug, {}).items()}}
        for slug, m in ds.models.items()
    }
    return Dataset(ds.meta, ds.categories, ds.providers, ds.benchmarks, models, ds.results)


def get_dataset() -> Dataset:
    """Cached dataset; reloads when the overlay file changes or after DATASET_TTL_SECONDS."""
    import time

    from app.core.config import settings
    from app.ingest.store import OVERLAY_FILE

    mtime = OVERLAY_FILE.stat().st_mtime if OVERLAY_FILE.exists() else None
    fresh = time.monotonic() - _cache["loaded"] < settings.DATASET_TTL_SECONDS
    if _cache["ds"] is not None and fresh and _cache["mtime"] == mtime:
        return _cache["ds"]

    if settings.BENCHMARK_DATA_SOURCE == "supabase":
        ds = load_from_supabase()
    else:
        ds = _with_overlay(load_from_file())
    _cache.update(ds=ds, loaded=time.monotonic(), mtime=mtime)
    return ds


def reset_cache() -> None:
    _cache.update(ds=None, loaded=0.0, mtime=None)
