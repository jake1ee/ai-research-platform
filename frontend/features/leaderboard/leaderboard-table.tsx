import Link from "next/link";
import { EvidenceBadge, LicenseBadge } from "@/components/ui/badge";
import { ScoreBar } from "@/components/ui/score-bar";
import { formatContext, formatPrice } from "@/lib/format";
import type { ModelEntry } from "@/lib/types";

export function LeaderboardTable({ items, scoreLabel }: { items: ModelEntry[]; scoreLabel: string }) {
  if (items.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-dashed border-line-strong p-10 text-center text-muted">
        No models match these filters.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-[var(--radius-card)] border border-line bg-surface">
      <table className="w-full min-w-[760px] text-left text-sm">
        <caption className="sr-only">Model leaderboard ranked by {scoreLabel}</caption>
        <thead className="border-b border-line text-[11px] uppercase tracking-wider text-subtle">
          <tr>
            <th scope="col" className="w-14 px-4 py-3">#</th>
            <th scope="col" className="px-2 py-3">Model</th>
            <th scope="col" className="hidden px-2 py-3 md:table-cell">Type</th>
            <th scope="col" className="px-2 py-3">{scoreLabel}</th>
            <th scope="col" className="hidden px-2 py-3 text-right lg:table-cell">Context</th>
            <th scope="col" className="px-2 py-3 text-right">Output $/1M</th>
            <th scope="col" className="hidden px-2 py-3 text-right lg:table-cell">Tok/s</th>
            <th scope="col" className="px-4 py-3">Evidence</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {items.map((m) => (
            <tr key={m.slug} className="transition-colors hover:bg-surface-2">
              <td className="num px-4 py-3 text-muted">{m.rank}</td>
              <td className="px-2 py-3">
                <Link href={`/models/${m.slug}`} className="font-medium text-foreground hover:text-accent">
                  {m.name}
                </Link>
                <div className="text-xs text-subtle">{m.provider}</div>
              </td>
              <td className="hidden px-2 py-3 md:table-cell"><LicenseBadge license={m.license} /></td>
              <td className="px-2 py-3"><ScoreBar score={m.overall} /></td>
              <td className="num hidden px-2 py-3 text-right text-muted lg:table-cell">
                {formatContext(m.context_window)}
              </td>
              <td className="num px-2 py-3 text-right text-muted">{formatPrice(m.output_price)}</td>
              <td className="num hidden px-2 py-3 text-right text-muted lg:table-cell">
                {m.tokens_per_sec}
              </td>
              <td className="px-4 py-3"><EvidenceBadge evidence={m.evidence} families={m.source_families} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
