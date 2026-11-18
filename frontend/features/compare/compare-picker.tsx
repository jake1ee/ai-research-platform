"use client";

import { useRouter } from "next/navigation";
import { useId } from "react";
import { cn } from "@/lib/utils";

const MAX = 5;

export function ComparePicker({
  options,
  selected,
}: {
  options: { slug: string; name: string; provider: string }[];
  selected: string[];
}) {
  const router = useRouter();
  const id = useId();

  const go = (next: string[]) =>
    router.push(next.length ? `/compare?models=${next.join(",")}` : "/compare", { scroll: false });

  const toggle = (slug: string) =>
    go(selected.includes(slug) ? selected.filter((s) => s !== slug) : [...selected, slug].slice(0, MAX));

  return (
    <fieldset className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
      <legend className="px-1 text-sm font-semibold">
        Choose 2-{MAX} models <span className="num text-subtle">({selected.length}/{MAX})</span>
      </legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => {
          const on = selected.includes(o.slug);
          const disabled = !on && selected.length >= MAX;
          return (
            <label
              key={o.slug}
              htmlFor={`${id}-${o.slug}`}
              className={cn(
                "cursor-pointer rounded-md border px-2.5 py-1.5 text-sm transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent",
                on ? "border-accent bg-accent/10 text-accent" : "border-line-strong text-muted hover:text-foreground",
                disabled && "cursor-not-allowed opacity-40",
              )}
            >
              <input
                id={`${id}-${o.slug}`}
                type="checkbox"
                className="sr-only"
                checked={on}
                disabled={disabled}
                onChange={() => toggle(o.slug)}
              />
              {o.name}
            </label>
          );
        })}
      </div>
      {selected.length > 0 && (
        <button type="button" onClick={() => go([])} className="mt-3 text-sm text-muted hover:text-foreground">
          Clear selection
        </button>
      )}
    </fieldset>
  );
}
