"""Pydantic v2 schemas for analytics endpoints."""

from pydantic import BaseModel


class ModelMetricPoint(BaseModel):
    date: str  # ISO date, e.g. "2026-03-01"
    model_id: str
    value: float


class TokenPoint(BaseModel):
    date: str
    input: int
    output: int


class Deltas(BaseModel):
    """Percent change vs the previous period of equal length (None = no baseline)."""

    cost: float | None = None
    tokens: float | None = None
    evaluations: float | None = None
    latency: float | None = None


class RecentEvaluation(BaseModel):
    id: str
    created_at: str
    prompt_preview: str
    models: list[str]
    fastest_model: str | None = None
    cheapest_model: str | None = None
    best_quality_model: str | None = None
    total_cost_usd: float
    avg_latency_ms: float
    status: str


class AnalyticsSummary(BaseModel):
    total_evaluations: int
    total_cost_usd: float
    total_tokens: int
    avg_latency_ms: float
    cost_per_eval_usd: float = 0.0
    top_model: str | None = None
    top_model_calls: int = 0
    deltas: Deltas = Deltas()
    model_call_counts: dict[str, int]
    model_avg_latency_ms: dict[str, float]
    model_avg_cost_usd: dict[str, float]
    model_avg_judge_score: dict[str, float]
    latency_trend: list[ModelMetricPoint]
    cost_trend: list[ModelMetricPoint]
    token_usage_trend: list[TokenPoint]
    recent: list[RecentEvaluation] = []
