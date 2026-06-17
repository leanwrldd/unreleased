import { useState } from 'react'
import { X, Mail, Lock, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { signIn, signUp } from '../lib/supabase'

interface Props {
  onClose: () => void
  defaultTab?: 'signin' | 'signup'
}

export default function AuthModal({ onClose, defaultTab = 'signin' }: Props): JSX.Element {
  const [tab, setTab] = useState<'signin' | 'signup'>(defaultTab)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const submit = async (): Promise<void> => {
    setError(null)
    setSuccess(null)
    if (!email || !password) { setError('Email and password are required'); return }
    setLoading(true)
    if (tab === 'signin') {
      const { error: err } = await signIn(email, password)
      setLoading(false)
      if (err) { setError(err); return }
      onClose()
    } else {
      const { error: err } = await signUp(email, password)
      setLoading(false)
      if (err) { setError(err); return }
      setSuccess('Account created! Check your email to confirm, then sign in. Your account will need admin approval before you can edit.')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.currentTarget === e.target) onClose() }}
    >
      <div className="bg-surface border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div className="flex gap-1 bg-surface-overlay rounded-lg p-0.5">
            {(['signin', 'signup'] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(null); setSuccess(null) }}
                className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  tab === t ? 'bg-surface text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {t === 'signin' ? 'Sign in' : 'Sign up'}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <div className="px-5 py-5 space-y-3">
          {tab === 'signup' && (
            <p className="text-xs text-text-muted leading-relaxed">
              Create an account to request editor access. An admin will review and approve your request.
            </p>
          )}

          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              <AlertCircle size={13} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
              <CheckCircle size={13} className="shrink-0 mt-0.5" />
              {success}
            </div>
          )}

          {!success && (
            <>
              <div>
                <label className="block text-xs text-text-muted mb-1">Email</label>
                <div className="relative">
                  <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submit()}
                    placeholder="you@example.com"
                    className="w-full bg-surface-overlay border border-[var(--border)] rounded-lg pl-8 pr-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent/50"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-text-muted mb-1">Password</label>
                <div className="relative">
                  <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submit()}
                    placeholder="••••••••"
                    className="w-full bg-surface-overlay border border-[var(--border)] rounded-lg pl-8 pr-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent/50"
                  />
                </div>
              </div>

              <button
                onClick={submit}
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-accent/15 hover:bg-accent/25 text-accent text-sm font-semibold transition-colors flex items-center justify-center gap-2 mt-1"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                {tab === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
