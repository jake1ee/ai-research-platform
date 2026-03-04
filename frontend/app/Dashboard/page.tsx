'use client';

import React, { useState } from 'react';
import Link from "next/link"
import { 
  LayoutGrid, Activity, CreditCard, Settings, Users, 
  FlaskConical, Shield, Key, GitBranch, BarChart3, 
  Zap, Clock, Database, ServerCrash, RefreshCcw,
  PieChart, LineChart as LineChartIcon, FileText,
  Terminal, AlertTriangle, CheckCircle2, Search,
  ArrowUpRight, ArrowDownRight, Layers,
  ArrowRight
} from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, PieChart as RechartsPieChart, Pie, 
  Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';

type Tab = 'overview' | 'billing' | 'engineering' | 'research' | 'team';

// Mock Data
const costData = [
  { date: 'Mar 1', cost: 12.5, requests: 4500 },
  { date: 'Mar 2', cost: 15.2, requests: 5200 },
  { date: 'Mar 3', cost: 18.7, requests: 6100 },
  { date: 'Mar 4', cost: 14.3, requests: 4800 },
  { date: 'Mar 5', cost: 22.1, requests: 7500 },
  { date: 'Mar 6', cost: 28.4, requests: 9200 },
  { date: 'Mar 7', cost: 25.6, requests: 8400 },
];

const modelUsageData = [
  { name: 'GPT-4o', value: 45 },
  { name: 'Claude 3 Opus', value: 30 },
  { name: 'Gemini 1.5 Pro', value: 15 },
  { name: 'Llama 3 70B', value: 10 },
];

const latencyTrendData = [
  { time: '00:00', gpt4o: 450, claude: 800, gemini: 600 },
  { time: '04:00', gpt4o: 480, claude: 850, gemini: 620 },
  { time: '08:00', gpt4o: 600, claude: 1200, gemini: 800 },
  { time: '12:00', gpt4o: 550, claude: 950, gemini: 750 },
  { time: '16:00', gpt4o: 520, claude: 900, gemini: 700 },
  { time: '20:00', gpt4o: 460, claude: 820, gemini: 650 },
];

const COLORS = ['#6366f1', '#8b5cf6', '#14b8a6', '#f59e0b'];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  return (
    <div className="min-h-screen bg-zinc-50 flex font-sans text-zinc-900">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white border-r border-zinc-200 flex flex-col shrink-0">
        <div className="h-14 flex items-center px-6 border-b border-zinc-200">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-6 h-6 bg-black rounded flex items-center justify-center">
              <LayoutGrid className="w-3 h-3 text-white" />
            </div>
            <span className="font-bold text-sm tracking-tight">ModelCompare</span>
          </Link>
        </div>

        <div className="p-4 flex-1 flex flex-col gap-1 overflow-y-auto">
          <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 mt-2 px-2">Dashboard</div>
          <button 
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'overview' ? 'bg-indigo-50 text-indigo-700' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'}`}
          >
            <Activity className="w-4 h-4" /> Analytics Overview
          </button>
          <button 
            onClick={() => setActiveTab('billing')}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'billing' ? 'bg-indigo-50 text-indigo-700' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'}`}
          >
            <CreditCard className="w-4 h-4" /> Billing & Usage
          </button>

          <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 mt-6 px-2">Architecture</div>
          <button 
            onClick={() => setActiveTab('engineering')}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'engineering' ? 'bg-indigo-50 text-indigo-700' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'}`}
          >
            <Settings className="w-4 h-4" /> Engineering Systems
          </button>
          <button 
            onClick={() => setActiveTab('research')}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'research' ? 'bg-indigo-50 text-indigo-700' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'}`}
          >
            <FlaskConical className="w-4 h-4" /> Research & Evals
          </button>
          
          <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 mt-6 px-2">Enterprise</div>
          <button 
            onClick={() => setActiveTab('team')}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'team' ? 'bg-indigo-50 text-indigo-700' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'}`}
          >
            <Users className="w-4 h-4" /> Team Workspace
          </button>
        </div>

        <div className="p-4 border-t border-zinc-200">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
              JD
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium">John Doe</span>
              <span className="text-xs text-zinc-500">Pro Plan</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 border-b border-zinc-200 bg-white flex items-center justify-between px-8 shrink-0">
          <h1 className="font-semibold text-lg capitalize">
            {activeTab === 'team' ? 'Team Workspace' : activeTab.replace('-', ' ')}
          </h1>
          <div className="flex items-center gap-4">
            <Link href="/compare" className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors">
              <Terminal className="w-4 h-4" /> Open Evaluation Lab
            </Link>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto space-y-8">
            
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-medium text-zinc-500">Total Cost (7d)</h3>
                      <CreditCard className="w-4 h-4 text-zinc-400" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold">$136.80</span>
                      <span className="text-sm font-medium text-emerald-600 flex items-center"><ArrowUpRight className="w-3 h-3" /> 12%</span>
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-medium text-zinc-500">Total Requests (7d)</h3>
                      <Activity className="w-4 h-4 text-zinc-400" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold">45.7K</span>
                      <span className="text-sm font-medium text-emerald-600 flex items-center"><ArrowUpRight className="w-3 h-3" /> 8%</span>
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-medium text-zinc-500">Avg Latency</h3>
                      <Clock className="w-4 h-4 text-zinc-400" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold">640ms</span>
                      <span className="text-sm font-medium text-emerald-600 flex items-center"><ArrowDownRight className="w-3 h-3" /> 5%</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                    <h3 className="text-base font-bold mb-6">Cost & Usage Trend</h3>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={costData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} dy={10} />
                          <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} tickFormatter={(val) => `$${val}`} />
                          <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                          <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                          <Area yAxisId="left" type="monotone" dataKey="cost" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorCost)" />
                          <Line yAxisId="right" type="monotone" dataKey="requests" stroke="#14b8a6" strokeWidth={2} dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                    <h3 className="text-base font-bold mb-6">Model Distribution</h3>
                    <div className="h-72 flex flex-col">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={modelUsageData}
                            cx="50%"
                            cy="45%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {modelUsageData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                      <div className="grid grid-cols-2 gap-2 mt-auto">
                        {modelUsageData.map((entry, index) => (
                          <div key={entry.name} className="flex items-center gap-2 text-xs">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                            <span className="text-zinc-600 truncate">{entry.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Billing Tab */}
            {activeTab === 'billing' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <h2 className="text-xl font-bold mb-1">Pro Plan</h2>
                    <p className="text-sm text-zinc-500">Your plan renews on April 1, 2026.</p>
                  </div>
                  <div className="flex gap-3">
                    <button className="px-4 py-2 bg-white border border-zinc-200 text-zinc-700 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-colors">
                      Manage in Stripe
                    </button>
                    <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
                      Upgrade Plan
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                    <h3 className="text-base font-bold mb-4">Usage Limits</h3>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="font-medium text-zinc-700">API Requests</span>
                          <span className="text-zinc-500">45.7K / 100K</span>
                        </div>
                        <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 w-[45.7%]" />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="font-medium text-zinc-700">Team Members</span>
                          <span className="text-zinc-500">3 / 5</span>
                        </div>
                        <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 w-[60%]" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                    <h3 className="text-base font-bold mb-4">Cost by Model (MTD)</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-600">GPT-4o</span>
                        <span className="font-medium">$84.20</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-600">Claude 3 Opus</span>
                        <span className="font-medium">$42.15</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-600">Gemini 1.5 Pro</span>
                        <span className="font-medium">$10.45</span>
                      </div>
                      <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-sm font-bold">
                        <span>Total</span>
                        <span>$136.80</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Engineering Tab */}
            {activeTab === 'engineering' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <RefreshCcw className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold">Model Fallback System</h3>
                        <p className="text-xs text-zinc-500">Automatically route to backups on failure</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 border border-zinc-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium">Primary: GPT-4o</span>
                          <ArrowRight className="w-4 h-4 text-zinc-400" />
                          <span className="text-sm text-zinc-600">Fallback: Claude 3 Sonnet</span>
                        </div>
                        <div className="w-8 h-4 bg-indigo-600 rounded-full relative cursor-pointer">
                          <div className="absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full translate-x-4" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 border border-zinc-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium">Primary: Claude 3 Opus</span>
                          <ArrowRight className="w-4 h-4 text-zinc-400" />
                          <span className="text-sm text-zinc-600">Fallback: Gemini 1.5 Pro</span>
                        </div>
                        <div className="w-8 h-4 bg-indigo-600 rounded-full relative cursor-pointer">
                          <div className="absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full translate-x-4" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                        <ServerCrash className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold">Resilience & Timeouts</h3>
                        <p className="text-xs text-zinc-500">Configure retry logic and limits</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="flex justify-between text-sm font-medium mb-2">
                          <span>Max Retries</span>
                          <span className="text-zinc-500">3 attempts</span>
                        </label>
                        <input type="range" min="0" max="5" defaultValue="3" className="w-full accent-amber-500" />
                      </div>
                      <div>
                        <label className="flex justify-between text-sm font-medium mb-2">
                          <span>Global Timeout</span>
                          <span className="text-zinc-500">30 seconds</span>
                        </label>
                        <input type="range" min="5" max="120" defaultValue="30" className="w-full accent-amber-500" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                        <Database className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold">Caching Layer</h3>
                        <p className="text-xs text-zinc-500">Semantic caching to reduce costs</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Enable Semantic Cache</span>
                        <div className="w-8 h-4 bg-emerald-600 rounded-full relative cursor-pointer">
                          <div className="absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full translate-x-4" />
                        </div>
                      </div>
                      <div>
                        <label className="flex justify-between text-sm font-medium mb-2">
                          <span>Similarity Threshold</span>
                          <span className="text-zinc-500">0.95</span>
                        </label>
                        <input type="range" min="0.8" max="1" step="0.01" defaultValue="0.95" className="w-full accent-emerald-500" />
                      </div>
                      <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" /> Saved $42.50 this month via caching
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                        <Layers className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold">Request Queue</h3>
                        <p className="text-xs text-zinc-500">Manage rate limits and concurrency</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Max Concurrent Requests</span>
                        <span className="text-sm font-bold bg-zinc-100 px-2 py-1 rounded">50</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Requests per Minute (RPM)</span>
                        <span className="text-sm font-bold bg-zinc-100 px-2 py-1 rounded">3,000</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Tokens per Minute (TPM)</span>
                        <span className="text-sm font-bold bg-zinc-100 px-2 py-1 rounded">250,000</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Research Tab */}
            {activeTab === 'research' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-bold">Prompt Versioning & A/B Testing</h3>
                      <p className="text-sm text-zinc-500">Track performance across prompt iterations</p>
                    </div>
                    <button className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors">
                      New Experiment
                    </button>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-zinc-500 uppercase bg-zinc-50 border-y border-zinc-200">
                        <tr>
                          <th className="px-4 py-3 font-medium">Experiment Name</th>
                          <th className="px-4 py-3 font-medium">Variants</th>
                          <th className="px-4 py-3 font-medium">Model</th>
                          <th className="px-4 py-3 font-medium">Win Rate</th>
                          <th className="px-4 py-3 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        <tr className="hover:bg-zinc-50">
                          <td className="px-4 py-3 font-medium text-zinc-900 flex items-center gap-2">
                            <GitBranch className="w-4 h-4 text-indigo-500" /> Customer Support v2
                          </td>
                          <td className="px-4 py-3 text-zinc-600">A vs B</td>
                          <td className="px-4 py-3 text-zinc-600">GPT-4o</td>
                          <td className="px-4 py-3 text-emerald-600 font-medium">Variant B (68%)</td>
                          <td className="px-4 py-3"><span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">Completed</span></td>
                        </tr>
                        <tr className="hover:bg-zinc-50">
                          <td className="px-4 py-3 font-medium text-zinc-900 flex items-center gap-2">
                            <GitBranch className="w-4 h-4 text-indigo-500" /> JSON Extraction
                          </td>
                          <td className="px-4 py-3 text-zinc-600">v1.2 vs v1.3</td>
                          <td className="px-4 py-3 text-zinc-600">Claude 3 Haiku</td>
                          <td className="px-4 py-3 text-zinc-400">Gathering data...</td>
                          <td className="px-4 py-3"><span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">Running</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                    <h3 className="text-base font-bold mb-4">Multi-Run Benchmarking</h3>
                    <p className="text-sm text-zinc-600 mb-4">Run evaluations 100+ times to calculate standard deviation and ensure deterministic outputs.</p>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg border border-zinc-200">
                        <span className="text-sm font-medium">Math Reasoning Eval</span>
                        <span className="text-xs font-mono text-zinc-500">n=100 runs</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg border border-zinc-200">
                        <span className="text-sm font-medium">Code Generation Eval</span>
                        <span className="text-xs font-mono text-zinc-500">n=50 runs</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                    <h3 className="text-base font-bold mb-4">Latency Standard Deviation</h3>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">GPT-4o</span>
                          <span className="text-zinc-500 font-mono">± 45ms</span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 w-[20%]" />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">Claude 3 Opus</span>
                          <span className="text-zinc-500 font-mono">± 120ms</span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 w-[60%]" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Team Tab */}
            {activeTab === 'team' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-bold">API Key Management</h3>
                      <p className="text-sm text-zinc-500">Manage provider keys securely via BYOK architecture</p>
                    </div>
                    <button className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors">
                      Add Provider Key
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 border border-zinc-200 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-zinc-100 flex items-center justify-center">
                          <Key className="w-4 h-4 text-zinc-600" />
                        </div>
                        <div>
                          <div className="text-sm font-bold">OpenAI</div>
                          <div className="text-xs text-zinc-500 font-mono">sk-proj-...8f9a</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">Active</span>
                        <button className="text-zinc-400 hover:text-zinc-900"><Settings className="w-4 h-4" /></button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 border border-zinc-200 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-zinc-100 flex items-center justify-center">
                          <Key className="w-4 h-4 text-zinc-600" />
                        </div>
                        <div>
                          <div className="text-sm font-bold">Anthropic</div>
                          <div className="text-xs text-zinc-500 font-mono">sk-ant-...2b4c</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">Active</span>
                        <button className="text-zinc-400 hover:text-zinc-900"><Settings className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-bold">Role-Based Access Control</h3>
                      <p className="text-sm text-zinc-500">Manage team members and permissions</p>
                    </div>
                    <button className="px-4 py-2 bg-white border border-zinc-200 text-zinc-700 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-colors">
                      Invite Member
                    </button>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-zinc-500 uppercase bg-zinc-50 border-y border-zinc-200">
                        <tr>
                          <th className="px-4 py-3 font-medium">User</th>
                          <th className="px-4 py-3 font-medium">Role</th>
                          <th className="px-4 py-3 font-medium">Status</th>
                          <th className="px-4 py-3 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        <tr className="hover:bg-zinc-50">
                          <td className="px-4 py-3 font-medium text-zinc-900 flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs">JD</div>
                            John Doe (You)
                          </td>
                          <td className="px-4 py-3 text-zinc-600">Admin</td>
                          <td className="px-4 py-3"><span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">Active</span></td>
                          <td className="px-4 py-3 text-zinc-400">--</td>
                        </tr>
                        <tr className="hover:bg-zinc-50">
                          <td className="px-4 py-3 font-medium text-zinc-900 flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs">AS</div>
                            Alice Smith
                          </td>
                          <td className="px-4 py-3 text-zinc-600">Engineer</td>
                          <td className="px-4 py-3"><span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">Active</span></td>
                          <td className="px-4 py-3"><button className="text-indigo-600 hover:underline">Edit</button></td>
                        </tr>
                        <tr className="hover:bg-zinc-50">
                          <td className="px-4 py-3 font-medium text-zinc-900 flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs">BW</div>
                            Bob Wilson
                          </td>
                          <td className="px-4 py-3 text-zinc-600">Viewer</td>
                          <td className="px-4 py-3"><span className="px-2 py-1 bg-zinc-100 text-zinc-700 text-xs font-bold rounded-full">Invited</span></td>
                          <td className="px-4 py-3"><button className="text-indigo-600 hover:underline">Resend</button></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
