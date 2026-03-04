'use client';

/**
 * ModelSelector
 * -------------
 * Multi-select list of available LLMs grouped by provider.
 * Shows context window size and cost tier per model.
 * Selected models are highlighted; clicking toggles selection.
 */

import { Check, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Model {
  id: string;            // litellm_id, e.g. "openai/gpt-4o"
  name: string;          // display name
  provider: string;
  contextWindow: number; // tokens
  costTier: 'low' | 'mid' | 'high';
  isActive: boolean;
}

interface ModelSelectorProps {
  models: Model[];
  selected: string[];
  onChange: (ids: string[]) => void;
  maxSelect?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PROVIDER_COLORS: Record<string, string> = {
  OpenAI:    '#10a37f',
  Anthropic: '#d4a574',
  Google:    '#4285f4',
  Cohere:    '#39594d',
};

const COST_TIER_LABEL: Record<Model['costTier'], { label: string; cls: string }> = {
  low:  { label: '$$',  cls: 'text-emerald-500' },
  mid:  { label: '$$$', cls: 'text-amber-500'   },
  high: { label: '$$$$',cls: 'text-red-400'     },
};

function formatCtx(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M ctx`;
  return `${Math.round(n / 1000)}k ctx`;
}

// ─── Provider group ───────────────────────────────────────────────────────────

function ProviderGroup({
  provider,
  models,
  selected,
  onToggle,
  color,
}: {
  provider: string;
  models: Model[];
  selected: string[];
  onToggle: (id: string) => void;
  color: string;
}) {
  const [open, setOpen] = useState(true);
  const selectedInGroup = models.filter((m) => selected.includes(m.id)).length;

  return (
    <div className="mb-1">
      {/* Provider header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-2 py-1.5 text-left"
      >
        <div
          className="h-2 w-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
        <span className="flex-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          {provider}
        </span>
        {selectedInGroup > 0 && (
          <span className="rounded-full bg-violet-600 px-1.5 text-[10px] font-bold text-white">
            {selectedInGroup}
          </span>
        )}
        {open
          ? <ChevronDown className="h-3 w-3 text-zinc-600" />
          : <ChevronRight className="h-3 w-3 text-zinc-600" />
        }
      </button>

      {/* Model list */}
      {open && (
        <div className="ml-4 space-y-0.5">
          {models.map((model) => {
            const isSelected = selected.includes(model.id);
            const tier = COST_TIER_LABEL[model.costTier];
            return (
              <button
                key={model.id}
                onClick={() => onToggle(model.id)}
                disabled={!model.isActive}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors ${
                  isSelected
                    ? 'bg-violet-600/20 ring-1 ring-violet-500/40'
                    : 'hover:bg-zinc-800'
                } ${!model.isActive ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {/* Checkbox */}
                <div
                  className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-colors ${
                    isSelected
                      ? 'border-violet-500 bg-violet-600'
                      : 'border-zinc-600 bg-zinc-800'
                  }`}
                >
                  {isSelected && <Check className="h-2.5 w-2.5 text-white" />}
                </div>

                {/* Model info */}
                <div className="min-w-0 flex-1">
                  <span className={`block truncate text-sm font-medium ${
                    isSelected ? 'text-zinc-100' : 'text-zinc-300'
                  }`}>
                    {model.name}
                  </span>
                  <span className="text-[10px] text-zinc-600">
                    {formatCtx(model.contextWindow)}
                  </span>
                </div>

                {/* Cost tier */}
                <span className={`text-[10px] font-mono font-bold ${tier.cls}`}>
                  {tier.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ModelSelector({
  models,
  selected,
  onChange,
  maxSelect = 5,
}: ModelSelectorProps) {
  // Group by provider
  const groups = models.reduce<Record<string, Model[]>>((acc, m) => {
    (acc[m.provider] ??= []).push(m);
    return acc;
  }, {});

  function toggle(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else if (selected.length < maxSelect) {
      onChange([...selected, id]);
    }
  }

  return (
    <div>
      {/* Counter */}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-400">Models</span>
        <span className="text-xs text-zinc-600">
          {selected.length}/{maxSelect} selected
        </span>
      </div>

      {/* Limit warning */}
      {selected.length >= maxSelect && (
        <p className="mb-2 rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-400">
          Max {maxSelect} models per evaluation
        </p>
      )}

      {/* Provider groups */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 py-1">
        {Object.entries(groups).map(([provider, mods]) => (
          <ProviderGroup
            key={provider}
            provider={provider}
            models={mods}
            selected={selected}
            onToggle={toggle}
            color={PROVIDER_COLORS[provider] ?? '#6b7280'}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Default model catalogue ──────────────────────────────────────────────────

export const DEFAULT_MODELS: Model[] = [
  { id: 'openai/gpt-4o',                          name: 'GPT-4o',              provider: 'OpenAI',    contextWindow: 128_000,   costTier: 'high',  isActive: true },
  { id: 'openai/gpt-4o-mini',                      name: 'GPT-4o Mini',         provider: 'OpenAI',    contextWindow: 128_000,   costTier: 'low',   isActive: true },
  { id: 'openai/gpt-3.5-turbo',                    name: 'GPT-3.5 Turbo',       provider: 'OpenAI',    contextWindow: 16_385,    costTier: 'low',   isActive: true },
  { id: 'anthropic/claude-3-5-sonnet-20241022',    name: 'Claude 3.5 Sonnet',   provider: 'Anthropic', contextWindow: 200_000,   costTier: 'high',  isActive: true },
  { id: 'anthropic/claude-3-5-haiku-20241022',     name: 'Claude 3.5 Haiku',    provider: 'Anthropic', contextWindow: 200_000,   costTier: 'mid',   isActive: true },
  { id: 'anthropic/claude-3-opus-20240229',        name: 'Claude 3 Opus',       provider: 'Anthropic', contextWindow: 200_000,   costTier: 'high',  isActive: true },
  { id: 'google/gemini-1.5-pro',                   name: 'Gemini 1.5 Pro',      provider: 'Google',    contextWindow: 2_000_000, costTier: 'mid',   isActive: true },
  { id: 'google/gemini-1.5-flash',                 name: 'Gemini 1.5 Flash',    provider: 'Google',    contextWindow: 1_000_000, costTier: 'low',   isActive: true },
  { id: 'cohere/command-r-plus',                   name: 'Command R+',          provider: 'Cohere',    contextWindow: 128_000,   costTier: 'high',  isActive: true },
  { id: 'cohere/command-r',                        name: 'Command R',           provider: 'Cohere',    contextWindow: 128_000,   costTier: 'low',   isActive: true },
];
