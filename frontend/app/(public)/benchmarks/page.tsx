import type { Metadata } from "next";
import Link from "next/link";
import { Chip } from "@/components/ui/badge";
import { api } from "@/lib/api";

export const metadata: Metadata = {
  title: "Benchmarks",
  description: "The benchmarks behind every ranking, grouped by category.",
};
export const dynamic = "force-dynamic"; // data is cached per-request by fetch(revalidate); avoids build-time API dependency

export default async function BenchmarksPage() {
  const [benchmarks, categories] = await Promise.all([api.benchmarks(), api.categories()]);
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Benchmarks</h1>
        <p className="mt-2 text-muted">{benchmarks.length} benchmarks in {categories.length} categories.</p>
      </header>
      {categories.map((c) => {
        const items = benchmarks.filter((b) => b.category === c.slug);
        if (!items.length) return null;
        return (
          <section key={c.slug} aria-labelledby={`c-${c.slug}`}>
            <h2 id={`c-${c.slug}`} className="mb-3 flex items-baseline gap-3 text-sm font-semibold uppercase tracking-wider text-subtle">
              {c.name} <span className="num normal-case text-subtle">weight {Math.round(c.weight * 100)}%</span>
            </h2>
            <ul className="grid gap-3 md:grid-cols-2">
              {items.map((b) => (
                <li key={b.slug}>
                  <Link href={`/benchmarks/${b.slug}`} className="block h-full rounded-[var(--radius-card)] border border-line bg-surface p-4 transition-colors hover:border-accent/60">
                    <div className="font-medium">{b.name}</div>
                    <p className="mt-1 text-sm text-muted">{b.description}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {b.year && <Chip>{b.year}</Chip>}
                      {b.difficulty && <Chip className="capitalize">{b.difficulty}</Chip>}
                      {b.format && <Chip>{b.format}</Chip>}
                      <Chip>{b.model_count} models</Chip>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
