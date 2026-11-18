import type { Metadata } from "next";
import { API_URL } from "@/lib/api";

export const metadata: Metadata = {
  title: "Data & API",
  description: "Download the dataset or query the public JSON API.",
};

const files = ["leaderboard", "models", "benchmarks", "pricing", "speed"];
const endpoints = [
  ["GET /v1/leaderboard", "Ranked models. Filters: category, license, provider, q, sort, order, page."],
  ["GET /v1/models/{slug}", "Model detail with every benchmark result and its provenance."],
  ["GET /v1/benchmarks/{slug}", "Benchmark detail with a per-benchmark leaderboard."],
  ["GET /v1/compare?models=a,b", "Compare 2-5 models: category winners and benchmark deltas."],
  ["GET /v1/recommend?max_price=", "Decision-ready picks (best open weight, value, fastest, context)."],
  ["GET /v1/methodology", "Weights, ranking rules and provenance shares."],
];

export default function DataPage() {
  return (
    <div className="max-w-3xl space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Data &amp; API</h1>
        <p className="mt-2 text-muted">
          Free, read-only, cached, and rate limited. Licensed CC BY-NC 4.0: attribution required,
          non-commercial use.
        </p>
      </header>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Downloads</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {files.map((f) => (
            <li key={f} className="flex items-center justify-between rounded-[var(--radius-card)] border border-line bg-surface px-4 py-3">
              <span className="num">{f}</span>
              <span className="flex gap-3 text-sm">
                <a className="text-accent hover:underline" href={`${API_URL}/v1/data/${f}.json`}>JSON</a>
                <a className="text-accent hover:underline" href={`${API_URL}/v1/data/${f}.csv`}>CSV</a>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-sm text-subtle">
          <a className="hover:text-foreground" href={`${API_URL}/v1/data/manifest.json`}>manifest.json</a>{" "}
          lists row counts and SHA-256 hashes for citation.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Endpoints</h2>
        <dl className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-surface">
          {endpoints.map(([e, d]) => (
            <div key={e} className="px-4 py-3">
              <dt className="num text-sm text-accent">{e}</dt>
              <dd className="mt-0.5 text-sm text-muted">{d}</dd>
            </div>
          ))}
        </dl>
        <pre className="num mt-4 overflow-x-auto rounded-[var(--radius-card)] border border-line bg-surface p-4 text-sm text-muted">
{`curl "${API_URL}/v1/leaderboard?category=coding&license=open&page_size=5"`}
        </pre>
      </section>
    </div>
  );
}
