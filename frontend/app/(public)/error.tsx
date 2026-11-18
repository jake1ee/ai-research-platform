"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-md py-24 text-center">
      <h1 className="text-2xl font-semibold">We couldn&apos;t load this page</h1>
      <p className="mt-2 text-muted">The data service may be temporarily unavailable.</p>
      <button
        onClick={reset}
        className="mt-6 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-ink hover:opacity-90"
      >
        Try again
      </button>
    </div>
  );
}
