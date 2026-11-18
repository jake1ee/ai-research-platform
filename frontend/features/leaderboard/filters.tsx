import Link from "next/link";
import { cn } from "@/lib/utils";
import { toQuery } from "@/lib/api";
import type { Category } from "@/lib/types";

export interface LeaderboardParams {
  category?: string;
  license?: string;
  q?: string;
  sort?: string;
  order?: string;
  page?: string;
}

const field =
  "h-9 rounded-md border border-line-strong bg-surface px-3 text-sm text-foreground placeholder:text-subtle";

/** Category tabs are plain links and the filter bar is a GET form: fully server-rendered, shareable URLs. */
export function Filters({ categories, params }: { categories: Category[]; params: LeaderboardParams }) {
  const tab = (slug?: string) => `/${toQuery({ ...params, category: slug, page: undefined })}`;
  const tabs = [{ slug: undefined, name: "Overall" }, ...categories];

  return (
    <div className="space-y-4">
      <nav aria-label="Categories" className="-mx-1 flex gap-1 overflow-x-auto pb-1">
        {tabs.map((c) => {
          const active = (params.category ?? undefined) === c.slug;
          return (
            <Link
              key={c.slug ?? "overall"}
              href={tab(c.slug)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "whitespace-nowrap rounded-md border px-3 py-1.5 text-sm transition-colors",
                active
                  ? "border-accent bg-accent text-accent-ink font-semibold"
                  : "border-line text-muted hover:border-line-strong hover:text-foreground",
              )}
            >
              {c.name}
            </Link>
          );
        })}
      </nav>

      <form method="get" action="/" className="flex flex-wrap items-center gap-2">
        {params.category && <input type="hidden" name="category" value={params.category} />}
        <label className="sr-only" htmlFor="q">Search models</label>
        <input id="q" name="q" defaultValue={params.q} placeholder="Search model or provider" className={cn(field, "w-full sm:w-64")} />
        <label className="sr-only" htmlFor="license">Type</label>
        <select id="license" name="license" defaultValue={params.license ?? ""} className={field}>
          <option value="">All types</option>
          <option value="open">Open weight</option>
          <option value="proprietary">Proprietary</option>
        </select>
        <label className="sr-only" htmlFor="sort">Sort by</label>
        <select id="sort" name="sort" defaultValue={params.sort ?? "rank"} className={field}>
          <option value="rank">Rank</option>
          <option value="price">Price</option>
          <option value="context">Context</option>
          <option value="speed">Speed</option>
          <option value="name">Name</option>
        </select>
        <button type="submit" className="h-9 rounded-md bg-surface-2 px-4 text-sm font-medium text-foreground hover:bg-line">
          Apply
        </button>
        {(params.q || params.license || (params.sort && params.sort !== "rank")) && (
          <Link href={tab(params.category)} className="text-sm text-muted hover:text-foreground">
            Reset
          </Link>
        )}
      </form>
    </div>
  );
}
