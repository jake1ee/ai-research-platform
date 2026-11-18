"""
Pure aggregation of evaluation history into dashboard analytics.

Input rows come from `evaluations` with embedded `evaluation_results` (schema.sql columns:
total_cost, latency_ms, quality_score ...). Kept free of I/O so it is unit-testable.
"""

from collections import defaultdict
from datetime import UTC, datetime, timedelta
from typing import Any


def _ok(results: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [r for r in results if not r.get("error")]


def _totals(rows: list[dict[str, Any]]) -> dict[str, float]:
    cost = tokens = 0.0
    latencies: list[float] = []
    for row in rows:
        for r in _ok(row.get("evaluation_results") or []):
            cost += float(r.get("total_cost") or 0)
            tokens += (r.get("input_tokens") or 0) + (r.get("output_tokens") or 0)
            latencies.append(float(r.get("latency_ms") or 0))
    return {
        "cost": cost,
        "tokens": tokens,
        "evals": float(len(rows)),
        "latency": sum(latencies) / len(latencies) if latencies else 0.0,
    }


def _delta(current: float, previous: float) -> float | None:
    """Percent change vs the previous period; None when there is nothing to compare."""
    if previous == 0:
        return None
    return round((current - previous) / previous * 100, 1)


def _row_summary(row: dict[str, Any]) -> dict[str, Any]:
    results = _ok(row.get("evaluation_results") or [])
    fastest = min(results, key=lambda r: r["latency_ms"], default=None)
    cheapest = min(results, key=lambda r: r["total_cost"], default=None)
    scored = [r for r in results if r.get("quality_score") is not None]
    best = max(scored, key=lambda r: r["quality_score"], default=None)
    return {
        "id": row["id"],
        "created_at": row["created_at"],
        "prompt_preview": (row.get("prompt") or "")[:140],
        "models": row.get("model_ids") or [],
        "fastest_model": fastest["model_id"] if fastest else None,
        "cheapest_model": cheapest["model_id"] if cheapest else None,
        "best_quality_model": best["model_id"] if best else None,
        "total_cost_usd": round(sum(float(r.get("total_cost") or 0) for r in results), 8),
        "avg_latency_ms": round(sum(r["latency_ms"] for r in results) / len(results), 1)
        if results
        else 0.0,
        "status": row.get("status", "completed"),
    }


def summarise(
    rows: list[dict[str, Any]], days: int, now: datetime | None = None, recent_limit: int = 50
) -> dict[str, Any]:
    """`rows` should cover 2*days so the previous period can be compared."""
    now = now or datetime.now(UTC)
    cutoff = now - timedelta(days=days)

    def created(row: dict[str, Any]) -> datetime:
        return datetime.fromisoformat(row["created_at"].replace("Z", "+00:00"))

    current = [r for r in rows if created(r) >= cutoff]
    previous = [r for r in rows if created(r) < cutoff]
    cur, prev = _totals(current), _totals(previous)

    calls: dict[str, int] = defaultdict(int)
    lat_sum: dict[str, float] = defaultdict(float)
    cost_sum: dict[str, float] = defaultdict(float)
    score_sum: dict[str, float] = defaultdict(float)
    score_n: dict[str, int] = defaultdict(int)
    daily_cost: dict[tuple[str, str], float] = defaultdict(float)
    daily_lat: dict[tuple[str, str], list[float]] = defaultdict(list)
    daily_tokens: dict[str, dict[str, int]] = defaultdict(lambda: {"input": 0, "output": 0})

    for row in current:
        day = created(row).date().isoformat()
        for r in _ok(row.get("evaluation_results") or []):
            m = r["model_id"]
            cost, lat = float(r.get("total_cost") or 0), float(r.get("latency_ms") or 0)
            calls[m] += 1
            lat_sum[m] += lat
            cost_sum[m] += cost
            daily_cost[(day, m)] += cost
            daily_lat[(day, m)].append(lat)
            daily_tokens[day]["input"] += r.get("input_tokens") or 0
            daily_tokens[day]["output"] += r.get("output_tokens") or 0
            if r.get("quality_score") is not None:
                score_sum[m] += float(r["quality_score"])
                score_n[m] += 1

    top = max(calls, key=lambda m: calls[m], default=None)
    evals = int(cur["evals"])
    return {
        "total_evaluations": evals,
        "total_cost_usd": round(cur["cost"], 6),
        "total_tokens": int(cur["tokens"]),
        "avg_latency_ms": round(cur["latency"], 2),
        "cost_per_eval_usd": round(cur["cost"] / evals, 6) if evals else 0.0,
        "top_model": top,
        "top_model_calls": calls[top] if top else 0,
        "deltas": {
            "cost": _delta(cur["cost"], prev["cost"]),
            "tokens": _delta(cur["tokens"], prev["tokens"]),
            "evaluations": _delta(cur["evals"], prev["evals"]),
            "latency": _delta(cur["latency"], prev["latency"]),
        },
        "model_call_counts": dict(calls),
        "model_avg_latency_ms": {m: round(lat_sum[m] / calls[m], 2) for m in calls},
        "model_avg_cost_usd": {m: round(cost_sum[m] / calls[m], 8) for m in calls},
        "model_avg_judge_score": {m: round(score_sum[m] / score_n[m], 2) for m in score_n},
        "latency_trend": [
            {"date": d, "model_id": m, "value": round(sum(v) / len(v), 2)}
            for (d, m), v in sorted(daily_lat.items())
        ],
        "cost_trend": [
            {"date": d, "model_id": m, "value": round(v, 8)}
            for (d, m), v in sorted(daily_cost.items())
        ],
        "token_usage_trend": [
            {"date": d, "input": t["input"], "output": t["output"]}
            for d, t in sorted(daily_tokens.items())
        ],
        "recent": [
            _row_summary(r)
            for r in sorted(current, key=created, reverse=True)[:recent_limit]
        ],
    }
