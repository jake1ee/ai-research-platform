"""
Load backend/data/dataset.json into Supabase (idempotent upserts).

    python scripts/seed_benchmarks.py [--file path/to/dataset.json]

Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Run against a dev/branch
project first. Then set BENCHMARK_DATA_SOURCE=supabase.
"""

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.benchmarks.dataset import DATA_FILE  # noqa: E402
from app.core.supabase.client import get_supabase  # noqa: E402


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--file", type=Path, default=DATA_FILE)
    raw = json.loads(ap.parse_args().file.read_text(encoding="utf-8"))
    sb = get_supabase()

    sb.table("benchmark_categories").upsert(raw["categories"], on_conflict="slug").execute()
    sb.table("providers").upsert(raw["providers"], on_conflict="slug").execute()
    provider_ids = {p["slug"]: p["id"] for p in sb.table("providers").select("id,slug").execute().data}

    sb.table("benchmark_models").upsert(
        [
            {
                **{k: v for k, v in m.items() if k not in ("provider", "license")},
                "provider_id": provider_ids[m["provider"]],
                "license_type": m["license"],
            }
            for m in raw["models"]
        ],
        on_conflict="slug",
    ).execute()
    sb.table("benchmarks").upsert(
        [{**{k: v for k, v in b.items() if k != "category"}, "category_slug": b["category"]} for b in raw["benchmarks"]],
        on_conflict="slug",
    ).execute()

    model_ids = {m["slug"]: m["id"] for m in sb.table("benchmark_models").select("id,slug").execute().data}
    bench_ids = {b["slug"]: b["id"] for b in sb.table("benchmarks").select("id,slug").execute().data}
    sb.table("benchmark_results").upsert(
        [
            {
                "model_id": model_ids[r["model"]],
                "benchmark_id": bench_ids[r["benchmark"]],
                **{k: r[k] for k in ("score", "provenance", "source", "source_url", "measured_at")},
            }
            for r in raw["results"]
        ],
        on_conflict="model_id,benchmark_id,source",
    ).execute()
    print(f"seeded {len(raw['models'])} models, {len(raw['results'])} results")


if __name__ == "__main__":
    main()
