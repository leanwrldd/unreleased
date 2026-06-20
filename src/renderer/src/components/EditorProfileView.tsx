import { useEffect, useState } from 'react'
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

const STATUS_STYLES: Record<ProposalStatus, { label: string; className: string }> = {
  pending:  { label: 'Pending',  className: 'bg-yellow-500/15 text-yellow-400' },
  approved: { label: 'Approved', className: 'bg-green-500/15 text-green-400' },
  rejected: { label: 'Rejected', className: 'bg-red-500/15 text-red-400' },
  reversed: { label: 'Reversed', className: 'bg-surface-overlay text-text-muted' },
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function changeTypeLabel(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1)
}

export default function EditorProfileView(): JSX.Element {
  const { account, setActiveView } = useStore()

  const [proposals, setProposals] = useState<SongEditProposal[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loadingProposals, setLoadingProposals] = useState(true)
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true)

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

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
      {/* Header */}
      <div className="px-6 pt-6 pb-5 border-b border-[var(--border)] shrink-0">
        <button
          onClick={() => setActiveView('api-tracker')}
          className="flex items-center gap-1.5 text-text-muted hover:text-text-primary text-xs mb-4 transition-colors"
        >
          <ChevronLeft size={14} />
          Back
        </button>
        <div className="flex items-center gap-4">
          {account?.discord_avatar ? (
            <img src={account.discord_avatar} alt="" className="w-14 h-14 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xl font-bold shrink-0">
              {(account?.display_name || account?.discord_username || '?').charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-text-primary text-xl font-bold">
              {account?.display_name || account?.discord_username || 'My Profile'}
            </h1>
            <div className="flex items-center gap-3 mt-1 text-text-muted text-xs">
              {myEntry && (
                <span className="flex items-center gap-1">
                  <Trophy size={11} className="text-accent" />
                  #{myEntry.rank} · {myEntry.approved_count} approved
                </span>
              )}
              {(account?.is_administrator) && (
                <span className="px-1.5 py-0.5 rounded bg-accent/15 text-accent text-[10px] font-semibold uppercase tracking-wide">Admin</span>
              )}
              {account?.is_editor && !account.is_administrator && (
                <span className="px-1.5 py-0.5 rounded bg-surface-overlay text-text-secondary text-[10px] font-semibold uppercase tracking-wide">Editor</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 px-6 py-5 space-y-8">
        {/* My Proposals */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <FileEdit size={15} className="text-text-muted" />
            <h2 className="text-text-secondary text-xs font-semibold uppercase tracking-widest">My Proposals</h2>
            {!loadingProposals && (
              <span className="ml-auto text-text-muted text-xs">{proposals.length} total</span>
            )}
          </div>

          {loadingProposals ? (
            <div className="flex justify-center py-8">
              <Loader2 size={20} className="animate-spin text-text-muted" />
            </div>
          ) : proposals.length === 0 ? (
            <p className="text-text-muted text-sm text-center py-8 opacity-50">No proposals yet</p>
          ) : (
            <div className="space-y-1">
              {proposals.map((p) => {
                const status = STATUS_STYLES[p.status]
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-overlay transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-text-primary text-sm truncate">{p.title || `Song #${p.song}`}</p>
                      <p className="text-text-muted text-xs">{changeTypeLabel(p.change_type)} · {formatDate(p.created_at)}</p>
                    </div>
                    <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium ${status.className}`}>
                      {status.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Leaderboard */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Trophy size={15} className="text-text-muted" />
            <h2 className="text-text-secondary text-xs font-semibold uppercase tracking-widest">Leaderboard</h2>
          </div>

          {loadingLeaderboard ? (
            <div className="flex justify-center py-8">
              <Loader2 size={20} className="animate-spin text-text-muted" />
            </div>
          ) : leaderboard.length === 0 ? (
            <p className="text-text-muted text-sm text-center py-8 opacity-50">No data</p>
          ) : (
            <div className="space-y-1">
              {leaderboard.map((entry) => {
                const isMe = entry.discord_username === account?.discord_username
                return (
                  <div
                    key={entry.user_id}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                      isMe ? 'bg-accent/8 ring-1 ring-accent/20' : 'hover:bg-surface-overlay'
                    }`}
                  >
                    {/* Rank */}
                    <span
                      className={`text-xs font-bold w-6 text-right shrink-0 tabular-nums ${
                        entry.rank === 1 ? 'text-yellow-400' : entry.rank === 2 ? 'text-slate-300' : entry.rank === 3 ? 'text-amber-600' : 'text-text-muted'
                      }`}
                    >
                      {entry.rank}
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
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${isMe ? 'text-accent font-semibold' : 'text-text-primary'}`}>
                        {entry.username || entry.discord_username}
                        {isMe && <span className="ml-1.5 text-[10px] font-normal opacity-70">you</span>}
                      </p>
                    </div>

                    {/* Badges */}
                    {entry.badges.length > 0 && (
                      <div className="flex items-center gap-0.5 shrink-0">
                        {entry.badges.slice(0, 4).map((b) => (
                          <span key={b.slug} title={b.name} className="text-sm leading-none">
                            {b.icon}
                          </span>
                        ))}
                        {entry.badges.length > 4 && (
                          <span className="text-text-muted text-[10px] ml-0.5">+{entry.badges.length - 4}</span>
                        )}
                      </div>
                    )}

                    {/* Approved count */}
                    <span className="text-text-muted text-xs tabular-nums shrink-0 w-14 text-right">
                      {entry.approved_count} <span className="opacity-60">approved</span>
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
