'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Bell, Key, Shield, Trash2, Copy, Check, Eye, EyeOff,
  Loader2, ChevronRight, Zap, Crown, AlertCircle, RefreshCw,
} from 'lucide-react'
import { useAuth } from '@/app/components/AuthContext'
import { supabase } from '@/app/lib/supabase'

// ── Plan config ──────────────────────────────────────────────────────────────
const PLAN_LIMITS: Record<string, { evals: number; tokens: number }> = {
  free:       { evals: 100,    tokens: 500_000 },
  pro:        { evals: 10_000, tokens: 50_000_000 },
  enterprise: { evals: -1,     tokens: -1 },
}

// ── Small reusables ────────────────────────────────────────────────────────
function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="mb-5">
        <h2 className="text-sm font-semibold text-zinc-200">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-zinc-500">{description}</p>}
      </div>
      {children}
    </div>
  )
}

function Toggle({ enabled, onChange, label, description, disabled }: {
  enabled: boolean; onChange: (v: boolean) => void
  label: string; description: string; disabled?: boolean
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-zinc-800 last:border-0">
      <div>
        <p className="text-sm text-zinc-200">{label}</p>
        <p className="text-xs text-zinc-500">{description}</p>
      </div>
      <button
        onClick={() => !disabled && onChange(!enabled)}
        disabled={disabled}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${enabled ? 'bg-violet-600' : 'bg-zinc-700'}`}
      >
        <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-4' : 'translate-x-1'}`} />
      </button>
    </div>
  )
}

const MOCK_KEYS = [
  { id: 'k1', name: 'Production key',    prefix: 'inf_live_', suffix: 'xK9m', lastUsed: '2 hours ago' },
  { id: 'k2', name: 'Dev / staging key', prefix: 'inf_test_', suffix: 'pQ3r', lastUsed: '5 days ago' },
]

interface UsageData {
  evalCount: number
  tokenCount: number
}

export default function SettingsPage() {
  const { user, signOut } = useAuth()

  const [plan,       setPlan]       = useState<string>('free')
  const [usage,      setUsage]      = useState<UsageData>({ evalCount: 0, tokenCount: 0 })
  const [loadingData, setLoadingData] = useState(true)
  const [error,      setError]      = useState<string | null>(null)

  // Notifications (persisted in user_metadata)
  const [notifs, setNotifs] = useState({
    evalComplete:   true,
    weeklyDigest:   true,
    billing:        true,
    productUpdates: false,
  })
  const [savingNotifs, setSavingNotifs] = useState(false)

  // API keys
  const [showKey, setShowKey] = useState<string | null>(null)
  const [copied,  setCopied]  = useState<string | null>(null)

  function copyKey(id: string) {
    navigator.clipboard.writeText('inf_live_••••••••••••xK9m')
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  // Danger zone
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteInput,   setDeleteInput]   = useState('')

  // ── Load real data ──────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!user) return
    setLoadingData(true); setError(null)

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const [profileRes, logsRes, evalsRes] = await Promise.all([
      supabase.from('profiles').select('plan').eq('id', user.id).single(),
      supabase.from('usage_logs').select('evaluation_id').eq('user_id', user.id).gte('created_at', monthStart),
      supabase.from('evaluations')
        .select('evaluation_results(input_tokens, output_tokens)')
        .eq('user_id', user.id)
        .gte('created_at', monthStart),
    ])

    if (profileRes.error) { setError(profileRes.error.message); setLoadingData(false); return }

    setPlan(profileRes.data?.plan ?? 'free')

    // Eval count: unique evaluation_ids in usage_logs this month
    const evalIds = new Set((logsRes.data ?? []).map((l: { evaluation_id: string }) => l.evaluation_id))
    const evalCount = evalIds.size

    // Token count: sum from evaluation_results this month
    type EvalRow = { evaluation_results: { input_tokens: number; output_tokens: number }[] }
    const tokenCount = (evalsRes.data ?? [] as EvalRow[]).reduce((sum: number, ev: EvalRow) =>
      sum + (ev.evaluation_results ?? []).reduce((s, r) => s + (r.input_tokens ?? 0) + (r.output_tokens ?? 0), 0), 0)

    setUsage({ evalCount, tokenCount })

    // Load notification prefs from user_metadata
    const meta = user.user_metadata ?? {}
    if (meta.notifs) {
      setNotifs(n => ({ ...n, ...meta.notifs }))
    }

    setLoadingData(false)
  }, [user])

  useEffect(() => { load() }, [load])

  // ── Save notification prefs ─────────────────────────────────────────────
  async function handleNotifsChange(key: keyof typeof notifs, value: boolean) {
    const next = { ...notifs, [key]: value }
    setNotifs(next)
    setSavingNotifs(true)
    try {
      await supabase.auth.updateUser({ data: { notifs: next } })
    } catch { /* ignore */ }
    setSavingNotifs(false)
  }

  // ── Plan display ────────────────────────────────────────────────────────
  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free
  const evalPct  = limits.evals  === -1 ? 0 : Math.min((usage.evalCount  / limits.evals)  * 100, 100)
  const tokenPct = limits.tokens === -1 ? 0 : Math.min((usage.tokenCount / limits.tokens) * 100, 100)

  function fmtTokens(n: number) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}k`
    return String(n)
  }
  function fmtLimit(n: number) {
    if (n === -1)       return '∞'
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`
    if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}k`
    return String(n)
  }

  return (
    <div className="min-h-full p-8 max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div className="mb-2 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Settings</h1>
          <p className="mt-1 text-sm text-zinc-500">Manage your account, notifications, and API access</p>
        </div>
        <button onClick={load} disabled={loadingData}
          className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-400 hover:text-zinc-200 disabled:opacity-50 transition-colors">
          <RefreshCw className={`h-3.5 w-3.5 ${loadingData ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-900/50 bg-red-950/20 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
        </div>
      )}

      {/* Plan & Usage */}
      <Section title="Plan & Usage" description="Your current subscription and monthly usage">
        {loadingData ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
          </div>
        ) : (
          <>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-zinc-800 p-2 text-zinc-400"><Zap className="h-4 w-4" /></div>
                <div>
                  <p className="text-sm font-semibold text-zinc-100 capitalize">{plan} Plan</p>
                  <p className="text-xs text-zinc-500">
                    {limits.evals === -1
                      ? 'Unlimited evaluations & tokens'
                      : `${fmtLimit(limits.evals)} evaluations / month · ${fmtLimit(limits.tokens)} tokens`}
                  </p>
                </div>
              </div>
              {plan === 'free' && (
                <button className="flex items-center gap-1.5 rounded-full bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500 transition-colors">
                  <Crown className="h-3.5 w-3.5" />
                  Upgrade to Pro
                </button>
              )}
            </div>

            {limits.evals !== -1 && (
              <>
                {[
                  { label: 'Evaluations', used: usage.evalCount,  total: limits.evals,  pct: evalPct,  fmtUsed: String(usage.evalCount),     fmtTotal: fmtLimit(limits.evals) },
                  { label: 'Tokens',      used: usage.tokenCount, total: limits.tokens, pct: tokenPct, fmtUsed: fmtTokens(usage.tokenCount), fmtTotal: fmtLimit(limits.tokens) },
                ].map(({ label, pct, fmtUsed, fmtTotal }) => (
                  <div key={label} className="mb-3 last:mb-0">
                    <div className="flex justify-between text-xs text-zinc-400 mb-1.5">
                      <span>{label}</span>
                      <span className={pct >= 90 ? 'text-red-400' : pct >= 70 ? 'text-amber-400' : ''}>{fmtUsed} / {fmtTotal}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-violet-600'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </Section>

      {/* Notifications */}
      <Section title="Notifications" description={`Choose which emails you want to receive${savingNotifs ? ' · Saving…' : ''}`}>
        <Toggle
          enabled={notifs.evalComplete}
          onChange={v => handleNotifsChange('evalComplete', v)}
          disabled={savingNotifs}
          label="Evaluation completed"
          description="Get notified when a long-running evaluation finishes"
        />
        <Toggle
          enabled={notifs.weeklyDigest}
          onChange={v => handleNotifsChange('weeklyDigest', v)}
          disabled={savingNotifs}
          label="Weekly digest"
          description="A summary of your usage and top evaluations each week"
        />
        <Toggle
          enabled={notifs.billing}
          onChange={v => handleNotifsChange('billing', v)}
          disabled={savingNotifs}
          label="Billing alerts"
          description="Notify when approaching plan limits or payment due"
        />
        <Toggle
          enabled={notifs.productUpdates}
          onChange={v => handleNotifsChange('productUpdates', v)}
          disabled={savingNotifs}
          label="Product updates"
          description="New features, improvements and release notes"
        />
      </Section>

      {/* API Keys */}
      <Section title="API Keys" description="Use these keys to call the Inferra API from your own code">
        <div className="space-y-3 mb-4">
          {MOCK_KEYS.map(k => (
            <div key={k.id} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <Key className="h-4 w-4 shrink-0 text-zinc-500" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-200">{k.name}</p>
                  <p className="text-xs text-zinc-500 font-mono">
                    {k.prefix}{'••••••••••••'}{k.suffix}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <span className="text-[10px] text-zinc-600">Last used {k.lastUsed}</span>
                <button
                  onClick={() => setShowKey(showKey === k.id ? null : k.id)}
                  className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showKey === k.id ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
                <button
                  onClick={() => copyKey(k.id)}
                  className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {copied === k.id ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          ))}
        </div>
        <button className="flex items-center gap-2 rounded-lg border border-dashed border-zinc-700 px-4 py-2.5 text-sm text-zinc-400 hover:border-violet-500 hover:text-violet-400 transition-colors w-full justify-center">
          + Generate new API key
        </button>
      </Section>

      {/* Security */}
      <Section title="Security" description="Password and account access">
        <div className="space-y-1">
          {[
            { label: 'Change password',           desc: 'Update your login password' },
            { label: 'Two-factor authentication', desc: 'Add an extra layer of security' },
            { label: 'Active sessions',            desc: 'View and revoke logged-in devices' },
          ].map(({ label, desc }) => (
            <button
              key={label}
              className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-left hover:bg-zinc-800 transition-colors"
            >
              <div>
                <p className="text-sm text-zinc-200">{label}</p>
                <p className="text-xs text-zinc-500">{desc}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-zinc-600" />
            </button>
          ))}
        </div>
      </Section>

      {/* Danger zone */}
      <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-6">
        <div className="flex items-center gap-2 mb-1">
          <Trash2 className="h-4 w-4 text-red-400" />
          <h2 className="text-sm font-semibold text-red-400">Danger Zone</h2>
        </div>
        <p className="text-xs text-zinc-500 mb-4">Permanently delete your account and all associated data. This cannot be undone.</p>

        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="rounded-lg border border-red-800 px-4 py-2 text-sm text-red-400 hover:bg-red-900/30 transition-colors"
          >
            Delete my account
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-zinc-400">Type <span className="font-mono text-red-400">delete my account</span> to confirm:</p>
            <input
              value={deleteInput}
              onChange={e => setDeleteInput(e.target.value)}
              className="w-full rounded-lg border border-red-800 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-red-500"
              placeholder="delete my account"
            />
            <div className="flex gap-2">
              <button
                disabled={deleteInput !== 'delete my account'}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-500 disabled:opacity-40 transition-colors"
              >
                Confirm delete
              </button>
              <button
                onClick={() => { setConfirmDelete(false); setDeleteInput('') }}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
