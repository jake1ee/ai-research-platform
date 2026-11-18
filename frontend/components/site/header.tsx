import Link from "next/link";
import { NavLinks } from "./nav-links";

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2.5 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold tracking-tight">
          <span
            aria-hidden
            className="grid h-6 w-6 place-items-center rounded-md bg-accent text-[13px] font-black text-accent-ink"
          >
            I
          </span>
          Inferra
        </Link>
        <div className="min-w-0 flex-1">
          <NavLinks />
        </div>
        <Link
          href="/lab"
          className="hidden shrink-0 rounded-md border border-line-strong px-3 py-1.5 text-sm text-foreground transition-colors hover:border-accent hover:text-accent sm:block"
        >
          Evaluation Lab
        </Link>
      </div>
    </header>
  );
}
