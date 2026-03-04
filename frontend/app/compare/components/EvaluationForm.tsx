import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal } from 'lucide-react';
import { ModelSelector } from './ModelSelector';
import { PromptInput } from './PromptInput';

export interface AdvancedOptions {
  llmAsJudge: boolean;
  similarityScore: boolean;
  jsonValidation: boolean;
  deterministic: boolean;
}

interface EvaluationFormProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  selectedModels: string[];
  setSelectedModels: (models: string[]) => void;
  advancedOptions: AdvancedOptions;
  setAdvancedOptions: React.Dispatch<React.SetStateAction<AdvancedOptions>>;
  onCompare: () => void;
  isLoading: boolean;
}

export function EvaluationForm({
  prompt,
  setPrompt,
  selectedModels,
  setSelectedModels,
  advancedOptions,
  setAdvancedOptions,
  onCompare,
  isLoading
}: EvaluationFormProps) {
  const [advancedMode, setAdvancedMode] = useState(false);

  return (
    <motion.section 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-6 md:p-8 rounded-3xl border border-zinc-200 shadow-sm space-y-6 mb-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-black mb-1">New Evaluation</h2>
          <p className="text-sm text-zinc-500">Configure your prompt and models for benchmarking.</p>
        </div>
        <button 
          onClick={() => setAdvancedMode(!advancedMode)}
          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${advancedMode ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Advanced Mode
        </button>
      </div>

      <AnimatePresence>
        {advancedMode && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-5 bg-zinc-50 border border-zinc-200 rounded-2xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <label className="flex items-center gap-3 text-sm font-medium text-zinc-700 cursor-pointer hover:text-black transition-colors">
                <input 
                  type="checkbox" 
                  checked={advancedOptions.llmAsJudge}
                  onChange={(e) => setAdvancedOptions(prev => ({ ...prev, llmAsJudge: e.target.checked }))}
                  className="w-4 h-4 rounded border-zinc-300 text-black focus:ring-black" 
                />
                LLM-as-a-Judge
              </label>
              <label className="flex items-center gap-3 text-sm font-medium text-zinc-700 cursor-pointer hover:text-black transition-colors">
                <input 
                  type="checkbox" 
                  checked={advancedOptions.similarityScore}
                  onChange={(e) => setAdvancedOptions(prev => ({ ...prev, similarityScore: e.target.checked }))}
                  className="w-4 h-4 rounded border-zinc-300 text-black focus:ring-black" 
                />
                Similarity Score
              </label>
              <label className="flex items-center gap-3 text-sm font-medium text-zinc-700 cursor-pointer hover:text-black transition-colors">
                <input 
                  type="checkbox" 
                  checked={advancedOptions.jsonValidation}
                  onChange={(e) => setAdvancedOptions(prev => ({ ...prev, jsonValidation: e.target.checked }))}
                  className="w-4 h-4 rounded border-zinc-300 text-black focus:ring-black" 
                />
                JSON Validation
              </label>
              <label className="flex items-center gap-3 text-sm font-medium text-zinc-700 cursor-pointer hover:text-black transition-colors">
                <input 
                  type="checkbox" 
                  checked={advancedOptions.deterministic}
                  onChange={(e) => setAdvancedOptions(prev => ({ ...prev, deterministic: e.target.checked }))}
                  className="w-4 h-4 rounded border-zinc-300 text-black focus:ring-black" 
                />
                Deterministic (T=0)
              </label>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <PromptInput 
        prompt={prompt}
        setPrompt={setPrompt}
        onSubmit={onCompare}
        isLoading={isLoading}
      />
      
      <div className="pt-6 border-t border-zinc-100">
        <ModelSelector 
          selectedModels={selectedModels}
          onChange={setSelectedModels}
          disabled={isLoading}
        />
      </div>
    </motion.section>
  );
}
