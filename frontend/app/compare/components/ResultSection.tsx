import React from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DashboardResultCard } from './DashboardResultCard';
import { ModelResponse } from '@/types/api';

interface ResultsSectionProps {
  results: ModelResponse[];
  isLoading: boolean;
  selectedModelsCount: number;
  onRegenerate: (model: string) => void;
}

export function ResultsSection({ results, isLoading, selectedModelsCount, onRegenerate }: ResultsSectionProps) {
  if (!isLoading && results.length === 0) return null;

  const fastestLatency = Math.min(...results.map(r => r.latency_ms));
  const cheapestCost = Math.min(...results.map(r => r.cost));

  return (
    <section className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-black">Evaluation Results</h2>
      </div>

      {!isLoading && results.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {/* Latency Chart */}
          <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm">
            <h3 className="text-sm font-bold text-zinc-900 mb-6">Latency Comparison (ms)</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={results} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                  <XAxis dataKey="model" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                  <Tooltip cursor={{ fill: '#f4f4f5' }} contentStyle={{ borderRadius: '12px', border: '1px solid #e4e4e7', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="latency_ms" fill="#18181b" radius={[6, 6, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Cost Chart */}
          <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm">
            <h3 className="text-sm font-bold text-zinc-900 mb-6">Cost Comparison ($)</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={results} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                  <XAxis dataKey="model" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                  <Tooltip cursor={{ fill: '#f4f4f5' }} contentStyle={{ borderRadius: '12px', border: '1px solid #e4e4e7', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="cost" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: selectedModelsCount || 3 }).map((_, i) => (
            <div key={i} className="flex flex-col bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden animate-pulse">
              <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
                <div className="h-5 bg-zinc-200 rounded w-32"></div>
              </div>
              <div className="p-4 grow bg-white space-y-3">
                <div className="h-4 bg-zinc-100 rounded w-full"></div>
                <div className="h-4 bg-zinc-100 rounded w-5/6"></div>
                <div className="h-4 bg-zinc-100 rounded w-4/6"></div>
                <div className="h-4 bg-zinc-100 rounded w-full"></div>
                <div className="h-4 bg-zinc-100 rounded w-3/4"></div>
              </div>
              <div className="p-4 bg-zinc-50 border-t border-zinc-100 grid grid-cols-2 gap-3">
                <div className="h-8 bg-zinc-200 rounded w-full"></div>
                <div className="h-8 bg-zinc-200 rounded w-full"></div>
                <div className="h-8 bg-zinc-200 rounded w-full"></div>
                <div className="h-8 bg-zinc-200 rounded w-full"></div>
              </div>
            </div>
          ))
        ) : (
          results.map((result, index) => (
            <motion.div
              key={result.model}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <DashboardResultCard 
                result={result} 
                isFastest={result.latency_ms === fastestLatency}
                isCheapest={result.cost === cheapestCost}
                onRegenerate={onRegenerate}
              />
            </motion.div>
          ))
        )}
      </div>
    </section>
  );
}
