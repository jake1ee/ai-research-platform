"""
Badge assignment utility.

After all model results are collected, assign comparative badges
so the frontend can display "Fastest", "Cheapest", etc. tags.

Badges
------
  fastest       – lowest latency_ms (among successful results)
  cheapest      – lowest cost_usd
  best_quality  – highest judge_score (only when judge ran)
  most_tokens   – highest total token count (useful for verbose tasks)
  valid_json    – passed JSON schema validation (when require_json_output=True)

Example
-------
    from utils.badge_assigner import assign_badges

    results = [
        {"model_id": "gpt-4o",         "latency_ms": 820, "cost_usd": 0.012, "judge_score": 8.5, "error": None},
        {"model_id": "claude-3-5-sonnet","latency_ms": 1100,"cost_usd": 0.008, "judge_score": 9.1, "error": None},
        {"model_id": "gemini-1.5-flash","latency_ms": 450,  "cost_usd": 0.001, "judge_score": 7.0, "error": None},
    ]
    badged = assign_badges(results)
    # gemini gets ["fastest", "cheapest"], claude gets ["best_quality"]
"""

from typing import Any


def assign_badges(results: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Assign comparative badges to each result dict.

    Modifies each dict in-place by adding/updating a "badges" key (list of str).
    Returns the same list for convenience.

    Only successful results (error is None / falsy) participate in comparisons.
    """
    # Initialise badge lists
    for r in results:
        r.setdefault("badges", [])

    successful = [r for r in results if not r.get("error")]
    if not successful:
        return results

    # ── Fastest (lowest latency_ms) ───────────────────────────────────────────
    min_latency = min(r["latency_ms"] for r in successful)
    for r in successful:
        if r["latency_ms"] == min_latency:
            r["badges"].append("fastest")

    # ── Cheapest (lowest cost_usd) ────────────────────────────────────────────
    min_cost = min(r["cost_usd"] for r in successful)
    for r in successful:
        if r["cost_usd"] == min_cost:
            r["badges"].append("cheapest")

    # ── Best quality (highest judge_score) ────────────────────────────────────
    scored = [r for r in successful if r.get("judge_score") is not None]
    if scored:
        max_score = max(r["judge_score"] for r in scored)
        for r in scored:
            if r["judge_score"] == max_score:
                r["badges"].append("best_quality")

    # ── Most tokens (highest total token usage) ───────────────────────────────
    # Useful indicator for tasks where thoroughness matters
    max_tokens = max(
        r.get("input_tokens", 0) + r.get("output_tokens", 0) for r in successful
    )
    for r in successful:
        if r.get("input_tokens", 0) + r.get("output_tokens", 0) == max_tokens:
            r["badges"].append("most_tokens")

    # ── Valid JSON (passed schema validation) ─────────────────────────────────
    for r in successful:
        if r.get("is_valid_json") is True:
            r["badges"].append("valid_json")

    return results


# ── Example usage ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import json

    sample_results = [
        {
            "model_id": "openai/gpt-4o",
            "latency_ms": 820.0,
            "cost_usd": 0.012,
            "judge_score": 8.5,
            "input_tokens": 200,
            "output_tokens": 300,
            "is_valid_json": True,
            "error": None,
        },
        {
            "model_id": "anthropic/claude-3-5-sonnet-20241022",
            "latency_ms": 1100.0,
            "cost_usd": 0.008,
            "judge_score": 9.1,
            "input_tokens": 200,
            "output_tokens": 420,
            "is_valid_json": False,
            "error": None,
        },
        {
            "model_id": "google/gemini-1.5-flash",
            "latency_ms": 450.0,
            "cost_usd": 0.001,
            "judge_score": 7.0,
            "input_tokens": 200,
            "output_tokens": 180,
            "is_valid_json": None,
            "error": None,
        },
        {
            "model_id": "openai/gpt-3.5-turbo",
            "latency_ms": 300.0,
            "cost_usd": 0.0004,
            "judge_score": None,
            "input_tokens": 200,
            "output_tokens": 150,
            "is_valid_json": None,
            "error": "Rate limit exceeded",  # failed – excluded from comparisons
        },
    ]

    assign_badges(sample_results)
    for r in sample_results:
        print(f"{r['model_id']:50s}  badges={r['badges']}")
