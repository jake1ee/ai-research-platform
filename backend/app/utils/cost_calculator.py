"""
Cost calculation utilities.

Import pattern:
    from app.utils.cost_calculator import calculate_cost
"""

from dataclasses import dataclass


@dataclass
class ModelPricing:
    """USD cost per 1 000 tokens (input and output priced separately)."""
    input_per_1k: float
    output_per_1k: float


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
    "gemini-2.0-flash-exp": ModelPricing(input_per_1k=0.0, output_per_1k=0.0),
    # Cohere
    "command-r-plus":       ModelPricing(input_per_1k=0.003,  output_per_1k=0.015),
    "command-r":            ModelPricing(input_per_1k=0.0005, output_per_1k=0.0015),
}

_FALLBACK_PRICING = ModelPricing(input_per_1k=0.002, output_per_1k=0.008)


def _resolve_pricing(model_id: str) -> ModelPricing:
    bare = model_id.split("/")[-1] if "/" in model_id else model_id
    return MODEL_PRICING.get(bare, _FALLBACK_PRICING)


def calculate_cost(model_id: str, input_tokens: int, output_tokens: int) -> float:
    """Calculate the USD cost for a single model call."""
    pricing = _resolve_pricing(model_id)
    cost = (
        (input_tokens / 1_000) * pricing.input_per_1k
        + (output_tokens / 1_000) * pricing.output_per_1k
    )
    return round(cost, 8)


def calculate_batch_cost(results: list[dict]) -> float:
    """Sum costs across multiple model results."""
    return sum(
        calculate_cost(r["model_id"], r["input_tokens"], r["output_tokens"])
        for r in results
    )
