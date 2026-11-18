export type License = "open" | "proprietary";
export type Evidence = "supported" | "estimated" | "unranked";
export type Provenance = "lab" | "maintainer" | "independent" | "third_party";

export interface Category {
  slug: string;
  name: string;
  weight: number;
}

export interface ModelEntry {
  slug: string;
  name: string;
  family: string;
  provider: string;
  provider_slug: string;
  license: License;
  context_window: number;
  input_price: number;
  output_price: number;
  tokens_per_sec: number;
  first_token_ms: number;
  release_date: string;
  rank: number | null;
  overall: number | null;
  categories: Record<string, number>;
  evidence: Evidence;
  source_families: number;
  benchmark_count: number;
}

export interface ModelResult {
  benchmark: string;
  benchmark_name: string;
  category: string;
  score: number;
  provenance: Provenance;
  source: string;
  source_url: string;
  measured_at: string;
}

export interface ModelDetail extends ModelEntry {
  results: ModelResult[];
  siblings: { slug: string; name: string; overall: number | null }[];
}

export interface LeaderboardPage {
  total: number;
  page: number;
  page_size: number;
  items: ModelEntry[];
}

export interface Benchmark {
  slug: string;
  name: string;
  category: string;
  description: string;
  year: number | null;
  format: string | null;
  difficulty: "easy" | "medium" | "hard" | null;
  source_url: string | null;
  model_count: number;
}

export interface BenchmarkDetail extends Benchmark {
  leaderboard: {
    rank: number;
    model: string;
    model_name: string;
    provider: string;
    score: number;
    provenance: Provenance;
    source: string;
    source_url: string;
  }[];
}

export interface Compare {
  models: ModelEntry[];
  category_winners: Record<string, string>;
  benchmarks: { benchmark: string; name: string; category: string; scores: Record<string, number> }[];
  verdict: { model: string; category_wins: number; of: number } | null;
}

export interface Pick {
  decision: string;
  model: ModelEntry;
  measure: "overall" | "output_price" | "tokens_per_sec" | "context_window";
  value: number;
}

export interface Stats {
  models: number;
  ranked: number;
  supported: number;
  estimated: number;
  benchmarks: number;
  results: number;
  categories: number;
  providers: number;
  sample_data: boolean;
  last_updated: string | null;
  live_updated: string | null;
}

export interface Methodology {
  categories: Category[];
  rules: {
    min_categories: number;
    min_source_families: number;
    close_call_points: number;
    interpolation: boolean;
  };
  provenance_share: Record<string, number>;
  sample_data: boolean;
}
