"""
Badge assignment utility.

Import pattern:
    from app.utils.badge_assigner import assign_badges
"""

from typing import Any


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

    min_cost = min(r["cost_usd"] for r in successful)
    for r in successful:
        if r["cost_usd"] == min_cost:
            r["badges"].append("cheapest")

    scored = [r for r in successful if r.get("judge_score") is not None]
    if scored:
        max_score = max(r["judge_score"] for r in scored)
        for r in scored:
            if r["judge_score"] == max_score:
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
