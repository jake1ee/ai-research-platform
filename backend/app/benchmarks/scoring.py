"""
Transparent scoring (documented in docs/SCORING.md).

* Category score  = mean of the model's benchmark scores in that category.
* Overall score   = weighted mean over categories the model has data for
                    (weights renormalised). Missing results are never interpolated.
* Ranked          = at least MIN_CATEGORIES categories covered.
* Evidence        = "supported" when results come from >= MIN_SOURCE_FAMILIES
                    distinct source families including at least one non-lab
                    family; otherwise "estimated".
* Close-call rule = an estimated model may not outrank a supported model that
                    is within CLOSE_CALL points below it.
"""

from dataclasses import dataclass
from statistics import fmean
from typing import Any

from app.benchmarks.dataset import Dataset

MIN_CATEGORIES = 3
MIN_SOURCE_FAMILIES = 2
CLOSE_CALL = 2.0


@dataclass
class ModelScore:
    slug: str
    overall: float | None
    categories: dict[str, float]
    evidence: str  # supported | estimated | unranked
    source_families: int
    benchmark_count: int
    rank: int | None = None


def _source_family(result: dict[str, Any]) -> str:
    return "lab" if result["provenance"] == "lab" else str(result["source"])


def score_model(ds: Dataset, slug: str) -> ModelScore:
    weights = {c["slug"]: float(c["weight"]) for c in ds.categories}
    by_cat: dict[str, list[float]] = {}
    families: set[str] = set()
    count = 0
    for r in ds.results:
        if r["model"] != slug:
            continue
        cat = ds.benchmarks[r["benchmark"]]["category"]
        by_cat.setdefault(cat, []).append(float(r["score"]))
        families.add(_source_family(r))
        count += 1

    cats = {c: round(fmean(v), 2) for c, v in by_cat.items()}
    if len(cats) < MIN_CATEGORIES:
        return ModelScore(slug, None, cats, "unranked", len(families), count)

    total_w = sum(weights[c] for c in cats)
    overall = round(sum(cats[c] * weights[c] for c in cats) / total_w, 2)
    supported = len(families) >= MIN_SOURCE_FAMILIES and any(f != "lab" for f in families)
    return ModelScore(
        slug, overall, cats, "supported" if supported else "estimated", len(families), count
    )


def rank_models(ds: Dataset) -> list[ModelScore]:
    scores = [score_model(ds, slug) for slug in ds.models]
    ranked = sorted((s for s in scores if s.overall is not None), key=lambda s: -(s.overall or 0))

    changed = True  # apply the close-call rule until stable
    while changed:
        changed = False
        for i in range(len(ranked) - 1):
            upper, lower = ranked[i], ranked[i + 1]
            if (
                upper.evidence == "estimated"
                and lower.evidence == "supported"
                and (upper.overall or 0) - (lower.overall or 0) < CLOSE_CALL
            ):
                ranked[i], ranked[i + 1] = lower, upper
                changed = True

    for i, s in enumerate(ranked, start=1):
        s.rank = i
    unranked = [s for s in scores if s.overall is None]
    return ranked + unranked
