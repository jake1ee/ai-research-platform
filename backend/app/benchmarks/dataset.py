"""Benchmark dataset domain objects and loaders (JSON file or Supabase tables)."""

import json
from dataclasses import dataclass, field
from functools import lru_cache
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


@lru_cache(maxsize=1)
def get_dataset() -> Dataset:
    from app.core.config import settings

    if settings.BENCHMARK_DATA_SOURCE == "supabase":
        return load_from_supabase()
    return load_from_file()
