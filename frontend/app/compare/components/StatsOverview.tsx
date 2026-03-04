import React from 'react';

export function StatsOverview() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <div className="p-5 bg-white rounded-2xl border border-zinc-200 shadow-sm">
        <div className="text-zinc-500 text-xs md:text-sm font-medium mb-1">Total Requests</div>
        <div className="text-xl md:text-2xl font-bold text-black font-mono">14,230</div>
        <div className="text-[10px] md:text-xs text-zinc-500 font-medium mt-2">Across all providers</div>
      </div>
      <div className="p-5 bg-white rounded-2xl border border-zinc-200 shadow-sm">
        <div className="text-zinc-500 text-xs md:text-sm font-medium mb-1">Avg Latency</div>
        <div className="text-xl md:text-2xl font-bold text-black font-mono">840ms</div>
        <div className="text-[10px] md:text-xs text-emerald-600 font-medium mt-2 flex items-center gap-1">↓ 45ms improvement</div>
      </div>
      <div className="p-5 bg-white rounded-2xl border border-zinc-200 shadow-sm">
        <div className="text-zinc-500 text-xs md:text-sm font-medium mb-1">Most Used Model</div>
        <div className="text-xl md:text-2xl font-bold text-black">GPT-4o</div>
        <div className="text-[10px] md:text-xs text-zinc-500 font-medium mt-2">45% of total requests</div>
      </div>
    </div>
  );
}
