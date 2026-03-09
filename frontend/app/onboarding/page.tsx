'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LayoutGrid, Loader2, ArrowRight } from 'lucide-react'
import { useAuth } from '../components/AuthContext'

const ROLES = ['Engineer / Developer', 'Researcher', 'Product Manager', 'Data Scientist', 'Designer', 'Other']
const USE_CASES = ['Comparing LLM quality', 'Cost optimisation', 'Latency benchmarking', 'Prompt engineering', 'Team evaluation', 'Just exploring']
const TEAM_SIZES = ['Just me', '2–10', '11–50', '51–200', '200+']

export default function OnboardingPage() {
  const router = useRouter()
  const { user } = useAuth()

  const [role, setRole] = useState('')
  const [useCase, setUseCase] = useState('')
  const [company, setCompany] = useState('')
  const [teamSize, setTeamSize] = useState('')
  const [saving, setSaving] = useState(false)

  const displayName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'there'

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    // Store preferences in user_metadata (non-blocking – best effort)
    try {
      const { supabase } = await import('../lib/supabase')
      await supabase.auth.updateUser({
        data: { role, use_case: useCase, company, team_size: teamSize, onboarding_completed: true }
      })
    } catch {
      // silently ignore – onboarding data is optional
    }
    router.push('/Dashboard')
  }

  const handleSkip = () => router.push('/Dashboard')

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center py-12 px-4 font-sans">
      {/* Progress indicator */}
      <div className="w-full max-w-lg mb-8">
        <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
          <span>Account created</span>
          <span className="text-zinc-900 font-medium">Personal details</span>
          <span>Dashboard</span>
        </div>
        <div className="h-1.5 w-full bg-zinc-200 rounded-full overflow-hidden">
          <div className="h-full w-2/3 bg-black rounded-full transition-all" />
        </div>
      </div>

      <div className="w-full max-w-lg bg-white border border-zinc-200 rounded-3xl shadow-sm px-8 py-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 bg-black rounded-xl flex items-center justify-center shrink-0">
            <LayoutGrid className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-medium text-zinc-500">Inferra</span>
        </div>

        <h1 className="mt-5 text-2xl font-bold text-zinc-900">
          Welcome, {displayName}!
        </h1>
        <p className="mt-1.5 text-sm text-zinc-500">
          Help us tailor your experience. This takes under a minute.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">What&apos;s your role?</label>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`rounded-xl border px-3 py-2.5 text-sm text-left transition-colors ${
                    role === r
                      ? 'border-black bg-black text-white'
                      : 'border-zinc-200 text-zinc-700 hover:border-zinc-400'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Use case */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">Primary use case</label>
            <div className="grid grid-cols-2 gap-2">
              {USE_CASES.map(u => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUseCase(u)}
                  className={`rounded-xl border px-3 py-2.5 text-sm text-left transition-colors ${
                    useCase === u
                      ? 'border-black bg-black text-white'
                      : 'border-zinc-200 text-zinc-700 hover:border-zinc-400'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          {/* Company + team size */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="company" className="block text-sm font-medium text-zinc-700 mb-1">Company <span className="text-zinc-400 font-normal">(optional)</span></label>
              <input
                id="company"
                type="text"
                value={company}
                onChange={e => setCompany(e.target.value)}
                placeholder="Acme Inc."
                className="block w-full rounded-xl border border-zinc-300 px-4 py-2.5 text-sm placeholder-zinc-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Team size</label>
              <select
                value={teamSize}
                onChange={e => setTeamSize(e.target.value)}
                className="block w-full rounded-xl border border-zinc-300 px-4 py-2.5 text-sm text-zinc-700 focus:border-black focus:outline-none focus:ring-1 focus:ring-black transition-colors bg-white"
              >
                <option value="">Select…</option>
                {TEAM_SIZES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-black py-3 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
              {saving ? 'Saving…' : 'Go to Dashboard'}
            </button>

            <button
              type="button"
              onClick={handleSkip}
              disabled={saving}
              className="rounded-full border border-zinc-300 py-3 px-5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 transition-colors"
            >
              Skip
            </button>
          </div>
        </form>
      </div>

      <p className="mt-6 text-xs text-zinc-400">You can update these anytime in Settings.</p>
    </div>
  )
}
