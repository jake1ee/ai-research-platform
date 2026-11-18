import type { EvaluationRow } from '@/features/dashboard/components/EvaluationTable';
import type { AnalyticsSummary } from '@/types/api';

export const shortName = (id: string) => id.split('/').pop() ?? id;

export const fmtDay = (iso: string) =>
  new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

export const fmtCost = (v: number) => (v >= 1 ? `$${v.toFixed(2)}` : `$${v.toFixed(4)}`);

export const fmtCount = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

/** Pivot long-form [{date, model_id, value}] into [{date, [model]: value}] for recharts. */
export function pivot(points: AnalyticsSummary['cost_trend']) {
  const byDate = new Map<string, Record<string, string | number>>();
  const models = new Set<string>();
  for (const p of points) {
    const name = shortName(p.model_id);
    models.add(name);
    const row = byDate.get(p.date) ?? { date: fmtDay(p.date) };
    row[name] = p.value;
    byDate.set(p.date, row);
  }
  return {
    rows: [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, r]) => r),
    models: [...models],
  };
}

/** Sum of all models per day, in date order (sparklines). */
export function dailyTotals(points: AnalyticsSummary['cost_trend']): number[] {
  const m = new Map<string, number>();
  for (const p of points) m.set(p.date, (m.get(p.date) ?? 0) + p.value);
  return [...m.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
}

export function toRows(data: AnalyticsSummary): EvaluationRow[] {
  return data.recent.map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    promptPreview: r.prompt_preview,
    models: r.models,
    fastestModel: r.fastest_model ?? '',
    cheapestModel: r.cheapest_model ?? '',
    bestQualityModel: r.best_quality_model,
    totalCostUsd: r.total_cost_usd,
    avgLatencyMs: r.avg_latency_ms,
    status: (['completed', 'failed', 'running'].includes(r.status) ? r.status : 'completed') as EvaluationRow['status'],
  }));
}

/** CSV with every cell quoted and quotes escaped (prompts are user text). */
export function toCsv(rows: EvaluationRow[]): string {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const head = ['created_at', 'prompt', 'models', 'total_cost_usd', 'avg_latency_ms', 'status'];
  const body = rows.map((r) =>
    [r.createdAt, r.promptPreview, r.models.join(' | '), r.totalCostUsd, r.avgLatencyMs, r.status].map(esc).join(','),
  );
  return [head.join(','), ...body].join('\n');
}
