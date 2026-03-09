import { Zap, DollarSign, Hash, Clock } from 'lucide-react';
import { ModelResponse } from '@/types/api';

interface ResultCardProps {
  result: ModelResponse;
  isFastest: boolean;
  isCheapest: boolean;
}

export function ResultCard({ result, isFastest, isCheapest }: ResultCardProps) {
  return (
    <div className={`
      flex flex-col bg-white rounded-2xl border overflow-hidden transition-all duration-200
      ${isFastest ? 'border-emerald-400 shadow-[0_0_0_1px_rgba(52,211,153,1)]' : 'border-zinc-200 shadow-sm'}
    `}>
      <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-zinc-900">{result.model}</h3>
          {isFastest && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-xs font-medium">
              <Zap className="w-3 h-3" /> Fastest
            </span>
          )}
          {isCheapest && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 text-xs font-medium">
              <DollarSign className="w-3 h-3" /> Cheapest
            </span>
          )}
        </div>
      </div>

      <div className="p-4 grow bg-white">
        <div className="h-62.5 overflow-y-auto pr-2 text-sm text-zinc-700 whitespace-pre-wrap font-sans leading-relaxed scrollbar-thin scrollbar-thumb-zinc-200">
          {result.content}
        </div>
      </div>

      <div className="p-4 bg-zinc-50 border-t border-zinc-100 grid grid-cols-2 gap-3 text-xs">
        <div className="flex flex-col gap-1">
          <span className="text-zinc-500 flex items-center gap-1"><Clock className="w-3 h-3" /> Latency</span>
          <span className="font-mono font-medium text-zinc-900">{result.latency_ms} ms</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-zinc-500 flex items-center gap-1"><DollarSign className="w-3 h-3" /> Cost</span>
          <span className="font-mono font-medium text-zinc-900">${result.cost.toFixed(6)}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-zinc-500 flex items-center gap-1"><Hash className="w-3 h-3" /> In Tokens</span>
          <span className="font-mono font-medium text-zinc-900">{result.input_tokens}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-zinc-500 flex items-center gap-1"><Hash className="w-3 h-3" /> Out Tokens</span>
          <span className="font-mono font-medium text-zinc-900">{result.output_tokens}</span>
        </div>
      </div>
    </div>
  );
}