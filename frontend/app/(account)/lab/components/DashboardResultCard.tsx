import React, { useState } from 'react';
import { Copy, RefreshCw, ChevronDown, ChevronUp, Activity } from 'lucide-react';
import { ModelResponse } from '@/types/api';

interface DashboardResultCardProps {
  result: ModelResponse;
  isFastest: boolean;
  isCheapest: boolean;
  onRegenerate: (model: string) => void;
}

export function DashboardResultCard({ result, isFastest, isCheapest, onRegenerate }: DashboardResultCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const tokensPerSec = ((result.output_tokens / result.latency_ms) * 1000).toFixed(1);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className={`flex flex-col bg-white rounded-2xl border overflow-hidden transition-all duration-200 ${isFastest ? 'border-emerald-400 shadow-[0_0_0_1px_rgba(52,211,153,1)]' : 'border-zinc-200 shadow-sm'}`}>
      <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-zinc-900">{result.model}</h3>
          {isFastest && <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-xs font-medium">Fastest</span>}
          {isCheapest && <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 text-xs font-medium">Cheapest</span>}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handleCopy} className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-md hover:bg-zinc-100 transition-colors" title="Copy Output">
            {copied ? <Activity className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
          </button>
          <button onClick={() => onRegenerate(result.model)} className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-md hover:bg-zinc-100 transition-colors" title="Regenerate">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="p-4 grow bg-white">
        <div className={`text-sm text-zinc-700 whitespace-pre-wrap font-sans leading-relaxed ${expanded ? '' : 'line-clamp-4'}`}>
          {result.content}
        </div>
        <button onClick={() => setExpanded(!expanded)} className="mt-2 text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
          {expanded ? <><ChevronUp className="w-3 h-3"/> Show Less</> : <><ChevronDown className="w-3 h-3"/> Show More</>}
        </button>
      </div>
      <div className="p-4 bg-zinc-50 border-t border-zinc-100 grid grid-cols-2 gap-3 text-xs">
        <div className="flex flex-col gap-1"><span className="text-zinc-500">Latency</span><span className="font-mono font-medium text-zinc-900">{result.latency_ms} ms</span></div>
        <div className="flex flex-col gap-1"><span className="text-zinc-500">Cost</span><span className="font-mono font-medium text-zinc-900">${result.cost.toFixed(4)}</span></div>
        <div className="flex flex-col gap-1"><span className="text-zinc-500">Tokens</span><span className="font-mono font-medium text-zinc-900">{result.output_tokens}</span></div>
        <div className="flex flex-col gap-1"><span className="text-zinc-500">Speed</span><span className="font-mono font-medium text-zinc-900">{tokensPerSec} t/s</span></div>
      </div>
    </div>
  );
}
