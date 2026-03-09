'use client';

/**
 * ChartCard
 * ---------
 * Consistent card shell for any Recharts chart.
 * Handles title, optional description, action slot (e.g. time range selector),
 * loading skeleton, and empty state.
 */

import { ReactNode } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChartCardProps {
  title: string;
  description?: string;
  /** Slot for buttons / dropdowns aligned to the top-right */
  action?: ReactNode;
  children: ReactNode;
  loading?: boolean;
  /** Rendered when data is empty instead of the chart */
  emptyMessage?: string;
  isEmpty?: boolean;
  /** Extra Tailwind classes on the card */
  className?: string;
  /** Chart height in pixels (default 220) */
  chartHeight?: number;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ChartSkeleton({ height }: { height: number }) {
  return (
    <div className="animate-pulse" style={{ height }}>
      <div className="h-full w-full rounded-lg bg-zinc-800" />
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-zinc-600">
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ChartCard({
  title,
  description,
  action,
  children,
  loading = false,
  emptyMessage = 'No data available',
  isEmpty = false,
  className = '',
  chartHeight = 220,
}: ChartCardProps) {
  return (
    <div
      className={`rounded-xl border border-zinc-800 bg-zinc-900 p-5 ${className}`}
    >
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-zinc-200">{title}</h3>
          {description && (
            <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
          )}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>

      {/* Body */}
      <div style={{ height: chartHeight }}>
        {loading ? (
          <ChartSkeleton height={chartHeight} />
        ) : isEmpty ? (
          <EmptyChart message={emptyMessage} />
        ) : (
          children
        )}
      </div>
    </div>
  );
}
