import Link from "next/link";
import { formatContext, formatPrice, formatScore } from "@/lib/format";
import type { Pick } from "@/lib/types";

function measure(p: Pick): string {
  switch (p.measure) {
    case "overall":
      return `${formatScore(p.value)} score`;
    case "output_price":
      return `${formatPrice(p.value)} / 1M out`;
    case "tokens_per_sec":
      return `${p.value} tok/s`;
    case "context_window":
      return `${formatContext(p.value)} context`;
  }
}

export function Picks({ picks }: { picks: Pick[] }) {
  return (
    <section aria-labelledby="picks-h" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <h2 id="picks-h" className="sr-only">Decision-ready picks</h2>
      {picks.map((p) => (
        <Link
          key={p.decision}
          href={`/models/${p.model.slug}`}
          className="group rounded-[var(--radius-card)] border border-line bg-surface p-4 transition-colors hover:border-accent/60"
        >
          <div className="text-[11px] uppercase tracking-wider text-subtle">{p.decision}</div>
          <div className="mt-2 font-semibold text-foreground group-hover:text-accent">{p.model.name}</div>
          <div className="text-xs text-subtle">{p.model.provider}</div>
          <div className="num mt-3 text-sm text-accent">{measure(p)}</div>
        </Link>
      ))}
    </section>
  );
}
