import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  ChevronLeft, Users, Clock, CheckCircle, XCircle, ShieldCheck, BarChart2,
  Loader2, RefreshCw, FileEdit, KeyRound, Check, AlertCircle, RotateCcw,
  ChevronDown, ChevronUp, UserCheck, Minus, Plus, Shield, TrendingUp,
  MessageSquare, Calendar, Hash,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import * as userApi from '../lib/userApi'
import type { EditorApplication, SongEditProposal, AdminUser, ProposalStatus } from '../lib/userApi'

type Tab = 'proposals' | 'applications' | 'users' | 'stats' | 'security'

// ── Utilities ─────────────────────────────────────────────────────────────────

function relativeTime(iso: string | null): string {
  if (!iso) return '—'
  const d = Date.now() - new Date(iso).getTime()
  const m = Math.floor(d / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function shortDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fieldLabel(key: string): string {
  return key.replace(/_/g, ' ')
}

function renderValue(v: unknown): string {
  if (v == null || v === '') return '(empty)'
  if (typeof v === 'string') return v
  if (Array.isArray(v)) return v.length ? v.join('\n') : '(empty)'
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  return JSON.stringify(v, null, 2)
}

const LONG_KEYS = new Set(['lyrics', 'synced_lyrics', 'description', 'notes'])
const LONG_THRESHOLD = 200

// ── Status chip ───────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  pending:  { bg: 'bg-amber-500/10',   text: 'text-amber-400',  dot: 'bg-amber-400' },
  approved: { bg: 'bg-emerald-500/10', text: 'text-emerald-400',dot: 'bg-emerald-400' },
  rejected: { bg: 'bg-red-500/10',     text: 'text-red-400',    dot: 'bg-red-400' },
  reversed: { bg: 'bg-zinc-500/10',    text: 'text-zinc-400',   dot: 'bg-zinc-400' },
}

function StatusChip({ status }: { status: string }): JSX.Element {
  const s = STATUS_STYLE[status] ?? { bg: 'bg-surface-raised', text: 'text-text-muted', dot: 'bg-text-muted' }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {status}
    </span>
  )
}

// ── Diff view ─────────────────────────────────────────────────────────────────

interface DiffLine {
  type: 'before' | 'after' | 'unchanged'
  text: string
}

function splitLines(value: string, maxLines: number, expanded: boolean): { lines: string[]; truncated: boolean } {
  const all = value.split('\n')
  if (expanded || all.length <= maxLines) return { lines: all, truncated: false }
  return { lines: all.slice(0, maxLines), truncated: true }
}

function FieldDiff({
  fieldKey, before, after,
}: { fieldKey: string; before: unknown; after: unknown }): JSX.Element {
  const beforeStr = renderValue(before)
  const afterStr  = renderValue(after)
  const isLong    = LONG_KEYS.has(fieldKey) || beforeStr.length > LONG_THRESHOLD || afterStr.length > LONG_THRESHOLD
  const unchanged = beforeStr === afterStr
  const [exp, setExp] = useState(!isLong)
  const maxLines = 4

  const bLines = splitLines(beforeStr, maxLines, exp)
  const aLines = splitLines(afterStr,  maxLines, exp)
  const hasBefore = before !== undefined && !unchanged

  return (
    <div className="rounded-lg overflow-hidden border border-[var(--border)] text-xs">
      {/* Field label row */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--surface-raised)] border-b border-[var(--border)]">
        <span className="font-mono text-[10px] text-text-muted/70 tracking-tight">{fieldLabel(fieldKey)}</span>
        <div className="flex items-center gap-2">
          {unchanged && <span className="text-[9px] italic text-text-muted/40">unchanged</span>}
          {isLong && (
            <button onClick={() => setExp(e => !e)} className="text-[10px] text-accent/70 hover:text-accent transition-colors">
              {exp ? 'collapse' : `expand`}
            </button>
          )}
        </div>
      </div>

      {/* Before lines */}
      {hasBefore && (
        <div className="bg-red-950/20">
          {bLines.lines.map((line, i) => (
            <div key={i} className="flex items-start gap-2 px-3 py-0.5 min-h-[20px]">
              <Minus size={10} className="text-red-400/60 mt-0.5 shrink-0" />
              <pre className="font-mono text-red-300/80 whitespace-pre-wrap break-words flex-1 text-[11px] leading-relaxed">{line}</pre>
            </div>
          ))}
          {bLines.truncated && (
            <div className="px-3 py-1 text-[10px] text-red-400/40 italic">
              …{beforeStr.split('\n').length - maxLines} more lines
            </div>
          )}
        </div>
      )}

      {/* After lines */}
      {!unchanged && (
        <div className="bg-emerald-950/20">
          {aLines.lines.map((line, i) => (
            <div key={i} className="flex items-start gap-2 px-3 py-0.5 min-h-[20px]">
              <Plus size={10} className="text-emerald-400/60 mt-0.5 shrink-0" />
              <pre className="font-mono text-emerald-300/90 whitespace-pre-wrap break-words flex-1 text-[11px] leading-relaxed">{line}</pre>
            </div>
          ))}
          {aLines.truncated && (
            <div className="px-3 py-1 text-[10px] text-emerald-400/40 italic">
              …{afterStr.split('\n').length - maxLines} more lines
            </div>
          )}
        </div>
      )}

      {/* Unchanged value */}
      {unchanged && (
        <div className="px-3 py-1.5">
          <pre className="font-mono text-text-muted/50 whitespace-pre-wrap break-words text-[11px] leading-relaxed">
            {exp ? afterStr : afterStr.slice(0, 80) + (afterStr.length > 80 ? '…' : '')}
          </pre>
        </div>
      )}
    </div>
  )
}

function ProposalDiff({ proposal }: { proposal: SongEditProposal }): JSX.Element | null {
  const entries = Object.entries(proposal.proposed_data || {})
  if (!entries.length) return <p className="text-text-muted/40 text-xs italic">No field data.</p>
  const snapshot = proposal.original_snapshot || {}
  return (
    <div className="space-y-2">
      {entries.map(([k, v]) => <FieldDiff key={k} fieldKey={k} before={snapshot[k]} after={v} />)}
    </div>
  )
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ src, name, size = 8 }: { src?: string; name: string; size?: number }): JSX.Element {
  const cls = `w-${size} h-${size} rounded-full shrink-0`
  return src
    ? <img src={src} alt="" className={`${cls} object-cover`} />
    : <div className={`${cls} bg-accent/20 text-accent flex items-center justify-center text-xs font-bold`}>
        {(name || '?')[0].toUpperCase()}
      </div>
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminPage(): JSX.Element {
  const { account, setActiveView, loadAccount } = useStore()
  const isAdmin    = !!account?.is_administrator
  const otpEnabled = !!account?.otp_enabled

  const [tab,         setTab]         = useState<Tab>('proposals')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [refreshKey,  setRefreshKey]  = useState(0)
  const [applications, setApplications] = useState<EditorApplication[]>([])
  const [proposalStatus, setProposalStatus] = useState<ProposalStatus | ''>('pending')
  const [proposals,   setProposals]   = useState<SongEditProposal[]>([])
  const [users,       setUsers]       = useState<AdminUser[]>([])

  const load = useCallback(async () => {
    if (!isAdmin) return
    setLoading(true); setError(null)
    try {
      if (tab === 'proposals') {
        setProposals(await userApi.adminListProposals(proposalStatus || undefined))
      } else if (tab === 'applications') {
        setApplications(await userApi.adminListApplications())
      } else if (tab === 'users' || tab === 'stats') {
        setUsers(await userApi.adminListUsers())
        if (tab === 'stats') {
          setApplications(await userApi.adminListApplications())
          setProposals(await userApi.adminListProposals())
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally { setLoading(false) }
  }, [tab, isAdmin, proposalStatus])

  useEffect(() => { load() }, [load, refreshKey])

  if (!isAdmin) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 px-8 text-center">
      <Shield size={28} className="text-text-muted/40" />
      <p className="text-text-primary font-semibold text-sm">Admin only</p>
      <p className="text-text-muted/60 text-xs">You don't have permission to view this page.</p>
      <button onClick={() => setActiveView('api-tracker')} className="text-xs text-accent hover:underline mt-1">Go back</button>
    </div>
  )

  if (!otpEnabled) return (
    <div className="flex-1 overflow-y-auto px-5 py-6">
      <OtpSetupPanel onEnabled={async () => { await loadAccount() }} />
    </div>
  )

  const pendingApps   = applications.filter(a => a.status === 'pending').length
  const pendingProps  = proposals.filter(p => p.status === 'pending').length

  type NavItem = { id: Tab; label: string; icon: React.ReactNode; badge?: number }
  const nav: NavItem[] = [
    { id: 'proposals',    label: 'Proposals',    icon: <FileEdit size={13} />,  badge: tab !== 'proposals' && pendingProps ? pendingProps : undefined },
    { id: 'applications', label: 'Applications', icon: <Clock size={13} />,     badge: pendingApps || undefined },
    { id: 'users',        label: 'Users',        icon: <Users size={13} /> },
    { id: 'stats',        label: 'Stats',        icon: <TrendingUp size={13} /> },
    { id: 'security',     label: 'Security',     icon: <Shield size={13} /> },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[var(--bg)]">

      {/* Top bar */}
      <div className="shrink-0 flex items-center gap-2 px-4 pt-4 pb-3">
        <button
          onClick={() => setActiveView('api-tracker')}
          className="p-1.5 rounded-lg hover:bg-surface-overlay transition-colors text-text-muted hover:text-text-primary"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="flex-1">
          <p className="text-text-primary font-bold text-sm leading-none">Admin</p>
          {account?.discord_username && (
            <p className="text-text-muted/50 text-[10px] mt-0.5 leading-none">{account.discord_username}</p>
          )}
        </div>
        <button
          onClick={() => setRefreshKey(k => k + 1)}
          disabled={loading}
          className="p-1.5 rounded-lg hover:bg-surface-overlay transition-colors text-text-muted hover:text-text-primary disabled:opacity-40"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Nav strip */}
      <div className="shrink-0 flex gap-0 overflow-x-auto border-y border-[var(--border)] bg-surface-overlay/30">
        {nav.map(n => (
          <button
            key={n.id}
            onClick={() => setTab(n.id)}
            className={`relative flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-medium transition-colors shrink-0 ${
              tab === n.id
                ? 'text-text-primary'
                : 'text-text-muted/60 hover:text-text-muted'
            }`}
          >
            <span className={tab === n.id ? 'text-accent' : ''}>{n.icon}</span>
            {n.label}
            {n.badge ? (
              <span className="bg-accent text-[var(--bg)] text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {n.badge > 9 ? '9+' : n.badge}
              </span>
            ) : null}
            {tab === n.id && (
              <span className="absolute bottom-0 inset-x-0 h-[2px] bg-accent" />
            )}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {error && (
          <div className="mx-4 mt-4 flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            <AlertCircle size={13} className="shrink-0 mt-0.5" /> {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 size={18} className="animate-spin text-text-muted/30" />
          </div>
        ) : (
          <div className="px-4 py-4">
            {tab === 'proposals'    && <ProposalsTab proposals={proposals} status={proposalStatus} setStatus={setProposalStatus} onChanged={() => setRefreshKey(k => k + 1)} />}
            {tab === 'applications' && <ApplicationsTab applications={applications} onChanged={() => setRefreshKey(k => k + 1)} />}
            {tab === 'users'        && <UsersTab users={users} onChanged={() => setRefreshKey(k => k + 1)} currentUserId={account?.id} />}
            {tab === 'stats'        && <StatsTab applications={applications} proposals={proposals} users={users} />}
            {tab === 'security'     && <SecurityTab />}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Proposals ─────────────────────────────────────────────────────────────────

function ProposalsTab({ proposals, status, setStatus, onChanged }: {
  proposals: SongEditProposal[]
  status: ProposalStatus | ''
  setStatus: (s: ProposalStatus | '') => void
  onChanged: () => void
}): JSX.Element {
  const [actionId,    setActionId]    = useState<number | null>(null)
  const [reviewNotes, setReviewNotes] = useState<Record<number, string>>({})
  const [expanded,    setExpanded]    = useState<number | null>(null)

  const doReview = async (id: number, action: 'approve' | 'reject') => {
    setActionId(id)
    try { await userApi.adminReviewProposal(id, { action, review_notes: reviewNotes[id] || '' }); onChanged() }
    catch {} finally { setActionId(null) }
  }

  const doReverse = async (id: number) => {
    if (!confirm('Reverse this approval?')) return
    setActionId(id)
    try { await userApi.adminReverseProposal(id); onChanged() }
    catch {} finally { setActionId(null) }
  }

  const FILTERS: { id: ProposalStatus | ''; label: string }[] = [
    { id: 'pending',  label: 'Pending'  },
    { id: 'approved', label: 'Approved' },
    { id: 'rejected', label: 'Rejected' },
    { id: 'reversed', label: 'Reversed' },
    { id: '',         label: 'All'      },
  ]

  return (
    <div className="space-y-3">
      {/* Filter row */}
      <div className="flex flex-wrap gap-1">
        {FILTERS.map(f => (
          <button key={f.id || 'all'} onClick={() => setStatus(f.id)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
              status === f.id
                ? 'bg-accent text-[var(--bg)] font-semibold'
                : 'text-text-muted/60 hover:text-text-muted bg-surface-overlay/50 hover:bg-surface-overlay'
            }`}>{f.label}
          </button>
        ))}
      </div>

      {proposals.length === 0 && <Empty label="No proposals" />}

      {proposals.map(p => {
        const isOpen    = expanded === p.id
        const isBusy    = actionId === p.id
        const fieldKeys = Object.keys(p.proposed_data || {})
        const statusStyle = STATUS_STYLE[p.status] ?? { bg: '', text: '', dot: '' }
        const leftBorder = {
          pending:  'border-l-amber-500/60',
          approved: 'border-l-emerald-500/60',
          rejected: 'border-l-red-500/60',
          reversed: 'border-l-zinc-500/40',
        }[p.status] ?? 'border-l-transparent'

        return (
          <div key={p.id} className={`bg-surface-overlay rounded-xl border border-[var(--border)] border-l-2 ${leftBorder} overflow-hidden`}>

            {/* Summary row — always visible */}
            <button
              className="w-full text-left px-3.5 py-3 hover:bg-white/[0.02] transition-colors"
              onClick={() => setExpanded(isOpen ? null : p.id)}
            >
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <StatusChip status={p.status} />
                <span className="text-[10px] font-medium text-text-muted/50 bg-surface-raised px-1.5 py-0.5 rounded">
                  {p.change_type}
                </span>
                {p.song_public_id != null && (
                  <span className="flex items-center gap-0.5 text-[10px] text-text-muted/40">
                    <Hash size={9} />{p.song_public_id}
                  </span>
                )}
                <span className="ml-auto text-[10px] text-text-muted/40 flex items-center gap-1 shrink-0">
                  {fieldKeys.length} field{fieldKeys.length !== 1 ? 's' : ''}
                  {isOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                </span>
              </div>
              <p className="text-text-primary text-[13px] font-semibold leading-snug truncate">
                {p.title || `Proposal #${p.id}`}
              </p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-text-muted/50 text-[10px]">
                  <span className="text-text-muted/70">{p.editor_username}</span>
                  {' · '}{relativeTime(p.created_at)}
                </span>
                {p.reviewer_username && (
                  <span className="text-text-muted/40 text-[10px]">reviewed by {p.reviewer_username}</span>
                )}
              </div>
            </button>

            {/* Quick actions for pending — always visible */}
            {p.status === 'pending' && !isOpen && (
              <div className="flex items-center gap-2 px-3.5 pb-3">
                <input
                  type="text"
                  value={reviewNotes[p.id] || ''}
                  onChange={e => setReviewNotes(n => ({ ...n, [p.id]: e.target.value }))}
                  onClick={e => e.stopPropagation()}
                  placeholder="Note (optional)"
                  className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-text-primary text-[11px] focus:outline-none focus:border-accent/40 min-w-0"
                />
                {isBusy ? <Loader2 size={14} className="animate-spin text-text-muted mx-1" /> : (
                  <>
                    <button onClick={e => { e.stopPropagation(); doReview(p.id, 'reject') }}
                      className="px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[11px] font-semibold transition-colors flex items-center gap-1">
                      <XCircle size={12} /> Reject
                    </button>
                    <button onClick={e => { e.stopPropagation(); doReview(p.id, 'approve') }}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-[11px] font-semibold transition-colors flex items-center gap-1">
                      <CheckCircle size={12} /> Approve
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Expanded body — diff + notes + actions */}
            {isOpen && (
              <div className="border-t border-[var(--border)] px-3.5 pt-3 pb-3.5 space-y-3">

                {/* Diff */}
                <ProposalDiff proposal={p} />

                {/* Notes */}
                {p.editor_notes && (
                  <div className="flex gap-2 text-xs bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2.5">
                    <MessageSquare size={12} className="text-text-muted/40 shrink-0 mt-0.5" />
                    <span className="text-text-muted/80 italic leading-relaxed">{p.editor_notes}</span>
                  </div>
                )}
                {p.review_notes && (
                  <div className="flex gap-2 text-xs bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2.5">
                    <Check size={12} className="text-text-muted/40 shrink-0 mt-0.5" />
                    <span className="text-text-muted/80 italic leading-relaxed">Review: {p.review_notes}</span>
                  </div>
                )}

                {/* Actions */}
                {p.status === 'pending' && (
                  <div className="space-y-2 pt-1">
                    <textarea
                      value={reviewNotes[p.id] || ''}
                      onChange={e => setReviewNotes(n => ({ ...n, [p.id]: e.target.value }))}
                      placeholder="Review notes (optional)"
                      rows={2}
                      className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-text-primary text-xs resize-none focus:outline-none focus:border-accent/40"
                    />
                    <div className="flex justify-end gap-2">
                      {isBusy ? <Loader2 size={14} className="animate-spin text-text-muted" /> : (
                        <>
                          <button onClick={() => doReview(p.id, 'reject')}
                            className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold transition-colors flex items-center gap-1.5">
                            <XCircle size={13} /> Reject
                          </button>
                          <button onClick={() => doReview(p.id, 'approve')}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs font-semibold transition-colors flex items-center gap-1.5">
                            <CheckCircle size={13} /> Approve
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {p.status === 'approved' && (
                  <div className="flex justify-end">
                    <button onClick={() => doReverse(p.id)} disabled={isBusy}
                      className="px-3 py-1.5 rounded-lg text-xs text-text-muted/60 hover:text-amber-400 hover:bg-amber-500/10 transition-colors flex items-center gap-1.5 disabled:opacity-40">
                      {isBusy ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />} Reverse
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

// ── Applications ──────────────────────────────────────────────────────────────

function ApplicationsTab({ applications, onChanged }: { applications: EditorApplication[]; onChanged: () => void }): JSX.Element {
  const [actionId,    setActionId]    = useState<number | null>(null)
  const [notes,       setNotes]       = useState<Record<number, string>>({})
  const [expanded,    setExpanded]    = useState<number | null>(null)

  const doReview = async (id: number, action: 'approve' | 'reject') => {
    setActionId(id)
    try { await userApi.adminReviewApplication(id, { action, review_notes: notes[id] || '' }); onChanged() }
    catch {} finally { setActionId(null) }
  }

  const pending  = applications.filter(a => a.status === 'pending')
  const reviewed = applications.filter(a => a.status !== 'pending').slice(0, 8)

  if (!applications.length) return <Empty label="No applications" />

  return (
    <div className="space-y-4">
      {pending.length > 0 && (
        <div className="space-y-2.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted/40">
            Pending · {pending.length}
          </p>
          {pending.map(a => (
            <div key={a.id} className="bg-surface-overlay border border-[var(--border)] border-l-2 border-l-amber-500/60 rounded-xl overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3.5">
                <Avatar src={a.discord_avatar} name={a.display_name || a.username} size={9} />
                <div className="min-w-0 flex-1">
                  <p className="text-text-primary text-sm font-semibold truncate">{a.display_name || a.username}</p>
                  <p className="text-text-muted/60 text-[11px] truncate">
                    {a.discord_username}{a.contact ? ` · ${a.contact}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-text-muted/40 text-[10px] flex items-center gap-1">
                    <Calendar size={9} />{relativeTime(a.created_at)}
                  </span>
                  <button onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                    className="p-1 rounded-md hover:bg-surface-raised transition-colors text-text-muted/50 hover:text-text-muted">
                    {expanded === a.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                </div>
              </div>

              {expanded === a.id && (
                <div className="px-4 pb-3 pt-1 space-y-2.5 border-t border-[var(--border)]">
                  {a.areas      && <AppField label="Areas"      value={a.areas} />}
                  {a.experience && <AppField label="Experience" value={a.experience} />}
                  {a.motivation && <AppField label="Motivation" value={a.motivation} />}
                </div>
              )}

              <div className="flex items-center gap-2 px-4 py-3 border-t border-[var(--border)] bg-surface-raised/20">
                <input
                  type="text"
                  value={notes[a.id] || ''}
                  onChange={e => setNotes(n => ({ ...n, [a.id]: e.target.value }))}
                  placeholder="Review note"
                  className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-[11px] text-text-primary focus:outline-none focus:border-accent/40 min-w-0"
                />
                {actionId === a.id ? <Loader2 size={14} className="animate-spin text-text-muted" /> : (
                  <>
                    <button onClick={() => doReview(a.id, 'reject')}
                      className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[11px] font-semibold transition-colors flex items-center gap-1">
                      <XCircle size={12} /> Reject
                    </button>
                    <button onClick={() => doReview(a.id, 'approve')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-[11px] font-semibold transition-colors flex items-center gap-1">
                      <CheckCircle size={12} /> Approve
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
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted/40">Recently reviewed</p>
          {reviewed.map(a => (
            <div key={a.id} className="flex items-center gap-3 px-3 py-2.5 bg-surface-overlay border border-[var(--border)] rounded-xl opacity-60">
              <Avatar src={a.discord_avatar} name={a.display_name || a.username} size={7} />
              <div className="min-w-0 flex-1">
                <p className="text-text-primary text-xs font-medium truncate">{a.display_name || a.username}</p>
                <p className="text-text-muted/50 text-[10px]">{shortDate(a.reviewed_at)}{a.reviewer_username ? ` · ${a.reviewer_username}` : ''}</p>
              </div>
              <StatusChip status={a.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AppField({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-widest text-text-muted/40 mb-0.5">{label}</p>
      <p className="text-text-primary/80 text-xs leading-relaxed whitespace-pre-wrap">{value}</p>
    </div>
  )
}

// ── Users ─────────────────────────────────────────────────────────────────────

function UsersTab({ users, onChanged, currentUserId }: { users: AdminUser[]; onChanged: () => void; currentUserId?: number }): JSX.Element {
  const [actionId, setActionId] = useState<number | null>(null)
  const [filter,   setFilter]   = useState<'all' | 'admins' | 'editors' | 'applicants'>('all')
  const [search,   setSearch]   = useState('')

  const doUpdate = async (uid: number, payload: Parameters<typeof userApi.adminUpdateUser>[1]) => {
    setActionId(uid)
    try { await userApi.adminUpdateUser(uid, payload); onChanged() }
    catch {} finally { setActionId(null) }
  }

  const FILTERS = [
    { id: 'all' as const,        label: 'All',        count: users.length },
    { id: 'admins' as const,     label: 'Admins',     count: users.filter(u => u.role === 'administrator').length },
    { id: 'editors' as const,    label: 'Editors',    count: users.filter(u => u.role === 'editor').length },
    { id: 'applicants' as const, label: 'Applicants', count: users.filter(u => u.role === 'applicant').length },
  ]

  const visible = useMemo(() => users.filter(u => {
    const matchesFilter =
      filter === 'all'        ? true :
      filter === 'admins'     ? u.role === 'administrator' :
      filter === 'editors'    ? u.role === 'editor' :
                                u.role === 'applicant'
    const q = search.toLowerCase()
    const matchesSearch = !q || (u.discord_username || u.username || '').toLowerCase().includes(q)
    return matchesFilter && matchesSearch
  }), [users, filter, search])

  const ROLE_COLOR: Record<string, string> = {
    administrator: 'text-accent bg-accent/15',
    editor:        'text-emerald-400 bg-emerald-500/15',
    applicant:     'text-text-muted bg-surface-raised',
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
              filter === f.id ? 'bg-accent text-[var(--bg)] font-semibold' : 'bg-surface-overlay text-text-muted/60 hover:text-text-muted'
            }`}
          >
            {f.label}
            <span className={`text-[9px] px-1 rounded ${filter === f.id ? 'bg-white/20' : 'bg-surface-raised'}`}>{f.count}</span>
          </button>
        ))}
      </div>

      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search users…"
        className="w-full bg-surface-overlay border border-[var(--border)] rounded-lg px-3 py-2 text-text-primary text-xs focus:outline-none focus:border-accent/40"
      />

      {visible.length === 0 && <Empty label="No users" />}

      <div className="space-y-1.5">
        {visible.map(u => (
          <div key={u.user_id} className="flex items-center gap-3 px-3 py-2.5 bg-surface-overlay border border-[var(--border)] rounded-xl">
            <Avatar src={u.discord_avatar} name={u.discord_username || u.username} size={8} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-text-primary text-xs font-semibold truncate">{u.discord_username || u.username}</p>
                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${ROLE_COLOR[u.role] ?? 'text-text-muted bg-surface-raised'}`}>{u.role}</span>
                {!u.is_active && <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded text-red-400 bg-red-500/15">off</span>}
                {u.user_id === currentUserId && <span className="text-[9px] text-text-muted/30 italic">you</span>}
              </div>
              <p className="text-text-muted/40 text-[10px] mt-0.5">
                {u.approved_count} approved · {u.proposal_count} proposals
              </p>
            </div>

            {u.user_id !== currentUserId && u.role !== 'administrator' && (
              <div className="flex items-center gap-1 shrink-0">
                {actionId === u.user_id ? (
                  <Loader2 size={13} className="animate-spin text-text-muted/40 mx-1" />
                ) : (
                  <>
                    {u.role === 'editor' && (
                      <label className="flex items-center gap-1 text-[9px] text-text-muted/40 cursor-pointer mr-2 hover:text-text-muted/70 transition-colors">
                        <input type="checkbox" checked={u.auto_approve_proposals}
                          onChange={e => doUpdate(u.user_id, { auto_approve_proposals: e.target.checked })}
                          className="w-3 h-3 accent-[var(--accent)]" />
                        auto
                      </label>
                    )}
                    {u.role === 'editor' ? (
                      <button onClick={() => doUpdate(u.user_id, { role: 'applicant' })}
                        className="px-2 py-1 rounded text-[10px] text-text-muted/50 hover:text-red-400 hover:bg-red-500/10 transition-colors font-medium">
                        Demote
                      </button>
                    ) : (
                      <button onClick={() => doUpdate(u.user_id, { role: 'editor' })}
                        className="px-2 py-1 rounded text-[10px] text-emerald-400 hover:bg-emerald-500/10 transition-colors font-medium">
                        Promote
                      </button>
                    )}
                    <button onClick={() => doUpdate(u.user_id, { is_active: !u.is_active })}
                      className="px-2 py-1 rounded text-[10px] text-text-muted/50 hover:text-text-muted hover:bg-surface-raised transition-colors font-medium">
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

// ── Stats ─────────────────────────────────────────────────────────────────────

function StatsTab({ applications, proposals, users }: {
  applications: EditorApplication[]; proposals: SongEditProposal[]; users: AdminUser[]
}): JSX.Element {
  const approved    = proposals.filter(p => p.status === 'approved').length
  const reviewed    = proposals.filter(p => p.status !== 'pending').length
  const approvalPct = reviewed > 0 ? Math.round(approved / reviewed * 100) : 0
  const editors     = users.filter(u => u.role === 'editor')
  const topEditors  = [...editors].sort((a, b) => b.approved_count - a.approved_count).slice(0, 5)

  const grid = [
    { v: users.length,                                                  label: 'Total users',        color: 'text-accent' },
    { v: editors.length,                                                label: 'Editors',            color: 'text-emerald-400' },
    { v: proposals.length,                                              label: 'Total proposals',    color: 'text-blue-400' },
    { v: approved,                                                      label: 'Approved',           color: 'text-emerald-400' },
    { v: proposals.filter(p => p.status === 'pending').length,          label: 'Pending review',     color: 'text-amber-400' },
    { v: applications.filter(a => a.status === 'pending').length,       label: 'Pending apps',       color: 'text-amber-400' },
    { v: `${approvalPct}%`,                                             label: 'Approval rate',      color: 'text-purple-400' },
    { v: users.filter(u => u.role === 'applicant').length,              label: 'Applicants',         color: 'text-text-muted' },
  ]

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2">
        {grid.map(s => (
          <div key={s.label} className="bg-surface-overlay border border-[var(--border)] rounded-xl px-4 py-4">
            <p className={`text-[26px] font-black leading-none tracking-tight ${s.color}`}>{s.v}</p>
            <p className="text-text-muted/50 text-[10px] mt-1.5 font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {topEditors.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted/40 mb-2">Top editors</p>
          <div className="space-y-1.5">
            {topEditors.map((u, i) => (
              <div key={u.user_id} className="flex items-center gap-3 px-3 py-2.5 bg-surface-overlay border border-[var(--border)] rounded-xl">
                <span className={`text-xs font-black w-5 text-center shrink-0 ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-amber-700' : 'text-text-muted/30'}`}>
                  {i + 1}
                </span>
                <Avatar src={u.discord_avatar} name={u.discord_username || u.username} size={7} />
                <p className="text-text-primary text-xs font-medium flex-1 truncate">{u.discord_username || u.username}</p>
                <div className="text-right shrink-0">
                  <p className="text-text-primary text-xs font-bold">{u.approved_count}</p>
                  <p className="text-text-muted/30 text-[9px]">approved</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Security ──────────────────────────────────────────────────────────────────

function SecurityTab(): JSX.Element {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 px-4 py-4 rounded-xl bg-emerald-500/8 border border-emerald-500/20">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
          <Check size={14} className="text-emerald-400" />
        </div>
        <div>
          <p className="text-text-primary text-sm font-semibold">Two-factor auth active</p>
          <p className="text-text-muted/60 text-xs mt-0.5">Your account is protected with 2FA.</p>
        </div>
      </div>
    </div>
  )
}

// ── Misc ──────────────────────────────────────────────────────────────────────

function Empty({ label }: { label: string }): JSX.Element {
  return <div className="flex items-center justify-center h-28 text-text-muted/30 text-sm">{label}</div>
}

// ── OTP setup ─────────────────────────────────────────────────────────────────

function OtpSetupPanel({ onEnabled }: { onEnabled: () => Promise<void> }): JSX.Element {
  const [setup,      setSetup]      = useState<userApi.OtpSetupPayload | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [code,       setCode]       = useState('')
  const [confirming, setConfirming] = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  useEffect(() => {
    userApi.getOtpSetup().then(setSetup).catch(e => setError(e instanceof Error ? e.message : 'Could not load setup')).finally(() => setLoading(false))
  }, [])

  const confirm = async () => {
    setConfirming(true); setError(null)
    try { await userApi.confirmOtpSetup(code); await onEnabled() }
    catch (e) { setError(e instanceof Error ? e.message : 'Verification failed') }
    finally { setConfirming(false) }
  }

  if (loading) return <div className="flex items-center justify-center h-32"><Loader2 size={20} className="animate-spin text-text-muted/30" /></div>
  if (!setup) return <p className="text-red-400 text-sm">Could not load OTP setup.</p>

  return (
    <div className="max-w-sm mx-auto space-y-5">
      <div>
        <h2 className="text-text-primary text-base font-bold flex items-center gap-2"><KeyRound size={16} /> Enable 2FA</h2>
        <p className="text-text-muted/70 text-xs mt-1.5 leading-relaxed">
          Admins must enable two-factor authentication. Scan the QR code with your authenticator app.
        </p>
      </div>
      {setup.qr_code && (
        <div className="bg-white p-4 rounded-2xl flex items-center justify-center w-fit mx-auto">
          <img src={setup.qr_code} alt="OTP QR code" className="w-40 h-40" />
        </div>
      )}
      {setup.otp_secret && (
        <div>
          <p className="text-text-muted/50 text-[10px] mb-1.5">Manual entry:</p>
          <code className="block bg-surface-overlay border border-[var(--border)] rounded-xl px-3 py-2.5 text-text-primary text-xs font-mono break-all">{setup.otp_secret}</code>
        </div>
      )}
      <div>
        <label className="block text-xs font-semibold text-text-muted/60 mb-1.5">Verification code</label>
        <input type="text" inputMode="numeric" value={code}
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
      <button onClick={confirm} disabled={confirming || !code}
        className="w-full py-2.5 rounded-xl bg-accent text-[var(--bg)] text-sm font-semibold transition-all hover:opacity-90 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-40">
        {confirming && <Loader2 size={14} className="animate-spin" />}
        Verify & enable
      </button>
    </div>
  )
}
