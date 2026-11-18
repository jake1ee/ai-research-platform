import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Chip, ProvenanceChip } from "@/components/ui/badge";
import { ScoreBar } from "@/components/ui/score-bar";
import { api } from "@/lib/api";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const b = await api.benchmark((await params).slug);
  return b ? { title: b.name, description: b.description } : { title: "Benchmark not found" };
}

export default async function BenchmarkPage({ params }: Props) {
  const b = await api.benchmark((await params).slug);
  if (!b) notFound();

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="text-sm text-subtle">
        <Link href="/benchmarks" className="hover:text-foreground">Benchmarks</Link> / {b.name}
      </nav>
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">{b.name}</h1>
        <p className="mt-2 max-w-2xl text-muted">{b.description}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Chip className="capitalize">{b.category.replace("_", " ")}</Chip>
          {b.year && <Chip>{b.year}</Chip>}
          {b.difficulty && <Chip className="capitalize">{b.difficulty}</Chip>}
          {b.format && <Chip>{b.format}</Chip>}
        </div>
      </header>
      <div className="overflow-x-auto rounded-[var(--radius-card)] border border-line bg-surface">
        <table className="w-full min-w-[560px] text-left text-sm">
          <caption className="sr-only">Results on {b.name}</caption>
          <thead className="border-b border-line text-[11px] uppercase tracking-wider text-subtle">
            <tr>
              <th scope="col" className="w-14 px-4 py-3">#</th>
              <th scope="col" className="px-2 py-3">Model</th>
              <th scope="col" className="px-2 py-3">Score</th>
              <th scope="col" className="px-4 py-3">Provenance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {b.leaderboard.map((r) => (
              <tr key={`${r.model}-${r.source}`} className="hover:bg-surface-2">
                <td className="num px-4 py-3 text-muted">{r.rank}</td>
                <td className="px-2 py-3">
                  <Link href={`/models/${r.model}`} className="font-medium hover:text-accent">{r.model_name}</Link>
                  <div className="text-xs text-subtle">{r.provider}</div>
                </td>
                <td className="px-2 py-3"><ScoreBar score={r.score} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <ProvenanceChip provenance={r.provenance} />
                    <a href={r.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-subtle hover:text-foreground">{r.source}</a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
