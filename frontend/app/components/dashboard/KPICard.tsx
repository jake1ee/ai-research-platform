'use client';

/**
 * KPICard
 * -------
 * Executive KPI tile with:
 *  • Formatted value + optional unit
 *  • Delta badge vs previous period (green up / red down / configurable)
 *  • Micro sparkline (7-day trend via Recharts)
 *  • Skeleton loading state
 *  • Icon slot
 */

import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  Tooltip,
  ReferenceLine,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KPICardProps {
  title: string;
  /** Formatted string to display, e.g. "$127.43" or "4.23M" */
  value: string;
  /** Percentage change vs previous period. Positive = good by default. */
  delta: number;
  /**
   * When true a POSITIVE delta is actually bad (e.g. avg latency – we want it going down).
   * Flips the colour logic.
   */
  deltaInverted?: boolean;
  /** 7-30 data points for the sparkline */
  trend: number[];
  icon: React.ReactNode;
  /** Optional sub-label beneath the value */
  subtitle?: string;
  loading?: boolean;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function KPICardSkeleton() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 w-28 rounded bg-zinc-800" />
        <div className="h-8 w-8 rounded-lg bg-zinc-800" />
      </div>
      <div className="h-8 w-36 rounded bg-zinc-800 mb-2" />
      <div className="h-3 w-20 rounded bg-zinc-800 mb-4" />
      <div className="h-10 w-full rounded bg-zinc-800" />
    </div>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function SparkTooltip({ active, payload }: { active?: boolean; payload?: { value: number }[] }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md bg-zinc-800 border border-zinc-700 px-2 py-1 text-xs text-zinc-200 shadow-lg">
      {payload[0].value}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function KPICard({
  title,
  value,
  delta,
  deltaInverted = false,
  trend,
  icon,
  subtitle,
  loading = false,
}: KPICardProps) {
  if (loading) return <KPICardSkeleton />;

  // Determine colour: positive delta is green unless inverted
  const isPositive = deltaInverted ? delta < 0 : delta > 0;
  const isNeutral  = delta === 0;

  const deltaColour = isNeutral
    ? 'text-zinc-500 bg-zinc-800'
    : isPositive
      ? 'text-emerald-400 bg-emerald-500/10'
      : 'text-red-400 bg-red-500/10';

  const DeltaIcon = isNeutral
    ? Minus
    : isPositive
      ? ArrowUpRight
      : ArrowDownRight;

  // Build sparkline data
  const sparkData = trend.map((v, i) => ({ i, v }));
  // Colour the spark line the same as the delta
  const sparkColour = isNeutral ? '#71717a' : isPositive ? '#34d399' : '#f87171';

  return (
    <div className="group rounded-xl border border-zinc-800 bg-zinc-900 p-5 transition-all duration-200 hover:border-zinc-700 hover:bg-zinc-900/80">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium uppercase tracking-widest text-zinc-500">
          {title}
        </span>
        {/* Icon pill */}
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400 group-hover:text-violet-400 transition-colors">
          {icon}
        </div>
      </div>

      {/* Value */}
      <div className="mb-1">
        <span className="text-2xl font-bold tracking-tight text-zinc-100">
          {value}
        </span>
      </div>

      {/* Subtitle + Delta */}
      <div className="flex items-center gap-2 mb-4">
        {subtitle && (
          <span className="text-xs text-zinc-500">{subtitle}</span>
        )}
        <span
          className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium ${deltaColour}`}
        >
          <DeltaIcon className="h-3 w-3" />
          {Math.abs(delta).toFixed(1)}%
        </span>
        <span className="text-xs text-zinc-600">vs last period</span>
      </div>

      {/* Sparkline */}
      <div className="h-10 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={sparkData}>
            <Line
              type="monotone"
              dataKey="v"
              stroke={sparkColour}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
            <Tooltip
              content={<SparkTooltip />}
              cursor={{ stroke: '#3f3f46', strokeWidth: 1 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
