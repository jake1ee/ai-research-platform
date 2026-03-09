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
