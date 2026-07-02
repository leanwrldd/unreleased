import { useState } from 'react'
import { Layers, ChevronDown, Loader2 } from 'lucide-react'
import { getVersionGroup } from '../lib/versionsApi'
import { apiFetch, JWApiSong } from '../lib/juicewrldApi'

interface Props {
  songId: number
  onChangeVersion: (song: JWApiSong) => void
}

/** "Change version" menu item — dropped into every song context menu in the
 *  app (see ApiTrackerView, LikedSongsView, PlaylistsView, Player, WrldView).
 *  Self-contained (owns its own expand/collapse + fetch state) so it plugs
 *  into any existing menu without touching that menu's own state shape.
 *  Siblings are fetched lazily on first expand rather than eagerly whenever
 *  the parent menu opens — doing that for every song regardless of whether
 *  the user ever clicks this item is exactly the kind of needless-fetch
 *  pattern that made compact view laggy before. */
export default function ChangeVersionMenuItem({ songId, onChangeVersion }: Props): JSX.Element {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [versions, setVersions] = useState<{ song: JWApiSong; label: string | null }[] | null>(null)

  const toggle = async (): Promise<void> => {
    if (expanded) { setExpanded(false); return }
    setExpanded(true)
    if (versions != null) return
    setLoading(true)
    try {
      const metas = await getVersionGroup(songId)
      const fetched = await Promise.all(metas.map(m =>
        apiFetch<JWApiSong>(`/songs/${m.songId}/`)
          .then(song => ({
            song,
            label: m.version
              ? (m.versionTitle ? `${m.version} — ${m.versionTitle}` : m.version)
              : m.versionTitle,
          }))
          .catch(() => null)
      ))
      setVersions(fetched.filter((v): v is { song: JWApiSong; label: string | null } => !!v))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); toggle() }}
        className="w-full flex items-center justify-between gap-2.5 px-3 py-2 text-sm text-left text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors"
      >
        <span className="flex items-center gap-2.5"><Layers size={14} /> Change version</span>
        <ChevronDown size={12} className={`text-text-muted transition-transform shrink-0 ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && (
        <div className="border-t border-[var(--border)] max-h-40 overflow-y-auto">
          {loading ? (
            <p className="px-3.5 py-2 text-xs text-text-muted flex items-center gap-1.5">
              <Loader2 size={12} className="animate-spin" /> Loading…
            </p>
          ) : !versions || versions.length === 0 ? (
            <p className="px-3.5 py-2 text-xs text-text-muted">No other versions linked.</p>
          ) : (
            versions.map(({ song, label }) => (
              <button
                key={song.id}
                onClick={(e) => { e.stopPropagation(); onChangeVersion(song) }}
                className="w-full text-left px-3.5 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-overlay transition-colors truncate block"
              >
                {song.track_titles?.[0] || song.name}
                {label && <span className="text-text-muted text-xs"> — {label}</span>}
              </button>
            ))
          )}
        </div>
      )}
    </>
  )
}
