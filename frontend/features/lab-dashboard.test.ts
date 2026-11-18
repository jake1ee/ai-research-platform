import { describe, expect, it } from 'vitest';
import type { EvalConfig } from '@/features/compare/components/PromptPanel';
import { buildRequest, orderResults, parseJsonSchema, toResult } from '@/features/compare/lib/evaluate';
import { dailyTotals, fmtCount, fmtCost, pivot, toCsv, toRows } from '@/features/dashboard/lib/transform';
import type { AnalyticsSummary, ModelResultOut } from '@/types/api';

const config: EvalConfig = {
  systemPrompt: '  ', prompt: 'hi', selectedModels: ['a/x', 'b/y'], temperature: 0.4, maxTokens: 256,
  isDeterministic: false, seed: 42, outputFormat: 'text', jsonSchema: '', judgeEnabled: false, judgeModel: 'a/x',
};

const out = (over: Partial<ModelResultOut> = {}): ModelResultOut => ({
  model_id: 'a/x', output_text: 'ok', input_tokens: 10, output_tokens: 50, latency_ms: 500, total_cost: 0.002,
  quality_score: null, judge_reasoning: null, is_valid_json: null, json_validation_error: null, error: null,
  badges: ['fastest', 'bogus'], ...over,
});

describe('lab request/response mapping', () => {
  it('builds a minimal text request without optional fields', () => {
    const req = buildRequest(config);
    expect(req).toMatchObject({ prompt: 'hi', model_ids: ['a/x', 'b/y'], temperature: 0.4, max_tokens: 256 });
    expect(req.system_prompt).toBeUndefined();
    expect(req.deterministic_seed).toBeUndefined();
    expect(req.judge_model).toBeUndefined();
  });

  it('includes seed, judge and json schema when enabled', () => {
    const req = buildRequest({
      ...config, isDeterministic: true, judgeEnabled: true, outputFormat: 'json', jsonSchema: '{"type":"object"}',
    });
    expect(req).toMatchObject({ deterministic_seed: 42, judge_model: 'a/x', require_json_output: true, json_schema: { type: 'object' } });
  });

  it('rejects invalid schema JSON and ignores non-objects', () => {
    expect(() => parseJsonSchema('{nope')).toThrow('not valid JSON');
    expect(parseJsonSchema('[1]')).toBeUndefined();
    expect(parseJsonSchema('')).toBeUndefined();
  });

  it('maps a result: tokens/sec, known badges only, error status', () => {
    const r = toResult(out(), [{ id: 'a/x', name: 'Model X', provider: 'Acme', contextWindow: 1000, costTier: 'low', isActive: true }]);
    expect(r).toMatchObject({ modelName: 'Model X', provider: 'Acme', status: 'complete', badges: ['fastest'] });
    expect(r.tokensPerSec).toBeCloseTo(100);
    expect(toResult(out({ error: 'boom' }), []).status).toBe('error');
    expect(toResult(out({ model_id: 'zz/q' }), []).provider).toBe('zz');
  });

  it('orders results by the user selection and skips missing ones', () => {
    const res = orderResults(['b/y', 'a/x', 'c/z'], [out({ model_id: 'a/x' }), out({ model_id: 'b/y' })], []);
    expect(res.map((r) => r.modelId)).toEqual(['b/y', 'a/x']);
  });
});

const summary = {
  cost_trend: [
    { date: '2026-11-02', model_id: 'openai/gpt-4o', value: 0.5 },
    { date: '2026-11-01', model_id: 'openai/gpt-4o', value: 0.25 },
    { date: '2026-11-01', model_id: 'anthropic/claude', value: 0.75 },
  ],
  recent: [
    { id: 'e1', created_at: '2026-11-02T10:00:00Z', prompt_preview: 'say "hi"', models: ['a/x', 'b/y'],
      fastest_model: null, cheapest_model: 'a/x', best_quality_model: null, total_cost_usd: 0.01, avg_latency_ms: 300, status: 'weird' },
  ],
} as unknown as AnalyticsSummary;

describe('dashboard transforms', () => {
  it('pivots long-form points by date and model', () => {
    const { rows, models } = pivot(summary.cost_trend);
    expect(models.sort()).toEqual(['claude', 'gpt-4o']);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ 'gpt-4o': 0.25, claude: 0.75 }); // sorted by date
  });

  it('sums daily totals in date order', () => {
    expect(dailyTotals(summary.cost_trend)).toEqual([1, 0.5]);
  });

  it('maps recent evaluations and normalises unknown status', () => {
    const [row] = toRows(summary);
    expect(row.status).toBe('completed');
    expect(row.fastestModel).toBe('');
  });

  it('escapes quotes in CSV', () => {
    expect(toCsv(toRows(summary))).toContain('"say ""hi"""');
  });

  it('formats numbers', () => {
    expect(fmtCost(0.0123)).toBe('$0.0123');
    expect(fmtCost(12.5)).toBe('$12.50');
    expect(fmtCount(4_230_000)).toBe('4.23M');
    expect(fmtCount(950)).toBe('950');
  });
});
