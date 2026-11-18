import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryRadar } from "@/components/charts/radar";
import { EvidenceBadge, LicenseBadge, ProvenanceChip } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { formatContext, formatDate, formatPrice, formatScore } from "@/lib/format";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const model = await api.model((await params).slug);
  if (!model) return { title: "Model not found" };
  return {
    title: model.name,
    description: `${model.name} by ${model.provider}: overall score ${formatScore(model.overall)}, benchmark results and pricing.`,
  };
}

export default async function ModelPage({ params }: Props) {
  const { slug } = await params;
  const [model, categories] = await Promise.all([api.model(slug), api.categories()]);
  if (!model) notFound();

  const radar = categories
    .filter((c) => c.slug in model.categories)
    .map((c) => ({ axis: c.name, score: model.categories[c.slug] }));

  const facts: [string, string][] = [
    ["Context window", formatContext(model.context_window)],
    ["Input $/1M", formatPrice(model.input_price)],
    ["Output $/1M", formatPrice(model.output_price)],
    ["Throughput", `${model.tokens_per_sec} tok/s`],
    ["First token", `${model.first_token_ms} ms`],
    ["Released", formatDate(model.release_date)],
  ];

  return (
    <div className="space-y-8">
      <nav aria-label="Breadcrumb" className="text-sm text-subtle">
        <Link href="/models" className="hover:text-foreground">Models</Link> / {model.name}
      </nav>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{model.name}</h1>
          <p className="mt-1 text-muted">{model.provider}</p>
          <div className="mt-3 flex gap-2">
            <LicenseBadge license={model.license} />
            <EvidenceBadge evidence={model.evidence} families={model.source_families} />
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] uppercase tracking-wider text-subtle">
            Overall · rank {model.rank ?? "-"}
          </div>
          <div className="num text-5xl font-semibold text-accent">{formatScore(model.overall)}</div>
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-card)] border border-line bg-line sm:grid-cols-3 lg:grid-cols-6">
        {facts.map(([k, v]) => (
          <div key={k} className="bg-surface px-4 py-3">
            <dt className="text-[11px] uppercase tracking-wider text-subtle">{k}</dt>
            <dd className="num mt-1 font-medium">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <section className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
          <h2 className="mb-2 text-sm font-semibold">Category profile</h2>
          <CategoryRadar data={radar} series={[{ key: "score", label: model.name }]} />
        </section>
        <section className="overflow-x-auto rounded-[var(--radius-card)] border border-line bg-surface">
          <h2 className="border-b border-line px-4 py-3 text-sm font-semibold">
            Benchmark results ({model.results.length})
          </h2>
          <table className="w-full text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-subtle">
              <tr>
                <th scope="col" className="px-4 py-2">Benchmark</th>
                <th scope="col" className="px-2 py-2 text-right">Score</th>
                <th scope="col" className="px-4 py-2">Provenance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {[...model.results].sort((a, b) => b.score - a.score).map((r) => (
                <tr key={`${r.benchmark}-${r.source}`}>
                  <td className="px-4 py-2.5">
                    <Link href={`/benchmarks/${r.benchmark}`} className="hover:text-accent">{r.benchmark_name}</Link>
                    <div className="text-xs capitalize text-subtle">{r.category.replace("_", " ")}</div>
                  </td>
                  <td className="num px-2 py-2.5 text-right font-semibold">{r.score.toFixed(1)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <ProvenanceChip provenance={r.provenance} />
                      <a href={r.source_url} rel="noopener noreferrer" target="_blank" className="text-xs text-subtle hover:text-foreground">
                        {r.source}
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      {model.siblings.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold">Same family</h2>
          <div className="flex flex-wrap gap-2">
            {model.siblings.map((s) => (
              <Link key={s.slug} href={`/models/${s.slug}`} className="rounded-md border border-line-strong px-3 py-1.5 text-sm text-muted hover:text-foreground">
                {s.name} <span className="num text-accent">{formatScore(s.overall)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
      <p>
        <Link href={`/compare?models=${model.slug}`} className="text-sm text-accent hover:underline">
          Compare {model.name} with other models →
        </Link>
      </p>
    </div>
  );
}
