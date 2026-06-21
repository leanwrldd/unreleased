import { useEffect, useState, useMemo } from 'react'
import { Loader2, Trophy, FileEdit, ChevronLeft } from 'lucide-react'
import { useStore } from '../store/useStore'
import { getMyProposals, getLeaderboard, SongEditProposal, ProposalStatus } from '../lib/userApi'

type LeaderboardEntry = {
  rank: number
  user_id: number
  username: string
  discord_username: string
  discord_avatar: string
  approved_count: number
  badges: Array<{ slug: string; name: string; icon: string; description: string; category: string; note: string; awarded_at: string; awarded_by_username: string | null }>
}

const STATUS_STYLES: Record<ProposalStatus, { label: string; bar: string; badge: string }> = {
  pending:  { label: 'Pending',  bar: 'bg-yellow-400',  badge: 'bg-yellow-500/15 text-yellow-400' },
  approved: { label: 'Approved', bar: 'bg-green-400',   badge: 'bg-green-500/15 text-green-400' },
  rejected: { label: 'Rejected', bar: 'bg-red-400',     badge: 'bg-red-500/15 text-red-400' },
  reversed: { label: 'Reversed', bar: 'bg-surface-overlay', badge: 'bg-surface-overlay text-text-muted' },
}

const RANK_STYLES: Record<number, { num: string; badge: string }> = {
  1: { num: 'text-yellow-400 font-black', badge: 'bg-yellow-500/15 ring-1 ring-yellow-500/30' },
  2: { num: 'text-slate-300 font-black',  badge: 'bg-slate-500/15 ring-1 ring-slate-400/30' },
  3: { num: 'text-amber-600 font-black',  badge: 'bg-amber-700/15 ring-1 ring-amber-600/30' },
}

type FilterTab = 'all' | ProposalStatus

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function changeTypeLabel(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export default function EditorProfileView(): JSX.Element {
  const { account, setActiveView } = useStore()

  const [proposals, setProposals] = useState<SongEditProposal[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loadingProposals, setLoadingProposals] = useState(true)
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true)
  const [filter, setFilter] = useState<FilterTab>('all')

  useEffect(() => {
    getMyProposals()
      .then(setProposals)
      .catch(() => {})
      .finally(() => setLoadingProposals(false))

    getLeaderboard()
      .then((data) => setLeaderboard(data as LeaderboardEntry[]))
      .catch(() => {})
      .finally(() => setLoadingLeaderboard(false))
  }, [])

  const myEntry = leaderboard.find((e) => e.discord_username === account?.discord_username)

  const filteredProposals = useMemo(() => {
    if (filter === 'all') return proposals
    return proposals.filter(p => p.status === filter)
  }, [proposals, filter])

  const TABS: { key: FilterTab; label: string }[] = [
    { key: 'all',      label: 'All' },
    { key: 'pending',  label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
  ]

  const tabCount = (tab: FilterTab) => tab === 'all' ? proposals.length : proposals.filter(p => p.status === tab).length

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

      {/* ── Header ── */}
      <div className="px-6 pt-5 pb-4 border-b border-[var(--border)] shrink-0">
        <button
          onClick={() => setActiveView('api-tracker')}
          className="flex items-center gap-1.5 text-text-muted hover:text-text-primary text-xs mb-3 transition-colors"
        >
          <ChevronLeft size={14} /> Back
        </button>

        <div className="flex items-center gap-3.5">
          {account?.discord_avatar ? (
            <img src={account.discord_avatar} alt="" className="w-12 h-12 rounded-full object-cover shrink-0 ring-2 ring-[var(--border)]" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-accent/20 text-accent flex items-center justify-center text-lg font-bold shrink-0">
              {(account?.display_name || account?.discord_username || '?').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-text-primary text-lg font-bold truncate">
                {account?.display_name || account?.discord_username || 'My Profile'}
              </h1>
              {account?.is_administrator && (
                <span className="px-1.5 py-0.5 rounded bg-accent/15 text-accent text-[10px] font-semibold uppercase tracking-wide shrink-0">Admin</span>
              )}
              {account?.is_editor && !account.is_administrator && (
                <span className="px-1.5 py-0.5 rounded bg-surface-overlay text-text-secondary text-[10px] font-semibold uppercase tracking-wide shrink-0">Editor</span>
              )}
            </div>
            {myEntry && (
              <p className="text-text-muted text-xs mt-0.5 flex items-center gap-1.5">
                <Trophy size={10} className="text-accent" />
                Rank #{myEntry.rank} · {myEntry.approved_count} approved
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Body: side by side ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Left: My Proposals ── */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden border-r border-[var(--border)]">
          {/* Section header */}
          <div className="px-5 pt-4 pb-3 shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <FileEdit size={13} className="text-text-muted" />
              <h2 className="text-text-secondary text-xs font-semibold uppercase tracking-widest">My Proposals</h2>
              {!loadingProposals && (
                <span className="ml-auto text-text-muted text-xs">{proposals.length} total</span>
              )}
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1">
              {TABS.map(({ key, label }) => {
                const count = tabCount(key)
                const active = filter === key
                return (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                      active ? 'bg-accent/15 text-accent' : 'text-text-muted hover:text-text-primary hover:bg-surface-overlay'
                    }`}
                  >
                    {label}
                    {count > 0 && (
                      <span className={`text-[10px] tabular-nums ${active ? 'text-accent/70' : 'text-text-muted'}`}>
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Proposals list */}
          <div className="flex-1 overflow-y-auto min-h-0 px-3 pb-6">
            {loadingProposals ? (
              <div className="flex justify-center py-12">
                <Loader2 size={18} className="animate-spin text-text-muted" />
              </div>
            ) : filteredProposals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-text-muted opacity-50">
                <FileEdit size={28} />
                <p className="text-sm">{filter === 'all' ? 'No proposals yet' : `No ${filter} proposals`}</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredProposals.map((p) => {
                  const s = STATUS_STYLES[p.status]
                  return (
                    <div key={p.id} className="flex items-stretch gap-0 rounded-lg overflow-hidden hover:bg-surface-overlay transition-colors group">
                      {/* Status bar */}
                      <div className={`w-0.5 shrink-0 ${s.bar}`} />
                      <div className="flex items-center gap-3 px-3 py-2.5 flex-1 min-w-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-text-primary text-sm font-medium truncate">{p.title || `Song #${p.song}`}</p>
                          <p className="text-text-muted text-xs mt-0.5">{changeTypeLabel(p.change_type)} · {formatDate(p.created_at)}</p>
                        </div>
                        <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium ${s.badge}`}>
                          {s.label}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Leaderboard ── */}
        <div className="w-80 flex flex-col min-h-0 overflow-hidden shrink-0">
          <div className="px-5 pt-4 pb-3 shrink-0 flex items-center gap-2">
            <Trophy size={13} className="text-text-muted" />
            <h2 className="text-text-secondary text-xs font-semibold uppercase tracking-widest">Leaderboard</h2>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 px-3 pb-6">
            {loadingLeaderboard ? (
              <div className="flex justify-center py-12">
                <Loader2 size={18} className="animate-spin text-text-muted" />
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-text-muted opacity-50">
                <Trophy size={28} />
                <p className="text-sm">No data</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {leaderboard.map((entry) => {
                  const isMe = entry.discord_username === account?.discord_username
                  const rankStyle = RANK_STYLES[entry.rank]
                  return (
                    <div
                      key={entry.user_id}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                        isMe ? 'bg-accent/8 ring-1 ring-accent/20' : 'hover:bg-surface-overlay'
                      }`}
                    >
                      {/* Rank */}
                      <span className={`w-5 shrink-0 flex items-center justify-center`}>
                        <span className={`text-xs tabular-nums rounded-md px-1 py-0.5 ${
                          rankStyle ? `${rankStyle.num} ${rankStyle.badge}` : 'text-text-muted font-medium'
                        }`}>
                          {entry.rank}
                        </span>
                      </span>

                      {/* Avatar */}
                      {entry.discord_avatar ? (
                        <img src={entry.discord_avatar} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-surface-raised flex items-center justify-center text-xs text-text-muted shrink-0">
                          {(entry.discord_username || '?').charAt(0).toUpperCase()}
                        </div>
                      )}

                      {/* Name */}
                      <p className={`flex-1 min-w-0 text-sm truncate ${isMe ? 'text-accent font-semibold' : 'text-text-primary'}`}>
                        {entry.username || entry.discord_username}
                        {isMe && <span className="ml-1.5 text-xs opacity-60 font-normal">you</span>}
                      </p>

                      {/* Approved count */}
                      <span className={`text-xs tabular-nums shrink-0 font-semibold ${isMe ? 'text-accent' : rankStyle ? 'text-text-secondary' : 'text-text-muted'}`}>
                        {entry.approved_count}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
