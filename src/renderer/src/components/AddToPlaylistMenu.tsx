import { useEffect, useRef, useState } from 'react'
import { Plus, Check, Loader2, ListMusic } from 'lucide-react'
import { useStore } from '../store/useStore'
import * as userApi from '../lib/userApi'

interface Props {
  songId: number
  onClose: () => void
  onAdded?: () => void
  placement?: 'top' | 'bottom'
  /** Override the outer positioning class — use when rendering inside a portal */
  anchorClass?: string
}

export default function AddToPlaylistMenu({ songId, onClose, onAdded, placement = 'bottom', anchorClass }: Props): JSX.Element {
  const { playlists, account, refreshPlaylists, setShowUserAuth } = useStore()
  const verticalClass = placement === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
  const posClass = anchorClass ?? `absolute right-0 ${verticalClass} z-50`
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [busyId, setBusyId] = useState<number | 'new' | null>(null)
  const [doneId, setDoneId] = useState<number | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDown = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [onClose])

  if (!account) {
    return (
      <div ref={ref} className={`${posClass} w-56 bg-surface border border-[var(--border)] rounded-xl shadow-2xl p-3`}>
        <p className="text-xs text-text-muted mb-2">Log in to save tracks to playlists.</p>
        <button
          onClick={() => { onClose(); setShowUserAuth(true) }}
          className="w-full py-2 rounded-lg bg-accent/15 hover:bg-accent/25 text-accent text-xs font-semibold transition-colors"
        >
          Log in
        </button>
      </div>
    )
  }

  const addTo = async (playlistId: number): Promise<void> => {
    setBusyId(playlistId)
    try {
      await userApi.addToPlaylist(playlistId, songId)
      setDoneId(playlistId)
      await refreshPlaylists()
      onAdded?.()
    } catch {} finally {
      setBusyId(null)
    }
  }

  const createAndAdd = async (): Promise<void> => {
    const name = newName.trim()
    if (!name) return
    setBusyId('new')
    try {
      const playlist = await userApi.createPlaylist(name)
      await userApi.addToPlaylist(playlist.id, songId)
      await refreshPlaylists()
      onAdded?.()
      onClose()
    } catch {} finally {
      setBusyId(null)
    }
  }

  return (
    <div ref={ref} className={`${posClass} w-60 bg-surface border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden`}>
      <div className="px-3 py-2 border-b border-[var(--border)] text-[11px] uppercase tracking-wider text-text-muted font-semibold">
        Add to playlist
      </div>
      <div className="max-h-56 overflow-y-auto py-1">
        {playlists.length === 0 && (
          <p className="px-3 py-2 text-xs text-text-muted">No playlists yet.</p>
        )}
        {playlists.map((p) => (
          <button
            key={p.id}
            onClick={() => addTo(p.id)}
            disabled={busyId === p.id}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors"
          >
            <ListMusic size={14} className="shrink-0 text-text-muted" />
            <span className="flex-1 truncate">{p.name}</span>
            {busyId === p.id ? <Loader2 size={13} className="animate-spin" /> : doneId === p.id ? <Check size={14} className="text-accent" /> : null}
          </button>
        ))}
      </div>
      <div className="border-t border-[var(--border)] p-2">
        {creating ? (
          <div className="flex items-center gap-1.5">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createAndAdd()}
              placeholder="Playlist name"
              autoFocus
              className="flex-1 min-w-0 bg-surface-overlay border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent/50"
            />
            <button
              onClick={createAndAdd}
              disabled={busyId === 'new'}
              className="shrink-0 p-1.5 rounded-lg bg-accent/15 hover:bg-accent/25 text-accent transition-colors"
            >
              {busyId === 'new' ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-accent hover:bg-surface-raised rounded-lg transition-colors"
          >
            <Plus size={14} /> New playlist
          </button>
        )}
      </div>
    </div>
  )
}
