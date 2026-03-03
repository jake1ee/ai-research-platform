'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion'; // <-- Add this import
import { PromptInput } from '../components/PromptInput';
import { ModelSelector } from '../components/ModelSelector';
import { ResultCard } from '../count/ResultCard';
import { StatsBar } from '../display/StatsBar';
import { SkeletonCard } from '../display/SkeletonCard';
import { compareModels } from '../lib/api';
import { ModelResponse } from '../types/model';
import { AlertCircle, LayoutGrid } from 'lucide-react';

export default function ComparePage() {
  const [prompt, setPrompt] = useState('');
  const [selectedModels, setSelectedModels] = useState<string[]>([
    'gpt-4o',
    'gpt-3.5-turbo',
    'claude-3-sonnet',
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<ModelResponse[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleCompare = async () => {
    if (!prompt.trim() || selectedModels.length === 0) return;

    setIsLoading(true);
    setError(null);
    setResults([]);

    try {
      const data = await compareModels({
        prompt: prompt.trim(),
        models: selectedModels,
      });
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const fastestLatency = results.length > 0 ? Math.min(...results.map(r => r.latency_ms)) : -1;
  const cheapestCost = results.length > 0 ? Math.min(...results.map(r => r.cost)) : -1;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans selection:bg-zinc-200">
      <nav className="w-full border-b border-zinc-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <LayoutGrid className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">ModelCompare</span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-zinc-200 border border-zinc-300 overflow-hidden">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm space-y-6"
        >
          <div>
            <h2 className="text-2xl font-bold text-black mb-1">Evaluation Prompt</h2>
            <p className="text-zinc-500">Enter the prompt you want to evaluate across different models.</p>
          </div>
          
          <PromptInput 
            prompt={prompt} 
            setPrompt={setPrompt} 
            onSubmit={handleCompare} 
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

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-700"
          >
            <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-medium">Comparison Failed</h3>
              <p className="text-sm mt-1 opacity-90">{error}</p>
            </div>
          </motion.div>
        )}

        {(results.length > 0 || isLoading) && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-black">Comparison Results</h2>
              {!isLoading && results.length > 0 && (
                <StatsBar results={results} />
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {isLoading ? (
                Array.from({ length: selectedModels.length || 3 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))
              ) : (
                results.map((result, index) => (
                  <motion.div
                    key={result.model}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }} // Staggered animation
                  >
                    <ResultCard 
                      result={result} 
                      isFastest={result.latency_ms === fastestLatency}
                      isCheapest={result.cost === cheapestCost}
                    />
                  </motion.div>
                ))
              )}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
        <footer className="border-t border-zinc-200 bg-white py-12">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-black rounded flex items-center justify-center">
                <LayoutGrid className="w-3 h-3 text-white" />
              </div>
              <span className="font-bold text-black">ModelCompare</span>
            </div>
            
            <div className="flex gap-6 text-sm text-zinc-500">
              <Link href="#" className="hover:text-black transition-colors">Privacy Policy</Link>
              <Link href="#" className="hover:text-black transition-colors">Terms of Service</Link>
              <Link href="#" className="hover:text-black transition-colors">Contact Support</Link>
            </div>
            
            <p className="text-sm text-zinc-400">
              © {new Date().getFullYear()} ModelCompare. All rights reserved.
            </p>
          </div>
        </footer>
    </div>
  );
}