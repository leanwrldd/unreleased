import { useState, useEffect, useCallback } from 'react'
import { Play, SkipForward, Loader2, Radio, Info, Download, ListPlus } from 'lucide-react'
import { useStore } from '../store/useStore'
import { apiFetch, songToTrack, parseDuration, buildStreamUrl, CATEGORY_LABELS, JWApiSong, JWApiPaginatedResponse } from '../lib/juicewrldApi'
import SongInfoModal from './SongInfoModal'

const PLAYABLE = ['released', 'unreleased'] as const
const QUEUE_SIZE = 14

function formatDur(secs: number): string {
  if (!secs) return '--:--'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

async function buildRandomQueue(): Promise<JWApiSong[]> {
  // Fetch total counts for each playable category
  const countResults = await Promise.all(
    PLAYABLE.map((cat) => apiFetch<JWApiPaginatedResponse>('/songs/', { category: cat, page_size: 1 }))
  )
  const totals = countResults.map((r) => r.count)

  // Pick QUEUE_SIZE random (category, offset) pairs
  const fetches: Promise<JWApiSong | null>[] = []
  for (let i = 0; i < QUEUE_SIZE; i++) {
    const catIdx = Math.floor(Math.random() * PLAYABLE.length)
    const category = PLAYABLE[catIdx]
    const total = totals[catIdx]
    if (total === 0) continue
    const offset = Math.floor(Math.random() * total)
    fetches.push(
      apiFetch<JWApiPaginatedResponse>('/songs/', { category, page_size: 1, offset })
        .then((r) => r.results[0] ?? null)
        .catch(() => null)
    )
  }

  const results = await Promise.all(fetches)
  const songs = results.filter((s): s is JWApiSong => !!s && !!s.path)
  return shuffle(songs)
}

export default function ApiRadioView(): JSX.Element {
  const { playTrack, addToQueue, currentTrack, isPlaying, account, setActiveView, setPendingEditorSongId } = useStore()
  const canEdit = !!(account?.is_editor || account?.is_administrator)

  const [queue, setQueue] = useState<JWApiSong[]>([])
  const [song, setSong] = useState<JWApiSong | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasPlayed, setHasPlayed] = useState(false)
  const [infoSong, setInfoSong] = useState<JWApiSong | null>(null)

  const loadQueue = useCallback(async (autoPlay = false): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const songs = await buildRandomQueue()
      if (!songs.length) throw new Error('No playable songs found')
      setQueue(songs)
      setSong(songs[0])
      if (autoPlay) {
        const tracks = songs.map(songToTrack)
        playTrack(tracks[0], tracks)
        setHasPlayed(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch')
    } finally {
      setLoading(false)
    }
  }, [playTrack])

  // Load queue on mount (no auto-play)
  useEffect(() => { loadQueue(false) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePlay = useCallback((): void => {
    if (!song) return
    const tracks = queue.map(songToTrack)
    const idx = Math.max(0, queue.findIndex((s) => s.id === song.id))
    playTrack(tracks[idx] ?? tracks[0], tracks)
    setHasPlayed(true)
  }, [song, queue, playTrack])

  const handleSkip = useCallback((): void => {
    // Rebuild queue and auto-play if we've already started
    loadQueue(hasPlayed)
  }, [loadQueue, hasPlayed])

  const handleAddToQueue = useCallback((): void => {
    if (!song) return
    addToQueue(songToTrack(song))
  }, [song, addToQueue])

  const handleDownload = useCallback((): void => {
    if (!song?.path) return
    const url = buildStreamUrl(song.path)
    const a = document.createElement('a')
    a.href = url
    a.download = (song.track_titles?.[0] || song.name) + '.mp3'
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }, [song])

  const track = song ? songToTrack(song) : null
  const isCurrentlyPlaying = track && currentTrack?.id === track.id && isPlaying

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 gap-8">
      {/* Icon */}
      <div className="text-text-muted opacity-30">
        <Radio size={32} />
      </div>

      {/* Cover art */}
      <div className="relative w-56 h-56 rounded-2xl overflow-hidden bg-surface-overlay shadow-2xl">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center">
            <Loader2 size={32} className="text-text-muted animate-spin" />
          </div>
        ) : track ? (
          <div className="w-full h-full">
            {track.imageUrl ? (
              <img src={track.imageUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Radio size={56} className="text-text-muted opacity-20" />
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Song info */}
      <div className="text-center max-w-sm">
        {error ? (
          <p className="text-red-400 text-sm">{error}</p>
        ) : song ? (
          <>
            <h2 className="text-text-primary text-xl font-bold mb-1 truncate">
              {song.track_titles?.[0] || song.name}
            </h2>
            {song.track_titles?.length > 1 && (
              <p className="text-text-muted text-xs mb-1 truncate">
                aka {song.track_titles.slice(1).join(' · ')}
              </p>
            )}
            <p className="text-text-muted text-sm mb-1">{song.credited_artists || 'Juice WRLD'}</p>
            <div className="flex items-center justify-center gap-2 flex-wrap mt-2">
              {song.era && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-surface-overlay text-text-muted">
                  {song.era.name}
                </span>
              )}
              <span className="text-xs px-2 py-0.5 rounded-full bg-surface-overlay text-text-muted">
                {CATEGORY_LABELS[song.category] ?? song.category}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-surface-overlay text-text-muted">
                {formatDur(parseDuration(song.length))}
              </span>
            </div>
          </>
        ) : !loading ? (
          <p className="text-text-muted text-sm">Press play to start radio</p>
        ) : null}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        {/* Info */}
        {song && (
          <button
            onClick={() => setInfoSong(song)}
            className="w-9 h-9 rounded-full bg-surface-overlay flex items-center justify-center hover:bg-surface-raised transition-colors"
            title="Song info"
          >
            <Info size={16} className="text-text-muted" />
          </button>
        )}

        {/* Play current */}
        <button
          disabled={!track || loading}
          onClick={handlePlay}
          className="w-14 h-14 rounded-full bg-accent flex items-center justify-center shadow-lg disabled:opacity-40 hover:opacity-90 transition-opacity"
          title={isCurrentlyPlaying ? 'Now playing' : 'Play'}
        >
          {isCurrentlyPlaying ? (
            <div className="flex gap-0.5 items-end h-4">
              <div className="w-1 bg-black rounded-full animate-bounce" style={{ height: '60%', animationDelay: '0ms' }} />
              <div className="w-1 bg-black rounded-full animate-bounce" style={{ height: '100%', animationDelay: '150ms' }} />
              <div className="w-1 bg-black rounded-full animate-bounce" style={{ height: '70%', animationDelay: '300ms' }} />
            </div>
          ) : (
            <Play size={22} fill="black" className="text-black ml-1" />
          )}
        </button>

        {/* Skip to next random queue */}
        <button
          disabled={loading}
          onClick={handleSkip}
          className="w-11 h-11 rounded-full bg-surface-overlay flex items-center justify-center hover:bg-surface-raised disabled:opacity-40 transition-colors"
          title="New random queue"
        >
          {loading ? (
            <Loader2 size={18} className="text-text-muted animate-spin" />
          ) : (
            <SkipForward size={18} className="text-text-muted" />
          )}
        </button>

        {/* Add to queue */}
        {song?.path && (
          <button
            onClick={handleAddToQueue}
            className="w-9 h-9 rounded-full bg-surface-overlay flex items-center justify-center hover:bg-surface-raised transition-colors"
            title="Add to queue"
          >
            <ListPlus size={16} className="text-text-muted" />
          </button>
        )}

        {/* Download */}
        {song?.path && (
          <button
            onClick={handleDownload}
            className="w-9 h-9 rounded-full bg-surface-overlay flex items-center justify-center hover:bg-surface-raised transition-colors"
            title="Download"
          >
            <Download size={16} className="text-text-muted" />
          </button>
        )}
      </div>

      {/* Producer info */}
      {song?.producers && (
        <p className="text-text-muted text-xs opacity-60">Produced by {song.producers}</p>
      )}

      {/* Queue hint */}
      {queue.length > 1 && (
        <p className="text-text-muted text-xs opacity-40">{queue.length} songs in queue</p>
      )}

      <SongInfoModal
        song={infoSong}
        onClose={() => setInfoSong(null)}
        onEdit={canEdit ? (songId) => { setInfoSong(null); setPendingEditorSongId(songId); setActiveView('editor') } : undefined}
      />
    </div>
  )
}
