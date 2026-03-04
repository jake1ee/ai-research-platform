"""
Async parallel LLM execution via LiteLLM.

This module provides a single coroutine – execute_models_parallel – that fans
out one prompt to multiple LLMs simultaneously, collects their responses with
latency and token metrics, and returns a list of ModelCallResult objects.

Key features
------------
  • True async parallelism via asyncio.gather (all models start at the same time)
  • Per-call timeout controlled by config.LLM_TIMEOUT_SECONDS
  • Deterministic mode: temperature=0 + fixed seed when requested
  • Automatic cost calculation via the cost_calculator utility
  • Graceful per-model error handling (one failure never cancels the others)

Example
-------
    from services.llm_executor import execute_models_parallel

    results = await execute_models_parallel(
        prompt="Explain recursion in one sentence.",
        model_ids=["openai/gpt-4o", "anthropic/claude-3-5-sonnet-20241022"],
        system_prompt="You are a concise teacher.",
        deterministic_seed=42,
    )
    for r in results:
        print(r.model_id, r.latency_ms, r.cost_usd, r.output[:80])
"""

import asyncio
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

import litellm
from litellm import acompletion

from config import settings
from utils.cost_calculator import calculate_cost


@dataclass
class ModelCallResult:
    """All metrics captured from one model invocation."""
    model_id: str

    output: Optional[str] = None          # Full text of the completion
    input_tokens: int = 0
    output_tokens: int = 0
    latency_ms: float = 0.0
    cost_usd: float = 0.0

    error: Optional[str] = None           # Set if the call raised an exception
    raw_response: Optional[Any] = None    # Full LiteLLM response object (for debugging)


async def _call_single_model(
    model_id: str,
    messages: List[Dict[str, str]],
    temperature: float,
    seed: Optional[int],
    timeout: int,
) -> ModelCallResult:
    """
    Execute a single LLM call and capture all performance metrics.

    Parameters
    ----------
    model_id    : LiteLLM model string, e.g. "openai/gpt-4o".
    messages    : OpenAI-style messages list.
    temperature : Sampling temperature (0 = deterministic).
    seed        : Optional fixed seed for reproducible outputs.
    timeout     : Max seconds to wait before raising TimeoutError.
    """
    kwargs: Dict[str, Any] = {
        "model": model_id,
        "messages": messages,
        "temperature": temperature,
        "timeout": timeout,
    }

    # Only pass seed if supported (OpenAI, some others) – LiteLLM ignores it gracefully
    if seed is not None:
        kwargs["seed"] = seed

    start = time.monotonic()
    try:
        response = await acompletion(**kwargs)
        latency_ms = (time.monotonic() - start) * 1000

        # Extract text output (first choice)
        output = response.choices[0].message.content or ""

        # Token usage reported by the provider
        usage = response.usage or {}
        input_tokens = getattr(usage, "prompt_tokens", 0) or 0
        output_tokens = getattr(usage, "completion_tokens", 0) or 0

        cost = calculate_cost(model_id, input_tokens, output_tokens)

        return ModelCallResult(
            model_id=model_id,
            output=output,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            latency_ms=round(latency_ms, 2),
            cost_usd=cost,
            raw_response=response,
        )

    except asyncio.TimeoutError:
        latency_ms = (time.monotonic() - start) * 1000
        return ModelCallResult(
            model_id=model_id,
            latency_ms=round(latency_ms, 2),
            error=f"Timeout after {timeout}s",
        )
    except Exception as exc:  # noqa: BLE001
        latency_ms = (time.monotonic() - start) * 1000
        return ModelCallResult(
            model_id=model_id,
            latency_ms=round(latency_ms, 2),
            error=str(exc),
        )


async def execute_models_parallel(
    prompt: str,
    model_ids: List[str],
    system_prompt: Optional[str] = None,
    deterministic_seed: Optional[int] = None,
    timeout: Optional[int] = None,
) -> List[ModelCallResult]:
    """
    Fan out *prompt* to all *model_ids* simultaneously and collect results.

    Parameters
    ----------
    prompt            : User message content.
    model_ids         : List of LiteLLM model strings.
    system_prompt     : Optional system message prepended to every call.
    deterministic_seed: If set → temperature=0, seed=deterministic_seed.
    timeout           : Per-call timeout in seconds. Defaults to config value.

    Returns
    -------
    List[ModelCallResult] in the same order as *model_ids*.
    Failed calls have error set and metrics zeroed.
    """
    temperature = 0.0 if deterministic_seed is not None else 1.0
    timeout = timeout or settings.LLM_TIMEOUT_SECONDS

    # Build the messages list once (same for all models)
    messages: List[Dict[str, str]] = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    # Launch all calls concurrently – asyncio.gather preserves order
    tasks = [
        _call_single_model(
            model_id=model_id,
            messages=messages,
            temperature=temperature,
            seed=deterministic_seed,
            timeout=timeout,
        )
        for model_id in model_ids
    ]

    results = await asyncio.gather(*tasks)
    return list(results)
