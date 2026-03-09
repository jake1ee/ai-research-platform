"""
Pydantic v2 schemas for analytics endpoints.

Import pattern:
    from app.schemas.analytics import AnalyticsSummary, ModelMetricPoint
"""

from typing import Dict, List

from pydantic import BaseModel


class ModelMetricPoint(BaseModel):
    date: str       # ISO date string e.g. "2025-03-01"
    model_id: str
    value: float


class AnalyticsSummary(BaseModel):
    total_evaluations: int
    total_cost_usd: float
    total_tokens: int
    avg_latency_ms: float
    model_call_counts: Dict[str, int]
    model_avg_latency_ms: Dict[str, float]
    model_avg_cost_usd: Dict[str, float]
    model_avg_judge_score: Dict[str, float]
    latency_trend: List[ModelMetricPoint]
    cost_trend: List[ModelMetricPoint]
    token_usage_trend: List[ModelMetricPoint]
