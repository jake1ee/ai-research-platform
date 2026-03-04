'use client';

/**
 * ModelResultCard – one card per model in the center panel
 * ---------------------------------------------------------
 * States: idle | streaming | complete | error
 *
 * Shows:
 *  • Header: model name, provider chip, context window, badges
 *  • Metrics row: latency, cost, input/output tokens, tokens/sec
 *  • Scrollable output area with syntax highlight toggle
 *  • Copy button, expand modal, retry button
 *  • Streaming animation (blinking cursor)
 *  • Skeleton loader while pending
 */

import { useState } from 'react';
import {
  Copy, Check, Maximize2, RotateCcw,
  Clock, DollarSign, Hash, Zap, AlertCircle, X,
} from 'lucide-react';
import { Badge, type BadgeVariant } from './Badge';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ResultStatus = 'idle' | 'pending' | 'streaming' | 'complete' | 'error';

export interface ModelResult {
  modelId: string;
  modelName: string;
  provider: string;
  contextWindow: number;
  status: ResultStatus;
  output: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  costUsd: number;
  tokensPerSec: number;
  badges: BadgeVariant[];
  judgeScore?: number;
  judgeReasoning?: string;
  error?: string;
}

interface ModelResultCardProps {
  result: ModelResult;
  onRetry?: (modelId: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PROVIDER_DOT: Record<string, string> = {
  OpenAI:    'bg-[#10a37f]',
  Anthropic: 'bg-[#d4a574]',
  Google:    'bg-[#4285f4]',
  Cohere:    'bg-[#39594d]',
};

function formatCost(usd: number) {
  if (usd === 0) return '$0.000';
  if (usd < 0.0001) return `$${(usd * 1_000_000).toFixed(1)}μ`;
  if (usd < 0.001)  return `$${(usd * 1000).toFixed(2)}m`;
  return `$${usd.toFixed(4)}`;
}

function formatLatency(ms: number) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms.toFixed(0)}ms`;
}

function formatCtx(n: number) {
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : `${Math.round(n / 1000)}k`;
}

// ─── Metric chip ─────────────────────────────────────────────────────────────

function Metric({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5" title={label}>
      <div className="flex items-center gap-1 text-zinc-400">{icon}</div>
      <span className="font-mono text-xs font-medium text-zinc-200">{value}</span>
      <span className="text-[9px] uppercase tracking-wide text-zinc-600">{label}</span>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function CardSkeleton({ modelName }: { modelName: string }) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-zinc-800 bg-zinc-900">
      <div className="border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-zinc-700 animate-pulse" />
          <span className="text-sm font-semibold text-zinc-300">{modelName}</span>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4 animate-pulse">
        <div className="grid grid-cols-4 gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="h-3 w-8 rounded bg-zinc-800" />
              <div className="h-2 w-6 rounded bg-zinc-800" />
            </div>
          ))}
        </div>
        <div className="flex-1 space-y-2 rounded-lg bg-zinc-800/50 p-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-3 rounded bg-zinc-800" style={{ width: `${60 + Math.random() * 40}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Expand modal ─────────────────────────────────────────────────────────────

function ExpandModal({
  modelName,
  output,
  onClose,
}: {
  modelName: string;
  output: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative flex h-[80vh] w-[80vw] max-w-4xl flex-col rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3">
          <span className="text-sm font-semibold text-zinc-200">{modelName} – Full Output</span>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <pre className="whitespace-pre-wrap font-mono text-sm text-zinc-200 leading-relaxed">
            {output}
          </pre>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ModelResultCard({ result, onRetry }: ModelResultCardProps) {
  const [copied, setCopied]     = useState(false);
  const [expanded, setExpanded] = useState(false);

  const {
    modelName, provider, contextWindow, status,
    output, inputTokens, outputTokens, latencyMs,
    costUsd, tokensPerSec, badges, error,
    judgeScore, judgeReasoning,
  } = result;

  // Pending → show skeleton
  if (status === 'idle' || status === 'pending') {
    return <CardSkeleton modelName={modelName} />;
  }

  async function copyOutput() {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const isStreaming = status === 'streaming';
  const isError     = status === 'error';
  const dotColor    = PROVIDER_DOT[provider] ?? 'bg-zinc-500';

  return (
    <>
      <div className={`flex h-full flex-col rounded-xl border bg-zinc-900 transition-colors ${
        isError ? 'border-red-500/40' : 'border-zinc-800 hover:border-zinc-700'
      }`}>

        {/* ── Card header ──────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-2 border-b border-zinc-800 px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 flex-shrink-0 rounded-full ${dotColor}`} />
              <span className="truncate text-sm font-semibold text-zinc-100">{modelName}</span>
            </div>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
                {provider}
              </span>
              <span className="text-[10px] text-zinc-600">
                {formatCtx(contextWindow)} ctx
              </span>
            </div>
          </div>

          {/* Badges */}
          {badges.length > 0 && (
            <div className="flex flex-wrap gap-1 justify-end">
              {badges.map((b) => (
                <Badge key={b} variant={b} />
              ))}
            </div>
          )}
        </div>

        {/* ── Metrics row ──────────────────────────────────────────────── */}
        {!isError && (
          <div className="grid grid-cols-5 gap-1 border-b border-zinc-800 px-4 py-2.5">
            <Metric icon={<Clock className="h-3 w-3" />}       value={isStreaming ? '…' : formatLatency(latencyMs)} label="Latency" />
            <Metric icon={<DollarSign className="h-3 w-3" />}  value={isStreaming ? '…' : formatCost(costUsd)}      label="Cost" />
            <Metric icon={<Hash className="h-3 w-3" />}        value={isStreaming ? '…' : inputTokens.toLocaleString()}  label="In" />
            <Metric icon={<Hash className="h-3 w-3" />}        value={isStreaming ? '…' : outputTokens.toLocaleString()} label="Out" />
            <Metric icon={<Zap className="h-3 w-3" />}         value={isStreaming ? '…' : `${tokensPerSec.toFixed(0)}/s`} label="Speed" />
          </div>
        )}

        {/* ── Output area ──────────────────────────────────────────────── */}
        <div className="relative flex-1 overflow-hidden">
          {isError ? (
            /* Error state */
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <AlertCircle className="h-8 w-8 text-red-400" />
              <div>
                <p className="text-sm font-medium text-red-300">Model call failed</p>
                <p className="mt-1 text-xs text-zinc-500">{error ?? 'Unknown error'}</p>
              </div>
              {onRetry && (
                <button
                  onClick={() => onRetry(result.modelId)}
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:text-zinc-100 transition-colors"
                >
                  <RotateCcw className="h-3 w-3" />
                  Retry
                </button>
              )}
            </div>
          ) : (
            /* Output text */
            <div className="h-full overflow-y-auto p-4">
              <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-zinc-200">
                {output}
                {isStreaming && (
                  <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-violet-400 align-middle" />
                )}
              </pre>
            </div>
          )}

          {/* Action bar (only when complete) */}
          {status === 'complete' && output && (
            <div className="absolute bottom-2 right-2 flex items-center gap-1">
              <button
                onClick={copyOutput}
                className="flex h-7 items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900/90 px-2.5 text-xs text-zinc-400 backdrop-blur-sm hover:text-zinc-200 transition-colors"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button
                onClick={() => setExpanded(true)}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900/90 text-zinc-400 backdrop-blur-sm hover:text-zinc-200 transition-colors"
              >
                <Maximize2 className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        {/* ── Judge score ───────────────────────────────────────────────── */}
        {judgeScore !== undefined && (
          <div className="border-t border-zinc-800 px-4 py-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">Judge Score</span>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-20 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-amber-400"
                    style={{ width: `${(judgeScore / 10) * 100}%` }}
                  />
                </div>
                <span className="font-mono text-xs font-bold text-amber-400">
                  {judgeScore.toFixed(1)}<span className="font-normal text-zinc-600">/10</span>
                </span>
              </div>
            </div>
            {judgeReasoning && (
              <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500 line-clamp-2">
                {judgeReasoning}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Expand modal */}
      {expanded && (
        <ExpandModal
          modelName={modelName}
          output={output}
          onClose={() => setExpanded(false)}
        />
      )}
    </>
  );
}
