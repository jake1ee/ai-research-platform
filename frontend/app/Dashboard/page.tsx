'use client';

/**
 * Dashboard – AI Performance Intelligence Center
 * -----------------------------------------------
 * Layout:
 *  1. Top bar: title, workspace switcher, time range selector
 *  2. KPI grid: 6 executive metric cards
 *  3. Charts row 1: Cost over time (line) + Model distribution (bar)
 *  4. Charts row 2: Token usage (stacked bar) + Cost vs Latency scatter
 *  5. Evaluation history table
 */

import { useState } from 'react';
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
import { KPICard }           from '../components/dashboard/KPICard';
import { ChartCard }         from '../components/dashboard/ChartCard';
import { EvaluationTable, type EvaluationRow } from '../components/dashboard/EvaluationTable';
import { WorkspaceSwitcher, type Workspace }    from '../components/dashboard/WorkspaceSwitcher';

// ─────────────────────────────────────────────────────────────────────────────
// Mock data  (replace with Supabase analytics queries)
// ─────────────────────────────────────────────────────────────────────────────

const WORKSPACES: Workspace[] = [
  { id: 'ws-1', name: 'Personal',    plan: 'pro',        role: 'admin',    memberCount: 1 },
  { id: 'ws-2', name: 'Acme Corp',   plan: 'enterprise', role: 'engineer', memberCount: 14 },
  { id: 'ws-3', name: 'Side Project',plan: 'free',       role: 'admin',    memberCount: 1 },
];

// 30-day cost trend per model
const COST_TREND = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(Date.now() - (29 - i) * 86_400_000)
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  'GPT-4o':            +(Math.random() * 4 + 1).toFixed(3),
  'Claude 3.5':        +(Math.random() * 3 + 0.5).toFixed(3),
  'Gemini Flash':      +(Math.random() * 0.8 + 0.1).toFixed(3),
}));

// Model call distribution
const MODEL_DIST = [
  { model: 'GPT-4o',         calls: 312 },
  { model: 'Claude 3.5',     calls: 287 },
  { model: 'Gemini Flash',   calls: 198 },
  { model: 'GPT-4o Mini',    calls: 50  },
];

// 30-day token trend (input/output stacked)
const TOKEN_TREND = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(Date.now() - (29 - i) * 86_400_000)
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  input:  Math.floor(Math.random() * 80_000 + 20_000),
  output: Math.floor(Math.random() * 30_000 + 5_000),
}));

// Cost vs latency scatter data
const SCATTER_DATA = [
  { model: 'GPT-4o',       cost: 0.012,  latency: 820  },
  { model: 'Claude 3.5',   cost: 0.009,  latency: 1100 },
  { model: 'Gemini Flash', cost: 0.001,  latency: 450  },
  { model: 'GPT-4o Mini',  cost: 0.0004, latency: 620  },
  { model: 'GPT-3.5',      cost: 0.0008, latency: 350  },
];

// KPI sparkline helper
function genTrend(base: number, variance: number) {
  return Array.from({ length: 14 }, () =>
    +(base + (Math.random() - 0.5) * variance).toFixed(3),
  );
}

// Evaluation history
const EVAL_HISTORY: EvaluationRow[] = Array.from({ length: 47 }, (_, i) => ({
  id:           `eval-${i}`,
  createdAt:    new Date(Date.now() - i * 3_600_000 * 6).toISOString(),
  promptPreview: [
    'Summarise this quarterly earnings report in 3 bullet points',
    'Write unit tests for the following TypeScript function',
    'Translate the following legal contract to plain English',
    'Generate 5 creative product names for an AI scheduling tool',
    'Debug this Python script and explain the root cause',
  ][i % 5],
  models:           ['openai/gpt-4o', 'anthropic/claude-3-5-sonnet-20241022', 'google/gemini-1.5-flash'].slice(0, (i % 3) + 1),
  fastestModel:     'google/gemini-1.5-flash',
  cheapestModel:    'google/gemini-1.5-flash',
  bestQualityModel: i % 4 === 0 ? null : 'anthropic/claude-3-5-sonnet-20241022',
  totalCostUsd:     +(Math.random() * 0.05 + 0.001).toFixed(6),
  avgLatencyMs:     Math.floor(Math.random() * 1000 + 400),
  status:           (i % 11 === 0 ? 'failed' : 'completed') as EvaluationRow['status'],
}));

// ─────────────────────────────────────────────────────────────────────────────
// Recharts shared theme
// ─────────────────────────────────────────────────────────────────────────────

const axisStyle    = { fill: '#71717a', fontSize: 11 };
const gridStyle    = { stroke: '#27272a', strokeDasharray: '3 3' };
const tooltipStyle = {
  backgroundColor: '#18181b',
  border: '1px solid #3f3f46',
  borderRadius: 8,
  color: '#e4e4e7',
  fontSize: 12,
};

const TIME_RANGES = ['7d', '14d', '30d', '90d'] as const;
type TimeRange = typeof TIME_RANGES[number];

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [workspace, setWorkspace] = useState(WORKSPACES[0]);
  const [range, setRange]         = useState<TimeRange>('30d');
  const loading = false; // flip to true while fetching real Supabase data

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-400 px-6 py-6">

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Performance Intelligence</h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              AI cost, latency, and evaluation analytics for{' '}
              <span className="text-zinc-300">{workspace.name}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <WorkspaceSwitcher
              workspaces={WORKSPACES}
              current={workspace}
              onSwitch={setWorkspace}
              onCreateNew={() => {}}
            />

            {/* Time range pill */}
            <div className="flex rounded-lg border border-zinc-700 bg-zinc-900 p-0.5">
              {TIME_RANGES.map((r) => (
                <button key={r} onClick={() => setRange(r)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    range === r ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
                  }`}>
                  {r}
                </button>
              ))}
            </div>

            <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition-colors">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
            <button className="flex h-8 items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
              <Download className="h-3.5 w-3.5" /> Export
            </button>
          </div>
        </div>

        {/* ── KPI Grid ──────────────────────────────────────────────────── */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
          <KPICard title="Monthly Cost"    value="$127.43" delta={12.3}  deltaInverted trend={genTrend(4.2, 2)}          icon={<DollarSign className="h-4 w-4" />} loading={loading} />
          <KPICard title="Tokens Used"     value="4.23M"   delta={-3.2}  deltaInverted trend={genTrend(140_000, 40_000)}  icon={<Cpu className="h-4 w-4" />}         loading={loading} />
          <KPICard title="Evaluations"     value="847"     delta={28.1}              trend={genTrend(28, 12)}             icon={<BarChart3 className="h-4 w-4" />}    loading={loading} />
          <KPICard title="Avg Latency"     value="1,243ms" delta={-8.7}              trend={genTrend(1300, 200)}          icon={<Timer className="h-4 w-4" />}        loading={loading} />
          <KPICard title="Top Model"       value="GPT-4o"  delta={5.2}   subtitle="312 calls" trend={genTrend(10, 3)}    icon={<Sparkles className="h-4 w-4" />}     loading={loading} />
          <KPICard title="Cost / Eval"     value="$0.151"  delta={-1.8}  deltaInverted trend={genTrend(0.15, 0.04)}     icon={<TrendingDown className="h-4 w-4" />} loading={loading} />
        </div>

        {/* ── Charts Row 1 ──────────────────────────────────────────────── */}
        <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Cost over time */}
          <ChartCard title="Cost Over Time" description="Daily USD spend per model" className="lg:col-span-2" chartHeight={220}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={COST_TREND} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid {...gridStyle} />
                <XAxis dataKey="date" tick={axisStyle} tickLine={false} interval={6} />
                <YAxis tick={axisStyle} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => v != null ? [`$${Number(v).toFixed(3)}`] : ['-']} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#71717a' }} />
                <Line type="monotone" dataKey="GPT-4o"       stroke="#8b5cf6" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="Claude 3.5"   stroke="#34d399" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="Gemini Flash" stroke="#60a5fa" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Model distribution */}
          <ChartCard title="Model Distribution" description="Calls by model this period" chartHeight={220}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MODEL_DIST} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid horizontal={false} {...gridStyle} />
                <XAxis type="number" tick={axisStyle} tickLine={false} />
                <YAxis dataKey="model" type="category" tick={{ ...axisStyle, fontSize: 10 }} tickLine={false} width={90} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="calls" fill="#8b5cf6" radius={[0, 4, 4, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* ── Charts Row 2 ──────────────────────────────────────────────── */}
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Token usage */}
          <ChartCard title="Token Usage" description="Input vs output tokens per day" className="lg:col-span-2" chartHeight={200}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={TOKEN_TREND} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid {...gridStyle} />
                <XAxis dataKey="date" tick={axisStyle} tickLine={false} interval={6} />
                <YAxis tick={axisStyle} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => v != null ? [`${(Number(v) / 1000).toFixed(1)}k`] : ['-']} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#71717a' }} />
                <Bar dataKey="input"  fill="#6366f1" radius={[2, 2, 0, 0]} stackId="a" maxBarSize={16} />
                <Bar dataKey="output" fill="#8b5cf6" radius={[2, 2, 0, 0]} stackId="a" maxBarSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Cost vs Latency scatter */}
          <ChartCard title="Cost vs Latency" description="Optimal model for your use case" chartHeight={200}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 4, right: 16, bottom: 16, left: -20 }}>
                <CartesianGrid {...gridStyle} />
                <XAxis dataKey="latency" name="Latency" unit="ms" tick={axisStyle} tickLine={false}
                  label={{ value: 'Latency (ms)', position: 'insideBottom', offset: -10, ...axisStyle }} />
                <YAxis dataKey="cost" name="Cost" tick={axisStyle} tickLine={false}
                  tickFormatter={(v) => `$${v.toFixed(3)}`} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: '#3f3f46' }}
                  formatter={(v, name) => [name === 'cost' ? `$${Number(v).toFixed(4)}` : `${v}ms`, name]} />
                <Scatter data={SCATTER_DATA} fill="#8b5cf6" fillOpacity={0.85} />
              </ScatterChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* ── Evaluation History ────────────────────────────────────────── */}
        <EvaluationTable data={EVAL_HISTORY} loading={loading} pageSize={10} />

      </div>
    </div>
  );
}
