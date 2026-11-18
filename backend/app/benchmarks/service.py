"""Read-side views over the benchmark dataset. Pure functions of a Dataset."""

from collections import Counter
from typing import Any

from app.benchmarks import scoring
from app.benchmarks.dataset import Dataset, get_dataset
from app.benchmarks.scoring import ModelScore

SORTABLE = {"rank", "score", "name", "price", "context", "speed"}


_rank_cache: dict[str, Any] = {"ds": None, "ranking": None}


def _ranking(ds: Dataset) -> list[ModelScore]:
    """Ranking is a pure function of the dataset: recompute only when the dataset object changes."""
    if _rank_cache["ds"] is not ds:
        _rank_cache.update(ds=ds, ranking=scoring.rank_models(ds))
    return _rank_cache["ranking"]


def _entry(ds: Dataset, s: ModelScore) -> dict[str, Any]:
    m = ds.models[s.slug]
    return {
        "slug": m["slug"],
        "name": m["name"],
        "family": m["family"],
        "provider": ds.providers[m["provider"]]["name"],
        "provider_slug": m["provider"],
        "license": m["license"],
        "context_window": m["context_window"],
        "input_price": m["input_price"],
        "output_price": m["output_price"],
        "tokens_per_sec": m["tokens_per_sec"],
        "first_token_ms": m["first_token_ms"],
        "release_date": m["release_date"],
        "rank": s.rank,
        "overall": s.overall,
        "categories": s.categories,
        "evidence": s.evidence,
        "source_families": s.source_families,
        "benchmark_count": s.benchmark_count,
    }


def leaderboard(
    ds: Dataset,
    *,
    category: str | None = None,
    license: str | None = None,
    provider: str | None = None,
    q: str | None = None,
    sort: str = "rank",
    order: str = "asc",
    page: int = 1,
    page_size: int = 50,
    include_unranked: bool = False,
) -> dict[str, Any]:
    entries = [_entry(ds, s) for s in _ranking(ds) if include_unranked or s.overall is not None]
    if category:
        key = category
        entries = [e for e in entries if key in e["categories"]]
        entries.sort(key=lambda e: -e["categories"][key])
        for i, e in enumerate(entries, 1):
            e["rank"] = i
            e["overall"] = e["categories"][key]  # score shown is the category score
    if license:
        entries = [e for e in entries if e["license"] == license]
    if provider:
        entries = [e for e in entries if e["provider_slug"] == provider]
    if q:
        needle = q.lower()
        entries = [
            e for e in entries if needle in e["name"].lower() or needle in e["provider"].lower()
        ]

    keyfn = {
        "rank": lambda e: e["rank"] or 10**6,
        "score": lambda e: -(e["overall"] or 0),
        "name": lambda e: e["name"].lower(),
        "price": lambda e: e["output_price"],
        "context": lambda e: -e["context_window"],
        "speed": lambda e: -e["tokens_per_sec"],
    }[sort if sort in SORTABLE else "rank"]
    entries.sort(key=keyfn, reverse=(order == "desc"))

    total = len(entries)
    start = (page - 1) * page_size
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": entries[start : start + page_size],
    }


def model_detail(ds: Dataset, slug: str) -> dict[str, Any] | None:
    ranking = {s.slug: s for s in _ranking(ds)}
    if slug not in ranking:
        return None
    entry = _entry(ds, ranking[slug])
    results = []
    for r in ds.results:
        if r["model"] != slug:
            continue
        b = ds.benchmarks[r["benchmark"]]
        results.append(
            {
                "benchmark": b["slug"],
                "benchmark_name": b["name"],
                "category": b["category"],
                "score": r["score"],
                "provenance": r["provenance"],
                "source": r["source"],
                "source_url": r["source_url"],
                "measured_at": r["measured_at"],
            }
        )
    siblings = [
        {"slug": m["slug"], "name": m["name"], "overall": ranking[m["slug"]].overall}
        for m in ds.models.values()
        if m["family"] == entry["family"] and m["slug"] != slug
    ]
    return {**entry, "results": results, "siblings": siblings}


def benchmarks_directory(ds: Dataset) -> list[dict[str, Any]]:
    counts = Counter(r["benchmark"] for r in ds.results)
    return [
        {**b, "model_count": counts.get(b["slug"], 0)}
        for b in sorted(ds.benchmarks.values(), key=lambda b: (b["category"], b["name"]))
    ]


def benchmark_detail(ds: Dataset, slug: str) -> dict[str, Any] | None:
    b = ds.benchmarks.get(slug)
    if b is None:
        return None
    rows = sorted(
        (
            {
                "model": r["model"],
                "model_name": ds.models[r["model"]]["name"],
                "provider": ds.providers[ds.models[r["model"]]["provider"]]["name"],
                "score": r["score"],
                "provenance": r["provenance"],
                "source": r["source"],
                "source_url": r["source_url"],
            }
            for r in ds.results
            if r["benchmark"] == slug
        ),
        key=lambda r: -r["score"],
    )
    for i, r in enumerate(rows, 1):
        r["rank"] = i
    return {**b, "model_count": len(rows), "leaderboard": rows}


def compare(ds: Dataset, slugs: list[str]) -> dict[str, Any] | None:
    ranking = {s.slug: s for s in _ranking(ds)}
    if any(s not in ranking for s in slugs):
        return None
    models = [_entry(ds, ranking[s]) for s in slugs]
    winners: dict[str, str] = {}
    for c in ds.categories:
        scored = [(m["slug"], m["categories"][c["slug"]]) for m in models if c["slug"] in m["categories"]]
        if scored:
            winners[c["slug"]] = max(scored, key=lambda t: t[1])[0]
    rows = []
    for b in ds.benchmarks.values():
        scores = {
            r["model"]: r["score"] for r in ds.results if r["benchmark"] == b["slug"] and r["model"] in slugs
        }
        if scores:
            rows.append({"benchmark": b["slug"], "name": b["name"], "category": b["category"], "scores": scores})
    wins = Counter(winners.values())
    verdict = None
    if wins:
        top, n = wins.most_common(1)[0]
        verdict = {"model": top, "category_wins": n, "of": len(winners)}
    return {"models": models, "category_winners": winners, "benchmarks": rows, "verdict": verdict}


def recommend(ds: Dataset, max_price: float | None = None) -> dict[str, Any]:
    ranked = [_entry(ds, s) for s in _ranking(ds) if s.overall is not None]
    if max_price is not None:
        ranked = [e for e in ranked if e["output_price"] <= max_price]
    if not ranked:
        return {"picks": []}
    top = ranked[0]["overall"]
    open_w = [e for e in ranked if e["license"] == "open"]
    near = [e for e in ranked if e["overall"] >= top - 12 and e["output_price"] > 0]
    picks = [
        ("Best overall", ranked[0], "overall", ranked[0]["overall"]),
        ("Best open weight", open_w[0] if open_w else None, "overall", None),
        ("Best near-frontier value", min(near, key=lambda e: e["output_price"]) if near else None, "output_price", None),
        ("Fastest", max(ranked, key=lambda e: e["tokens_per_sec"]), "tokens_per_sec", None),
        ("Largest context", max(ranked, key=lambda e: e["context_window"]), "context_window", None),
    ]
    return {
        "picks": [
            {"decision": d, "model": e, "measure": m, "value": e[m]}
            for d, e, m, _ in picks
            if e is not None
        ]
    }


def stats(ds: Dataset) -> dict[str, Any]:
    ranking = _ranking(ds)
    return {
        "models": len(ds.models),
        "ranked": sum(1 for s in ranking if s.overall is not None),
        "supported": sum(1 for s in ranking if s.evidence == "supported"),
        "estimated": sum(1 for s in ranking if s.evidence == "estimated"),
        "benchmarks": len(ds.benchmarks),
        "results": len(ds.results),
        "categories": len(ds.categories),
        "providers": len(ds.providers),
        "sample_data": bool(ds.meta.get("sample")),
        "last_updated": max((r["measured_at"] for r in ds.results), default=None),
        "live_updated": max(
            (str(m["live_updated_at"]) for m in ds.models.values() if m.get("live_updated_at")),
            default=None,
        ),
    }


def methodology(ds: Dataset) -> dict[str, Any]:
    prov = Counter(r["provenance"] for r in ds.results)
    total = sum(prov.values()) or 1
    return {
        "categories": ds.categories,
        "rules": {
            "min_categories": scoring.MIN_CATEGORIES,
            "min_source_families": scoring.MIN_SOURCE_FAMILIES,
            "close_call_points": scoring.CLOSE_CALL,
            "interpolation": False,
        },
        "provenance_share": {k: round(v / total * 100, 1) for k, v in prov.items()},
        "sample_data": bool(ds.meta.get("sample")),
    }


def export_models(ds: Dataset) -> list[dict[str, Any]]:
    return [_entry(ds, s) for s in _ranking(ds)]


def export_pricing(ds: Dataset) -> list[dict[str, Any]]:
    return [
        {k: e[k] for k in ("slug", "name", "provider", "license", "input_price", "output_price", "context_window")}
        for e in export_models(ds)
    ]


def export_speed(ds: Dataset) -> list[dict[str, Any]]:
    return [
        {k: e[k] for k in ("slug", "name", "provider", "tokens_per_sec", "first_token_ms")}
        for e in export_models(ds)
    ]


def current_dataset() -> Dataset:
    return get_dataset()
