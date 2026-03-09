'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Search, Download, ChevronDown, ChevronUp, Clock, Cpu,
  DollarSign, CheckCircle2, XCircle, Loader2,
  SplitSquareHorizontal, RefreshCw, AlertCircle,
} from 'lucide-react'
import { supabase } from '@/app/lib/supabase'
import { useAuth } from '@/app/components/AuthContext'

type Status = 'completed' | 'failed' | 'running' | 'pending'

interface EvalResult {
  input_tokens:  number
  output_tokens: number
  cost_usd:      number
  latency_ms:    number
}

interface EvalRow {
  id:                 string
  prompt:             string
  model_ids:          string
  status:             Status
  created_at:         string
  evaluation_results: EvalResult[]
}

function parseModelIds(raw: string): string[] {
  try {
    const p = JSON.parse(raw)
    if (Array.isArray(p)) return p
  } catch { /* not JSON */ }
  return (raw ?? '').split(',').map(s => s.trim()).filter(Boolean)
}

function shortModel(id: string) {
  return id.includes('/') ? id.split('/')[1] : id
}

const STATUS_CFG: Record<Status, { label: string; icon: React.ElementType; cls: string }> = {
  completed: { label: 'Completed', icon: CheckCircle2, cls: 'text-emerald-400 bg-emerald-400/10' },
  failed:    { label: 'Failed',    icon: XCircle,      cls: 'text-red-400 bg-red-400/10'         },
  running:   { label: 'Running',   icon: Loader2,      cls: 'text-violet-400 bg-violet-400/10'   },
  pending:   { label: 'Pending',   icon: Loader2,      cls: 'text-zinc-400 bg-zinc-400/10'       },
}

function fmt(d: string) {
  return new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function HistoryPage() {
  const { user } = useAuth()
  const [rows,    setRows]    = useState<EvalRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [search,  setSearch]  = useState('')
  const [status,  setStatus]  = useState<Status | 'all'>('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [sortDir, setSortDir]   = useState<'asc' | 'desc'>('desc')

  const fetch = useCallback(async () => {
    if (!user) return
    setLoading(true); setError(null)
    const { data, error: err } = await supabase
      .from('evaluations')
      .select('id, prompt, model_ids, status, created_at, evaluation_results(input_tokens, output_tokens, cost_usd, latency_ms)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100)
    if (err) setError(err.message)
    else setRows((data ?? []) as EvalRow[])
    setLoading(false)
  }, [user])

  useEffect(() => { fetch() }, [fetch])

  const totalCost = rows.reduce((s, r) => s + (r.evaluation_results ?? []).reduce((rs, e) => rs + (e.cost_usd ?? 0), 0), 0)
  const completedCount = rows.filter(r => r.status === 'completed').length
  const allLat = rows.flatMap(r => (r.evaluation_results ?? []).map(e => e.latency_ms).filter(Boolean))
  const avgLatency = allLat.length ? Math.round(allLat.reduce((s, v) => s + v, 0) / allLat.length) : 0

  const filtered = useMemo(() => {
    let list = rows.filter(r => {
      if (status !== 'all' && r.status !== status) return false
      const models = parseModelIds(r.model_ids)
      if (search && !r.prompt.toLowerCase().includes(search.toLowerCase()) &&
          !models.some(m => m.toLowerCase().includes(search.toLowerCase()))) return false
      return true
    })
    return [...list].sort((a, b) => {
      const d = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      return sortDir === 'desc' ? -d : d
    })
  }, [rows, search, status, sortDir])

  return (
    <div className="min-h-full p-8 max-w-6xl mx-auto">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Evaluation History</h1>
          <p className="mt-1 text-sm text-zinc-500">All your past and current LLM evaluation runs</p>
        </div>
        <button onClick={fetch} disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-400 hover:text-zinc-200 disabled:opacity-50 transition-colors">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="mb-8 grid grid-cols-3 gap-4">
        {[
          { label: 'Completed Evals', value: loading ? '—' : String(completedCount),         icon: SplitSquareHorizontal, color: 'text-violet-400' },
          { label: 'Total Cost',      value: loading ? '—' : `$${totalCost.toFixed(4)}`,     icon: DollarSign,            color: 'text-emerald-400' },
          { label: 'Avg Latency',     value: loading ? '—' : avgLatency ? `${avgLatency} ms` : '—', icon: Clock, color: 'text-blue-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex items-center gap-4">
            <div className={`rounded-lg bg-zinc-800 p-2.5 ${color}`}><Icon className="h-5 w-5" /></div>
            <div>
              <p className="text-xs text-zinc-500">{label}</p>
              <p className="text-xl font-bold text-zinc-100">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search prompts or models…"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 pl-9 pr-4 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500" />
        </div>
        <select value={status} onChange={e => setStatus(e.target.value as Status | 'all')}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 focus:border-violet-500 focus:outline-none">
          <option value="all">All statuses</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="running">Running</option>
          <option value="pending">Pending</option>
        </select>
        <button onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
          {sortDir === 'desc' ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          {sortDir === 'desc' ? 'Newest first' : 'Oldest first'}
        </button>
        <button className="ml-auto flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/60">
              {['Prompt', 'Models', 'Status', 'Cost', 'Latency', 'Date'].map((h, i) => (
                <th key={h} className={`px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider ${i === 0 ? 'text-left w-[38%]' : i < 3 ? 'text-left' : 'text-right'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-16 text-center">
                <Loader2 className="h-6 w-6 animate-spin text-violet-500 mx-auto mb-2" />
                <p className="text-sm text-zinc-500">Loading evaluations…</p>
              </td></tr>
            ) : error ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center">
                <AlertCircle className="h-6 w-6 text-red-400 mx-auto mb-2" />
                <p className="text-sm text-red-400">{error}</p>
                <button onClick={fetch} className="mt-3 text-xs text-zinc-500 hover:text-zinc-300 underline">Try again</button>
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-16 text-center text-sm text-zinc-600">
                {rows.length === 0 ? 'No evaluations yet — run your first comparison in the Evaluation Lab.' : 'No evaluations match your search.'}
              </td></tr>
            ) : filtered.map((row, i) => {
              const cfg = STATUS_CFG[row.status] ?? STATUS_CFG.pending
              const isExp = expanded === row.id
              const models = parseModelIds(row.model_ids)
              const res = row.evaluation_results ?? []
              const rowCost = res.reduce((s, r) => s + (r.cost_usd ?? 0), 0)
              const rowLat  = res.length ? Math.round(res.reduce((s, r) => s + (r.latency_ms ?? 0), 0) / res.length) : 0
              const rowIn   = res.reduce((s, r) => s + (r.input_tokens  ?? 0), 0)
              const rowOut  = res.reduce((s, r) => s + (r.output_tokens ?? 0), 0)

              return (
                <>
                  <tr key={row.id} onClick={() => setExpanded(isExp ? null : row.id)}
                    className={`cursor-pointer border-b border-zinc-800/60 transition-colors hover:bg-zinc-800/40 ${i % 2 === 0 ? 'bg-zinc-950' : 'bg-zinc-900/30'}`}>
                    <td className="px-4 py-3"><p className="truncate max-w-xs text-zinc-200">{row.prompt}</p></td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {models.map(m => <span key={m} className="inline-flex rounded-md bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-400">{shortModel(m)}</span>)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.cls}`}>
                        <cfg.icon className={`h-3 w-3 ${row.status === 'running' || row.status === 'pending' ? 'animate-spin' : ''}`} />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-zinc-300">{rowCost > 0 ? `$${rowCost.toFixed(4)}` : '—'}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-zinc-300">{rowLat > 0 ? `${rowLat} ms` : '—'}</td>
                    <td className="px-4 py-3 text-right text-xs text-zinc-500 whitespace-nowrap">{fmt(row.created_at)}</td>
                  </tr>
                  {isExp && (
                    <tr key={`${row.id}-d`} className="border-b border-zinc-800">
                      <td colSpan={6} className="bg-zinc-900/60 px-6 py-4">
                        <div className="grid grid-cols-4 gap-3 mb-3">
                          {[
                            { label: 'Input tokens',  value: rowIn  > 0 ? rowIn.toLocaleString()   : '—', icon: Cpu },
                            { label: 'Output tokens', value: rowOut > 0 ? rowOut.toLocaleString()  : '—', icon: Cpu },
                            { label: 'Avg latency',   value: rowLat > 0 ? `${rowLat} ms`           : '—', icon: Clock },
                            { label: 'Total cost',    value: rowCost > 0 ? `$${rowCost.toFixed(6)}` : '—', icon: DollarSign },
                          ].map(({ label, value, icon: Icon }) => (
                            <div key={label} className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3">
                              <p className="text-[11px] text-zinc-500 mb-0.5">{label}</p>
                              <p className="text-sm font-semibold font-mono text-zinc-200">{value}</p>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          <span className="text-zinc-600 mr-1">Prompt:</span>{row.prompt}
                        </p>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
      </div>
      {!loading && !error && (
        <p className="mt-4 text-xs text-zinc-600 text-right">{filtered.length} of {rows.length} evaluations</p>
      )}
    </div>
  )
}
