'use client';

/**
 * PromptPanel – Left panel of the Evaluation Lab
 * -----------------------------------------------
 * Sections:
 *  1. System prompt (collapsible)
 *  2. User prompt textarea + live token counter
 *  3. Quick settings: temperature slider, max tokens
 *  4. Deterministic toggle + seed input
 *  5. Output format selector (text / json / strict_json)
 *  6. Advanced section (judge model, JSON schema)
 *  7. Model multi-select (via ModelSelector)
 *  8. Action buttons: Run / Save prompt version
 */

import { useState, useCallback } from 'react';
import { ChevronDown, ChevronUp, Save, Play, Loader2 } from 'lucide-react';
import { ModelSelector, DEFAULT_MODELS } from './ModelSelector';

// ─── Types ────────────────────────────────────────────────────────────────────

export type OutputFormat = 'text' | 'json' | 'strict_json';

export interface EvalConfig {
  systemPrompt: string;
  prompt: string;
  selectedModels: string[];
  temperature: number;
  maxTokens: number;
  isDeterministic: boolean;
  seed: number;
  outputFormat: OutputFormat;
  jsonSchema: string;
  judgeEnabled: boolean;
  judgeModel: string;
}

interface PromptPanelProps {
  config: EvalConfig;
  onChange: (patch: Partial<EvalConfig>) => void;
  onRun: () => void;
  onSave?: () => void;
  isRunning: boolean;
  /** Approximate token count of the current prompt */
  estimatedTokens: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Very rough token estimate: ~4 chars per token */
export function estimateTokens(text: string): number {
  return Math.max(0, Math.round(text.length / 4));
}

function TokenMeter({ count, max }: { count: number; max: number }) {
  const pct = Math.min(100, (count / max) * 100);
  const color =
    pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-violet-500';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-[10px] font-mono ${pct > 90 ? 'text-red-400' : 'text-zinc-500'}`}>
        ~{count.toLocaleString()} / {(max / 1000).toFixed(0)}k
      </span>
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  title,
  children,
  collapsible = false,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-zinc-800 px-4 py-3 last:border-0">
      {collapsible ? (
        <button
          onClick={() => setOpen((o) => !o)}
          className="mb-2 flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-300"
        >
          {title}
          {open
            ? <ChevronUp className="h-3 w-3" />
            : <ChevronDown className="h-3 w-3" />
          }
        </button>
      ) : (
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          {title}
        </div>
      )}
      {open && children}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PromptPanel({
  config,
  onChange,
  onRun,
  onSave,
  isRunning,
  estimatedTokens,
}: PromptPanelProps) {
  const maxCtx = 128_000; // rough cap for the token meter

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-zinc-900">

      {/* ── System Prompt ──────────────────────────────────────────────── */}
      <Section title="System Prompt" collapsible defaultOpen={false}>
        <textarea
          value={config.systemPrompt}
          onChange={(e) => onChange({ systemPrompt: e.target.value })}
          placeholder="You are a helpful assistant…"
          rows={3}
          className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
        />
      </Section>

      {/* ── User Prompt ────────────────────────────────────────────────── */}
      <Section title="Prompt">
        <textarea
          value={config.prompt}
          onChange={(e) => onChange({ prompt: e.target.value })}
          placeholder="Enter your prompt here…"
          rows={8}
          className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
        />
        <div className="mt-1.5">
          <TokenMeter count={estimatedTokens} max={maxCtx} />
        </div>
      </Section>

      {/* ── Sampling settings ──────────────────────────────────────────── */}
      <Section title="Sampling">
        {/* Temperature */}
        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xs text-zinc-400">Temperature</label>
            <span className="font-mono text-xs text-violet-400">
              {config.isDeterministic ? '0.0 (deterministic)' : config.temperature.toFixed(1)}
            </span>
          </div>
          <input
            type="range"
            min={0} max={2} step={0.1}
            value={config.isDeterministic ? 0 : config.temperature}
            disabled={config.isDeterministic}
            onChange={(e) => onChange({ temperature: parseFloat(e.target.value) })}
            className="w-full accent-violet-500 disabled:opacity-40"
          />
          <div className="mt-0.5 flex justify-between text-[10px] text-zinc-700">
            <span>Focused</span><span>Creative</span>
          </div>
        </div>

        {/* Max tokens */}
        <div className="mb-3">
          <label className="mb-1 block text-xs text-zinc-400">Max Output Tokens</label>
          <input
            type="number"
            value={config.maxTokens}
            min={1} max={8192}
            onChange={(e) => onChange({ maxTokens: parseInt(e.target.value) || 1024 })}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none"
          />
        </div>

        {/* Deterministic toggle */}
        <label className="flex cursor-pointer items-center gap-3">
          <div
            onClick={() => onChange({ isDeterministic: !config.isDeterministic })}
            className={`relative h-5 w-9 rounded-full transition-colors ${
              config.isDeterministic ? 'bg-violet-600' : 'bg-zinc-700'
            }`}
          >
            <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
              config.isDeterministic ? 'translate-x-4' : 'translate-x-0.5'
            }`} />
          </div>
          <span className="text-xs text-zinc-400">Deterministic mode</span>
        </label>

        {/* Seed input (shown only when deterministic is on) */}
        {config.isDeterministic && (
          <div className="mt-2">
            <label className="mb-1 block text-xs text-zinc-400">Seed</label>
            <input
              type="number"
              value={config.seed}
              onChange={(e) => onChange({ seed: parseInt(e.target.value) || 42 })}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none"
            />
          </div>
        )}
      </Section>

      {/* ── Output format ──────────────────────────────────────────────── */}
      <Section title="Output Format">
        <div className="flex gap-1">
          {(['text', 'json', 'strict_json'] as OutputFormat[]).map((fmt) => (
            <button
              key={fmt}
              onClick={() => onChange({ outputFormat: fmt })}
              className={`flex-1 rounded-lg border py-1.5 text-xs font-medium transition-colors ${
                config.outputFormat === fmt
                  ? 'border-violet-500 bg-violet-600/20 text-violet-300'
                  : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {fmt === 'strict_json' ? 'Strict JSON' : fmt === 'json' ? 'JSON' : 'Text'}
            </button>
          ))}
        </div>

        {/* JSON schema input */}
        {config.outputFormat !== 'text' && (
          <div className="mt-2">
            <label className="mb-1 block text-xs text-zinc-400">JSON Schema (optional)</label>
            <textarea
              value={config.jsonSchema}
              onChange={(e) => onChange({ jsonSchema: e.target.value })}
              placeholder={'{\n  "type": "object",\n  "properties": {}\n}'}
              rows={4}
              className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-xs text-zinc-200 placeholder:text-zinc-700 focus:border-violet-500 focus:outline-none"
            />
          </div>
        )}
      </Section>

      {/* ── LLM-as-a-Judge ─────────────────────────────────────────────── */}
      <Section title="Quality Scoring" collapsible defaultOpen={false}>
        <label className="flex cursor-pointer items-center gap-3 mb-3">
          <div
            onClick={() => onChange({ judgeEnabled: !config.judgeEnabled })}
            className={`relative h-5 w-9 rounded-full transition-colors ${
              config.judgeEnabled ? 'bg-violet-600' : 'bg-zinc-700'
            }`}
          >
            <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
              config.judgeEnabled ? 'translate-x-4' : 'translate-x-0.5'
            }`} />
          </div>
          <span className="text-xs text-zinc-400">Enable LLM-as-a-Judge</span>
        </label>

        {config.judgeEnabled && (
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Judge Model</label>
            <select
              value={config.judgeModel}
              onChange={(e) => onChange({ judgeModel: e.target.value })}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none"
            >
              <option value="openai/gpt-4o">GPT-4o (recommended)</option>
              <option value="anthropic/claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
              <option value="google/gemini-1.5-pro">Gemini 1.5 Pro</option>
            </select>
          </div>
        )}
      </Section>

      {/* ── Model selection ────────────────────────────────────────────── */}
      <Section title="Select Models">
        <ModelSelector
          models={DEFAULT_MODELS}
          selected={config.selectedModels}
          onChange={(ids) => onChange({ selectedModels: ids })}
        />
      </Section>

      {/* ── Action buttons ─────────────────────────────────────────────── */}
      <div className="sticky bottom-0 border-t border-zinc-800 bg-zinc-900 p-4 flex gap-2">
        {onSave && (
          <button
            onClick={onSave}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <Save className="h-3.5 w-3.5" />
            Save
          </button>
        )}
        <button
          onClick={onRun}
          disabled={isRunning || config.selectedModels.length === 0 || !config.prompt.trim()}
          className="flex flex-1 h-9 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRunning
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Running…</>
            : <><Play className="h-4 w-4" /> Run Evaluation</>
          }
        </button>
      </div>
    </div>
  );
}
