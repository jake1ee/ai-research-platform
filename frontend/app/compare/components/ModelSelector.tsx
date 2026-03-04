'use client';

import { Check } from 'lucide-react';

export const AVAILABLE_MODELS = [
  { id: 'gpt-4o', name: 'GPT-4o' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
  { id: 'claude-3-opus', name: 'Claude 3 Opus' },
  { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet' },
  { id: 'claude-3-haiku', name: 'Claude 3 Haiku' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
  { id: 'ollama/llama3', name: 'Llama 3 (Local)' },
];

interface ModelSelectorProps {
  selectedModels: string[];
  onChange: (models: string[]) => void;
  disabled?: boolean;
}

export function ModelSelector({ selectedModels, onChange, disabled }: ModelSelectorProps) {
  const toggleModel = (modelId: string) => {
    if (selectedModels.includes(modelId)) {
      onChange(selectedModels.filter(id => id !== modelId));
    } else {
      onChange([...selectedModels, modelId]);
    }
  };

  return (
    <div className="w-full">
      <h3 className="text-sm font-semibold text-zinc-900 mb-3">Select Models to Compare</h3>
      <div className="flex flex-wrap gap-2">
        {AVAILABLE_MODELS.map((model) => {
          const isSelected = selectedModels.includes(model.id);
          return (
            <button
              key={model.id}
              onClick={() => toggleModel(model.id)}
              disabled={disabled}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all border
                ${isSelected 
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                  : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50'}
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div className={`flex items-center justify-center w-4 h-4 rounded-full border ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-zinc-300'}`}>
                {isSelected && <Check className="w-3 h-3 text-white" />}
              </div>
              {model.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}