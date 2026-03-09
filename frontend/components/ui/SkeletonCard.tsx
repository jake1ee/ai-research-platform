export function SkeletonCard() {
  return (
    <div className="flex flex-col bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden animate-pulse">
      <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
        <div className="h-5 bg-zinc-200 rounded w-32"></div>
      </div>
      <div className="p-4 grow bg-white space-y-3">
        <div className="h-4 bg-zinc-100 rounded w-full"></div>
        <div className="h-4 bg-zinc-100 rounded w-5/6"></div>
        <div className="h-4 bg-zinc-100 rounded w-4/6"></div>
        <div className="h-4 bg-zinc-100 rounded w-full"></div>
        <div className="h-4 bg-zinc-100 rounded w-3/4"></div>
      </div>
      <div className="p-4 bg-zinc-50 border-t border-zinc-100 grid grid-cols-2 gap-3">
        <div className="h-8 bg-zinc-200 rounded w-full"></div>
        <div className="h-8 bg-zinc-200 rounded w-full"></div>
        <div className="h-8 bg-zinc-200 rounded w-full"></div>
        <div className="h-8 bg-zinc-200 rounded w-full"></div>
      </div>
    </div>
  );
}