import type { Metadata } from "next";
import Link from "next/link";
import { CategoryRadar, SERIES_COLORS } from "@/components/charts/radar";
import { ComparePicker } from "@/features/compare/compare-picker";
import { api } from "@/lib/api";
import { formatContext, formatPrice, formatScore, parseSlugs } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Compare models",
  description: "Compare up to five LLMs side by side: category winners, benchmark deltas, price and speed.",
};

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ models?: string }>;
}) {
  const slugs = parseSlugs((await searchParams).models);
  const [all, categories, result] = await Promise.all([
    api.models(),
    api.categories(),
    slugs.length >= 2 ? api.compare(slugs) : Promise.resolve(null),
  ]);

  const options = all
    .filter((m) => m.overall !== null)
    .map((m) => ({ slug: m.slug, name: m.name, provider: m.provider }));
  const unknown = slugs.length >= 2 && !result;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Compare models</h1>
        <p className="mt-2 text-muted">The URL is shareable: it always reflects your current selection.</p>
      </header>

      <ComparePicker options={options} selected={slugs} />

      {unknown && (
        <p role="alert" className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          One or more selected models could not be found.
        </p>
      )}
      {slugs.length < 2 && (
        <p className="text-muted">Select at least two models to see a comparison.</p>
      )}

      {result && (
        <>
          {result.verdict && (
            <section className="rounded-[var(--radius-card)] border border-accent/30 bg-accent/5 p-4">
              <div className="text-[11px] uppercase tracking-wider text-accent">Verdict</div>
              <p className="mt-1 text-lg">
                <strong>{result.models.find((m) => m.slug === result.verdict!.model)?.name}</strong> wins{" "}
                <span className="num">{result.verdict.category_wins}</span> of{" "}
                <span className="num">{result.verdict.of}</span> categories.
              </p>
            </section>
          )}

          <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
            <section className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
              <h2 className="mb-2 text-sm font-semibold">Category profile</h2>
              <CategoryRadar
                data={categories
                  .filter((c) => result.models.some((m) => c.slug in m.categories))
                  .map((c) => ({
                    axis: c.name,
                    ...Object.fromEntries(result.models.map((m) => [m.slug, m.categories[c.slug] ?? 0])),
                  }))}
                series={result.models.map((m) => ({ key: m.slug, label: m.name }))}
              />
            </section>

            <section className="overflow-x-auto rounded-[var(--radius-card)] border border-line bg-surface">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Model facts</caption>
                <thead className="text-[11px] uppercase tracking-wider text-subtle">
                  <tr>
                    <th scope="col" className="px-4 py-3">Model</th>
                    <th scope="col" className="px-2 py-3 text-right">Score</th>
                    <th scope="col" className="px-2 py-3 text-right">Ctx</th>
                    <th scope="col" className="px-2 py-3 text-right">Out $</th>
                    <th scope="col" className="px-4 py-3 text-right">Tok/s</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {result.models.map((m, i) => (
                    <tr key={m.slug}>
                      <td className="px-4 py-2.5">
                        <span aria-hidden className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: SERIES_COLORS[i] }} />
                        <Link href={`/models/${m.slug}`} className="font-medium hover:text-accent">{m.name}</Link>
                      </td>
                      <td className="num px-2 py-2.5 text-right font-semibold">{formatScore(m.overall)}</td>
                      <td className="num px-2 py-2.5 text-right text-muted">{formatContext(m.context_window)}</td>
                      <td className="num px-2 py-2.5 text-right text-muted">{formatPrice(m.output_price)}</td>
                      <td className="num px-4 py-2.5 text-right text-muted">{m.tokens_per_sec}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>

          <section className="overflow-x-auto rounded-[var(--radius-card)] border border-line bg-surface">
            <h2 className="border-b border-line px-4 py-3 text-sm font-semibold">Benchmark by benchmark</h2>
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wider text-subtle">
                <tr>
                  <th scope="col" className="px-4 py-2">Benchmark</th>
                  {result.models.map((m) => (
                    <th key={m.slug} scope="col" className="px-2 py-2 text-right">{m.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {result.benchmarks.map((b) => {
                  const best = Math.max(...Object.values(b.scores));
                  return (
                    <tr key={b.benchmark}>
                      <td className="px-4 py-2.5">
                        <Link href={`/benchmarks/${b.benchmark}`} className="hover:text-accent">{b.name}</Link>
                      </td>
                      {result.models.map((m) => {
                        const v = b.scores[m.slug];
                        return (
                          <td key={m.slug} className={cn("num px-2 py-2.5 text-right", v === best ? "font-semibold text-accent" : "text-muted")}>
                            {v === undefined ? "-" : v.toFixed(1)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}
