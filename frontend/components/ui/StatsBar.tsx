import { Calculator, Clock, Zap } from 'lucide-react';
import { ModelResponse } from '@/types/api';

export function StatsBar({ results }: { results: ModelResponse[] }) {
  if (!results.length) return null;

  const totalCost = results.reduce((sum, r) => sum + r.cost, 0);
  const avgLatency = Math.round(results.reduce((sum, r) => sum + r.latency_ms, 0) / results.length);
  const fastestModel = [...results].sort((a, b) => a.latency_ms - b.latency_ms)[0];

  return (
    <div className="flex flex-wrap items-center gap-4 p-4 bg-white border border-zinc-200 rounded-xl shadow-sm">
      <div className="flex items-center gap-3 pr-4 border-r border-zinc-200">
        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
          <Calculator className="w-4 h-4" />
        </div>
        <div>
          <p className="text-xs text-zinc-500 font-medium">Total Cost</p>
          <p className="text-sm font-bold text-zinc-900 font-mono">${totalCost.toFixed(6)}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 pr-4 border-r border-zinc-200">
        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
          <Clock className="w-4 h-4" />
        </div>
        <div>
          <p className="text-xs text-zinc-500 font-medium">Avg Latency</p>
          <p className="text-sm font-bold text-zinc-900 font-mono">{avgLatency} ms</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
          <Zap className="w-4 h-4" />
        </div>
        <div>
          <p className="text-xs text-zinc-500 font-medium">Fastest Model</p>
          <p className="text-sm font-bold text-zinc-900">{fastestModel.model}</p>
        </div>
      </div>
    </div>
  );
}