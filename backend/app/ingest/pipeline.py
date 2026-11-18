"""Orchestrates refreshes. Every function returns a report; failures never raise past a source."""

import asyncio
import logging
from dataclasses import dataclass, field
from typing import Any

from app.ingest import sources, store
from app.ingest.aliases import load_aliases
from app.ingest.probe import probe_model

log = logging.getLogger("ingest")


@dataclass
class Report:
    updated: int = 0
    skipped_no_alias: list[str] = field(default_factory=list)
    unmatched: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)


def build_metadata_updates(
    aliases: dict[str, dict[str, str]],
    openrouter: dict[str, dict[str, Any]],
    litellm: dict[str, dict[str, Any]],
    report: Report,
) -> dict[str, dict[str, Any]]:
    """OpenRouter wins; LiteLLM fills any field OpenRouter lacks."""
    updates: dict[str, dict[str, Any]] = {}
    for slug, alias in aliases.items():
        merged: dict[str, Any] = {}
        if (key := alias.get("litellm")) and key in litellm:
            merged.update(litellm[key])
        if (key := alias.get("openrouter")) and key in openrouter:
            merged.update(openrouter[key])
        if merged:
            updates[slug] = merged
        elif alias.get("openrouter") or alias.get("litellm"):
            report.unmatched.append(slug)
    return updates


def refresh_metadata() -> Report:
    """Pull price / context / release date for every aliased model."""
    report = Report()
    aliases = load_aliases()
    if not aliases:
        report.errors.append("no aliases configured (backend/data/aliases.json)")
        return report

    openrouter: dict[str, dict[str, Any]] = {}
    litellm: dict[str, dict[str, Any]] = {}
    for name, fetch, target in (
        ("openrouter", sources.fetch_openrouter, openrouter),
        ("litellm", sources.fetch_litellm, litellm),
    ):
        try:
            target.update(fetch())
        except Exception as exc:  # noqa: BLE001 - one dead source must not block the other
            log.warning("source %s failed: %s", name, exc)
            report.errors.append(f"{name}: {type(exc).__name__}")

    if not openrouter and not litellm:
        return report
    report.updated = store.apply_updates(build_metadata_updates(aliases, openrouter, litellm, report))
    return report


async def _probe_all(targets: dict[str, str], concurrency: int = 3) -> dict[str, dict[str, Any]]:
    sem = asyncio.Semaphore(concurrency)

    async def one(slug: str, model: str) -> tuple[str, dict[str, Any]]:
        async with sem:
            return slug, await probe_model(model)

    results = await asyncio.gather(*(one(s, m) for s, m in targets.items()))
    return {slug: r for slug, r in results if r}


def refresh_speed() -> Report:
    """Measure latency / throughput for every model with a `probe` alias."""
    report = Report()
    aliases = load_aliases()
    targets = {s: a["probe"] for s, a in aliases.items() if a.get("probe")}
    report.skipped_no_alias = [s for s, a in aliases.items() if not a.get("probe")]
    if not targets:
        report.errors.append("no models with a 'probe' alias")
        return report
    measured = asyncio.run(_probe_all(targets))
    report.unmatched = [s for s in targets if s not in measured]  # probe failed
    report.updated = store.apply_updates(measured)
    return report
