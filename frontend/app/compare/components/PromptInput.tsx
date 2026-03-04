'use client';

import { Send, Loader2 } from 'lucide-react';

interface PromptInputProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

export function PromptInput({ prompt, setPrompt, onSubmit, isLoading }: PromptInputProps) {
  const maxLength = 2000;

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="relative">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value.slice(0, maxLength))}
          placeholder="Enter your prompt here to compare models..."
          className="w-full min-h-30 p-4 bg-white border border-zinc-200 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y transition-all text-zinc-900 placeholder:text-zinc-400"
          disabled={isLoading}
        />
        <div className="absolute bottom-3 right-3 text-xs text-zinc-400 font-medium">
          {prompt.length} / {maxLength}
        </div>
      </div>
      <div className="flex justify-end">
        <button
          onClick={onSubmit}
          disabled={isLoading || prompt.trim().length === 0}
          className="flex items-center gap-2 px-8 py-3 bg-black hover:bg-zinc-800 text-white rounded-full font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Comparing...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Compare Models
            </>
          )}
        </button>
      </div>
    </div>
  );
}