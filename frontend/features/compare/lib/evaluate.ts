import type { BadgeVariant } from '@/features/compare/components/Badge';
import type { ModelResult } from '@/features/compare/components/ModelResultCard';
import type { Model } from '@/features/compare/components/ModelSelector';
import type { EvalConfig } from '@/features/compare/components/PromptPanel';
import type { EvaluateRequest, ModelResultOut } from '@/types/api';

const KNOWN_BADGES: BadgeVariant[] = ['fastest', 'cheapest', 'best_quality', 'valid_json', 'most_tokens'];

export function parseJsonSchema(raw: string): Record<string, unknown> | undefined {
  if (!raw.trim()) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('JSON schema is not valid JSON');
  }
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    ? (parsed as Record<string, unknown>)
    : undefined;
}

/** EvalConfig (UI state) -> POST /evaluate body. */
export function buildRequest(config: EvalConfig): EvaluateRequest {
  const json = config.outputFormat === 'json';
  return {
    prompt: config.prompt,
    system_prompt: config.systemPrompt.trim() || undefined,
    model_ids: config.selectedModels,
    temperature: config.temperature,
    max_tokens: config.maxTokens,
    deterministic_seed: config.isDeterministic ? config.seed : undefined,
    require_json_output: json ? true : undefined,
    json_schema: json ? parseJsonSchema(config.jsonSchema) : undefined,
    judge_model: config.judgeEnabled ? config.judgeModel : undefined,
  };
}

/** One API result -> the card model the UI renders. */
export function toResult(r: ModelResultOut, models: Model[]): ModelResult {
  const meta = models.find((m) => m.id === r.model_id);
  return {
    modelId: r.model_id,
    modelName: meta?.name ?? r.model_id,
    provider: meta?.provider ?? r.model_id.split('/')[0],
    contextWindow: meta?.contextWindow ?? 0,
    status: r.error ? 'error' : 'complete',
    output: r.output_text ?? '',
    inputTokens: r.input_tokens,
    outputTokens: r.output_tokens,
    latencyMs: r.latency_ms,
    costUsd: r.total_cost,
    tokensPerSec: r.latency_ms > 0 ? (r.output_tokens / r.latency_ms) * 1000 : 0,
    badges: r.badges.filter((b): b is BadgeVariant => (KNOWN_BADGES as string[]).includes(b)),
    judgeScore: r.quality_score ?? undefined,
    judgeReasoning: r.judge_reasoning ?? undefined,
    error: r.error ?? undefined,
  };
}

/** Maps results back into the order the user selected the models in. */
export function orderResults(selected: string[], results: ModelResultOut[], models: Model[]): ModelResult[] {
  const byId = new Map(results.map((r) => [r.model_id, r]));
  return selected.flatMap((id) => {
    const r = byId.get(id);
    return r ? [toResult(r, models)] : [];
  });
}
