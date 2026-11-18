export function formatContext(tokens: number): string {
  if (tokens >= 1_000_000) return `${+(tokens / 1_000_000).toFixed(1)}M`;
  return `${Math.round(tokens / 1000)}K`;
}

/** USD per 1M output tokens. Open-weight models have no hosted price. */
export function formatPrice(price: number): string {
  if (price === 0) return "Self-hosted";
  return price < 1 ? `$${price.toFixed(2)}` : `$${+price.toFixed(2)}`;
}

export function formatScore(score: number | null | undefined): string {
  return score === null || score === undefined ? "-" : score.toFixed(1);
}

export function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function parseSlugs(raw: string | undefined, max = 5): string[] {
  if (!raw) return [];
  return [...new Set(raw.split(",").map((s) => s.trim()).filter(Boolean))].slice(0, max);
}
