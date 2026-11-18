"""
External metadata sources. Parsing is pure (testable); fetching is a thin httpx call.

OpenRouter  - public model list: price, context window, creation date.
LiteLLM     - community price/context table used as a fallback.
Check each source's terms of use before relying on it commercially.
"""

from datetime import UTC, datetime
from typing import Any

import httpx

OPENROUTER_URL = "https://openrouter.ai/api/v1/models"
LITELLM_URL = (
    "https://raw.githubusercontent.com/BerriAI/litellm/main/"
    "model_prices_and_context_window.json"
)
TIMEOUT = httpx.Timeout(20.0)


def _per_million(value: Any) -> float | None:
    try:
        return round(float(value) * 1_000_000, 4)
    except (TypeError, ValueError):
        return None


def parse_openrouter(payload: dict[str, Any]) -> dict[str, dict[str, Any]]:
    out: dict[str, dict[str, Any]] = {}
    for m in payload.get("data", []):
        pricing = m.get("pricing") or {}
        entry: dict[str, Any] = {}
        if (p := _per_million(pricing.get("prompt"))) is not None and p >= 0:
            entry["input_price"] = p
        if (p := _per_million(pricing.get("completion"))) is not None and p >= 0:
            entry["output_price"] = p
        if isinstance(m.get("context_length"), int) and m["context_length"] > 0:
            entry["context_window"] = m["context_length"]
        if isinstance(m.get("created"), int | float):
            entry["release_date"] = datetime.fromtimestamp(m["created"], UTC).date().isoformat()
        if entry and m.get("id"):
            out[m["id"]] = entry
    return out


def parse_litellm(payload: dict[str, Any]) -> dict[str, dict[str, Any]]:
    out: dict[str, dict[str, Any]] = {}
    for key, m in payload.items():
        if not isinstance(m, dict):
            continue
        entry: dict[str, Any] = {}
        if (p := _per_million(m.get("input_cost_per_token"))) is not None:
            entry["input_price"] = p
        if (p := _per_million(m.get("output_cost_per_token"))) is not None:
            entry["output_price"] = p
        ctx = m.get("max_input_tokens") or m.get("max_tokens")
        if isinstance(ctx, int) and ctx > 0:
            entry["context_window"] = ctx
        if entry:
            out[key] = entry
    return out


def _get_json(url: str) -> dict[str, Any]:
    resp = httpx.get(url, timeout=TIMEOUT, follow_redirects=True)
    resp.raise_for_status()
    return resp.json()


def fetch_openrouter() -> dict[str, dict[str, Any]]:
    return parse_openrouter(_get_json(OPENROUTER_URL))


def fetch_litellm() -> dict[str, dict[str, Any]]:
    return parse_litellm(_get_json(LITELLM_URL))
