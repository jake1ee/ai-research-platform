"""
Generate backend/data/dataset.json: a deterministic SAMPLE dataset.

All providers, models and scores are FICTIONAL demo data so the platform can be
developed and demoed without presenting invented numbers as real benchmarks.
Replace backend/data/dataset.json (or the Supabase tables) with real,
source-cited results before launch. See docs/SCORING.md.

    python scripts/generate_sample_dataset.py
"""

import json
import random
from pathlib import Path

rng = random.Random(42)

CATEGORIES = [
    ("agentic", "Agentic", 0.20),
    ("coding", "Coding", 0.20),
    ("reasoning", "Reasoning", 0.15),
    ("knowledge", "Knowledge", 0.12),
    ("math", "Math", 0.10),
    ("multimodal", "Multimodal", 0.08),
    ("long_context", "Long context", 0.08),
    ("instruction", "Instruction following", 0.07),
]

BENCHMARKS = [
    ("toolrun", "ToolRun", "agentic", "Multi-step tool use in simulated environments", 2025, "agentic", "hard"),
    ("webquest", "WebQuest", "agentic", "Autonomous web browsing and research tasks", 2025, "agentic", "hard"),
    ("repofix", "RepoFix", "coding", "Resolve real-world repository issues", 2024, "patch", "hard"),
    ("livecode", "LiveCode", "coding", "Fresh competitive programming problems", 2025, "generation", "medium"),
    ("logicgrid", "LogicGrid", "reasoning", "Constraint and deductive puzzles", 2024, "qa", "medium"),
    ("abstractiq", "AbstractIQ", "reasoning", "Abstract pattern induction", 2025, "grid", "hard"),
    ("worldqa", "WorldQA", "knowledge", "Broad academic knowledge, 57 subjects", 2023, "mcq", "medium"),
    ("expertqa", "ExpertQA", "knowledge", "Graduate-level expert questions", 2024, "mcq", "hard"),
    ("mathbowl", "MathBowl", "math", "Competition mathematics", 2025, "free-form", "hard"),
    ("gradeschool", "GradeSchool", "math", "Multi-step word problems", 2022, "free-form", "easy"),
    ("visionbench", "VisionBench", "multimodal", "Image and chart understanding", 2024, "mcq", "medium"),
    ("docread", "DocRead", "multimodal", "Document and screenshot reasoning", 2025, "qa", "medium"),
    ("needlestack", "NeedleStack", "long_context", "Retrieval in very long documents", 2024, "retrieval", "medium"),
    ("multihop", "MultiHop-Long", "long_context", "Multi-hop reasoning over long context", 2025, "qa", "hard"),
    ("followit", "FollowIt", "instruction", "Verifiable instruction constraints", 2024, "constraints", "medium"),
    ("formatwise", "FormatWise", "instruction", "Strict output-format adherence", 2025, "constraints", "easy"),
]

PROVIDERS = [
    ("northwind", "Northwind AI"),
    ("helios", "Helios Labs"),
    ("quanta", "Quanta Systems"),
    ("verdant", "Verdant AI"),
    ("ironleaf", "Ironleaf"),
]

# (provider, name, family, license, ability, context, in$, out$, tps, release)
MODELS = [
    ("northwind", "Orion 3 Ultra", "orion", "proprietary", 90, 1_000_000, 12.0, 60.0, 55, "2026-09-12"),
    ("northwind", "Orion 3", "orion", "proprietary", 84, 1_000_000, 3.0, 15.0, 110, "2026-09-12"),
    ("northwind", "Orion 3 Mini", "orion", "proprietary", 74, 400_000, 0.3, 1.2, 240, "2026-09-12"),
    ("helios", "Solstice 2 Pro", "solstice", "proprietary", 88, 512_000, 10.0, 40.0, 70, "2026-08-02"),
    ("helios", "Solstice 2", "solstice", "proprietary", 81, 512_000, 2.5, 10.0, 130, "2026-08-02"),
    ("helios", "Solstice 2 Flash", "solstice", "proprietary", 72, 1_000_000, 0.1, 0.4, 320, "2026-08-02"),
    ("quanta", "Vector 5", "vector", "proprietary", 86, 256_000, 5.0, 20.0, 85, "2026-07-21"),
    ("quanta", "Vector 5 Lite", "vector", "proprietary", 73, 128_000, 0.4, 1.6, 210, "2026-07-21"),
    ("verdant", "Fern 4 405B", "fern", "open", 82, 256_000, 0.0, 0.0, 40, "2026-06-18"),
    ("verdant", "Fern 4 70B", "fern", "open", 76, 128_000, 0.0, 0.0, 90, "2026-06-18"),
    ("verdant", "Fern 4 8B", "fern", "open", 61, 128_000, 0.0, 0.0, 300, "2026-06-18"),
    ("ironleaf", "Oak R2", "oak", "open", 79, 200_000, 0.0, 0.0, 55, "2026-10-05"),
    ("ironleaf", "Oak R2 Distill 32B", "oak", "open", 70, 128_000, 0.0, 0.0, 120, "2026-10-05"),
    ("ironleaf", "Birch Coder 33B", "birch", "open", 66, 64_000, 0.0, 0.0, 130, "2026-05-11"),
    ("quanta", "Vector 4.5", "vector", "proprietary", 77, 200_000, 2.0, 8.0, 100, "2026-02-14"),
    ("helios", "Solstice 1.5", "solstice", "proprietary", 68, 128_000, 0.8, 3.2, 150, "2025-12-01"),
]

AFFINITY = {  # per-family category bias
    "orion": {"agentic": 4, "coding": 3},
    "solstice": {"multimodal": 5, "long_context": 4},
    "vector": {"math": 4, "reasoning": 3},
    "fern": {"knowledge": 3, "instruction": 3},
    "oak": {"reasoning": 5, "math": 3},
    "birch": {"coding": 8, "knowledge": -6},
}
PROVENANCE = [("lab", 0.5), ("maintainer", 0.3), ("independent", 0.15), ("third_party", 0.05)]
INDEPENDENT_SOURCES = ["EvalHub", "OpenArena", "LabCross"]


def pick_provenance() -> str:
    x, acc = rng.random(), 0.0
    for name, p in PROVENANCE:
        acc += p
        if x <= acc:
            return name
    return "lab"


def main() -> None:
    models, results = [], []
    for provider, name, family, lic, ability, ctx, pin, pout, tps, release in MODELS:
        slug = name.lower().replace(" ", "-").replace(".", "-")
        models.append(
            {
                "slug": slug, "name": name, "family": family, "provider": provider,
                "license": lic, "context_window": ctx, "input_price": pin, "output_price": pout,
                "tokens_per_sec": tps, "first_token_ms": int(180 + 9000 / max(tps, 20)),
                "release_date": release,
            }
        )
        for bslug, _n, cat, _d, _y, _f, diff in BENCHMARKS:
            if rng.random() < 0.14:  # missing result stays missing (no interpolation)
                continue
            penalty = {"easy": 0, "medium": 6, "hard": 16}[diff]
            score = ability - penalty + AFFINITY.get(family, {}).get(cat, 0) + rng.gauss(0, 3)
            prov = pick_provenance()
            source = {
                "lab": f"{dict(PROVIDERS)[provider]} release notes",
                "maintainer": f"{bslug} maintainers",
                "independent": rng.choice(INDEPENDENT_SOURCES),
                "third_party": "Community report",
            }[prov]
            results.append(
                {
                    "model": slug, "benchmark": bslug,
                    "score": round(max(5.0, min(99.0, score)), 1),
                    "provenance": prov, "source": source,
                    "source_url": f"https://example.com/sample/{bslug}/{slug}",
                    "measured_at": "2026-11-01",
                }
            )
    data = {
        "meta": {"sample": True, "generated": "2026-11-18",
                 "note": "Fictional demo data. Replace with sourced results before launch."},
        "categories": [{"slug": s, "name": n, "weight": w} for s, n, w in CATEGORIES],
        "providers": [{"slug": s, "name": n} for s, n in PROVIDERS],
        "benchmarks": [
            {"slug": s, "name": n, "category": c, "description": d, "year": y,
             "format": f, "difficulty": diff, "source_url": f"https://example.com/sample/{s}"}
            for s, n, c, d, y, f, diff in BENCHMARKS
        ],
        "models": models,
        "results": results,
    }
    out = Path(__file__).parent.parent / "data" / "dataset.json"
    out.parent.mkdir(exist_ok=True)
    out.write_text(json.dumps(data, indent=1), encoding="utf-8")
    print(f"wrote {out}: {len(models)} models, {len(results)} results")


if __name__ == "__main__":
    main()
