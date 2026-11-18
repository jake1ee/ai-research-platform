"""
Badge assignment utility.

Import pattern:
    from app.utils.badge_assigner import assign_badges
"""

from typing import Any


def _cost(r: dict[str, Any]) -> float:
    """Accepts both naming schemes: `total_cost` (DB / sync route) and `cost_usd` (legacy)."""
    return float(r.get("total_cost", r.get("cost_usd", 0)) or 0)


def _score(r: dict[str, Any]) -> float | None:
    """Accepts `quality_score` (DB / sync route) and `judge_score` (legacy)."""
    v = r.get("quality_score", r.get("judge_score"))
    return None if v is None else float(v)


def assign_badges(results: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Assign comparative badges to each result dict.

    Modifies each dict in-place by adding/updating a "badges" key (list of str).
    Returns the same list for convenience.

    Badges: fastest, cheapest, best_quality, most_tokens, valid_json
    """
    for r in results:
        r.setdefault("badges", [])

    successful = [r for r in results if not r.get("error")]
    if not successful:
        return results

    min_latency = min(r["latency_ms"] for r in successful)
    for r in successful:
        if r["latency_ms"] == min_latency:
            r["badges"].append("fastest")

    min_cost = min(_cost(r) for r in successful)
    for r in successful:
        if _cost(r) == min_cost:
            r["badges"].append("cheapest")

    scored = [r for r in successful if _score(r) is not None]
    if scored:
        max_score = max(_score(r) for r in scored)  # type: ignore[type-var]
        for r in scored:
            if _score(r) == max_score:
                r["badges"].append("best_quality")

    max_tokens = max(
        r.get("input_tokens", 0) + r.get("output_tokens", 0) for r in successful
    )
    for r in successful:
        if r.get("input_tokens", 0) + r.get("output_tokens", 0) == max_tokens:
            r["badges"].append("most_tokens")

    for r in successful:
        if r.get("is_valid_json") is True:
            r["badges"].append("valid_json")

    return results
