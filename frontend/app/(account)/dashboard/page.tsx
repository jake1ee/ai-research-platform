'use client';

/**
 * Dashboard – AI Performance Intelligence Center
 * -----------------------------------------------
 * Real data from GET /analytics (personal or workspace scoped), with:
 *  1. Header: workspace switcher, time range, refresh, CSV export
 *  2. KPI grid (cost, tokens, evaluations, latency, top model, cost/eval) with period deltas
 *  3. Charts: cost over time, model distribution, token usage, cost vs latency
 *  4. Recent evaluations table
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DollarSign, Cpu, BarChart3, Timer, Sparkles, TrendingDown,
  RefreshCw, Download,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { useAuth } from '@/app/components/AuthContext';
import { api } from '@/services/api';
import type { AnalyticsSummary, MyUsage } from '@/types/api';
import { KPICard }           from '@/features/dashboard/components/KPICard';
import { ChartCard }         from '@/features/dashboard/components/ChartCard';
import { EvaluationTable, type EvaluationRow } from '@/features/dashboard/components/EvaluationTable';
import { WorkspaceSwitcher, type Workspace }    from '@/features/dashboard/components/WorkspaceSwitcher';
import { dailyTotals, fmtCost, fmtCount, fmtDay, pivot, shortName, toCsv, toRows } from '@/features/dashboard/lib/transform';

// ─── Shared chart theme ───────────────────────────────────────────────────────

const axisStyle    = { fill: '#71717a', fontSize: 11 };
const gridStyle    = { stroke: '#27272a', strokeDasharray: '3 3' };
const tooltipStyle = {
  backgroundColor: '#18181b',
  border: '1px solid #3f3f46',
  borderRadius: 8,
  color: '#e4e4e7',
  fontSize: 12,
};
const SERIES = ['#8b5cf6', '#34d399', '#60a5fa', '#f59e0b', '#f472b6', '#22d3ee'];

const RANGES = { '7d': 7, '14d': 14, '30d': 30, '90d': 90 } as const;
type RangeKey = keyof typeof RANGES;

const PERSONAL_ID = 'personal';

function exportCsv(rows: EvaluationRow[]) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([toCsv(rows)], { type: 'text/csv' }));
  a.download = `evaluations-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const { user, isInitializing } = useAuth();

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [usage, setUsage]           = useState<MyUsage | null>(null);
  const [scope, setScope]           = useState<string>(PERSONAL_ID);
  const [range, setRange]           = useState<RangeKey>('30d');
  const [reloadKey, setReloadKey]   = useState(0);
  // The latest settled request; `loading` is derived by comparing its key to the current inputs.
  const [result, setResult] = useState<{ key: string; data: AnalyticsSummary | null; error: string | null } | null>(null);
  const requestKey = `${user?.id ?? ''}|${scope}|${range}|${reloadKey}`;
  const loading = result?.key !== requestKey;
  const data = result?.key === requestKey ? result.data : (result?.data ?? null);
  const error = result?.key === requestKey ? result.error : null;

  // Auth gate
  useEffect(() => {
    if (!isInitializing && !user) router.replace('/login');
  }, [isInitializing, user, router]);

  // Workspaces + plan usage (once)
  useEffect(() => {
    if (!user) return;
    api.getMyUsage().then(setUsage).catch(() => setUsage(null));
    api.listWorkspaces().then((list) => setWorkspaces(list.map((w) => ({ ...w, slug: w.slug ?? undefined })))).catch(() => setWorkspaces([]));
  }, [user]);

  // Analytics (re-run on scope / range / manual refresh)
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    api.getAnalytics(RANGES[range], scope === PERSONAL_ID ? undefined : scope)
      .then((d) => { if (!cancelled) setResult({ key: requestKey, data: d, error: null }); })
      .catch((e: unknown) => {
        if (!cancelled) setResult({ key: requestKey, data: null, error: e instanceof Error ? e.message : 'Failed to load analytics' });
      });
    return () => { cancelled = true; };
  }, [user, scope, range, requestKey]);

  const personal: Workspace = useMemo(
    () => ({ id: PERSONAL_ID, name: 'Personal', plan: (usage?.plan as Workspace['plan']) ?? 'free', role: 'admin', memberCount: 1 }),
    [usage?.plan],
  );
  const allWorkspaces = useMemo(() => [personal, ...workspaces], [personal, workspaces]);
  const current = allWorkspaces.find((w) => w.id === scope) ?? personal;

  const cost   = useMemo(() => pivot(data?.cost_trend ?? []), [data]);
  const rows   = useMemo(() => (data ? toRows(data) : []), [data]);
  const dist   = useMemo(
    () => Object.entries(data?.model_call_counts ?? {}).map(([m, calls]) => ({ model: shortName(m), calls })).sort((a, b) => b.calls - a.calls),
    [data],
  );
  const scatter = useMemo(
    () => Object.keys(data?.model_avg_latency_ms ?? {}).map((m) => ({
      model: shortName(m), latency: data!.model_avg_latency_ms[m], cost: data!.model_avg_cost_usd[m],
    })),
    [data],
  );
  const tokens = useMemo(() => (data?.token_usage_trend ?? []).map((t) => ({ ...t, date: fmtDay(t.date) })), [data]);
  const sparkCost = useMemo(() => dailyTotals(data?.cost_trend ?? []), [data]);
  const sparkLat  = useMemo(() => dailyTotals(data?.latency_trend ?? []), [data]);
  const sparkTok  = useMemo(() => (data?.token_usage_trend ?? []).map((t) => t.input + t.output), [data]);

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);
  const empty = !loading && !error && data?.total_evaluations === 0;

  if (isInitializing || !user) return <div className="min-h-screen bg-zinc-950" aria-busy="true" />;

  const d = data?.deltas;
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-400 px-6 py-6">

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Performance Intelligence</h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              AI cost, latency, and evaluation analytics for <span className="text-zinc-300">{current.name}</span>
            </p>
            {usage && usage.evals_limit !== -1 && (
              <p className="mt-1 text-xs text-zinc-600">
                {usage.evals_used} / {usage.evals_limit} evaluations used this month ({usage.plan} plan)
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <WorkspaceSwitcher
              workspaces={allWorkspaces}
              current={current}
              onSwitch={(w) => setScope(w.id)}
            />

            <div className="flex rounded-lg border border-zinc-700 bg-zinc-900 p-0.5" role="group" aria-label="Time range">
              {(Object.keys(RANGES) as RangeKey[]).map((r) => (
                <button key={r} onClick={() => setRange(r)} aria-pressed={range === r}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    range === r ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
                  }`}>
                  {r}
                </button>
              ))}
            </div>

            <button onClick={refresh} aria-label="Refresh"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition-colors">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={() => exportCsv(rows)} disabled={rows.length === 0}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-xs text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-40">
              <Download className="h-3.5 w-3.5" /> Export
            </button>
          </div>
        </div>

        {error && (
          <div role="alert" className="mb-6 flex items-center justify-between rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <span>{error}</span>
            <button onClick={refresh} className="rounded-md border border-red-500/40 px-3 py-1 text-xs hover:bg-red-500/10">Retry</button>
          </div>
        )}

        {empty && (
          <div className="mb-6 rounded-xl border border-dashed border-zinc-700 p-8 text-center">
            <p className="text-sm text-zinc-300">No evaluations in this period yet.</p>
            <a href="/lab" className="mt-2 inline-block text-sm text-violet-400 hover:underline">Run your first evaluation in the Lab →</a>
          </div>
        )}

        {/* ── KPI Grid ──────────────────────────────────────────────────── */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
          <KPICard title="Cost"        value={fmtCost(data?.total_cost_usd ?? 0)} delta={d?.cost ?? null} deltaInverted trend={sparkCost}  icon={<DollarSign className="h-4 w-4" />} loading={loading} />
          <KPICard title="Tokens Used" value={fmtCount(data?.total_tokens ?? 0)}  delta={d?.tokens ?? null} deltaInverted trend={sparkTok}   icon={<Cpu className="h-4 w-4" />}        loading={loading} />
          <KPICard title="Evaluations" value={String(data?.total_evaluations ?? 0)} delta={d?.evaluations ?? null}           trend={rows.map((_, i) => i + 1)} icon={<BarChart3 className="h-4 w-4" />} loading={loading} />
          <KPICard title="Avg Latency" value={`${Math.round(data?.avg_latency_ms ?? 0).toLocaleString()}ms`} delta={d?.latency ?? null} deltaInverted trend={sparkLat} icon={<Timer className="h-4 w-4" />} loading={loading} />
          <KPICard title="Top Model"   value={data?.top_model ? shortName(data.top_model) : '-'} delta={null} subtitle={data?.top_model ? `${data.top_model_calls} calls` : undefined} trend={[]} icon={<Sparkles className="h-4 w-4" />} loading={loading} />
          <KPICard title="Cost / Eval" value={fmtCost(data?.cost_per_eval_usd ?? 0)} delta={null} trend={sparkCost} icon={<TrendingDown className="h-4 w-4" />} loading={loading} />
        </div>

        {/* ── Charts Row 1 ──────────────────────────────────────────────── */}
        <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ChartCard title="Cost Over Time" description="Daily USD spend per model" className="lg:col-span-2" chartHeight={220} loading={loading} isEmpty={cost.rows.length === 0}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cost.rows} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
                <CartesianGrid {...gridStyle} />
                <XAxis dataKey="date" tick={axisStyle} tickLine={false} minTickGap={24} />
                <YAxis tick={axisStyle} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => (v != null ? [fmtCost(Number(v))] : ['-'])} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#71717a' }} />
                {cost.models.map((m, i) => (
                  <Line key={m} type="monotone" dataKey={m} stroke={SERIES[i % SERIES.length]} strokeWidth={1.5} dot={false} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Model Distribution" description="Calls by model this period" chartHeight={220} loading={loading} isEmpty={dist.length === 0}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dist} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid horizontal={false} {...gridStyle} />
                <XAxis type="number" allowDecimals={false} tick={axisStyle} tickLine={false} />
                <YAxis dataKey="model" type="category" tick={{ ...axisStyle, fontSize: 10 }} tickLine={false} width={110} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="calls" fill="#8b5cf6" radius={[0, 4, 4, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* ── Charts Row 2 ──────────────────────────────────────────────── */}
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ChartCard title="Token Usage" description="Input vs output tokens per day" className="lg:col-span-2" chartHeight={200} loading={loading} isEmpty={tokens.length === 0}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tokens} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
                <CartesianGrid {...gridStyle} />
                <XAxis dataKey="date" tick={axisStyle} tickLine={false} minTickGap={24} />
                <YAxis tick={axisStyle} tickLine={false} tickFormatter={(v) => fmtCount(Number(v))} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => (v != null ? [fmtCount(Number(v))] : ['-'])} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#71717a' }} />
                <Bar dataKey="input"  fill="#6366f1" radius={[2, 2, 0, 0]} stackId="a" maxBarSize={16} />
                <Bar dataKey="output" fill="#8b5cf6" radius={[2, 2, 0, 0]} stackId="a" maxBarSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Cost vs Latency" description="Average per call, by model" chartHeight={200} loading={loading} isEmpty={scatter.length === 0}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 4, right: 16, bottom: 16, left: -10 }}>
                <CartesianGrid {...gridStyle} />
                <XAxis dataKey="latency" name="Latency" unit="ms" tick={axisStyle} tickLine={false}
                  label={{ value: 'Latency (ms)', position: 'insideBottom', offset: -10, ...axisStyle }} />
                <YAxis dataKey="cost" name="Cost" tick={axisStyle} tickLine={false} tickFormatter={(v) => `$${Number(v).toFixed(3)}`} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: '#3f3f46' }}
                  formatter={(v, name) => [name === 'Cost' ? fmtCost(Number(v)) : `${Math.round(Number(v))}ms`, name]}
                  labelFormatter={() => ''} />
                <Scatter data={scatter} fill="#8b5cf6" fillOpacity={0.85} />
              </ScatterChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* ── Recent evaluations ────────────────────────────────────────── */}
        <EvaluationTable data={rows} loading={loading} pageSize={10} />

      </div>
    </div>
  );
}
