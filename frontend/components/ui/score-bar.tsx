import { formatScore } from "@/lib/format";

/** Numeric score with a thin proportional bar. Decorative bar is aria-hidden; the number carries meaning. */
export function ScoreBar({ score, max = 100 }: { score: number | null; max?: number }) {
  const pct = score === null ? 0 : Math.max(0, Math.min(100, (score / max) * 100));
  return (
    <div className="flex items-center gap-2.5">
      <span className="num w-11 text-right text-sm font-semibold text-foreground">
        {formatScore(score)}
      </span>
      <div aria-hidden className="h-1.5 w-20 overflow-hidden rounded-full bg-line sm:w-28">
        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
