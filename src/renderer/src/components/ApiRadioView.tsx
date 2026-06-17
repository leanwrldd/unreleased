import { useState, useEffect, useCallback } from 'react'
import { Play, SkipForward, Loader2, Radio } from 'lucide-react'
import { useStore } from '../store/useStore'
import { apiFetch, songToTrack, parseDuration, CATEGORY_LABELS, JWApiRadioResponse } from '../lib/juicewrldApi'

function formatDur(secs: number): string {
  if (!secs) return '--:--'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function ApiRadioView(): JSX.Element {
  const { playTrack, currentTrack, isPlaying } = useStore()

  const [radio, setRadio] = useState<JWApiRadioResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasPlayed, setHasPlayed] = useState(false)

  const fetchRandom = useCallback(async (autoPlay = false): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      // Retry until we get a non-session song (max 10 attempts)
      let data: JWApiRadioResponse | null = null
      for (let i = 0; i < 10; i++) {
        const candidate = await apiFetch<JWApiRadioResponse>('/radio/random/')
        if (candidate.song.category !== 'recording_session') {
          data = candidate
          break
        }
      }
      if (!data) data = await apiFetch<JWApiRadioResponse>('/radio/random/')
      setRadio(data)
      if (autoPlay) {
        const track = songToTrack(data.song)
        playTrack(track, [track])
        setHasPlayed(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch')
    } finally {
      setLoading(false)
    }
  }, [playTrack])

  // Load first song on mount (don't auto-play)
  useEffect(() => { fetchRandom(false) }, [])

  const handlePlay = useCallback((): void => {
    if (!radio) return
    const track = songToTrack(radio.song)
    playTrack(track, [track])
    setHasPlayed(true)
  }, [radio, playTrack])

  const handleSkip = useCallback((): void => {
    fetchRandom(hasPlayed)
  }, [fetchRandom, hasPlayed])

  const song = radio?.song
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
              <img
                src={track.imageUrl}
                alt=""
                className="w-full h-full object-cover"
              />
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

        {/* Skip to next random */}
        <button
          disabled={loading}
          onClick={handleSkip}
          className="w-11 h-11 rounded-full bg-surface-overlay flex items-center justify-center hover:bg-surface-raised disabled:opacity-40 transition-colors"
          title="Skip to random song"
        >
          {loading ? (
            <Loader2 size={18} className="text-text-muted animate-spin" />
          ) : (
            <SkipForward size={18} className="text-text-muted" />
          )}
        </button>
      </div>

      {/* Producer info */}
      {song?.producers && (
        <p className="text-text-muted text-xs opacity-60">Produced by {song.producers}</p>
      )}
    </div>
  )
}
