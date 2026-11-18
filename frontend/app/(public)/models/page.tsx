import type { Metadata } from "next";
import Link from "next/link";
import { EvidenceBadge, LicenseBadge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { formatContext, formatScore } from "@/lib/format";
import type { ModelEntry } from "@/lib/types";

export const metadata: Metadata = {
  title: "Models",
  description: "Every tracked LLM, grouped by provider, with scores, context and licence.",
};
export const dynamic = "force-dynamic"; // data is cached per-request by fetch(revalidate); avoids build-time API dependency

export default async function ModelsPage() {
  const models = await api.models();
  const groups = new Map<string, ModelEntry[]>();
  for (const m of models) groups.set(m.provider, [...(groups.get(m.provider) ?? []), m]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Models</h1>
        <p className="mt-2 text-muted">{models.length} models across {groups.size} providers.</p>
      </header>
      {[...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([provider, items]) => (
        <section key={provider} aria-labelledby={`p-${provider}`}>
          <h2 id={`p-${provider}`} className="mb-3 text-sm font-semibold uppercase tracking-wider text-subtle">
            {provider}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((m) => (
              <li key={m.slug}>
                <Link
                  href={`/models/${m.slug}`}
                  className="block rounded-[var(--radius-card)] border border-line bg-surface p-4 transition-colors hover:border-accent/60"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium">{m.name}</span>
                    <span className="num text-lg font-semibold text-accent">{formatScore(m.overall)}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <LicenseBadge license={m.license} />
                    <EvidenceBadge evidence={m.evidence} />
                    <span className="num text-xs text-subtle">{formatContext(m.context_window)} ctx</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
