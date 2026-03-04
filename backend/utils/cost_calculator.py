"""
Cost calculation utilities.

Pricing is stored per-model in USD per 1 000 tokens.
Update MODEL_PRICING as providers change rates.

Example
-------
    from utils.cost_calculator import calculate_cost

    cost = calculate_cost("gpt-4o", input_tokens=1500, output_tokens=300)
    # → 0.001500 * (1.5) + 0.006000 * (0.3) = 0.00405
"""

from dataclasses import dataclass
from typing import Optional


@dataclass
class ModelPricing:
    """USD cost per 1 000 tokens (input and output priced separately)."""
    input_per_1k: float
    output_per_1k: float


# ── Pricing table (USD per 1k tokens) ────────────────────────────────────────
# Sources: provider docs as of early 2025. Update regularly.
MODEL_PRICING: dict[str, ModelPricing] = {
    # OpenAI
    "gpt-4o":               ModelPricing(input_per_1k=0.0025, output_per_1k=0.010),
    "gpt-4o-mini":          ModelPricing(input_per_1k=0.00015, output_per_1k=0.0006),
    "gpt-4-turbo":          ModelPricing(input_per_1k=0.010,  output_per_1k=0.030),
    "gpt-3.5-turbo":        ModelPricing(input_per_1k=0.0005, output_per_1k=0.0015),
    # Anthropic
    "claude-3-5-sonnet-20241022": ModelPricing(input_per_1k=0.003,  output_per_1k=0.015),
    "claude-3-5-haiku-20241022":  ModelPricing(input_per_1k=0.0008, output_per_1k=0.004),
    "claude-3-opus-20240229":     ModelPricing(input_per_1k=0.015,  output_per_1k=0.075),
    # Google
    "gemini-1.5-pro":       ModelPricing(input_per_1k=0.00125, output_per_1k=0.005),
    "gemini-1.5-flash":     ModelPricing(input_per_1k=0.000075, output_per_1k=0.0003),
    "gemini-2.0-flash-exp": ModelPricing(input_per_1k=0.0, output_per_1k=0.0),  # free preview
    # Cohere
    "command-r-plus":       ModelPricing(input_per_1k=0.003,  output_per_1k=0.015),
    "command-r":            ModelPricing(input_per_1k=0.0005, output_per_1k=0.0015),
}

# Fallback pricing used when the model isn't in the table
_FALLBACK_PRICING = ModelPricing(input_per_1k=0.002, output_per_1k=0.008)


def _resolve_pricing(model_id: str) -> ModelPricing:
    """
    Find pricing for *model_id*.
    Strips provider prefix ("openai/gpt-4o" → "gpt-4o") before lookup.
    Falls back to _FALLBACK_PRICING if not found.
    """
    bare = model_id.split("/")[-1] if "/" in model_id else model_id
    return MODEL_PRICING.get(bare, _FALLBACK_PRICING)


def calculate_cost(
    model_id: str,
    input_tokens: int,
    output_tokens: int,
) -> float:
    """
    Calculate the USD cost for a single model call.

    Parameters
    ----------
    model_id      : LiteLLM model string.
    input_tokens  : Number of prompt tokens consumed.
    output_tokens : Number of completion tokens generated.

    Returns
    -------
    float – cost in USD, rounded to 8 decimal places.
    """
    pricing = _resolve_pricing(model_id)
    cost = (
        (input_tokens / 1_000) * pricing.input_per_1k
        + (output_tokens / 1_000) * pricing.output_per_1k
    )
    return round(cost, 8)


def calculate_batch_cost(results: list[dict]) -> float:
    """
    Sum costs across multiple model results.

    Parameters
    ----------
    results : List of dicts with keys "model_id", "input_tokens", "output_tokens".
    """
    return sum(
        calculate_cost(r["model_id"], r["input_tokens"], r["output_tokens"])
        for r in results
    )


# ── Example usage ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    examples = [
        ("gpt-4o", 1500, 300),
        ("claude-3-5-sonnet-20241022", 2000, 500),
        ("gemini-1.5-flash", 3000, 800),
    ]
    for model, inp, out in examples:
        cost = calculate_cost(model, inp, out)
        print(f"{model:45s}  {inp:>5} in  {out:>5} out  → ${cost:.6f}")
