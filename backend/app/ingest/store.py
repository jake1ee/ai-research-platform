"""
Where live updates are persisted.

file mode     - data/live_overlay.json, merged over dataset.json on load (single-host dev).
supabase mode - UPDATE benchmark_models (shared by API and worker containers in production).
"""

import json
import os
import tempfile
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from app.core.config import settings

OVERLAY_FILE = Path(__file__).parent.parent.parent / "data" / "live_overlay.json"
ALLOWED_FIELDS = {
    "input_price",
    "output_price",
    "context_window",
    "release_date",
    "tokens_per_sec",
    "first_token_ms",
}


def _now() -> str:
    return datetime.now(UTC).isoformat(timespec="seconds")


def read_overlay(path: Path = OVERLAY_FILE) -> dict[str, dict[str, Any]]:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def _write_atomic(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=path.parent, suffix=".tmp")
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=1, sort_keys=True)
    os.replace(tmp, path)  # readers never see a half-written file


def apply_updates(updates: dict[str, dict[str, Any]], path: Path = OVERLAY_FILE) -> int:
    """Persist {slug: {field: value}}. Unknown fields are dropped. Returns models touched."""
    clean = {
        slug: {k: v for k, v in fields.items() if k in ALLOWED_FIELDS}
        for slug, fields in updates.items()
    }
    clean = {slug: f for slug, f in clean.items() if f}
    if not clean:
        return 0

    stamp = _now()
    if settings.BENCHMARK_DATA_SOURCE == "supabase":
        from app.core.supabase.client import get_supabase

        sb = get_supabase()
        for slug, fields in clean.items():
            sb.table("benchmark_models").update({**fields, "live_updated_at": stamp}).eq(
                "slug", slug
            ).execute()
    else:
        overlay = read_overlay(path)
        for slug, fields in clean.items():
            overlay[slug] = {**overlay.get(slug, {}), **fields, "live_updated_at": stamp}
        _write_atomic(path, overlay)
    return len(clean)
