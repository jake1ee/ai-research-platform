import type { Metadata } from "next";
import { api } from "@/lib/api";

export const metadata: Metadata = {
  title: "Methodology",
  description: "How Inferra scores, ranks and labels models.",
};
export const dynamic = "force-dynamic"; // data is cached per-request by fetch(revalidate); avoids build-time API dependency

const provenanceLabel: Record<string, string> = {
  lab: "Reported by the lab",
  maintainer: "Run by benchmark maintainers",
  independent: "Independent run",
  third_party: "Reported by a third party",
};

export default async function MethodologyPage() {
  const m = await api.methodology();
  return (
    <article className="max-w-3xl space-y-8 [&_h2]:text-xl [&_h2]:font-semibold [&_p]:text-muted">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Methodology</h1>
        <p className="mt-2">
          Inferra aggregates published benchmark results. We do not run evaluations ourselves, and
          missing results stay blank: there is no interpolation.
        </p>
      </header>

      <section className="space-y-3">
        <h2>Scoring</h2>
        <p>
          A category score is the mean of a model&apos;s benchmark scores in that category. The overall
          score is the weighted mean of the categories the model has data for, with weights
          renormalised. A model needs at least <b className="num text-foreground">{m.rules.min_categories}</b>{" "}
          categories to be ranked.
        </p>
        <div className="overflow-x-auto rounded-[var(--radius-card)] border border-line bg-surface">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Category weights</caption>
            <thead className="text-[11px] uppercase tracking-wider text-subtle">
              <tr><th scope="col" className="px-4 py-2">Category</th><th scope="col" className="px-4 py-2 text-right">Weight</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {m.categories.map((c) => (
                <tr key={c.slug}>
                  <td className="px-4 py-2.5">{c.name}</td>
                  <td className="num px-4 py-2.5 text-right">{Math.round(c.weight * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2>Evidence labels</h2>
        <p>
          <b className="text-accent">Supported</b>: results come from at least {m.rules.min_source_families}{" "}
          distinct source families, including one that is not the lab itself.{" "}
          <b className="text-warn">Estimated</b>: anything less.
        </p>
        <p>
          Close-call rule: an Estimated model cannot rank above a Supported model that sits within{" "}
          <span className="num text-foreground">{m.rules.close_call_points}</span> points below it.
        </p>
      </section>

      <section className="space-y-3">
        <h2>Where results come from</h2>
        <ul className="space-y-2">
          {Object.entries(m.provenance_share).sort(([, a], [, b]) => b - a).map(([k, v]) => (
            <li key={k} className="flex items-center gap-3 text-sm">
              <span className="w-56 text-muted">{provenanceLabel[k] ?? k}</span>
              <span aria-hidden className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                <span className="block h-full bg-accent" style={{ width: `${v}%` }} />
              </span>
              <span className="num w-12 text-right">{v}%</span>
            </li>
          ))}
        </ul>
      </section>

      {m.sample_data && (
        <p role="note" className="rounded-md border border-warn/40 bg-warn/10 px-3 py-2 text-sm !text-warn">
          This deployment currently shows fictional demo data.
        </p>
      )}
    </article>
  );
}
