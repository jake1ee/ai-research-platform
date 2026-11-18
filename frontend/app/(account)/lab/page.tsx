'use client';

/**
 * Compare – AI Evaluation Lab
 * ----------------------------
 * 3-panel layout:
 *   LEFT  (320px fixed) – PromptPanel (config + model selection)
 *   CENTER (flex)        – Model result cards (scrollable grid)
 *   RIGHT (320px fixed)  – MetricsPanel (charts + scores)
 *
 * State management
 * ----------------
 * All state lives in this page component (single source of truth).
 * Child panels receive slices via props and call onChange / onRun.
 *
 * API integration
 * ---------------
 * Models come from GET /lab/models; runs call POST /evaluate (see runEvaluation below).
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Download, Link2, Check, LayoutGrid, Rows } from 'lucide-react';
import { PromptPanel, type EvalConfig, estimateTokens } from '@/features/compare/components/PromptPanel';
import { api } from '@/services/api';
import { buildRequest, orderResults } from '@/features/compare/lib/evaluate';
import { ModelResultCard, type ModelResult } from '@/features/compare/components/ModelResultCard';
import { MetricsPanel } from '@/features/compare/components/MetricsPanel';
import { DEFAULT_MODELS, type Model } from '@/features/compare/components/ModelSelector';

// ─────────────────────────────────────────────────────────────────────────────
// Default config
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: EvalConfig = {
  systemPrompt:    '',
  prompt:          '',
  selectedModels:  ['openai/gpt-4o', 'anthropic/claude-3-5-sonnet-20241022'],
  temperature:     1.0,
  maxTokens:       1024,
  isDeterministic: false,
  seed:            42,
  outputFormat:    'text',
  jsonSchema:      '',
  judgeEnabled:    false,
  judgeModel:      'openai/gpt-4o',
};

// ─────────────────────────────────────────────────────────────────────────────
// Real evaluation (POST /evaluate)
// ─────────────────────────────────────────────────────────────────────────────

async function runEvaluation(config: EvalConfig, models: Model[]): Promise<ModelResult[]> {
  const response = await api.runEvaluation(buildRequest(config));
  return orderResults(config.selectedModels, response.results, models);
}

// ─────────────────────────────────────────────────────────────────────────────
// Export helpers
// ─────────────────────────────────────────────────────────────────────────────

function exportCSV(results: ModelResult[]) {
  const headers = ['model', 'latency_ms', 'cost_usd', 'input_tokens', 'output_tokens', 'tokens_per_sec', 'judge_score'];
  const rows = results.map((r) => [
    r.modelId, r.latencyMs, r.costUsd, r.inputTokens, r.outputTokens, r.tokensPerSec, r.judgeScore ?? '',
  ]);
  const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `modelcompare-${Date.now()}.csv`;
  a.click();
}

function exportJSON(results: ModelResult[]) {
  const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `modelcompare-${Date.now()}.json`;
  a.click();
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function ComparePage() {
  const [config, setConfig]         = useState<EvalConfig>(DEFAULT_CONFIG);
  const [results, setResults]       = useState<ModelResult[]>([]);
  const [isRunning, setIsRunning]   = useState(false);
  const [layout, setLayout]         = useState<'grid' | 'rows'>('grid');
  const [copied, setCopied]         = useState(false);
  const [models, setModels]         = useState<Model[]>(DEFAULT_MODELS);
  const [modelsError, setModelsError] = useState<string | null>(null);

  // Load the selectable models from the backend catalog
  useEffect(() => {
    let cancelled = false;
    api.listLabModels()
      .then((list) => {
        if (cancelled || list.length === 0) return;
        setModels(list);
        // Drop any default selection that is not in the catalog
        const ids = new Set(list.map((m) => m.id));
        setConfig((prev) => {
          const kept = prev.selectedModels.filter((id) => ids.has(id));
          return {
            ...prev,
            selectedModels: kept.length ? kept : list.slice(0, 2).map((m) => m.id),
            judgeModel: ids.has(prev.judgeModel) ? prev.judgeModel : list[0].id,
          };
        });
      })
      .catch((e: unknown) => {
        if (!cancelled) setModelsError(e instanceof Error ? e.message : 'Could not load models');
      });
    return () => { cancelled = true; };
  }, []);

  // Live token counter
  const estimatedTokens = useMemo(
    () => estimateTokens((config.systemPrompt + ' ' + config.prompt).trim()),
    [config.systemPrompt, config.prompt],
  );

  // ── Config patch ──────────────────────────────────────────────────────────
  const patchConfig = useCallback((patch: Partial<EvalConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  // ── Run ───────────────────────────────────────────────────────────────────
  async function handleRun() {
    if (isRunning || !config.prompt.trim() || config.selectedModels.length === 0) return;
    setIsRunning(true);

    // Show pending skeletons immediately
    const pendingResults: ModelResult[] = config.selectedModels.map((modelId) => {
      const model = models.find((m) => m.id === modelId);
      return {
        modelId,
        modelName:     model?.name ?? modelId,
        provider:      model?.provider ?? 'Unknown',
        contextWindow: model?.contextWindow ?? 128_000,
        status:        'pending',
        output:        '',
        inputTokens:   0,
        outputTokens:  0,
        latencyMs:     0,
        costUsd:       0,
        tokensPerSec:  0,
        badges:        [],
      };
    });
    setResults(pendingResults);

    try {
      const data = await runEvaluation(config, models);
      setResults(data);
    } catch (err) {
      // Mark all as errored
      setResults(
        pendingResults.map((r) => ({
          ...r,
          status: 'error',
          error: err instanceof Error ? err.message : 'Unknown error',
        })),
      );
    } finally {
      setIsRunning(false);
    }
  }

  // ── Retry single model ────────────────────────────────────────────────────
  async function handleRetry(modelId: string) {
    setResults((prev) => prev.map((r) => (r.modelId === modelId ? { ...r, status: 'pending', error: undefined } : r)));
    try {
      const [single] = await runEvaluation({ ...config, selectedModels: [modelId] }, models);
      if (single) setResults((prev) => prev.map((r) => (r.modelId === modelId ? single : r)));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Retry failed';
      setResults((prev) => prev.map((r) => (r.modelId === modelId ? { ...r, status: 'error', error: message } : r)));
    }
  }

  // ── Copy share link ───────────────────────────────────────────────────────
  async function copyShareLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const hasResults = results.length > 0;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-zinc-950">

      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <header className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-5 py-3">
        <div>
          <h1 className="text-sm font-bold text-zinc-100">Evaluation Lab</h1>
          <p className="text-xs text-zinc-600">Compare LLMs side-by-side</p>
          {modelsError && (
            <p role="alert" className="mt-1 text-xs text-amber-500">
              Couldn&apos;t load the live model list ({modelsError}); showing defaults.
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Layout toggle */}
          <div className="flex rounded-lg border border-zinc-700 bg-zinc-900 p-0.5">
            <button
              onClick={() => setLayout('grid')}
              className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                layout === 'grid' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setLayout('rows')}
              className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                layout === 'rows' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Rows className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Export buttons (shown after results) */}
          {hasResults && (
            <>
              <button
                onClick={() => exportCSV(results.filter((r) => r.status === 'complete'))}
                className="flex h-8 items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                CSV
              </button>
              <button
                onClick={() => exportJSON(results.filter((r) => r.status === 'complete'))}
                className="flex h-8 items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                JSON
              </button>
              <button
                onClick={copyShareLink}
                className="flex h-8 items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Link2 className="h-3.5 w-3.5" />}
                {copied ? 'Copied!' : 'Share'}
              </button>
            </>
          )}
        </div>
      </header>

      {/* ── 3-panel body ──────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT – Configuration */}
        <aside className="w-80 shrink-0 flex flex-col border-r border-zinc-800">
          <PromptPanel
            models={models}
            config={config}
            onChange={patchConfig}
            onRun={handleRun}
            onSave={() => {/* save to Supabase prompts table */}}
            isRunning={isRunning}
            estimatedTokens={estimatedTokens}
          />
        </aside>

        {/* CENTER – Model outputs */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {!hasResults ? (
            /* Empty state */
            <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-violet-600/20">
                  <svg className="h-7 w-7 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h2 className="text-sm font-semibold text-zinc-200">Ready to evaluate</h2>
                <p className="mt-1 max-w-xs text-xs text-zinc-500">
                  Select models, write your prompt, and click{' '}
                  <span className="text-violet-400">Run Evaluation</span> to compare outputs side-by-side.
                </p>
              </div>
            </div>
          ) : (
            /* Result grid */
            <div className="flex-1 overflow-y-auto p-4 dark-scroll">
              <div
                className={
                  layout === 'grid'
                    ? `grid gap-4 ${
                        results.length === 1
                          ? 'grid-cols-1'
                          : results.length === 2
                            ? 'grid-cols-2'
                            : results.length <= 4
                              ? 'grid-cols-2'
                              : 'grid-cols-3'
                      }`
                    : 'flex flex-col gap-4'
                }
                style={layout === 'rows' ? {} : { gridAutoRows: 'calc(50vh - 4rem)' }}
              >
                {results.map((result) => (
                  <ModelResultCard
                    key={result.modelId}
                    result={result}
                    onRetry={handleRetry}
                  />
                ))}
              </div>
            </div>
          )}
        </main>

        {/* RIGHT – Metrics intelligence */}
        <aside className="w-80 shrink-0 flex flex-col border-l border-zinc-800">
          <MetricsPanel results={results} />
        </aside>
      </div>
    </div>
  );
}
