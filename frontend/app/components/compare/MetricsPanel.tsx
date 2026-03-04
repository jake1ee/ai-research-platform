'use client';

/**
 * MetricsPanel – Right panel of the Evaluation Lab
 * -------------------------------------------------
 * Sections:
 *  1. Quick summary: winner badges, total cost, total tokens
 *  2. Latency comparison bar chart
 *  3. Cost comparison bar chart
 *  4. Token usage (input + output stacked bar)
 *  5. Speed (tokens/sec) bar
 *  6. Cost vs Latency scatter
 *  7. Quality section (judge scores ranked list, reasoning)
 *  8. Diff viewer toggle
 */

import { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart, Bar,
  ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip,
  Cell, LabelList,
} from 'recharts';
import { type ModelResult } from './ModelResultCard';
import { Badge, type BadgeVariant } from './Badge';
import { Star, GitCompare, ChevronDown, ChevronUp } from 'lucide-react';

// ─── Shared chart theme ───────────────────────────────────────────────────────

const axisStyle    = { fill: '#71717a', fontSize: 10 };
const gridStyle    = { stroke: '#27272a', strokeDasharray: '3 3' };
const tooltipStyle = {
  backgroundColor: '#18181b',
  border: '1px solid #3f3f46',
  borderRadius: 8,
  color: '#e4e4e7',
  fontSize: 11,
};

// Color scale for bars (first = highlighted, rest = muted)
const BAR_COLORS = ['#8b5cf6', '#6366f1', '#3b82f6', '#14b8a6', '#f59e0b'];

function shortName(id: string) {
  return id.split('/').pop()?.replace(/-\d{8}$/, '') ?? id;
}
function fmtMs(ms: number)   { return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms.toFixed(0)}ms`; }
function fmtCost(v: number)  { return v < 0.001 ? `$${(v * 1000).toFixed(2)}m` : `$${v.toFixed(4)}`; }

// ─── Section wrapper ──────────────────────────────────────────────────────────

function PanelSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-zinc-800 px-4 py-4 last:border-0">
      <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">{title}</h4>
      {children}
    </div>
  );
}

// ─── Horizontal bar chart ─────────────────────────────────────────────────────

function CompareBar({
  data,
  dataKey,
  formatter,
  winner,
}: {
  data: { name: string; value: number }[];
  dataKey: string;
  formatter: (v: number) => string;
  winner?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(60, data.length * 34)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 50, bottom: 0, left: 0 }}>
        <CartesianGrid horizontal={false} {...gridStyle} />
        <XAxis type="number" tick={axisStyle} tickLine={false} tickFormatter={formatter} />
        <YAxis dataKey="name" type="category" tick={{ ...axisStyle, fontSize: 9 }} tickLine={false} width={80} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [formatter(Number(v))]} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={16}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.name === winner ? '#8b5cf6' : '#3f3f46'}
              fillOpacity={entry.name === winner ? 1 : 0.7}
            />
          ))}
          <LabelList
            dataKey="value"
            position="right"
            formatter={formatter}
            style={{ fill: '#71717a', fontSize: 10 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Judge scoring section ────────────────────────────────────────────────────

function JudgeSection({ results }: { results: ModelResult[] }) {
  const scored = results
    .filter((r) => r.judgeScore !== undefined)
    .sort((a, b) => (b.judgeScore ?? 0) - (a.judgeScore ?? 0));

  if (scored.length === 0) return null;

  return (
    <PanelSection title="Quality Scores">
      <div className="space-y-2">
        {scored.map((r, i) => (
          <div key={r.modelId}>
            <div className="mb-1 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {i === 0 && <Star className="h-3 w-3 text-amber-400" />}
                <span className="text-xs font-medium text-zinc-300">{shortName(r.modelId)}</span>
              </div>
              <span className="font-mono text-xs font-bold text-amber-400">
                {r.judgeScore?.toFixed(1)}<span className="font-normal text-zinc-600">/10</span>
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-amber-400 transition-all duration-500"
                style={{ width: `${((r.judgeScore ?? 0) / 10) * 100}%` }}
              />
            </div>
            {r.judgeReasoning && (
              <p className="mt-1 text-[10px] leading-relaxed text-zinc-600 line-clamp-2">
                {r.judgeReasoning}
              </p>
            )}
          </div>
        ))}
      </div>
    </PanelSection>
  );
}

// ─── Diff viewer ─────────────────────────────────────────────────────────────

function DiffViewer({ results }: { results: ModelResult[] }) {
  const [modelA, setModelA] = useState(results[0]?.modelId ?? '');
  const [modelB, setModelB] = useState(results[1]?.modelId ?? '');
  const a = results.find((r) => r.modelId === modelA);
  const b = results.find((r) => r.modelId === modelB);

  return (
    <div>
      <div className="mb-3 flex gap-2">
        <select
          value={modelA}
          onChange={(e) => setModelA(e.target.value)}
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-200 focus:border-violet-500 focus:outline-none"
        >
          {results.map((r) => (
            <option key={r.modelId} value={r.modelId}>{shortName(r.modelId)}</option>
          ))}
        </select>
        <span className="flex items-center text-xs text-zinc-600">vs</span>
        <select
          value={modelB}
          onChange={(e) => setModelB(e.target.value)}
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-200 focus:border-violet-500 focus:outline-none"
        >
          {results.map((r) => (
            <option key={r.modelId} value={r.modelId}>{shortName(r.modelId)}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[a, b].map((r, i) =>
          r ? (
            <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-950 p-2">
              <div className="mb-1 text-[10px] font-semibold text-zinc-500 uppercase">
                {shortName(r.modelId)}
              </div>
              <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap text-[10px] leading-relaxed text-zinc-300">
                {r.output || '—'}
              </pre>
            </div>
          ) : null,
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface MetricsPanelProps {
  results: ModelResult[];
}

export function MetricsPanel({ results }: MetricsPanelProps) {
  const [showDiff, setShowDiff] = useState(false);
  const complete = results.filter((r) => r.status === 'complete');

  if (complete.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-zinc-600 px-6 text-center">
        <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p className="text-sm">Run an evaluation to see metrics</p>
      </div>
    );
  }

  // Build chart data arrays (sorted by the metric)
  const latencyData = [...complete]
    .sort((a, b) => a.latencyMs - b.latencyMs)
    .map((r) => ({ name: shortName(r.modelId), value: r.latencyMs }));

  const costData = [...complete]
    .sort((a, b) => a.costUsd - b.costUsd)
    .map((r) => ({ name: shortName(r.modelId), value: r.costUsd }));

  const tokenData = [...complete]
    .map((r) => ({
      name:   shortName(r.modelId),
      input:  r.inputTokens,
      output: r.outputTokens,
    }));

  const speedData = [...complete]
    .sort((a, b) => b.tokensPerSec - a.tokensPerSec)
    .map((r) => ({ name: shortName(r.modelId), value: r.tokensPerSec }));

  const scatterData = complete.map((r) => ({
    name:    shortName(r.modelId),
    latency: r.latencyMs,
    cost:    r.costUsd,
  }));

  const fastestName  = latencyData[0]?.name;
  const cheapestName = costData[0]?.name;
  const fastestModel = shortName(results.find((r) => r.badges.includes('fastest'))?.modelId ?? '');

  return (
    <div className="h-full overflow-y-auto bg-zinc-900">

      {/* ── Summary strip ────────────────────────────────────────────── */}
      <PanelSection title="Summary">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-2.5">
            <div className="text-[10px] uppercase text-zinc-600">Total Cost</div>
            <div className="font-mono text-sm font-bold text-zinc-200">
              {fmtCost(complete.reduce((s, r) => s + r.costUsd, 0))}
            </div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-2.5">
            <div className="text-[10px] uppercase text-zinc-600">Total Tokens</div>
            <div className="font-mono text-sm font-bold text-zinc-200">
              {(complete.reduce((s, r) => s + r.inputTokens + r.outputTokens, 0)).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Winner badges */}
        {complete.some((r) => r.badges.length > 0) && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {(['fastest', 'cheapest', 'best_quality'] as BadgeVariant[]).map((v) => {
              const winner = complete.find((r) => r.badges.includes(v));
              if (!winner) return null;
              return (
                <div key={v} className="flex items-center gap-1">
                  <Badge variant={v} />
                  <span className="text-[10px] text-zinc-500">→ {shortName(winner.modelId)}</span>
                </div>
              );
            })}
          </div>
        )}
      </PanelSection>

      {/* ── Latency ──────────────────────────────────────────────────── */}
      <PanelSection title="Latency">
        <CompareBar data={latencyData} dataKey="latency" formatter={fmtMs} winner={fastestName} />
      </PanelSection>

      {/* ── Cost ─────────────────────────────────────────────────────── */}
      <PanelSection title="Cost">
        <CompareBar data={costData} dataKey="cost" formatter={fmtCost} winner={cheapestName} />
      </PanelSection>

      {/* ── Token usage ──────────────────────────────────────────────── */}
      <PanelSection title="Token Usage">
        <ResponsiveContainer width="100%" height={Math.max(60, complete.length * 34)}>
          <BarChart data={tokenData} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid horizontal={false} {...gridStyle} />
            <XAxis type="number" tick={axisStyle} tickLine={false}
              tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
            <YAxis dataKey="name" type="category" tick={{ ...axisStyle, fontSize: 9 }} tickLine={false} width={80} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${Number(v).toLocaleString()} tokens`]} />
            <Bar dataKey="input"  fill="#6366f1" stackId="a" radius={[0, 0, 0, 0]} maxBarSize={14} />
            <Bar dataKey="output" fill="#8b5cf6" stackId="a" radius={[0, 4, 4, 0]} maxBarSize={14} />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-1.5 flex gap-3 text-[10px] text-zinc-600">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-[#6366f1]" />Input</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-[#8b5cf6]" />Output</span>
        </div>
      </PanelSection>

      {/* ── Speed ────────────────────────────────────────────────────── */}
      <PanelSection title="Speed (tokens/sec)">
        <CompareBar
          data={speedData}
          dataKey="speed"
          formatter={(v) => `${v.toFixed(0)}/s`}
          winner={speedData[0]?.name}
        />
      </PanelSection>

      {/* ── Cost vs Latency scatter ───────────────────────────────────── */}
      <PanelSection title="Cost vs Latency">
        <ResponsiveContainer width="100%" height={160}>
          <ScatterChart margin={{ top: 4, right: 16, bottom: 12, left: -24 }}>
            <CartesianGrid {...gridStyle} />
            <XAxis dataKey="latency" name="Latency" tick={axisStyle} tickLine={false}
              tickFormatter={fmtMs}
              label={{ value: 'Latency', position: 'insideBottom', offset: -8, ...axisStyle }} />
            <YAxis dataKey="cost" name="Cost" tick={axisStyle} tickLine={false}
              tickFormatter={fmtCost} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: '#3f3f46' }}
              formatter={(v, name) => [name === 'cost' ? fmtCost(Number(v)) : fmtMs(Number(v)), name]} />
            <Scatter data={scatterData} fill="#8b5cf6" fillOpacity={0.85} />
          </ScatterChart>
        </ResponsiveContainer>
      </PanelSection>

      {/* ── Judge scores ─────────────────────────────────────────────── */}
      <JudgeSection results={complete} />

      {/* ── Diff viewer ──────────────────────────────────────────────── */}
      {complete.length >= 2 && (
        <div className="border-b border-zinc-800 px-4 py-4 last:border-0">
          <button
            onClick={() => setShowDiff((o) => !o)}
            className="flex w-full items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-300"
          >
            <GitCompare className="h-3.5 w-3.5" />
            Output Diff Viewer
            {showDiff ? <ChevronUp className="ml-auto h-3 w-3" /> : <ChevronDown className="ml-auto h-3 w-3" />}
          </button>
          {showDiff && (
            <div className="mt-3">
              <DiffViewer results={complete} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
