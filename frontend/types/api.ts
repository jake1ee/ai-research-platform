/**
 * API request and response types that mirror the FastAPI schemas.
 *
 * Import pattern:
 *   import type { CompareRequest, ModelResponse } from '@/types/api';
 */

export interface CompareRequest {
  prompt: string;
  models: string[];
  advancedOptions?: {
    llmAsJudge?: boolean;
    similarityScore?: boolean;
    jsonValidation?: boolean;
    deterministic?: boolean;
  };
}

export interface ModelResponse {
  model: string;
  content: string;
  latency_ms: number;
  input_tokens: number;
  output_tokens: number;
  cost: number;
}

// ── Evaluation API types ───────────────────────────────────────────────────────

export interface EvaluateRequest {
  prompt: string;
  model_ids: string[];
  system_prompt?: string;
  temperature?: number;
  max_tokens?: number;
  deterministic_seed?: number;
  require_json_output?: boolean;
  json_schema?: Record<string, unknown>;
  judge_model?: string;
  workspace_id?: string;
}

export interface ModelResultOut {
  model_id: string;
  output_text: string | null;
  input_tokens: number;
  output_tokens: number;
  latency_ms: number;
  total_cost: number;
  quality_score: number | null;
  judge_reasoning: string | null;
  is_valid_json: boolean | null;
  json_validation_error: string | null;
  error: string | null;
  badges: string[];
}

export interface EvaluateResponse {
  evaluation_id: string;
  status: string;
  prompt: string;
  model_ids: string[];
  results: ModelResultOut[];
  total_cost_usd: number;
  total_input_tokens: number;
  total_output_tokens: number;
}

export interface WorkspaceResponse {
  id: string;
  name: string;
  tier: 'free' | 'pro' | 'enterprise';
  stripe_customer_id: string | null;
  created_at: string;
}

export interface UsageStats {
  total_evaluations: number;
  total_cost_usd: number;
  total_tokens: number;
  plan_limit: number;
  remaining_evals: number;
}

// ── Lab catalog ────────────────────────────────────────────────────────────────

export interface LabModel {
  id: string; // litellm id, e.g. "openai/gpt-4o"
  name: string;
  provider: string;
  contextWindow: number;
  costTier: 'low' | 'mid' | 'high';
  costPer1kInput: number;
  costPer1kOutput: number;
  isActive: boolean;
}

// ── Analytics ──────────────────────────────────────────────────────────────────

export interface MetricPoint {
  date: string;
  model_id: string;
  value: number;
}

export interface TokenPoint {
  date: string;
  input: number;
  output: number;
}

export interface RecentEvaluation {
  id: string;
  created_at: string;
  prompt_preview: string;
  models: string[];
  fastest_model: string | null;
  cheapest_model: string | null;
  best_quality_model: string | null;
  total_cost_usd: number;
  avg_latency_ms: number;
  status: string;
}

export interface AnalyticsSummary {
  total_evaluations: number;
  total_cost_usd: number;
  total_tokens: number;
  avg_latency_ms: number;
  cost_per_eval_usd: number;
  top_model: string | null;
  top_model_calls: number;
  deltas: { cost: number | null; tokens: number | null; evaluations: number | null; latency: number | null };
  model_call_counts: Record<string, number>;
  model_avg_latency_ms: Record<string, number>;
  model_avg_cost_usd: Record<string, number>;
  model_avg_judge_score: Record<string, number>;
  latency_trend: MetricPoint[];
  cost_trend: MetricPoint[];
  token_usage_trend: TokenPoint[];
  recent: RecentEvaluation[];
}

export interface MyWorkspace {
  id: string;
  name: string;
  plan: 'free' | 'pro' | 'enterprise';
  role: 'admin' | 'engineer' | 'viewer';
  memberCount: number;
  slug?: string | null;
}

export interface MyUsage {
  plan: string;
  evals_used: number;
  evals_limit: number;
  evals_remaining: number;
  tokens_used: number;
  tokens_limit: number;
  tokens_remaining: number;
  cost_this_month_usd: number;
}
