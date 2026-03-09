'use client'

import { useState, useEffect, useCallback } from 'react'
import { Camera, Save, Loader2, CheckCircle2, SplitSquareHorizontal, DollarSign, Calendar, AlertCircle } from 'lucide-react'
import { supabase } from '@/app/lib/supabase'
import { useAuth } from '@/app/components/AuthContext'

const ROLES     = ['Engineer / Developer', 'Researcher', 'Product Manager', 'Data Scientist', 'Designer', 'Other']
const USE_CASES = ['Comparing LLM quality', 'Cost optimisation', 'Latency benchmarking', 'Prompt engineering', 'Team evaluation', 'Just exploring']
const TEAM_SIZES = ['Just me', '2–10', '11–50', '51–200', '200+']

interface Profile {
  full_name:  string
  avatar_url: string | null
  plan:       string
  created_at: string
}

interface Stats {
  evalCount: number
  totalCost: number
}

function Avatar({ name }: { name: string }) {
  const initials = name.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'
  return (
    <div className="h-20 w-20 flex items-center justify-center rounded-full bg-violet-600 text-2xl font-bold text-white">
      {initials}
    </div>
  )
}

const PLAN_BADGE: Record<string, string> = {
  free:       'bg-zinc-800 text-zinc-400',
  pro:        'bg-violet-600/20 text-violet-300',
  enterprise: 'bg-amber-500/20 text-amber-300',
}

export default function ProfilePage() {
  const { user } = useAuth()

  const [profile,  setProfile]  = useState<Profile | null>(null)
  const [stats,    setStats]    = useState<Stats>({ evalCount: 0, totalCost: 0 })
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)

  // Editable fields
  const [fullName, setFullName] = useState('')
  const [company,  setCompany]  = useState('')
  const [teamSize, setTeamSize] = useState('')
  const [role,     setRole]     = useState('')
  const [useCase,  setUseCase]  = useState('')

  const loadProfile = useCallback(async () => {
    if (!user) return
    setLoading(true); setError(null)

    const [profileRes, statsRes] = await Promise.all([
      supabase.from('profiles').select('full_name, avatar_url, plan, created_at').eq('id', user.id).single(),
      supabase.from('usage_logs').select('cost_usd, evaluation_id').eq('user_id', user.id),
    ])

    if (profileRes.error) { setError(profileRes.error.message); setLoading(false); return }

    const p = profileRes.data as Profile
    setProfile(p)
    setFullName(p.full_name ?? '')

    // Load extras from user_metadata (set during onboarding)
    const meta = user.user_metadata ?? {}
    setCompany(meta.company ?? '')
    setTeamSize(meta.team_size ?? '')
    setRole(meta.role ?? '')
    setUseCase(meta.use_case ?? '')

    if (statsRes.data) {
      const logs = statsRes.data
      const evalIds = new Set(logs.map((l: { evaluation_id: string }) => l.evaluation_id))
      const totalCost = logs.reduce((s: number, l: { cost_usd: number }) => s + (l.cost_usd ?? 0), 0)
      setStats({ evalCount: evalIds.size, totalCost })
    }

    setLoading(false)
  }, [user])

  useEffect(() => { loadProfile() }, [loadProfile])

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    try {
      await Promise.all([
        // Update profiles table
        supabase.from('profiles').update({ full_name: fullName }).eq('id', user.id),
        // Update user_metadata for extras
        supabase.auth.updateUser({
          data: { name: fullName, company, team_size: teamSize, role, use_case: useCase }
        }),
      ])
      setProfile(p => p ? { ...p, full_name: fullName } : p)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch { /* ignore */ }
    setSaving(false)
  }

  const email     = user?.email ?? '—'
  const joinedAt  = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—'
  const plan = profile?.plan ?? 'free'

  if (loading) return (
    <div className="min-h-full flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
    </div>
  )

  if (error) return (
    <div className="min-h-full flex items-center justify-center">
      <div className="text-center">
        <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-3" />
        <p className="text-sm text-red-400">{error}</p>
        <button onClick={loadProfile} className="mt-3 text-xs text-zinc-500 hover:text-zinc-300 underline">Retry</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-full p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-100">Profile</h1>
        <p className="mt-1 text-sm text-zinc-500">Manage your personal information and preferences</p>
      </div>

      {/* Identity card */}
      <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900 p-6 flex items-center gap-5">
        <div className="relative">
          <Avatar name={fullName || email} />
          <button className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-white hover:bg-violet-500 transition-colors">
            <Camera className="h-3 w-3" />
          </button>
        </div>
        <div>
          <p className="text-lg font-semibold text-zinc-100">{fullName || 'Unnamed User'}</p>
          <p className="text-sm text-zinc-500">{email}</p>
          <span className={`mt-1.5 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${PLAN_BADGE[plan] ?? PLAN_BADGE.free}`}>
            {plan} plan
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        {[
          { label: 'Evaluations',  value: String(stats.evalCount),              icon: SplitSquareHorizontal, color: 'text-violet-400' },
          { label: 'Total Spent',  value: `$${stats.totalCost.toFixed(4)}`,     icon: DollarSign,            color: 'text-emerald-400' },
          { label: 'Member Since', value: joinedAt,                             icon: Calendar,              color: 'text-blue-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex items-center gap-4">
            <div className={`rounded-lg bg-zinc-800 p-2.5 ${color}`}><Icon className="h-5 w-5" /></div>
            <div>
              <p className="text-xs text-zinc-500">{label}</p>
              <p className="text-base font-bold text-zinc-100 truncate">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Edit form */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-6">
        <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Personal Details</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Display name</label>
            <input value={fullName} onChange={e => setFullName(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              placeholder="Your name" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Email</label>
            <input value={email} disabled
              className="w-full rounded-lg border border-zinc-800 bg-zinc-800/50 px-4 py-2.5 text-sm text-zinc-500 cursor-not-allowed" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Company</label>
            <input value={company} onChange={e => setCompany(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              placeholder="Acme Inc." />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Team size</label>
            <select value={teamSize} onChange={e => setTeamSize(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500">
              <option value="">Select…</option>
              {TEAM_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-2">Role</label>
          <div className="grid grid-cols-3 gap-2">
            {ROLES.map(r => (
              <button key={r} type="button" onClick={() => setRole(r)}
                className={`rounded-lg border px-3 py-2 text-xs text-left transition-colors ${role === r ? 'border-violet-500 bg-violet-600/15 text-violet-300' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}>
                {r}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-2">Primary use case</label>
          <div className="grid grid-cols-3 gap-2">
            {USE_CASES.map(u => (
              <button key={u} type="button" onClick={() => setUseCase(u)}
                className={`rounded-lg border px-3 py-2 text-xs text-left transition-colors ${useCase === u ? 'border-violet-500 bg-violet-600/15 text-violet-300' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}>
                {u}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2 border-t border-zinc-800">
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 rounded-full bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50 transition-colors">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save changes'}
          </button>
          {saved && <p className="text-xs text-emerald-400">Profile updated successfully.</p>}
        </div>
      </div>
    </div>
  )
}
