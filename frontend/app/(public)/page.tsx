import Link from "next/link";
import { Filters, type LeaderboardParams } from "@/features/leaderboard/filters";
import { LeaderboardTable } from "@/features/leaderboard/leaderboard-table";
import { Picks } from "@/features/leaderboard/picks";
import { api, toQuery } from "@/lib/api";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<LeaderboardParams>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const [stats, categories, recommend, board] = await Promise.all([
    api.stats(),
    api.categories(),
    api.recommend(),
    api.leaderboard({ ...params, page, page_size: PAGE_SIZE }),
  ]);

  const category = categories.find((c) => c.slug === params.category);
  const pages = Math.max(1, Math.ceil(board.total / PAGE_SIZE));
  const link = (p: number) => `/${toQuery({ ...params, page: p === 1 ? undefined : p })}`;

  return (
    <div className="space-y-8">
      <section>
        <p className="num text-xs uppercase tracking-[0.2em] text-accent">LLM leaderboard</p>
        <h1 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
          Which model should you actually use?
        </h1>
        <p className="mt-3 max-w-2xl text-muted">
          Rankings built from published benchmark results across {stats.categories} weighted
          categories, with the evidence behind every score shown.
        </p>
        <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-card)] border border-line bg-line sm:grid-cols-4">
          {[
            ["Ranked models", stats.ranked],
            ["Supported", stats.supported],
            ["Benchmarks", stats.benchmarks],
            ["Results", stats.results],
          ].map(([label, value]) => (
            <div key={label} className="bg-surface px-4 py-3">
              <dt className="text-[11px] uppercase tracking-wider text-subtle">{label}</dt>
              <dd className="num mt-1 text-2xl font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
        {stats.sample_data && (
          <p role="note" className="mt-3 rounded-md border border-warn/40 bg-warn/10 px-3 py-2 text-sm text-warn">
            Demo data: models and scores shown here are fictional placeholders until real, sourced
            results are loaded.
          </p>
        )}
        {stats.last_updated && (
          <p className="mt-2 text-xs text-subtle">Last verified {formatDate(stats.last_updated)}</p>
        )}
      </section>

      <Picks picks={recommend.picks} />

      <section className="space-y-4">
        <Filters categories={categories} params={params} />
        <LeaderboardTable
          items={board.items}
          scoreLabel={category ? `${category.name} score` : "Overall score"}
        />
        {pages > 1 && (
          <nav aria-label="Pagination" className="flex items-center justify-between text-sm text-muted">
            <span className="num">
              Page {board.page} of {pages} · {board.total} models
            </span>
            <span className="flex gap-2">
              {board.page > 1 && (
                <Link className="rounded-md border border-line-strong px-3 py-1.5 hover:text-foreground" href={link(board.page - 1)}>
                  Previous
                </Link>
              )}
              {board.page < pages && (
                <Link className="rounded-md border border-line-strong px-3 py-1.5 hover:text-foreground" href={link(board.page + 1)}>
                  Next
                </Link>
              )}
            </span>
          </nav>
        )}
      </section>
    </div>
  );
}
