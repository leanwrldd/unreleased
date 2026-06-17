import { useMemo } from 'react'
import { Play, ListMusic } from 'lucide-react'
import { useStore } from '../store/useStore'
import { AlbumArtThumbnail } from './AlbumArtThumbnail'
import { formatDuration } from '../lib/lyrics'
import { Playlist } from '../types'

type PlaylistSort = 'name' | 'date' | 'manual'

function sortPlaylists(playlists: Playlist[], sort: PlaylistSort): Playlist[] {
  if (sort === 'name') return [...playlists].sort((a, b) => a.name.localeCompare(b.name))
  if (sort === 'date') return [...playlists].sort((a, b) => b.createdAt - a.createdAt)
  return playlists
}

const SORT_OPTIONS: { value: PlaylistSort; label: string }[] = [
  { value: 'manual', label: 'Custom' },
  { value: 'name', label: 'Name' },
  { value: 'date', label: 'Date' },
]

export default function PlaylistsView(): JSX.Element {
  const { playlists, library, setActiveView, setActivePlaylistId, playTrack, playlistSort, setPlaylistSort } = useStore()

  const sorted = useMemo(() => sortPlaylists(playlists, playlistSort as PlaylistSort), [playlists, playlistSort])

  // Build a map of playlistId → cover track (first track in library that exists in the playlist)
  const coverTracks = useMemo(() => {
    const map = new Map<string, import('../types').Track>()
    for (const pl of sorted) {
      for (const tid of pl.trackIds) {
        const t = library.find((lt) => lt.id === tid)
        if (t) { map.set(pl.id, t); break }
      }
    }
    return map
  }, [sorted, library])

  const getDuration = (pl: typeof playlists[0]): number => {
    return pl.trackIds.reduce((acc, tid) => {
      const t = library.find((lt) => lt.id === tid)
      return acc + (t?.duration ?? 0)
    }, 0)
  }

  const handlePlay = (pl: typeof playlists[0]): void => {
    const tracks = pl.trackIds
      .map((tid) => library.find((t) => t.id === tid))
      .filter(Boolean) as import('../types').Track[]
    if (tracks.length > 0) playTrack(tracks[0], tracks)
  }

  if (playlists.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
        <div className="w-20 h-20 rounded-full bg-surface-overlay flex items-center justify-center">
          <ListMusic className="text-text-muted w-10 h-10 opacity-40" />
        </div>
        <p className="text-text-primary text-lg font-semibold">No playlists yet</p>
        <p className="text-text-muted text-sm max-w-xs">Create a playlist from the sidebar to get started.</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="px-4 py-4 shrink-0 flex items-end justify-between">
        <div>
          <h1 className="text-text-primary text-xl font-bold">Playlists</h1>
          <p className="text-text-muted text-sm mt-0.5">{playlists.length} playlist{playlists.length !== 1 ? 's' : ''}</p>
        </div>
        {/* Sort buttons */}
        <div className="flex items-center gap-1 bg-surface-raised rounded-lg p-0.5">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPlaylistSort(opt.value)}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                playlistSort === opt.value
                  ? 'bg-surface-overlay text-text-primary'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto p-4"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px', alignContent: 'start' }}
      >
        {sorted.map((pl) => {
          const cover = coverTracks.get(pl.id)
          const total = getDuration(pl)
          return (
            <div
              key={pl.id}
              className="group cursor-pointer"
              onClick={() => { setActivePlaylistId(pl.id); setActiveView('playlist') }}
            >
              {/* Cover art */}
              <div className="relative aspect-square rounded-lg overflow-hidden bg-surface-overlay mb-2">
                {cover ? (
                  <AlbumArtThumbnail track={cover} size={0} className="w-full h-full" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ListMusic size={36} className="text-text-muted opacity-30" />
                  </div>
                )}
                <button
                  className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => { e.stopPropagation(); handlePlay(pl) }}
                >
                  <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center shadow-lg">
                    <Play size={18} fill="black" className="text-black ml-0.5" />
                  </div>
                </button>
              </div>
              <p className="text-text-primary text-sm font-medium truncate">{pl.name}</p>
              <p className="text-text-muted text-xs">
                {pl.trackIds.length} track{pl.trackIds.length !== 1 ? 's' : ''}
                {total > 0 ? ` · ${formatDuration(total)}` : ''}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
