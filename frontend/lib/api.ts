import type {
  Benchmark,
  BenchmarkDetail,
  Category,
  Compare,
  LeaderboardPage,
  Methodology,
  ModelDetail,
  ModelEntry,
  Pick,
  Stats,
} from "./types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

type Query = Record<string, string | number | undefined | null>;

export function toQuery(params: Query): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/** Server-side fetch of the public API with ISR caching. */
async function get<T>(path: string, params: Query = {}, revalidate = 300): Promise<T> {
  const res = await fetch(`${API_URL}/v1${path}${toQuery(params)}`, { next: { revalidate } });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.error?.message ?? `API error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/** Returns null on 404 so pages can call notFound(). */
async function getOrNull<T>(path: string, params: Query = {}): Promise<T | null> {
  try {
    return await get<T>(path, params);
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 422)) return null;
    throw e;
  }
}

export const api = {
  leaderboard: (p: Query = {}) => get<LeaderboardPage>("/leaderboard", p),
  categories: () => get<Category[]>("/categories"),
  models: () => get<ModelEntry[]>("/models"),
  model: (slug: string) => getOrNull<ModelDetail>(`/models/${encodeURIComponent(slug)}`),
  benchmarks: () => get<Benchmark[]>("/benchmarks"),
  benchmark: (slug: string) => getOrNull<BenchmarkDetail>(`/benchmarks/${encodeURIComponent(slug)}`),
  compare: (slugs: string[]) => getOrNull<Compare>("/compare", { models: slugs.join(",") }),
  recommend: () => get<{ picks: Pick[] }>("/recommend"),
  stats: () => get<Stats>("/stats"),
  methodology: () => get<Methodology>("/methodology"),
};
