import { useEffect, useState } from 'react'
import { Play, Loader2, Music2, Share2, Download } from 'lucide-react'
import { useStore } from '../store/useStore'
import { apiFetch, buildStreamUrl, buildCoverArtUrl, JWAPI_BASE } from '../lib/juicewrldApi'
import { Track } from '../types'

interface SharedPlaylistData {
  share_id?: string
  paths?: string[]
  items?: Array<{ path: string; [key: string]: unknown }>
}

function pathToTrack(path: string): Track {
  return {
    id: `shared-${path}`,
    path,
    streamUrl: buildStreamUrl(path),
    imageUrl: buildCoverArtUrl(path),
    title: path.split('/').pop()?.replace(/\.[^.]+$/, '') ?? path,
    artist: 'Juice WRLD',
    album: 'Shared Playlist',
    albumArtist: 'Juice WRLD',
    year: null,
    trackNumber: null,
    duration: 0,
    genre: '',
    hasAlbumArt: true,
  }
}

export default function SharedPlaylistView(): JSX.Element {
  const { playTrack } = useStore()
  const shareId = window.location.pathname.split('/shared/')[1]?.split('/')[0] ?? ''

  const [tracks, setTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!shareId) { setError(true); setLoading(false); return }
    apiFetch<SharedPlaylistData>(`/playlists/shared/${shareId}/`)
      .then(data => {
        const paths: string[] = data.paths ?? data.items?.map(i => i.path as string) ?? []
        setTracks(paths.map(pathToTrack))
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [shareId])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-text-muted" />
      </div>
    )
  }

  if (error || !shareId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-text-muted">
        <Music2 size={40} className="opacity-20" />
        <p className="text-sm">Shared playlist not found or expired.</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto px-5 py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
          <Share2 size={28} className="text-accent" />
        </div>
        <div>
          <p className="text-text-muted text-xs uppercase tracking-widest font-semibold mb-1">Shared playlist</p>
          <h1 className="text-text-primary text-2xl font-bold">Shared Playlist</h1>
          <p className="text-text-muted text-sm">{tracks.length} tracks</p>
        </div>
      </div>

      {/* Play button */}
      {tracks.length > 0 && (
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => playTrack(tracks[0], tracks)}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-accent text-black text-sm font-bold hover:scale-105 active:scale-95 transition-transform shadow-lg"
          >
            <Play size={17} fill="currentColor" /> Play all
          </button>
        </div>
      )}

      {/* Track list */}
      <div className="space-y-0.5">
        {tracks.map((t, i) => (
          <div
            key={t.id}
            className="group flex items-center gap-3 px-3 py-2.5 hover:bg-surface-overlay rounded-lg cursor-pointer transition-colors"
            onClick={() => playTrack(t, tracks)}
          >
            <span className="text-text-muted text-xs w-6 text-right tabular-nums shrink-0">{i + 1}</span>
            <div className="relative w-9 h-9 rounded-lg overflow-hidden bg-surface-overlay shrink-0 flex items-center justify-center">
              {!imgErrors.has(t.id) && t.imageUrl ? (
                <img
                  src={t.imageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={() => setImgErrors(prev => new Set([...prev, t.id]))}
                />
              ) : (
                <Music2 size={14} className="text-text-muted opacity-40" />
              )}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Play size={12} fill="white" className="text-white ml-0.5" />
              </div>
            </div>
            <span className="text-text-primary text-sm flex-1 truncate">{t.title}</span>
            <a
              href={buildStreamUrl(t.path)}
              download={`${t.title}.mp3`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-raised transition-all hidden md:flex"
              title="Download"
            >
              <Download size={14} />
            </a>
          </div>
        ))}
      </div>

      {tracks.length === 0 && (
        <div className="flex flex-col items-center justify-center h-40 gap-2 text-text-muted">
          <Music2 size={40} className="opacity-20" />
          <p className="text-sm">This shared playlist is empty.</p>
        </div>
      )}
    </div>
  )
}
