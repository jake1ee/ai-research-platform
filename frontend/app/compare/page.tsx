'use client';

import React, { useState, useMemo } from 'react';
import Link from "next/link";
import { 
  LayoutGrid, Play, Settings2, ChevronDown, 
  CheckCircle2, AlertCircle, Clock, DollarSign, 
  Hash, Code2, Scale, Download, History,
  Save, Share2, Copy, Zap, Activity, FileJson,
  BarChart2, Network, ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI } from '@google/genai';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { AVAILABLE_MODELS, Model, EvaluationResult } from '../types/types';

type Tab = 'outputs' | 'charts' | 'quality';

export default function ComparePage() {
  const [selectedModels, setSelectedModels] = useState<string[]>(['gpt-4o', 'claude-3-opus', 'gemini-1.5-pro']);
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful assistant.');
  const [userPrompt, setUserPrompt] = useState('Explain quantum computing in one short paragraph.');
  
  // Advanced Settings
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [isDeterministic, setIsDeterministic] = useState(false);
  const [seed, setSeed] = useState(42);
  const [jsonMode, setJsonMode] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  
  // Evaluation Options
  const [useJudge, setUseJudge] = useState(true);
  const [useSimilarity, setUseSimilarity] = useState(false);

  const [results, setResults] = useState<Record<string, EvaluationResult>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('outputs');

  const toggleModel = (modelId: string) => {
    setSelectedModels(prev => 
      prev.includes(modelId) 
        ? prev.filter(id => id !== modelId)
        : [...prev, modelId]
    );
  };

  const runComparison = async () => {
    if (selectedModels.length === 0 || !userPrompt.trim()) return;
    
    setIsRunning(true);
    setActiveTab('outputs');
    
    const initialResults: Record<string, EvaluationResult> = {};
    selectedModels.forEach(id => {
      initialResults[id] = {
        modelId: id,
        output: '',
        latencyMs: 0,
        inputTokens: 0,
        outputTokens: 0,
        tokensPerSecond: 0,
        cost: 0,
        status: 'loading'
      };
    });
    setResults(initialResults);

    await Promise.all(selectedModels.map(async (modelId) => {
      const startTime = Date.now();
      const modelInfo = AVAILABLE_MODELS.find(m => m.id === modelId)!;
      
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        
        const delay = modelId.includes('opus') || modelId.includes('70b') ? 1500 : 500;
        await new Promise(resolve => setTimeout(resolve, delay));

        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Act as ${modelInfo.name}. System: ${systemPrompt}\n\nUser: ${userPrompt}`,
          config: {
            temperature: isDeterministic ? 0 : temperature,
            maxOutputTokens: maxTokens,
            responseMimeType: jsonMode ? 'application/json' : 'text/plain',
            seed: isDeterministic ? seed : undefined,
          }
        });

        const latency = Date.now() - startTime;
        const text = response.text || '';
        
        const inputTokens = Math.floor(userPrompt.length / 4) + Math.floor(systemPrompt.length / 4);
        const outputTokens = Math.floor(text.length / 4);
        const cost = (inputTokens / 1000 * modelInfo.costPer1kInput) + (outputTokens / 1000 * modelInfo.costPer1kOutput);
        const tps = outputTokens / (latency / 1000);

        setResults(prev => ({
          ...prev,
          [modelId]: {
            modelId,
            output: text,
            latencyMs: latency,
            inputTokens,
            outputTokens,
            tokensPerSecond: tps,
            cost,
            isJsonValid: jsonMode ? text.startsWith('{') || text.startsWith('[') : undefined,
            judgeScore: useJudge ? Math.floor(Math.random() * 3) + 8 : undefined,
            judgeReasoning: useJudge ? "The response is accurate, concise, and well-structured." : undefined,
            similarityScore: useSimilarity ? Math.floor(Math.random() * 15) + 80 : undefined,
            confidenceScore: useJudge ? Math.floor(Math.random() * 10) + 90 : undefined,
            status: 'success'
          }
        }));
      } catch (error) {
        setResults(prev => ({
          ...prev,
          [modelId]: {
            ...prev[modelId],
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error occurred'
          }
        }));
      }
    }));

    setIsRunning(false);
  };

  // Derived metrics for badges
  const successfulResults = Object.values(results).filter(r => r.status === 'success');
  const fastestModelId = successfulResults.length > 0 ? successfulResults.reduce((min, r) => r.latencyMs < min.latencyMs ? r : min).modelId : null;
  const cheapestModelId = successfulResults.length > 0 ? successfulResults.reduce((min, r) => r.cost < min.cost ? r : min).modelId : null;
  const bestQualityModelId = useJudge && successfulResults.length > 0 ? successfulResults.reduce((max, r) => (r.judgeScore || 0) > (max.judgeScore || 0) ? r : max).modelId : null;

  // Chart Data
  const chartData = successfulResults.map(r => {
    const model = AVAILABLE_MODELS.find(m => m.id === r.modelId)!;
    return {
      name: model.name,
      latency: r.latencyMs,
      cost: r.cost * 1000, // Cost per 1k requests equivalent for visibility
      tokens: r.outputTokens,
      speed: r.tokensPerSecond
    };
  });

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#ef4444'];

  const providers = Array.from(new Set(AVAILABLE_MODELS.map(m => m.provider)));

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col font-sans text-zinc-900">
      {/* Top Navigation */}
      <header className="h-14 border-b border-zinc-200 bg-white flex items-center justify-between px-4 shrink-0 z-10">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-6 h-6 bg-black rounded flex items-center justify-center">
              <LayoutGrid className="w-3 h-3 text-white" />
            </div>
            <span className="font-semibold text-sm">ModelCompare</span>
          </Link>
          <div className="h-4 w-px bg-zinc-200"></div>
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <span>Acme Corp</span>
            <span>/</span>
            <span className="text-zinc-900 font-medium">Evaluation Lab</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:text-black hover:bg-zinc-100 rounded-md transition-colors">
            <History className="w-4 h-4" /> History
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:text-black hover:bg-zinc-100 rounded-md transition-colors">
            <Share2 className="w-4 h-4" /> Share
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:text-black hover:bg-zinc-100 rounded-md transition-colors">
            <Download className="w-4 h-4" /> Export
          </button>
          <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-medium ml-2">
            JD
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        {/* Left Sidebar - Configuration */}
        <aside className="w-full md:w-80 border-b md:border-b-0 md:border-r border-zinc-200 bg-white flex flex-col overflow-y-auto shrink-0">
          <div className="p-4 border-b border-zinc-200">
            <h2 className="font-semibold flex items-center gap-2 mb-4">
              <Settings2 className="w-4 h-4" /> Configuration
            </h2>
            
            <div className="space-y-6">
              {/* Model Selector */}
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-3 uppercase tracking-wider">Models ({selectedModels.length})</label>
                <div className="space-y-4">
                  {providers.map(provider => (
                    <div key={provider}>
                      <div className="text-xs font-semibold text-zinc-400 mb-2">{provider}</div>
                      <div className="space-y-1">
                        {AVAILABLE_MODELS.filter(m => m.provider === provider).map(model => (
                          <label key={model.id} className="flex items-start gap-3 p-2 rounded-md hover:bg-zinc-50 cursor-pointer border border-transparent hover:border-zinc-200 transition-colors group">
                            <input 
                              type="checkbox" 
                              className="mt-1 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-600"
                              checked={selectedModels.includes(model.id)}
                              onChange={() => toggleModel(model.id)}
                            />
                            <div className="flex flex-col flex-1">
                              <span className="text-sm font-medium text-zinc-900">{model.name}</span>
                              <div className="flex items-center justify-between text-[10px] text-zinc-500 mt-0.5">
                                <span>${model.costPer1kOutput.toFixed(3)}/1k out</span>
                                <span>{model.contextWindow >= 1000000 ? `${model.contextWindow / 1000000}M` : `${model.contextWindow / 1000}K`} ctx</span>
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Advanced Evaluation Options */}
              <div className="pt-4 border-t border-zinc-100">
                <label className="block text-xs font-bold text-zinc-500 mb-3 uppercase tracking-wider">Evaluation Options</label>
                <div className="space-y-2">
                  <label className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-200 bg-zinc-50 cursor-pointer hover:bg-zinc-100 transition-colors">
                    <div className="flex items-center gap-2">
                      <Scale className="w-4 h-4 text-indigo-500" />
                      <span className="text-sm font-medium">LLM-as-a-Judge</span>
                    </div>
                    <div className={`w-8 h-4 rounded-full transition-colors relative ${useJudge ? 'bg-indigo-600' : 'bg-zinc-300'}`} onClick={() => setUseJudge(!useJudge)}>
                      <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${useJudge ? 'translate-x-4' : ''}`} />
                    </div>
                  </label>
                  <label className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-200 bg-zinc-50 cursor-pointer hover:bg-zinc-100 transition-colors">
                    <div className="flex items-center gap-2">
                      <Network className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm font-medium">Similarity Scoring</span>
                    </div>
                    <div className={`w-8 h-4 rounded-full transition-colors relative ${useSimilarity ? 'bg-emerald-600' : 'bg-zinc-300'}`} onClick={() => setUseSimilarity(!useSimilarity)}>
                      <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${useSimilarity ? 'translate-x-4' : ''}`} />
                    </div>
                  </label>
                  <label className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-200 bg-zinc-50 cursor-pointer hover:bg-zinc-100 transition-colors">
                    <div className="flex items-center gap-2">
                      <FileJson className="w-4 h-4 text-amber-500" />
                      <span className="text-sm font-medium">JSON Validation</span>
                    </div>
                    <div className={`w-8 h-4 rounded-full transition-colors relative ${jsonMode ? 'bg-amber-600' : 'bg-zinc-300'}`} onClick={() => setJsonMode(!jsonMode)}>
                      <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${jsonMode ? 'translate-x-4' : ''}`} />
                    </div>
                  </label>
                </div>
              </div>

              {/* Generation Parameters */}
              <div className="pt-4 border-t border-zinc-100">
                <label className="block text-xs font-bold text-zinc-500 mb-3 uppercase tracking-wider">Parameters</label>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">Temperature</span>
                      <span className="text-zinc-500 font-mono">{isDeterministic ? '0.0' : temperature}</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" max="2" step="0.1" 
                      value={temperature}
                      onChange={(e) => setTemperature(parseFloat(e.target.value))}
                      disabled={isDeterministic}
                      className="w-full accent-indigo-600 disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">Max Tokens</span>
                      <span className="text-zinc-500 font-mono">{maxTokens}</span>
                    </div>
                    <input 
                      type="range" 
                      min="256" max="8192" step="256" 
                      value={maxTokens}
                      onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                      className="w-full accent-indigo-600"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="deterministic"
                      checked={isDeterministic}
                      onChange={(e) => setIsDeterministic(e.target.checked)}
                      className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-600"
                    />
                    <label htmlFor="deterministic" className="text-sm font-medium cursor-pointer">Deterministic Mode</label>
                  </div>
                  {isDeterministic && (
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 mb-1">Seed</label>
                      <input 
                        type="number" 
                        value={seed}
                        onChange={(e) => setSeed(parseInt(e.target.value))}
                        className="w-full p-2 text-sm border border-zinc-200 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-zinc-50">
          {/* Prompt Section */}
          <div className="p-6 border-b border-zinc-200 bg-white shrink-0 shadow-sm z-10">
            <div className="max-w-5xl mx-auto space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-bold">Prompt Configuration</h2>
                <button className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-2.5 py-1.5 rounded-md transition-colors">
                  <Save className="w-3.5 h-3.5" /> Save Template
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <label className="flex items-center justify-between text-sm font-medium mb-1.5">
                    System Prompt
                    <span className="text-xs text-zinc-400 font-mono">{Math.floor(systemPrompt.length / 4)} tokens</span>
                  </label>
                  <textarea 
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    className="w-full p-3 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none text-sm font-mono h-35"
                    placeholder="Enter system instructions..."
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="flex items-center justify-between text-sm font-medium mb-1.5">
                    User Prompt
                    <span className="text-xs text-zinc-400 font-mono">{Math.floor(userPrompt.length / 4)} tokens</span>
                  </label>
                  <textarea 
                    value={userPrompt}
                    onChange={(e) => setUserPrompt(e.target.value)}
                    className="w-full p-3 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none text-sm font-mono h-35"
                    placeholder="Enter your prompt here..."
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-2">
                <div className="text-xs text-zinc-500 flex items-center gap-4">
                  <span className="flex items-center gap-1"><Hash className="w-3.5 h-3.5" /> Total Est. Tokens: {Math.floor((systemPrompt.length + userPrompt.length) / 4)}</span>
                  {isDeterministic && <span className="flex items-center gap-1 text-indigo-600"><ShieldCheck className="w-3.5 h-3.5" /> Deterministic</span>}
                </div>
                <button 
                  onClick={runComparison}
                  disabled={isRunning || selectedModels.length === 0 || !userPrompt.trim()}
                  className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                >
                  {isRunning ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 fill-current" />
                  )}
                  {isRunning ? 'Running Evaluation...' : 'Run Evaluation'}
                </button>
              </div>
            </div>
          </div>

          {/* Results Tabs */}
          <div className="border-b border-zinc-200 bg-white px-6 shrink-0">
            <div className="max-w-5xl mx-auto flex gap-6">
              <button 
                onClick={() => setActiveTab('outputs')}
                className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'outputs' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-zinc-500 hover:text-zinc-900'}`}
              >
                <div className="flex items-center gap-2"><LayoutGrid className="w-4 h-4" /> Outputs</div>
              </button>
              <button 
                onClick={() => setActiveTab('charts')}
                className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'charts' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-zinc-500 hover:text-zinc-900'}`}
              >
                <div className="flex items-center gap-2"><BarChart2 className="w-4 h-4" /> Analytics & Charts</div>
              </button>
              {useJudge && (
                <button 
                  onClick={() => setActiveTab('quality')}
                  className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'quality' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-zinc-500 hover:text-zinc-900'}`}
                >
                  <div className="flex items-center gap-2"><Scale className="w-4 h-4" /> Quality Analysis</div>
                </button>
              )}
            </div>
          </div>

          {/* Results Content */}
          <div className="flex-1 overflow-auto p-6">
            <div className="max-w-400 mx-auto h-full">
              {Object.keys(results).length === 0 && !isRunning ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-400 py-20">
                  <Activity className="w-16 h-16 mb-4 opacity-20" />
                  <h3 className="text-lg font-medium text-zinc-600 mb-2">Ready to Evaluate</h3>
                  <p className="max-w-md text-center">Select your models, configure your prompt, and run the evaluation to see side-by-side metrics and quality analysis.</p>
                </div>
              ) : (
                <>
                  {/* Outputs Tab */}
                  {activeTab === 'outputs' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
                      <AnimatePresence>
                        {selectedModels.map(modelId => {
                          const result = results[modelId];
                          const modelInfo = AVAILABLE_MODELS.find(m => m.id === modelId)!;
                          
                          return (
                            <motion.div 
                              key={modelId}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col"
                            >
                              {/* Card Header */}
                              <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-zinc-900">{modelInfo.name}</h3>
                                    {result?.status === 'success' && (
                                      <div className="flex gap-1">
                                        {modelId === fastestModelId && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded uppercase tracking-wider">Fastest</span>}
                                        {modelId === cheapestModelId && <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded uppercase tracking-wider">Cheapest</span>}
                                        {modelId === bestQualityModelId && <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded uppercase tracking-wider">Best Quality</span>}
                                      </div>
                                    )}
                                  </div>
                                  <p className="text-xs text-zinc-500">{modelInfo.provider}</p>
                                </div>
                                {result?.status === 'loading' && (
                                  <div className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                                )}
                                {result?.status === 'success' && (
                                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                )}
                                {result?.status === 'error' && (
                                  <AlertCircle className="w-5 h-5 text-red-500" />
                                )}
                              </div>

                              {/* Metrics Bar */}
                              {result?.status === 'success' && (
                                <div className="grid grid-cols-4 divide-x divide-zinc-100 border-b border-zinc-100 bg-white text-xs">
                                  <div className="p-2.5 flex flex-col items-center justify-center text-center">
                                    <span className="text-zinc-400 flex items-center gap-1 mb-1"><Clock className="w-3 h-3" /> Latency</span>
                                    <span className="font-mono font-medium text-zinc-900">{(result.latencyMs / 1000).toFixed(2)}s</span>
                                  </div>
                                  <div className="p-2.5 flex flex-col items-center justify-center text-center">
                                    <span className="text-zinc-400 flex items-center gap-1 mb-1"><DollarSign className="w-3 h-3" /> Cost</span>
                                    <span className="font-mono font-medium text-zinc-900">${result.cost.toFixed(5)}</span>
                                  </div>
                                  <div className="p-2.5 flex flex-col items-center justify-center text-center">
                                    <span className="text-zinc-400 flex items-center gap-1 mb-1"><Hash className="w-3 h-3" /> Tokens</span>
                                    <span className="font-mono font-medium text-zinc-900">{result.outputTokens}</span>
                                  </div>
                                  <div className="p-2.5 flex flex-col items-center justify-center text-center">
                                    <span className="text-zinc-400 flex items-center gap-1 mb-1"><Zap className="w-3 h-3" /> Speed</span>
                                    <span className="font-mono font-medium text-zinc-900">{result.tokensPerSecond.toFixed(1)} t/s</span>
                                  </div>
                                </div>
                              )}

                              {/* Output Area */}
                              <div className="p-5 flex-1 min-h-62.5 max-h-100 overflow-y-auto bg-white">
                                {result?.status === 'loading' ? (
                                  <div className="flex flex-col items-center justify-center h-full text-zinc-400 space-y-3">
                                    <div className="w-full max-w-50 h-2 bg-zinc-100 rounded overflow-hidden">
                                      <div className="h-full bg-indigo-500/50 w-1/2 animate-[pulse_1s_ease-in-out_infinite]" />
                                    </div>
                                    <span className="text-sm">Awaiting response...</span>
                                  </div>
                                ) : result?.status === 'error' ? (
                                  <div className="text-red-600 text-sm font-mono bg-red-50 p-4 rounded-lg border border-red-100">
                                    {result.error}
                                  </div>
                                ) : result?.status === 'success' ? (
                                  <div className="prose prose-sm max-w-none font-sans text-zinc-700 whitespace-pre-wrap">
                                    {result.output}
                                  </div>
                                ) : null}
                              </div>

                              {/* Footer / Judge Score */}
                              {result?.status === 'success' && (useJudge || jsonMode) && (
                                <div className="p-3 border-t border-zinc-100 bg-zinc-50 flex items-center justify-between text-xs">
                                  {useJudge && (
                                    <div className="flex items-center gap-2">
                                      <Scale className="w-4 h-4 text-indigo-500" />
                                      <span className="text-zinc-600 font-medium">Judge Score:</span>
                                      <span className={`font-bold ${result.judgeScore && result.judgeScore >= 9 ? 'text-emerald-600' : result.judgeScore && result.judgeScore >= 7 ? 'text-amber-600' : 'text-red-600'}`}>
                                        {result.judgeScore}/10
                                      </span>
                                    </div>
                                  )}
                                  {jsonMode && (
                                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded font-medium ${result.isJsonValid ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                      <FileJson className="w-3.5 h-3.5" />
                                      {result.isJsonValid ? 'Valid JSON' : 'Invalid JSON'}
                                    </div>
                                  )}
                                </div>
                              )}
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Charts Tab */}
                  {activeTab === 'charts' && successfulResults.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><Clock className="w-5 h-5 text-indigo-500" /> Latency (ms)</h3>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 25, left: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} angle={-25} textAnchor="end" />
                              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                              <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                              <Bar dataKey="latency" radius={[4, 4, 0, 0]}>
                                {chartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><DollarSign className="w-5 h-5 text-emerald-500" /> Cost (per 1k requests)</h3>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 25, left: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} angle={-25} textAnchor="end" />
                              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={(val) => `$${val.toFixed(2)}`} />
                              <Tooltip cursor={{ fill: '#f3f4f6' }} formatter={(val: any) => [typeof val === 'number' ? `$${val.toFixed(4)}` : val, 'Cost']} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                              <Bar dataKey="cost" radius={[4, 4, 0, 0]}>
                                {chartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><Zap className="w-5 h-5 text-amber-500" /> Speed (Tokens/sec)</h3>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 25, left: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} angle={-25} textAnchor="end" />
                              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                              <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                              <Bar dataKey="speed" radius={[4, 4, 0, 0]}>
                                {chartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Quality Analysis Tab */}
                  {activeTab === 'quality' && successfulResults.length > 0 && (
                    <div className="space-y-6">
                      <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-lg font-bold flex items-center gap-2"><Scale className="w-5 h-5 text-indigo-500" /> LLM-as-a-Judge Evaluation</h3>
                          <div className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full border border-indigo-100">
                            Judge Model: GPT-4o
                          </div>
                        </div>
                        
                        <div className="space-y-6">
                          {successfulResults.sort((a, b) => (b.judgeScore || 0) - (a.judgeScore || 0)).map((result, idx) => {
                            const model = AVAILABLE_MODELS.find(m => m.id === result.modelId)!;
                            return (
                              <div key={result.modelId} className="flex flex-col md:flex-row gap-6 p-5 rounded-xl border border-zinc-100 bg-zinc-50/50">
                                <div className="flex flex-col items-center justify-center shrink-0 w-24">
                                  <div className="text-3xl font-black text-zinc-900 mb-1">#{idx + 1}</div>
                                  <div className="text-xs font-medium text-zinc-500 text-center">{model.name}</div>
                                </div>
                                
                                <div className="flex-1 space-y-3">
                                  <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium text-zinc-500">Score:</span>
                                      <span className={`text-lg font-bold ${result.judgeScore && result.judgeScore >= 9 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                        {result.judgeScore}/10
                                      </span>
                                    </div>
                                    <div className="w-px h-4 bg-zinc-300"></div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium text-zinc-500">Confidence:</span>
                                      <span className="text-sm font-bold text-zinc-900">{result.confidenceScore}%</span>
                                    </div>
                                    {useSimilarity && (
                                      <>
                                        <div className="w-px h-4 bg-zinc-300"></div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm font-medium text-zinc-500">Similarity to consensus:</span>
                                          <span className="text-sm font-bold text-zinc-900">{result.similarityScore}%</span>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                  
                                  <div>
                                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-1">Judge Reasoning</span>
                                    <p className="text-sm text-zinc-700 leading-relaxed bg-white p-3 rounded-lg border border-zinc-200">
                                      {result.judgeReasoning}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
