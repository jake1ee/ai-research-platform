export function KpiCards({}){
    return (  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 bg-white rounded-2xl border border-zinc-200 shadow-sm">
              <div className="text-zinc-500 text-xs md:text-sm font-medium mb-1">Total Comparisons</div>
              <div className="text-xl md:text-2xl font-bold text-black">1,284</div>
              <div className="text-[10px] md:text-xs text-emerald-600 font-medium mt-2 flex items-center gap-1">↑ 12% from last month</div>
            </div>
            <div className="p-5 bg-white rounded-2xl border border-zinc-200 shadow-sm">
              <div className="text-zinc-500 text-xs md:text-sm font-medium mb-1">Total Cost</div>
              <div className="text-xl md:text-2xl font-bold text-black font-mono">$14.23</div>
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
          </div>);
}