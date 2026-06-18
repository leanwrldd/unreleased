import { useEffect, useState, useCallback } from 'react'
import {
  ChevronLeft, Users, Clock, CheckCircle, XCircle, ShieldCheck, BarChart2,
  Loader2, RefreshCw, FileEdit, KeyRound, Check, AlertCircle, RotateCcw,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import * as userApi from '../lib/userApi'
import type {
  EditorApplication, SongEditProposal, AdminUser, ApplicationStatus, ProposalStatus,
} from '../lib/userApi'

type Tab = 'applications' | 'proposals' | 'users' | 'stats' | 'security'

export default function AdminPage(): JSX.Element {
  const { account, setActiveView, loadAccount } = useStore()
  const isAdmin = !!account?.is_administrator
  const otpEnabled = !!account?.otp_enabled

  const [tab, setTab] = useState<Tab>('applications')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const [applications, setApplications] = useState<EditorApplication[]>([])
  const [proposalStatus, setProposalStatus] = useState<ProposalStatus | ''>('pending')
  const [proposals, setProposals] = useState<SongEditProposal[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])

  const load = useCallback(async (): Promise<void> => {
    if (!isAdmin) return
    setLoading(true)
    setError(null)
    try {
      if (tab === 'applications') {
        setApplications(await userApi.adminListApplications())
      } else if (tab === 'proposals') {
        setProposals(await userApi.adminListProposals(proposalStatus || undefined))
      } else if (tab === 'users' || tab === 'stats') {
        setUsers(await userApi.adminListUsers())
        if (tab === 'stats') {
          setApplications(await userApi.adminListApplications())
          setProposals(await userApi.adminListProposals())
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [tab, isAdmin, proposalStatus])

  useEffect(() => { load() }, [load, refreshKey])

  if (!isAdmin) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <ShieldCheck size={32} className="text-text-muted" />
        <p className="text-text-primary font-semibold">Admin access required</p>
        <p className="text-text-muted text-sm">You don't have permission to view this page.</p>
        <button onClick={() => setActiveView('api-tracker')} className="text-xs text-accent hover:underline">Go back</button>
      </div>
    )
  }

  if (!otpEnabled) {
    return (
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto px-5 py-6">
        <OtpSetupPanel onEnabled={async () => { await loadAccount() }} />
      </div>
    )
  }

  const pendingApps = applications.filter((a) => a.status === 'pending')
  const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'applications', label: 'Applications', icon: <Clock size={14} />, badge: pendingApps.length || undefined },
    { id: 'proposals',    label: 'Proposals',    icon: <FileEdit size={14} /> },
    { id: 'users',        label: 'Users',        icon: <Users size={14} /> },
    { id: 'stats',        label: 'Stats',        icon: <BarChart2 size={14} /> },
    { id: 'security',     label: 'Security',     icon: <KeyRound size={14} /> },
  ]

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="px-5 pt-5 pb-3 shrink-0 flex items-center gap-3 border-b border-[var(--border)]">
        <button onClick={() => setActiveView('api-tracker')} className="p-1.5 rounded-lg hover:bg-surface-overlay transition-colors text-text-muted hover:text-text-primary">
          <ChevronLeft size={18} />
        </button>
        <h1 className="text-text-primary text-xl font-bold">Admin</h1>
        <button onClick={() => setRefreshKey((k) => k + 1)} disabled={loading} className="ml-auto p-1.5 rounded-lg hover:bg-surface-overlay transition-colors text-text-muted hover:text-text-primary" title="Refresh">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="flex gap-1 px-5 pt-3 pb-0 shrink-0 overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
              tab === t.id ? 'bg-accent/15 text-accent' : 'text-text-muted hover:text-text-primary hover:bg-surface-overlay'
            }`}>
            {t.icon}
            {t.label}
            {t.badge !== undefined && t.badge > 0 && (
              <span className="ml-0.5 bg-accent text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {error && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs mb-3">
            <AlertCircle size={13} className="shrink-0 mt-0.5" />{error}
          </div>
        )}

        {loading && <div className="flex items-center justify-center h-32"><Loader2 size={20} className="animate-spin text-text-muted" /></div>}

        {!loading && tab === 'applications' && (
          <ApplicationsTab applications={applications} onChanged={() => setRefreshKey((k) => k + 1)} />
        )}

        {!loading && tab === 'proposals' && (
          <ProposalsTab
            proposals={proposals}
            status={proposalStatus}
            setStatus={setProposalStatus}
            onChanged={() => setRefreshKey((k) => k + 1)}
          />
        )}

        {!loading && tab === 'users' && (
          <UsersTab users={users} onChanged={() => setRefreshKey((k) => k + 1)} currentUserId={account?.id} />
        )}

        {!loading && tab === 'stats' && (
          <StatsTab applications={applications} proposals={proposals} users={users} />
        )}

        {!loading && tab === 'security' && (
          <div className="max-w-md">
            <p className="text-text-primary text-sm font-semibold mb-1">Two-factor authentication</p>
            <p className="text-text-muted text-xs mb-3">Two-factor authentication is enabled on your account.</p>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
              <Check size={13} /> 2FA is active
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function ApplicationsTab({
  applications, onChanged,
}: { applications: EditorApplication[]; onChanged: () => void }): JSX.Element {
  const [actionId, setActionId] = useState<number | null>(null)
  const [reviewNotes, setReviewNotes] = useState<Record<number, string>>({})
  const [expanded, setExpanded] = useState<number | null>(null)

  const review = async (id: number, action: 'approve' | 'reject'): Promise<void> => {
    setActionId(id)
    try {
      await userApi.adminReviewApplication(id, { action, review_notes: reviewNotes[id] || '' })
      onChanged()
    } catch {} finally {
      setActionId(null)
    }
  }

  const pending = applications.filter((a) => a.status === 'pending')
  const reviewed = applications.filter((a) => a.status !== 'pending').slice(0, 10)

  if (applications.length === 0) {
    return <p className="text-text-muted text-sm text-center py-8">No applications yet.</p>
  }

  return (
    <div className="space-y-3">
      {pending.length > 0 && (
        <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Pending</p>
      )}
      {pending.map((a) => (
        <div key={a.id} className="bg-surface-overlay border border-[var(--border)] rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            {a.discord_avatar ? (
              <img src={a.discord_avatar} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-semibold shrink-0">
                {(a.username || '?').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-text-primary text-sm font-medium truncate">{a.display_name || a.username}</p>
              <p className="text-text-muted text-xs truncate">{a.discord_username}{a.contact ? ` · ${a.contact}` : ''}</p>
            </div>
            <button onClick={() => setExpanded(expanded === a.id ? null : a.id)} className="text-xs text-text-muted hover:text-text-primary transition-colors">
              {expanded === a.id ? 'Collapse' : 'Details'}
            </button>
          </div>

          {expanded === a.id && (
            <div className="space-y-2 text-xs border-t border-[var(--border)] pt-3">
              {a.areas && <Detail label="Areas" value={a.areas} />}
              {a.experience && <Detail label="Experience" value={a.experience} />}
              {a.motivation && <Detail label="Motivation" value={a.motivation} />}
            </div>
          )}

          <textarea
            value={reviewNotes[a.id] || ''}
            onChange={(e) => setReviewNotes({ ...reviewNotes, [a.id]: e.target.value })}
            placeholder="Review notes (optional)"
            rows={2}
            className="w-full bg-surface border border-[var(--border)] rounded-lg px-3 py-2 text-text-primary text-xs resize-none focus:outline-none focus:border-accent/50"
          />

          <div className="flex items-center gap-2">
            {actionId === a.id ? (
              <Loader2 size={15} className="animate-spin text-text-muted" />
            ) : (
              <>
                <button onClick={() => review(a.id, 'reject')} className="px-3 py-1.5 rounded-lg text-xs text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-1.5">
                  <XCircle size={14} /> Reject
                </button>
                <button onClick={() => review(a.id, 'approve')} className="ml-auto px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs font-semibold transition-colors flex items-center gap-1.5">
                  <CheckCircle size={14} /> Approve
                </button>
              </>
            )}
          </div>
          <p className="text-text-muted/60 text-[10px]">Submitted {fmtDate(a.created_at)}</p>
        </div>
      ))}

      {reviewed.length > 0 && (
        <>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted pt-3">Recent</p>
          {reviewed.map((a) => (
            <div key={a.id} className="bg-surface-overlay border border-[var(--border)] rounded-xl px-3 py-2.5 flex items-center gap-3 opacity-70">
              <div className="min-w-0 flex-1">
                <p className="text-text-primary text-sm font-medium truncate">{a.display_name || a.username}</p>
                <p className="text-text-muted text-xs truncate">
                  {a.status} · {fmtDate(a.reviewed_at)}{a.reviewer_username ? ` by ${a.reviewer_username}` : ''}
                </p>
              </div>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                a.status === 'approved' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
              }`}>{a.status}</span>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div>
      <p className="text-text-muted/60 text-[10px] uppercase tracking-wide font-semibold mb-0.5">{label}</p>
      <p className="text-text-primary whitespace-pre-wrap leading-relaxed">{value}</p>
    </div>
  )
}

function ProposalsTab({
  proposals, status, setStatus, onChanged,
}: {
  proposals: SongEditProposal[]
  status: ProposalStatus | ''
  setStatus: (s: ProposalStatus | '') => void
  onChanged: () => void
}): JSX.Element {
  const [actionId, setActionId] = useState<number | null>(null)
  const [reviewNotes, setReviewNotes] = useState<Record<number, string>>({})

  const review = async (id: number, action: 'approve' | 'reject'): Promise<void> => {
    setActionId(id)
    try {
      await userApi.adminReviewProposal(id, { action, review_notes: reviewNotes[id] || '' })
      onChanged()
    } catch {} finally {
      setActionId(null)
    }
  }

  const reverse = async (id: number): Promise<void> => {
    if (!confirm('Reverse this approved proposal?')) return
    setActionId(id)
    try {
      await userApi.adminReverseProposal(id)
      onChanged()
    } catch {} finally {
      setActionId(null)
    }
  }

  const filters: { id: ProposalStatus | ''; label: string }[] = [
    { id: 'pending', label: 'Pending' },
    { id: 'approved', label: 'Approved' },
    { id: 'rejected', label: 'Rejected' },
    { id: 'reversed', label: 'Reversed' },
    { id: '', label: 'All' },
  ]

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1">
        {filters.map((f) => (
          <button key={f.id || 'all'} onClick={() => setStatus(f.id)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
              status === f.id ? 'bg-accent/15 text-accent' : 'text-text-muted hover:text-text-primary hover:bg-surface-overlay'
            }`}>{f.label}</button>
        ))}
      </div>

      {proposals.length === 0 && (
        <p className="text-text-muted text-sm text-center py-8">No proposals.</p>
      )}

      {proposals.map((p) => {
        const fields = Object.entries(p.proposed_data || {})
        const statusColor = {
          pending: 'bg-yellow-500/15 text-yellow-400',
          approved: 'bg-emerald-500/15 text-emerald-400',
          rejected: 'bg-red-500/15 text-red-400',
          reversed: 'bg-text-muted/10 text-text-muted',
        }[p.status]
        return (
          <div key={p.id} className="bg-surface-overlay border border-[var(--border)] rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${statusColor}`}>{p.status}</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-surface-raised text-text-muted">{p.change_type}</span>
              <p className="text-text-primary text-sm font-medium truncate flex-1">{p.title || `Proposal #${p.id}`}</p>
              {p.song_public_id != null && (
                <span className="text-text-muted/60 text-[10px]">#{p.song_public_id}</span>
              )}
            </div>
            <p className="text-text-muted text-xs">by {p.editor_username} · {fmtDate(p.created_at)}</p>

            {fields.length > 0 && (
              <div className="space-y-1.5 text-xs border-t border-[var(--border)] pt-3">
                {fields.slice(0, 8).map(([k, v]) => (
                  <div key={k} className="flex gap-2">
                    <span className="text-text-muted/60 text-[10px] uppercase tracking-wide font-semibold w-32 shrink-0 pt-0.5">{k}</span>
                    <span className="text-text-primary whitespace-pre-wrap break-words flex-1">{formatValue(v)}</span>
                  </div>
                ))}
                {fields.length > 8 && <p className="text-text-muted text-[10px]">…and {fields.length - 8} more field{fields.length - 8 === 1 ? '' : 's'}</p>}
              </div>
            )}

            {p.editor_notes && (
              <div className="text-xs italic text-text-muted bg-surface rounded-lg px-3 py-2 border border-[var(--border)]">"{p.editor_notes}"</div>
            )}

            {p.review_notes && (
              <div className="text-xs italic text-text-muted">Reviewer: "{p.review_notes}"</div>
            )}

            {p.status === 'pending' && (
              <>
                <textarea
                  value={reviewNotes[p.id] || ''}
                  onChange={(e) => setReviewNotes({ ...reviewNotes, [p.id]: e.target.value })}
                  placeholder="Review notes (optional)"
                  rows={2}
                  className="w-full bg-surface border border-[var(--border)] rounded-lg px-3 py-2 text-text-primary text-xs resize-none focus:outline-none focus:border-accent/50"
                />
                <div className="flex items-center gap-2">
                  {actionId === p.id ? (
                    <Loader2 size={15} className="animate-spin text-text-muted" />
                  ) : (
                    <>
                      <button onClick={() => review(p.id, 'reject')} className="px-3 py-1.5 rounded-lg text-xs text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-1.5">
                        <XCircle size={14} /> Reject
                      </button>
                      <button onClick={() => review(p.id, 'approve')} className="ml-auto px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs font-semibold transition-colors flex items-center gap-1.5">
                        <CheckCircle size={14} /> Approve
                      </button>
                    </>
                  )}
                </div>
              </>
            )}

            {p.status === 'approved' && (
              <button onClick={() => reverse(p.id)} disabled={actionId === p.id}
                className="px-3 py-1.5 rounded-lg text-xs text-text-muted hover:text-yellow-400 hover:bg-yellow-500/10 transition-colors flex items-center gap-1.5 ml-auto">
                {actionId === p.id ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />} Reverse
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

function formatValue(v: unknown): string {
  if (v == null) return '—'
  if (typeof v === 'string') return v
  if (Array.isArray(v)) return v.join(', ')
  return JSON.stringify(v)
}

function UsersTab({
  users, onChanged, currentUserId,
}: { users: AdminUser[]; onChanged: () => void; currentUserId?: number }): JSX.Element {
  const [actionId, setActionId] = useState<number | null>(null)
  const [filter, setFilter] = useState<'all' | 'editors' | 'admins' | 'applicants'>('all')

  const update = async (userId: number, payload: Parameters<typeof userApi.adminUpdateUser>[1]): Promise<void> => {
    setActionId(userId)
    try {
      await userApi.adminUpdateUser(userId, payload)
      onChanged()
    } catch {} finally {
      setActionId(null)
    }
  }

  const filters: { id: typeof filter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'admins', label: 'Admins' },
    { id: 'editors', label: 'Editors' },
    { id: 'applicants', label: 'Applicants' },
  ]

  const filtered = users.filter((u) => {
    if (filter === 'all') return true
    if (filter === 'admins') return u.role === 'administrator'
    if (filter === 'editors') return u.role === 'editor'
    return u.role === 'applicant'
  })

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1">
        {filters.map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
              filter === f.id ? 'bg-accent/15 text-accent' : 'text-text-muted hover:text-text-primary hover:bg-surface-overlay'
            }`}>{f.label}</button>
        ))}
      </div>

      {filtered.length === 0 && <p className="text-text-muted text-sm text-center py-8">No users in this group.</p>}

      {filtered.map((u) => (
        <div key={u.user_id} className="bg-surface-overlay border border-[var(--border)] rounded-xl p-3 flex items-center gap-3">
          {u.discord_avatar ? (
            <img src={u.discord_avatar} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-semibold shrink-0">
              {(u.username || '?').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-text-primary text-sm font-medium truncate">{u.discord_username || u.username}</p>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                u.role === 'administrator' ? 'bg-accent/20 text-accent' :
                u.role === 'editor' ? 'bg-emerald-500/15 text-emerald-400' :
                'bg-surface-raised text-text-muted'
              }`}>{u.role}</span>
              {!u.is_active && <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-red-500/15 text-red-400">disabled</span>}
            </div>
            <p className="text-text-muted text-xs">
              {u.approved_count} approved · {u.proposal_count} total · joined {fmtDate(u.date_joined)}
            </p>
          </div>

          {u.user_id !== currentUserId && u.role !== 'administrator' && (
            <div className="flex items-center gap-1 shrink-0">
              {actionId === u.user_id ? (
                <Loader2 size={15} className="animate-spin text-text-muted" />
              ) : (
                <>
                  {u.role === 'editor' ? (
                    <>
                      <label className="flex items-center gap-1.5 text-[10px] text-text-muted cursor-pointer mr-2">
                        <input type="checkbox" checked={u.auto_approve_proposals} onChange={(e) => update(u.user_id, { auto_approve_proposals: e.target.checked })} />
                        auto-approve
                      </label>
                      <button onClick={() => update(u.user_id, { role: 'applicant' })} className="px-2 py-1 rounded text-xs text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors">Demote</button>
                    </>
                  ) : (
                    <button onClick={() => update(u.user_id, { role: 'editor' })} className="px-2 py-1 rounded text-xs text-emerald-400 hover:bg-emerald-500/10 transition-colors">Promote</button>
                  )}
                  <button onClick={() => update(u.user_id, { is_active: !u.is_active })}
                    className="px-2 py-1 rounded text-xs text-text-muted hover:text-text-primary transition-colors">
                    {u.is_active ? 'Disable' : 'Enable'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function StatsTab({
  applications, proposals, users,
}: { applications: EditorApplication[]; proposals: SongEditProposal[]; users: AdminUser[] }): JSX.Element {
  const stats = [
    { label: 'Total users', value: users.length },
    { label: 'Editors', value: users.filter((u) => u.role === 'editor').length },
    { label: 'Admins', value: users.filter((u) => u.role === 'administrator').length },
    { label: 'Applicants', value: users.filter((u) => u.role === 'applicant').length },
    { label: 'Total proposals', value: proposals.length },
    { label: 'Pending proposals', value: proposals.filter((p) => p.status === 'pending').length },
    { label: 'Approved proposals', value: proposals.filter((p) => p.status === 'approved').length },
    { label: 'Pending applications', value: applications.filter((a: EditorApplication) => a.status === 'pending').length },
  ]
  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map((s) => (
        <div key={s.label} className="bg-surface-overlay border border-[var(--border)] rounded-xl px-4 py-4">
          <p className="text-2xl font-bold text-text-primary">{s.value}</p>
          <p className="text-xs text-text-muted mt-0.5">{s.label}</p>
        </div>
      ))}
    </div>
  )
}

function OtpSetupPanel({ onEnabled }: { onEnabled: () => Promise<void> }): JSX.Element {
  const [setup, setSetup] = useState<userApi.OtpSetupPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [code, setCode] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    userApi.getOtpSetup()
      .then(setSetup)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load setup'))
      .finally(() => setLoading(false))
  }, [])

  const confirm = async (): Promise<void> => {
    setConfirming(true)
    setError(null)
    try {
      await userApi.confirmOtpSetup(code)
      await onEnabled()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed')
    } finally {
      setConfirming(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-32"><Loader2 size={20} className="animate-spin text-text-muted" /></div>
  if (!setup) return <p className="text-red-400 text-sm">Could not load OTP setup.</p>

  return (
    <div className="max-w-md space-y-4">
      <div>
        <h2 className="text-text-primary text-lg font-bold flex items-center gap-2"><KeyRound size={18} /> Enable two-factor authentication</h2>
        <p className="text-text-muted text-sm mt-1">Admins must enable 2FA before accessing the admin tools. Scan the QR code with an authenticator app, then enter a code to confirm.</p>
      </div>

      {setup.qr_code && (
        <div className="bg-white p-4 rounded-xl flex items-center justify-center">
          <img src={setup.qr_code} alt="OTP QR code" className="w-48 h-48" />
        </div>
      )}

      {setup.otp_secret && (
        <div>
          <p className="text-text-muted text-xs mb-1">Or enter the secret manually:</p>
          <code className="block bg-surface-overlay border border-[var(--border)] rounded-lg px-3 py-2 text-text-primary text-xs font-mono break-all">{setup.otp_secret}</code>
        </div>
      )}

      <div>
        <label className="block text-xs text-text-muted mb-1">Verification code</label>
        <input
          type="text"
          inputMode="numeric"
          value={code}
          onChange={(e) => { setCode(e.target.value); setError(null) }}
          onKeyDown={(e) => e.key === 'Enter' && confirm()}
          placeholder="123456"
          className="w-full bg-surface-overlay border border-[var(--border)] rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent/50 font-mono tracking-[0.4em] text-center"
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
          <AlertCircle size={13} className="shrink-0 mt-0.5" />{error}
        </div>
      )}

      <button onClick={confirm} disabled={confirming || !code}
        className="w-full py-2.5 rounded-xl bg-accent/15 hover:bg-accent/25 text-accent text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
        {confirming && <Loader2 size={14} className="animate-spin" />}
        Verify & enable
      </button>
    </div>
  )
}
