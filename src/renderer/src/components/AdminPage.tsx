import { useEffect, useState, useCallback } from 'react'
import {
  ChevronLeft, Users, Clock, CheckCircle, XCircle, ShieldCheck, BarChart2,
  Loader2, RefreshCw, FileEdit, KeyRound, Check, AlertCircle, RotateCcw,
  ChevronDown, ChevronUp, ArrowRight, UserCheck, FileCheck, Activity,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import * as userApi from '../lib/userApi'
import type {
  EditorApplication, SongEditProposal, AdminUser, ProposalStatus,
} from '../lib/userApi'

type Tab = 'applications' | 'proposals' | 'users' | 'stats' | 'security'

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtRelative(iso: string | null): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return fmtDate(iso)
}

function formatFieldValue(v: unknown): string {
  if (v == null) return '(empty)'
  if (typeof v === 'string') return v || '(empty)'
  if (Array.isArray(v)) return v.length === 0 ? '(empty)' : v.join('\n')
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  return JSON.stringify(v, null, 2)
}

function StatusBadge({ status }: { status: string }): JSX.Element {
  const map: Record<string, string> = {
    pending:   'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
    approved:  'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    rejected:  'bg-red-500/15 text-red-400 border-red-500/20',
    reversed:  'bg-zinc-500/15 text-zinc-400 border-zinc-500/20',
    active:    'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    disabled:  'bg-red-500/15 text-red-400 border-red-500/20',
  }
  const cls = map[status] ?? 'bg-surface-raised text-text-muted border-transparent'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border ${cls}`}>
      {status}
    </span>
  )
}

// ── Diff component ─────────────────────────────────────────────────────────────

const LONG_FIELD_KEYS = new Set(['lyrics', 'synced_lyrics', 'description', 'notes', 'editor_notes'])
const LONG_THRESHOLD = 120

interface DiffFieldProps {
  fieldKey: string
  before: unknown
  after: unknown
}

function DiffField({ fieldKey, before, after }: DiffFieldProps): JSX.Element {
  const beforeStr = formatFieldValue(before)
  const afterStr  = formatFieldValue(after)
  const unchanged = beforeStr === afterStr
  const isLong    = LONG_FIELD_KEYS.has(fieldKey) ||
                    afterStr.length > LONG_THRESHOLD ||
                    beforeStr.length > LONG_THRESHOLD
  const [expanded, setExpanded] = useState(!isLong)
  const hasSnapshot = before !== undefined

  return (
    <div className="rounded-lg overflow-hidden border border-[var(--border)] text-xs">
      {/* Field header */}
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-surface-raised/50">
        <span className="font-semibold uppercase tracking-widest text-[9px] text-text-muted/70">
          {fieldKey.replace(/_/g, ' ')}
        </span>
        <div className="flex items-center gap-2">
          {unchanged && <span className="text-[9px] text-text-muted/50 italic">unchanged</span>}
          {isLong && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="flex items-center gap-0.5 text-[10px] text-accent hover:opacity-80 transition-opacity"
            >
              {expanded ? <><ChevronUp size={10} /> Collapse</> : <><ChevronDown size={10} /> Expand</>}
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className={unchanged ? '' : 'divide-y divide-[var(--border)]'}>
          {/* Before */}
          {hasSnapshot && !unchanged && (
            <div className="px-3 py-2 bg-red-500/5">
              <p className="text-[9px] font-bold uppercase tracking-widest text-red-400/60 mb-1">Before</p>
              <pre className="font-mono text-red-300/80 whitespace-pre-wrap break-words leading-relaxed">
                {beforeStr}
              </pre>
            </div>
          )}

          {/* After */}
          <div className={unchanged ? 'px-3 py-2' : 'px-3 py-2 bg-emerald-500/5'}>
            {!unchanged && hasSnapshot && (
              <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-400/60 mb-1">After</p>
            )}
            {!hasSnapshot && !unchanged && (
              <p className="text-[9px] font-bold uppercase tracking-widest text-text-muted/40 mb-1">Value</p>
            )}
            <pre className={`font-mono whitespace-pre-wrap break-words leading-relaxed ${
              unchanged ? 'text-text-muted/70' : 'text-emerald-300/90'
            }`}>
              {afterStr}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}

function ProposalDiff({ proposal }: { proposal: SongEditProposal }): JSX.Element | null {
  const fields = Object.entries(proposal.proposed_data || {})
  if (!fields.length) return null
  const snapshot = proposal.original_snapshot || {}

  return (
    <div className="space-y-2 border-t border-[var(--border)] pt-3">
      <p className="text-[9px] font-bold uppercase tracking-widest text-text-muted/50 px-0.5">Changes</p>
      {fields.map(([k, v]) => (
        <DiffField key={k} fieldKey={k} before={snapshot[k]} after={v} />
      ))}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function AdminPage(): JSX.Element {
  const { account, setActiveView, loadAccount } = useStore()
  const isAdmin  = !!account?.is_administrator
  const otpEnabled = !!account?.otp_enabled

  const [tab,          setTab]          = useState<Tab>('applications')
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [refreshKey,   setRefreshKey]   = useState(0)

  const [applications,    setApplications]    = useState<EditorApplication[]>([])
  const [proposalStatus,  setProposalStatus]  = useState<ProposalStatus | ''>('pending')
  const [proposals,       setProposals]       = useState<SongEditProposal[]>([])
  const [users,           setUsers]           = useState<AdminUser[]>([])

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
        <div className="w-14 h-14 rounded-2xl bg-surface-overlay border border-[var(--border)] flex items-center justify-center">
          <ShieldCheck size={24} className="text-text-muted" />
        </div>
        <div>
          <p className="text-text-primary font-semibold">Admin access required</p>
          <p className="text-text-muted text-sm mt-1">You don't have permission to view this page.</p>
        </div>
        <button onClick={() => setActiveView('api-tracker')} className="text-xs text-accent hover:underline">
          Go back
        </button>
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

  const pendingApps   = applications.filter(a => a.status === 'pending').length
  const pendingProps  = proposals.filter(p => p.status === 'pending').length

  type TabDef = { id: Tab; label: string; icon: React.ReactNode; badge?: number }
  const tabs: TabDef[] = [
    { id: 'applications', label: 'Applications', icon: <Clock size={13} />,     badge: pendingApps || undefined },
    { id: 'proposals',    label: 'Proposals',    icon: <FileEdit size={13} />,  badge: tab === 'proposals' ? undefined : (pendingProps || undefined) },
    { id: 'users',        label: 'Users',        icon: <Users size={13} /> },
    { id: 'stats',        label: 'Stats',        icon: <BarChart2 size={13} /> },
    { id: 'security',     label: 'Security',     icon: <KeyRound size={13} /> },
  ]

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-4 pb-0 shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setActiveView('api-tracker')}
            className="p-1.5 rounded-lg hover:bg-surface-overlay transition-colors text-text-muted hover:text-text-primary"
          >
            <ChevronLeft size={17} />
          </button>
          <div className="flex-1">
            <h1 className="text-text-primary text-base font-bold leading-none">Admin</h1>
            {account?.discord_username && (
              <p className="text-text-muted/60 text-[11px] mt-0.5">{account.discord_username}</p>
            )}
          </div>
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-surface-overlay transition-colors text-text-muted hover:text-text-primary"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 overflow-x-auto border-b border-[var(--border)]">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold transition-colors shrink-0 ${
                tab === t.id
                  ? 'text-accent'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {t.icon}
              {t.label}
              {t.badge !== undefined && t.badge > 0 && (
                <span className="bg-accent text-[var(--bg)] text-[9px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5">
                  {t.badge}
                </span>
              )}
              {tab === t.id && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent rounded-t-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {error && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs mb-4">
            <AlertCircle size={13} className="shrink-0 mt-0.5" /> {error}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center h-40">
            <Loader2 size={20} className="animate-spin text-text-muted/40" />
          </div>
        )}

        {!loading && tab === 'applications' && (
          <ApplicationsTab applications={applications} onChanged={() => setRefreshKey(k => k + 1)} />
        )}
        {!loading && tab === 'proposals' && (
          <ProposalsTab
            proposals={proposals}
            status={proposalStatus}
            setStatus={setProposalStatus}
            onChanged={() => setRefreshKey(k => k + 1)}
          />
        )}
        {!loading && tab === 'users' && (
          <UsersTab users={users} onChanged={() => setRefreshKey(k => k + 1)} currentUserId={account?.id} />
        )}
        {!loading && tab === 'stats' && (
          <StatsTab applications={applications} proposals={proposals} users={users} />
        )}
        {!loading && tab === 'security' && <SecurityTab />}
      </div>
    </div>
  )
}

// ── Applications tab ───────────────────────────────────────────────────────────

function ApplicationsTab({
  applications, onChanged,
}: { applications: EditorApplication[]; onChanged: () => void }): JSX.Element {
  const [actionId,     setActionId]    = useState<number | null>(null)
  const [reviewNotes,  setReviewNotes] = useState<Record<number, string>>({})
  const [expanded,     setExpanded]    = useState<number | null>(null)

  const review = async (id: number, action: 'approve' | 'reject'): Promise<void> => {
    setActionId(id)
    try {
      await userApi.adminReviewApplication(id, { action, review_notes: reviewNotes[id] || '' })
      onChanged()
    } catch {} finally {
      setActionId(null)
    }
  }

  const pending  = applications.filter(a => a.status === 'pending')
  const reviewed = applications.filter(a => a.status !== 'pending').slice(0, 10)

  if (applications.length === 0) {
    return <EmptyState label="No applications yet" />
  }

  return (
    <div className="space-y-4">
      {pending.length > 0 && (
        <div className="space-y-3">
          <SectionLabel>Pending · {pending.length}</SectionLabel>
          {pending.map(a => (
            <div key={a.id} className="bg-surface-overlay border border-[var(--border)] rounded-xl overflow-hidden">
              {/* User row */}
              <div className="flex items-center gap-3 p-4">
                <Avatar src={a.discord_avatar} name={a.display_name || a.username} />
                <div className="min-w-0 flex-1">
                  <p className="text-text-primary text-sm font-semibold truncate">{a.display_name || a.username}</p>
                  <p className="text-text-muted text-xs truncate">{a.discord_username}{a.contact ? ` · ${a.contact}` : ''}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-text-muted/50 text-[10px]">{fmtRelative(a.created_at)}</span>
                  <button
                    onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                    className="p-1 rounded-md hover:bg-surface-raised transition-colors text-text-muted hover:text-text-primary"
                  >
                    {expanded === a.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
              </div>

              {/* Expanded details */}
              {expanded === a.id && (
                <div className="px-4 pb-4 space-y-3 border-t border-[var(--border)] pt-3">
                  {a.areas      && <Detail label="Areas"      value={a.areas} />}
                  {a.experience && <Detail label="Experience" value={a.experience} />}
                  {a.motivation && <Detail label="Motivation" value={a.motivation} />}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 px-4 py-3 border-t border-[var(--border)] bg-surface-raised/30">
                <textarea
                  value={reviewNotes[a.id] || ''}
                  onChange={e => setReviewNotes({ ...reviewNotes, [a.id]: e.target.value })}
                  placeholder="Review notes (optional)"
                  rows={1}
                  className="flex-1 bg-surface border border-[var(--border)] rounded-lg px-3 py-1.5 text-text-primary text-xs resize-none focus:outline-none focus:border-accent/50"
                />
                {actionId === a.id ? (
                  <Loader2 size={15} className="animate-spin text-text-muted mx-2" />
                ) : (
                  <>
                    <button
                      onClick={() => review(a.id, 'reject')}
                      className="px-3 py-1.5 rounded-lg text-xs text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-1.5 font-medium"
                    >
                      <XCircle size={13} /> Reject
                    </button>
                    <button
                      onClick={() => review(a.id, 'approve')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs font-semibold transition-colors flex items-center gap-1.5"
                    >
                      <CheckCircle size={13} /> Approve
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {reviewed.length > 0 && (
        <div className="space-y-2">
          <SectionLabel>Recently reviewed</SectionLabel>
          {reviewed.map(a => (
            <div key={a.id} className="flex items-center gap-3 px-3 py-2.5 bg-surface-overlay border border-[var(--border)] rounded-xl opacity-70">
              <Avatar src={a.discord_avatar} name={a.display_name || a.username} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-text-primary text-xs font-medium truncate">{a.display_name || a.username}</p>
                <p className="text-text-muted text-[10px] truncate">
                  {a.reviewer_username ? `by ${a.reviewer_username}` : ''} · {fmtDate(a.reviewed_at)}
                </p>
              </div>
              <StatusBadge status={a.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Proposals tab ──────────────────────────────────────────────────────────────

function ProposalsTab({
  proposals, status, setStatus, onChanged,
}: {
  proposals: SongEditProposal[]
  status: ProposalStatus | ''
  setStatus: (s: ProposalStatus | '') => void
  onChanged: () => void
}): JSX.Element {
  const [actionId,    setActionId]    = useState<number | null>(null)
  const [reviewNotes, setReviewNotes] = useState<Record<number, string>>({})
  const [expanded,    setExpanded]    = useState<number | null>(null)

  const review = async (id: number, action: 'approve' | 'reject'): Promise<void> => {
    setActionId(id)
    try {
      await userApi.adminReviewProposal(id, { action, review_notes: reviewNotes[id] || '' })
      onChanged()
    } catch {} finally { setActionId(null) }
  }

  const reverse = async (id: number): Promise<void> => {
    if (!confirm('Reverse this approved proposal?')) return
    setActionId(id)
    try {
      await userApi.adminReverseProposal(id)
      onChanged()
    } catch {} finally { setActionId(null) }
  }

  const filters: { id: ProposalStatus | ''; label: string }[] = [
    { id: 'pending',  label: 'Pending'  },
    { id: 'approved', label: 'Approved' },
    { id: 'rejected', label: 'Rejected' },
    { id: 'reversed', label: 'Reversed' },
    { id: '',         label: 'All'      },
  ]

  return (
    <div className="space-y-4">
      {/* Filter pills */}
      <div className="flex flex-wrap gap-1.5">
        {filters.map(f => (
          <button
            key={f.id || 'all'}
            onClick={() => setStatus(f.id)}
            className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-colors border ${
              status === f.id
                ? 'bg-accent/15 text-accent border-accent/30'
                : 'text-text-muted border-[var(--border)] hover:text-text-primary hover:border-text-muted/30'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {proposals.length === 0 && <EmptyState label="No proposals" />}

      {proposals.map(p => {
        const isExpanded = expanded === p.id
        const fieldCount = Object.keys(p.proposed_data || {}).length

        return (
          <div
            key={p.id}
            className={`bg-surface-overlay border rounded-xl overflow-hidden transition-colors ${
              p.status === 'pending'
                ? 'border-accent/20'
                : 'border-[var(--border)]'
            }`}
          >
            {/* Card header */}
            <button
              className="w-full text-left p-4 hover:bg-surface-raised/20 transition-colors"
              onClick={() => setExpanded(isExpanded ? null : p.id)}
            >
              <div className="flex items-start gap-2 flex-wrap">
                <StatusBadge status={p.status} />
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border bg-surface-raised text-text-muted border-[var(--border)]">
                  {p.change_type}
                </span>
                {p.song_public_id != null && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-accent/10 text-accent border border-accent/20">
                    #{p.song_public_id}
                  </span>
                )}
                <span className="ml-auto flex items-center gap-1 text-text-muted/50 text-[10px]">
                  {fieldCount} field{fieldCount !== 1 ? 's' : ''}
                  {isExpanded ? <ChevronUp size={10} className="ml-0.5" /> : <ChevronDown size={10} className="ml-0.5" />}
                </span>
              </div>
              <p className="text-text-primary text-sm font-semibold mt-2 mb-1 leading-snug">
                {p.title || `Proposal #${p.id}`}
              </p>
              <p className="text-text-muted/70 text-[11px]">
                by <span className="text-text-muted font-medium">{p.editor_username}</span>
                {' · '}{fmtRelative(p.created_at)}
                {p.reviewer_username && (
                  <span> · reviewed by <span className="text-text-muted font-medium">{p.reviewer_username}</span></span>
                )}
              </p>
            </button>

            {/* Expanded body */}
            {isExpanded && (
              <div className="px-4 pb-4 space-y-3 border-t border-[var(--border)]">
                {/* Diff */}
                <ProposalDiff proposal={p} />

                {/* Editor notes */}
                {p.editor_notes && (
                  <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-surface-raised/50 border border-[var(--border)] text-xs">
                    <span className="text-text-muted/50 shrink-0 font-semibold mt-0.5">Note:</span>
                    <span className="text-text-muted italic">{p.editor_notes}</span>
                  </div>
                )}

                {/* Review notes */}
                {p.review_notes && (
                  <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-surface-raised/50 border border-[var(--border)] text-xs">
                    <span className="text-text-muted/50 shrink-0 font-semibold mt-0.5">Review:</span>
                    <span className="text-text-muted italic">{p.review_notes}</span>
                  </div>
                )}

                {/* Pending actions */}
                {p.status === 'pending' && (
                  <div className="pt-2 border-t border-[var(--border)] space-y-2">
                    <textarea
                      value={reviewNotes[p.id] || ''}
                      onChange={e => setReviewNotes({ ...reviewNotes, [p.id]: e.target.value })}
                      placeholder="Review notes (optional)"
                      rows={2}
                      className="w-full bg-surface border border-[var(--border)] rounded-lg px-3 py-2 text-text-primary text-xs resize-none focus:outline-none focus:border-accent/50"
                    />
                    <div className="flex items-center justify-end gap-2">
                      {actionId === p.id ? (
                        <Loader2 size={15} className="animate-spin text-text-muted" />
                      ) : (
                        <>
                          <button
                            onClick={() => review(p.id, 'reject')}
                            className="px-3 py-1.5 rounded-lg text-xs text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-1.5 font-medium"
                          >
                            <XCircle size={13} /> Reject
                          </button>
                          <button
                            onClick={() => review(p.id, 'approve')}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs font-semibold transition-colors flex items-center gap-1.5"
                          >
                            <CheckCircle size={13} /> Approve
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Approved — reverse */}
                {p.status === 'approved' && (
                  <div className="flex justify-end pt-2 border-t border-[var(--border)]">
                    <button
                      onClick={() => reverse(p.id)}
                      disabled={actionId === p.id}
                      className="px-3 py-1.5 rounded-lg text-xs text-text-muted hover:text-yellow-400 hover:bg-yellow-500/10 transition-colors flex items-center gap-1.5 font-medium disabled:opacity-40"
                    >
                      {actionId === p.id ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                      Reverse
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Users tab ──────────────────────────────────────────────────────────────────

function UsersTab({
  users, onChanged, currentUserId,
}: { users: AdminUser[]; onChanged: () => void; currentUserId?: number }): JSX.Element {
  const [actionId, setActionId] = useState<number | null>(null)
  const [filter,   setFilter]   = useState<'all' | 'editors' | 'admins' | 'applicants'>('all')

  const update = async (userId: number, payload: Parameters<typeof userApi.adminUpdateUser>[1]): Promise<void> => {
    setActionId(userId)
    try {
      await userApi.adminUpdateUser(userId, payload)
      onChanged()
    } catch {} finally { setActionId(null) }
  }

  const filterDefs: { id: typeof filter; label: string; count: number }[] = [
    { id: 'all',        label: 'All',        count: users.length },
    { id: 'admins',     label: 'Admins',     count: users.filter(u => u.role === 'administrator').length },
    { id: 'editors',    label: 'Editors',    count: users.filter(u => u.role === 'editor').length },
    { id: 'applicants', label: 'Applicants', count: users.filter(u => u.role === 'applicant').length },
  ]

  const filtered = users.filter(u => {
    if (filter === 'all')        return true
    if (filter === 'admins')     return u.role === 'administrator'
    if (filter === 'editors')    return u.role === 'editor'
    return u.role === 'applicant'
  })

  const roleColor = (role: string) => ({
    administrator: 'bg-accent/20 text-accent border-accent/30',
    editor:        'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    applicant:     'bg-surface-raised text-text-muted border-[var(--border)]',
  })[role] ?? 'bg-surface-raised text-text-muted border-[var(--border)]'

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {filterDefs.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold transition-colors border ${
              filter === f.id
                ? 'bg-accent/15 text-accent border-accent/30'
                : 'text-text-muted border-[var(--border)] hover:text-text-primary hover:border-text-muted/30'
            }`}
          >
            {f.label}
            <span className={`text-[9px] rounded-full px-1 ${filter === f.id ? 'bg-accent/20' : 'bg-surface-raised'}`}>
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 && <EmptyState label="No users in this group" />}

      <div className="space-y-2">
        {filtered.map(u => (
          <div key={u.user_id} className="bg-surface-overlay border border-[var(--border)] rounded-xl p-3 flex items-center gap-3">
            <Avatar src={u.discord_avatar} name={u.discord_username || u.username} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-text-primary text-sm font-semibold truncate">
                  {u.discord_username || u.username}
                </p>
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide border ${roleColor(u.role)}`}>
                  {u.role}
                </span>
                {!u.is_active && <StatusBadge status="disabled" />}
                {u.user_id === currentUserId && (
                  <span className="text-[9px] text-text-muted/50 italic">you</span>
                )}
              </div>
              <p className="text-text-muted/70 text-[10px] mt-0.5">
                {u.approved_count} approved · {u.proposal_count} proposals · joined {fmtDate(u.date_joined)}
              </p>
            </div>

            {u.user_id !== currentUserId && u.role !== 'administrator' && (
              <div className="flex items-center gap-1 shrink-0">
                {actionId === u.user_id ? (
                  <Loader2 size={14} className="animate-spin text-text-muted mx-1" />
                ) : (
                  <>
                    {u.role === 'editor' && (
                      <label className="flex items-center gap-1 text-[9px] text-text-muted/60 cursor-pointer mr-1.5 hover:text-text-muted transition-colors">
                        <input
                          type="checkbox"
                          checked={u.auto_approve_proposals}
                          onChange={e => update(u.user_id, { auto_approve_proposals: e.target.checked })}
                          className="w-3 h-3"
                        />
                        auto
                      </label>
                    )}
                    {u.role === 'editor' ? (
                      <button
                        onClick={() => update(u.user_id, { role: 'applicant' })}
                        className="px-2 py-1 rounded-lg text-[10px] text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors font-medium"
                      >
                        Demote
                      </button>
                    ) : (
                      <button
                        onClick={() => update(u.user_id, { role: 'editor' })}
                        className="px-2 py-1 rounded-lg text-[10px] text-emerald-400 hover:bg-emerald-500/10 transition-colors font-medium"
                      >
                        Promote
                      </button>
                    )}
                    <button
                      onClick={() => update(u.user_id, { is_active: !u.is_active })}
                      className="px-2 py-1 rounded-lg text-[10px] text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors font-medium"
                    >
                      {u.is_active ? 'Disable' : 'Enable'}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Stats tab ──────────────────────────────────────────────────────────────────

function StatsTab({
  applications, proposals, users,
}: { applications: EditorApplication[]; proposals: SongEditProposal[]; users: AdminUser[] }): JSX.Element {
  const editors       = users.filter(u => u.role === 'editor')
  const approved      = proposals.filter(p => p.status === 'approved')
  const approvalRate  = proposals.length > 0
    ? Math.round((approved.length / proposals.filter(p => p.status !== 'pending').length || 0) * 100)
    : 0

  const topEditors = [...editors]
    .sort((a, b) => b.approved_count - a.approved_count)
    .slice(0, 5)

  const statCards = [
    { label: 'Total users',           value: users.length,                                              icon: <Users size={14} />,       color: 'text-accent' },
    { label: 'Editors',               value: editors.length,                                            icon: <UserCheck size={14} />,   color: 'text-emerald-400' },
    { label: 'Total proposals',       value: proposals.length,                                          icon: <FileEdit size={14} />,    color: 'text-blue-400' },
    { label: 'Approved',              value: approved.length,                                           icon: <FileCheck size={14} />,   color: 'text-emerald-400' },
    { label: 'Pending proposals',     value: proposals.filter(p => p.status === 'pending').length,      icon: <Clock size={14} />,       color: 'text-yellow-400' },
    { label: 'Pending applications',  value: applications.filter(a => a.status === 'pending').length,   icon: <Clock size={14} />,       color: 'text-yellow-400' },
    { label: 'Approval rate',         value: `${approvalRate}%`,                                        icon: <Activity size={14} />,    color: 'text-purple-400' },
    { label: 'Applicants',            value: users.filter(u => u.role === 'applicant').length,           icon: <Users size={14} />,       color: 'text-text-muted' },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5">
        {statCards.map(s => (
          <div key={s.label} className="bg-surface-overlay border border-[var(--border)] rounded-xl px-4 py-3.5">
            <div className={`mb-1.5 ${s.color}`}>{s.icon}</div>
            <p className="text-2xl font-bold text-text-primary leading-none">{s.value}</p>
            <p className="text-[10px] text-text-muted/70 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {topEditors.length > 0 && (
        <div>
          <SectionLabel>Top editors by approvals</SectionLabel>
          <div className="space-y-2 mt-2">
            {topEditors.map((u, i) => (
              <div key={u.user_id} className="flex items-center gap-3 px-3 py-2.5 bg-surface-overlay border border-[var(--border)] rounded-xl">
                <span className={`text-xs font-bold w-5 text-center ${i === 0 ? 'text-yellow-400' : 'text-text-muted/40'}`}>
                  {i + 1}
                </span>
                <Avatar src={u.discord_avatar} name={u.discord_username || u.username} size="sm" />
                <p className="text-text-primary text-xs font-medium flex-1 truncate">
                  {u.discord_username || u.username}
                </p>
                <div className="text-right shrink-0">
                  <p className="text-text-primary text-xs font-bold">{u.approved_count}</p>
                  <p className="text-text-muted/50 text-[9px]">approved</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Security tab ───────────────────────────────────────────────────────────────

function SecurityTab(): JSX.Element {
  return (
    <div className="max-w-md space-y-4">
      <div className="flex items-start gap-3 px-4 py-4 rounded-xl bg-emerald-500/8 border border-emerald-500/20">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
          <Check size={15} className="text-emerald-400" />
        </div>
        <div>
          <p className="text-text-primary text-sm font-semibold">Two-factor authentication</p>
          <p className="text-text-muted text-xs mt-0.5">2FA is active on your account.</p>
        </div>
      </div>
    </div>
  )
}

// ── Shared sub-components ──────────────────────────────────────────────────────

function Avatar({ src, name, size = 'md' }: { src?: string; name: string; size?: 'sm' | 'md' }): JSX.Element {
  const sz = size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-9 h-9 text-xs'
  return src ? (
    <img src={src} alt="" className={`${sz} rounded-full object-cover shrink-0`} />
  ) : (
    <div className={`${sz} rounded-full bg-accent/20 text-accent flex items-center justify-center font-semibold shrink-0`}>
      {(name || '?').charAt(0).toUpperCase()}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted/50 px-0.5">{children}</p>
  )
}

function EmptyState({ label }: { label: string }): JSX.Element {
  return (
    <div className="flex items-center justify-center h-32 text-text-muted/40 text-sm">{label}</div>
  )
}

function Detail({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-widest text-text-muted/50 mb-0.5">{label}</p>
      <p className="text-text-primary text-xs whitespace-pre-wrap leading-relaxed">{value}</p>
    </div>
  )
}

// ── OTP setup ──────────────────────────────────────────────────────────────────

function OtpSetupPanel({ onEnabled }: { onEnabled: () => Promise<void> }): JSX.Element {
  const [setup,      setSetup]      = useState<userApi.OtpSetupPayload | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [code,       setCode]       = useState('')
  const [confirming, setConfirming] = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  useEffect(() => {
    userApi.getOtpSetup()
      .then(setSetup)
      .catch(e => setError(e instanceof Error ? e.message : 'Could not load setup'))
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
    <div className="max-w-md space-y-5">
      <div>
        <h2 className="text-text-primary text-lg font-bold flex items-center gap-2.5">
          <KeyRound size={18} /> Enable 2FA
        </h2>
        <p className="text-text-muted text-sm mt-1.5 leading-relaxed">
          Admins must enable two-factor authentication before accessing admin tools. Scan the QR code with your authenticator app, then enter a code to confirm.
        </p>
      </div>

      {setup.qr_code && (
        <div className="bg-white p-4 rounded-2xl flex items-center justify-center w-fit mx-auto">
          <img src={setup.qr_code} alt="OTP QR code" className="w-44 h-44" />
        </div>
      )}

      {setup.otp_secret && (
        <div>
          <p className="text-text-muted/60 text-xs mb-1.5">Or enter the secret manually:</p>
          <code className="block bg-surface-overlay border border-[var(--border)] rounded-xl px-3 py-2.5 text-text-primary text-xs font-mono break-all">
            {setup.otp_secret}
          </code>
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-text-muted mb-1.5">Verification code</label>
        <input
          type="text"
          inputMode="numeric"
          value={code}
          onChange={e => { setCode(e.target.value); setError(null) }}
          onKeyDown={e => e.key === 'Enter' && confirm()}
          placeholder="123456"
          className="w-full bg-surface-overlay border border-[var(--border)] rounded-xl px-4 py-2.5 text-text-primary text-base focus:outline-none focus:border-accent/50 font-mono tracking-[0.5em] text-center"
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
          <AlertCircle size={13} className="shrink-0 mt-0.5" /> {error}
        </div>
      )}

      <button
        onClick={confirm}
        disabled={confirming || !code}
        className="w-full py-2.5 rounded-xl bg-accent text-[var(--bg)] text-sm font-semibold transition-all hover:opacity-90 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-40"
      >
        {confirming && <Loader2 size={14} className="animate-spin" />}
        Verify & enable
      </button>
    </div>
  )
}
