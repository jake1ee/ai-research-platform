import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-line">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 text-sm text-muted sm:px-6 md:flex-row md:justify-between">
        <p className="max-w-sm">
          Inferra aggregates published benchmark results. We do not run evaluations ourselves and
          never interpolate missing scores.
        </p>
        <div className="flex gap-10">
          <ul className="space-y-2">
            <li><Link className="hover:text-foreground" href="/models">Models</Link></li>
            <li><Link className="hover:text-foreground" href="/benchmarks">Benchmarks</Link></li>
            <li><Link className="hover:text-foreground" href="/compare">Compare</Link></li>
          </ul>
          <ul className="space-y-2">
            <li><Link className="hover:text-foreground" href="/methodology">Methodology</Link></li>
            <li><Link className="hover:text-foreground" href="/data">Data &amp; API</Link></li>
            <li><Link className="hover:text-foreground" href="/lab">Evaluation Lab</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
