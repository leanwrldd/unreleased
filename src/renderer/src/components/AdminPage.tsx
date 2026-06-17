import { useEffect, useState } from 'react'
import { ChevronLeft, Users, Clock, CheckCircle, XCircle, ShieldCheck, BarChart2, Loader2, RefreshCw } from 'lucide-react'
import { useStore } from '../store/useStore'
import { getProfiles, getRecentSupplements, updateProfileRole, Profile, SongSupplement } from '../lib/supabase'

type Tab = 'pending' | 'editors' | 'submissions' | 'stats'

export default function AdminPage(): JSX.Element {
  const { setActiveView, session, userProfile } = useStore()
  const [tab, setTab] = useState<Tab>('pending')
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [supplements, setSupplements] = useState<SongSupplement[]>([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)

  // Redirect non-admins
  const isAdmin = userProfile?.role === 'admin'

  const load = async (): Promise<void> => {
    setLoading(true)
    const [p, s] = await Promise.all([getProfiles(), getRecentSupplements(30)])
    setProfiles(p)
    setSupplements(s)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const pending = profiles.filter((p) => p.role === 'pending')
  const editors = profiles.filter((p) => p.role === 'editor' || p.role === 'admin')

  const approve = async (userId: string): Promise<void> => {
    if (!session) return
    setActionId(userId)
    await updateProfileRole(userId, 'editor', session.user.id)
    await load()
    setActionId(null)
  }

  const reject = async (userId: string): Promise<void> => {
    setActionId(userId)
    // Keep in db but flag as rejected — for now we just remove editor role (already pending, no change needed)
    // A real flow might delete or set role='rejected'. We'll just reload for now.
    setActionId(null)
  }

  const revoke = async (userId: string): Promise<void> => {
    setActionId(userId)
    await updateProfileRole(userId, 'pending')
    await load()
    setActionId(null)
  }

  const promote = async (userId: string): Promise<void> => {
    if (!session) return
    setActionId(userId)
    await updateProfileRole(userId, 'admin', session.user.id)
    await load()
    setActionId(null)
  }

  const fmt = (iso: string | null): string => {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'pending',     label: 'Pending',     icon: <Clock size={14} />,       badge: pending.length },
    { id: 'editors',     label: 'Editors',      icon: <Users size={14} /> },
    { id: 'submissions', label: 'Submissions',  icon: <CheckCircle size={14} /> },
    { id: 'stats',       label: 'Stats',        icon: <BarChart2 size={14} /> },
  ]

  if (!isAdmin) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <ShieldCheck size={32} className="text-text-muted" />
        <p className="text-text-primary font-semibold">Admin access required</p>
        <p className="text-text-muted text-sm">You don't have permission to view this page.</p>
        <button
          onClick={() => setActiveView('api-tracker')}
          className="text-xs text-accent hover:underline"
        >
          Go back
        </button>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 shrink-0 flex items-center gap-3 border-b border-[var(--border)]">
        <button
          onClick={() => setActiveView('api-tracker')}
          className="p-1.5 rounded-lg hover:bg-surface-overlay transition-colors text-text-muted hover:text-text-primary"
        >
          <ChevronLeft size={18} />
        </button>
        <h1 className="text-text-primary text-xl font-bold">Admin</h1>
        <button
          onClick={load}
          disabled={loading}
          className="ml-auto p-1.5 rounded-lg hover:bg-surface-overlay transition-colors text-text-muted hover:text-text-primary"
          title="Refresh"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 px-5 pt-3 pb-0 shrink-0">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              tab === t.id
                ? 'bg-accent/15 text-accent'
                : 'text-text-muted hover:text-text-primary hover:bg-surface-overlay'
            }`}
          >
            {t.icon}
            {t.label}
            {t.badge !== undefined && t.badge > 0 && (
              <span className="ml-0.5 bg-accent text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {loading && (
          <div className="flex items-center justify-center h-32">
            <Loader2 size={20} className="animate-spin text-text-muted" />
          </div>
        )}

        {!loading && tab === 'pending' && (
          <div className="space-y-2">
            {pending.length === 0 ? (
              <p className="text-text-muted text-sm text-center py-8">No pending requests.</p>
            ) : (
              pending.map((p) => (
                <div key={p.id} className="bg-surface-overlay border border-[var(--border)] rounded-xl px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary text-sm font-medium truncate">{p.email}</p>
                    <p className="text-text-muted text-xs">Signed up {fmt(p.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {actionId === p.id ? (
                      <Loader2 size={15} className="animate-spin text-text-muted" />
                    ) : (
                      <>
                        <button
                          onClick={() => reject(p.id)}
                          className="p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Reject"
                        >
                          <XCircle size={16} />
                        </button>
                        <button
                          onClick={() => approve(p.id)}
                          className="px-3 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs font-semibold transition-colors"
                        >
                          Approve
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {!loading && tab === 'editors' && (
          <div className="space-y-2">
            {editors.length === 0 ? (
              <p className="text-text-muted text-sm text-center py-8">No editors yet.</p>
            ) : (
              editors.map((p) => (
                <div key={p.id} className="bg-surface-overlay border border-[var(--border)] rounded-xl px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-text-primary text-sm font-medium truncate">{p.email}</p>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                        p.role === 'admin' ? 'bg-accent/20 text-accent' : 'bg-emerald-500/15 text-emerald-400'
                      }`}>{p.role}</span>
                    </div>
                    <p className="text-text-muted text-xs">Approved {fmt(p.approved_at)}</p>
                  </div>
                  {p.id !== session?.user.id && (
                    <div className="flex items-center gap-2 shrink-0">
                      {actionId === p.id ? (
                        <Loader2 size={15} className="animate-spin text-text-muted" />
                      ) : (
                        <>
                          {p.role === 'editor' && (
                            <button
                              onClick={() => promote(p.id)}
                              className="px-2 py-1 rounded-lg text-xs text-text-muted hover:text-accent hover:bg-accent/10 transition-colors"
                            >
                              Make admin
                            </button>
                          )}
                          <button
                            onClick={() => revoke(p.id)}
                            className="px-2 py-1 rounded-lg text-xs text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            Revoke
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {!loading && tab === 'submissions' && (
          <div className="space-y-2">
            {supplements.length === 0 ? (
              <p className="text-text-muted text-sm text-center py-8">No submissions yet.</p>
            ) : (
              supplements.map((s) => (
                <div key={s.id} className="bg-surface-overlay border border-[var(--border)] rounded-xl px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-text-primary text-sm font-medium">Song ID {s.jw_song_id}</p>
                      <p className="text-text-muted text-xs">
                        Updated {fmt(s.updated_at)}{s.updated_by ? ` by ${s.updated_by}` : ''}
                      </p>
                    </div>
                    {s.quality_rating && (
                      <span className="text-xs bg-surface-raised px-2 py-0.5 rounded-full text-text-muted">
                        ★ {s.quality_rating}/10
                      </span>
                    )}
                  </div>
                  {s.context && (
                    <p className="text-text-muted text-xs mt-2 line-clamp-2">{s.context}</p>
                  )}
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {s.youtube_url && <span className="text-[10px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full">YouTube</span>}
                    {s.soundcloud_url && <span className="text-[10px] bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-full">SoundCloud</span>}
                    {s.trivia && <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full">{s.trivia.length} trivia</span>}
                    {s.verified_producers && <span className="text-[10px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full">Producers</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {!loading && tab === 'stats' && (
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Total users',    value: profiles.length },
              { label: 'Pending',        value: pending.length },
              { label: 'Editors',        value: editors.filter((e) => e.role === 'editor').length },
              { label: 'Admins',         value: editors.filter((e) => e.role === 'admin').length },
              { label: 'Song entries',   value: supplements.length },
              { label: 'With YouTube',   value: supplements.filter((s) => s.youtube_url).length },
              { label: 'With trivia',    value: supplements.filter((s) => s.trivia?.length).length },
              { label: 'With context',   value: supplements.filter((s) => s.context).length },
            ].map((stat) => (
              <div key={stat.label} className="bg-surface-overlay border border-[var(--border)] rounded-xl px-4 py-4">
                <p className="text-2xl font-bold text-text-primary">{stat.value}</p>
                <p className="text-xs text-text-muted mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
