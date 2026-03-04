'use client';

/**
 * EvaluationTable
 * ---------------
 * Professional data table for evaluation history.
 * Features: client-side sort, search filter, pagination, row click nav,
 * badge display for model winners, empty/loading states.
 */

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronUp,
  ChevronDown,
  Search,
  ExternalLink,
  Zap,
  DollarSign,
  Star,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EvaluationRow {
  id: string;
  createdAt: string;          // ISO string
  promptPreview: string;
  models: string[];           // all model ids compared
  fastestModel: string;
  cheapestModel: string;
  bestQualityModel: string | null;
  totalCostUsd: number;
  avgLatencyMs: number;
  status: 'completed' | 'failed' | 'running';
}

type SortKey = keyof Pick<
  EvaluationRow,
  'createdAt' | 'totalCostUsd' | 'avgLatencyMs'
>;

interface EvaluationTableProps {
  data: EvaluationRow[];
  loading?: boolean;
  pageSize?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}

function formatCost(usd: number) {
  return usd < 0.001 ? `$${(usd * 1000).toFixed(3)}m` : `$${usd.toFixed(4)}`;
}

function formatLatency(ms: number) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms.toFixed(0)}ms`;
}

// Short model name from litellm_id string
function shortModel(id: string) {
  const bare = id.split('/').pop() ?? id;
  return bare.length > 16 ? bare.slice(0, 14) + '…' : bare;
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: EvaluationRow['status'] }) {
  const styles = {
    completed: 'bg-emerald-500/10 text-emerald-400',
    failed:    'bg-red-500/10 text-red-400',
    running:   'bg-blue-500/10 text-blue-400',
  }[status];
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${styles}`}>
      {status}
    </span>
  );
}

// ─── Model winner pill ────────────────────────────────────────────────────────

function WinnerPill({
  model,
  type,
}: {
  model: string | null;
  type: 'fastest' | 'cheapest' | 'quality';
}) {
  if (!model) return <span className="text-zinc-700">—</span>;

  const styles = {
    fastest:  { icon: <Zap className="h-2.5 w-2.5" />, cls: 'bg-blue-500/10 text-blue-400' },
    cheapest: { icon: <DollarSign className="h-2.5 w-2.5" />, cls: 'bg-emerald-500/10 text-emerald-400' },
    quality:  { icon: <Star className="h-2.5 w-2.5" />, cls: 'bg-amber-500/10 text-amber-400' },
  }[type];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${styles.cls}`}
      title={model}
    >
      {styles.icon}
      {shortModel(model)}
    </span>
  );
}

// ─── Sort icon ────────────────────────────────────────────────────────────────

function SortIcon({ col, active, dir }: { col: string; active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) return <span className="ml-1 inline-block opacity-30"><ChevronDown className="h-3 w-3" /></span>;
  return dir === 'asc'
    ? <ChevronUp className="ml-1 h-3 w-3 inline-block text-violet-400" />
    : <ChevronDown className="ml-1 h-3 w-3 inline-block text-violet-400" />;
}

// ─── Row skeleton ─────────────────────────────────────────────────────────────

function RowSkeleton() {
  return (
    <tr className="border-t border-zinc-800 animate-pulse">
      {[120, 200, 100, 90, 90, 80, 70, 70, 50].map((w, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3 rounded bg-zinc-800" style={{ width: w }} />
        </td>
      ))}
    </tr>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function EvaluationTable({
  data,
  loading = false,
  pageSize = 10,
}: EvaluationTableProps) {
  const router = useRouter();
  const [search, setSearch]   = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage]       = useState(1);

  // ── Filter ───────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter(
      (r) =>
        r.promptPreview.toLowerCase().includes(q) ||
        r.models.some((m) => m.toLowerCase().includes(q)),
    );
  }, [data, search]);

  // ── Sort ──────────────────────────────────────────────────────────────────
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey] as string | number;
      const bVal = b[sortKey] as string | number;
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  // ── Paginate ──────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const rows = sorted.slice((page - 1) * pageSize, page * pageSize);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
    setPage(1);
  }

  function handleSearch(v: string) {
    setSearch(v);
    setPage(1);
  }

  const columns: { label: string; key?: SortKey; width?: string }[] = [
    { label: 'Date',          key: 'createdAt',    width: 'w-36' },
    { label: 'Prompt',        width: 'w-auto' },
    { label: 'Models',        width: 'w-28' },
    { label: 'Fastest',       width: 'w-28' },
    { label: 'Cheapest',      width: 'w-28' },
    { label: 'Best Quality',  width: 'w-28' },
    { label: 'Cost',          key: 'totalCostUsd', width: 'w-20' },
    { label: 'Avg Latency',   key: 'avgLatencyMs', width: 'w-24' },
    { label: '',              width: 'w-12' },
  ];

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900">
      {/* Table toolbar */}
      <div className="flex items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3">
        <h3 className="text-sm font-semibold text-zinc-200">Evaluation History</h3>
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search prompts, models…"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="h-8 rounded-lg border border-zinc-700 bg-zinc-800 pl-8 pr-3 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
            />
          </div>
          {/* Filter icon (placeholder for future popover) */}
          <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors">
            <SlidersHorizontal className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left">
          <thead>
            <tr className="border-b border-zinc-800">
              {columns.map((col) => (
                <th
                  key={col.label}
                  className={`px-4 py-2.5 text-xs font-medium text-zinc-500 ${col.width ?? ''} ${
                    col.key ? 'cursor-pointer select-none hover:text-zinc-300' : ''
                  }`}
                  onClick={() => col.key && toggleSort(col.key)}
                >
                  {col.label}
                  {col.key && (
                    <SortIcon col={col.key} active={sortKey === col.key} dir={sortDir} />
                  )}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              Array.from({ length: pageSize }).map((_, i) => <RowSkeleton key={i} />)
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-sm text-zinc-600">
                  {search ? `No evaluations match "${search}"` : 'No evaluations yet. Run your first comparison!'}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="group border-t border-zinc-800 cursor-pointer transition-colors hover:bg-zinc-800/50"
                  onClick={() => router.push(`/evaluations/${row.id}`)}
                >
                  {/* Date */}
                  <td className="px-4 py-3 text-xs text-zinc-400 whitespace-nowrap">
                    {formatDate(row.createdAt)}
                  </td>

                  {/* Prompt preview */}
                  <td className="px-4 py-3 max-w-xs">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm text-zinc-200">
                        {row.promptPreview}
                      </span>
                      <StatusBadge status={row.status} />
                    </div>
                  </td>

                  {/* Models (count badge) */}
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                      {row.models.length} models
                    </span>
                  </td>

                  {/* Winners */}
                  <td className="px-4 py-3"><WinnerPill model={row.fastestModel} type="fastest" /></td>
                  <td className="px-4 py-3"><WinnerPill model={row.cheapestModel} type="cheapest" /></td>
                  <td className="px-4 py-3"><WinnerPill model={row.bestQualityModel} type="quality" /></td>

                  {/* Metrics */}
                  <td className="px-4 py-3 text-xs font-mono text-zinc-300 whitespace-nowrap">
                    {formatCost(row.totalCostUsd)}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-zinc-300 whitespace-nowrap">
                    {formatLatency(row.avgLatencyMs)}
                  </td>

                  {/* Action */}
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex h-7 items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800 px-2 text-xs text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ExternalLink className="h-3 w-3" />
                      View
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination footer */}
      {!loading && rows.length > 0 && (
        <div className="flex items-center justify-between border-t border-zinc-800 px-4 py-3">
          <span className="text-xs text-zinc-500">
            {sorted.length} evaluation{sorted.length !== 1 ? 's' : ''} ·{' '}
            page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-400 transition-colors hover:text-zinc-200 disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const p = i + 1;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`h-7 w-7 rounded-lg text-xs font-medium transition-colors ${
                    p === page
                      ? 'bg-violet-600 text-white'
                      : 'border border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-400 transition-colors hover:text-zinc-200 disabled:opacity-40"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
