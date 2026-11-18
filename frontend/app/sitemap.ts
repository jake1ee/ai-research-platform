import type { MetadataRoute } from "next";
import { api } from "@/lib/api";

const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = ["", "/models", "/benchmarks", "/compare", "/methodology", "/data"].map(
    (p) => ({ url: `${site}${p}`, changeFrequency: "daily" as const }),
  );
  try {
    const [models, benchmarks] = await Promise.all([api.models(), api.benchmarks()]);
    return [
      ...staticRoutes,
      ...models.map((m) => ({ url: `${site}/models/${m.slug}` })),
      ...benchmarks.map((b) => ({ url: `${site}/benchmarks/${b.slug}` })),
    ];
  } catch {
    return staticRoutes; // API unavailable at build time: still serve the static routes
  }
}
