export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="space-y-4">
      <div className="h-10 w-80 animate-pulse rounded-md bg-surface-2" />
      <div className="h-24 animate-pulse rounded-[var(--radius-card)] bg-surface" />
      <div className="h-96 animate-pulse rounded-[var(--radius-card)] bg-surface" />
    </div>
  );
}
