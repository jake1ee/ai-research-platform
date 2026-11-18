"""
Latency probe: stream a short fixed prompt and measure time-to-first-token and throughput.

Uses your own provider keys through LiteLLM, so numbers reflect what YOUR deployment sees.
Costs a few hundred tokens per model per run.
"""

import logging
import time
from typing import Any

import litellm

from app.core.config import settings
from app.utils.token_counter import count_tokens

PROBE_PROMPT = "Write a 150 word explanation of how a hash table works."
log = logging.getLogger("ingest.probe")
MAX_TOKENS = 200
SAMPLES = 2


def summarise(samples: list[dict[str, float]]) -> dict[str, Any]:
    """Median of successful samples."""
    ok = [s for s in samples if s["tokens_per_sec"] > 0]
    if not ok:
        return {}
    mid = len(ok) // 2
    ttft = sorted(s["first_token_ms"] for s in ok)[mid]
    tps = sorted(s["tokens_per_sec"] for s in ok)[mid]
    return {"first_token_ms": int(ttft), "tokens_per_sec": round(tps, 1)}


async def probe_once(model: str) -> dict[str, float]:
    start = time.perf_counter()
    first: float | None = None
    text: list[str] = []
    stream = await litellm.acompletion(
        model=model,
        messages=[{"role": "user", "content": PROBE_PROMPT}],
        max_tokens=MAX_TOKENS,
        temperature=0,
        stream=True,
        timeout=settings.LLM_TIMEOUT_SECONDS,
    )
    async for chunk in stream:
        delta = chunk.choices[0].delta.content if chunk.choices else None
        if delta:
            if first is None:
                first = time.perf_counter()
            text.append(delta)
    end = time.perf_counter()
    if first is None:
        return {"first_token_ms": 0.0, "tokens_per_sec": 0.0}
    tokens = count_tokens("".join(text), model)
    gen_seconds = max(end - first, 1e-3)
    return {"first_token_ms": (first - start) * 1000, "tokens_per_sec": tokens / gen_seconds}


async def probe_model(model: str) -> dict[str, Any]:
    samples: list[dict[str, float]] = []
    for _ in range(SAMPLES):
        try:
            samples.append(await probe_once(model))
        except Exception as exc:  # noqa: BLE001 - a failing provider must not abort the whole run
            log.warning("probe failed for %s: %s", model, type(exc).__name__)
    return summarise(samples)
