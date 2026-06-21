import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Headphones, Radio, Mic, Play, Square, SkipForward, ListPlus, Check, X,
  Loader2, Volume2, ChevronDown,
} from 'lucide-react'
import { fetchRadioLive, RadioLiveState, RadioVote } from '../lib/radioLive'
import { fetchRadioLibrary, RadioLibrary } from '../lib/radioLibrary'
import { RadioStreamClient } from '../lib/radioSocketService'

const DEFAULT_LIVE: RadioLiveState = {
  is_live: false,
  station: '999 FM',
  state: 'offline',
  stream_url: '',
  now_playing: null,
  up_next: null,
  queue_preview: [],
  vote: { active: false },
}

const STATE_LABELS: Record<string, string> = {
  playing: 'Now Playing',
  dj_talking: 'DJ on the mic',
  paused: 'Paused',
  preparing: 'Up next',
  idle: 'Standing by',
  offline: 'Offline',
}

function formatTime(ms: number | undefined): string {
  if (ms === undefined || ms === null) return '0:00'
  const total = Math.floor(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function RadioFmView(): JSX.Element {
  const audioRef = useRef<HTMLAudioElement>(null)
  const clientRef = useRef<RadioStreamClient | null>(null)
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const tickTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastVoteKeyRef = useRef('')
  const wsOpenRef = useRef(false)

  const [live, setLive] = useState<RadioLiveState>(DEFAULT_LIVE)
  const liveRef = useRef(live)
  liveRef.current = live
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioLoading, setAudioLoading] = useState(false)
  const [volume, setVolume] = useState(80)
  const [displayElapsed, setDisplayElapsed] = useState(0)
  const [voteSecondsLeft, setVoteSecondsLeft] = useState(0)
  const [myVote, setMyVote] = useState<'yes' | 'no' | null>(null)
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [library, setLibrary] = useState<RadioLibrary>({ eras: [] })
  const [libraryLoading, setLibraryLoading] = useState(false)
  const [libraryLoaded, setLibraryLoaded] = useState(false)
  const [selectedEra, setSelectedEra] = useState('')
  const [selectedTrackId, setSelectedTrackId] = useState('')
  const [songFilter, setSongFilter] = useState('')
  const [streamError, setStreamError] = useState<string | null>(null)

  const nowPlaying = live.now_playing
  const upNext = live.up_next
  const vote: RadioVote = live.vote || { active: false }
  const voteActive = !!vote.active
  const canVote = live.is_live && isPlaying
  const totalListeners = live.total_listeners || 0

  const stateLabel = STATE_LABELS[live.state] || 'Now Playing'
  const hasProgress = !!nowPlaying?.duration_ms && nowPlaying.duration_ms > 0
  const progressRatio = hasProgress
    ? Math.min(1, displayElapsed / (nowPlaying!.duration_ms!))
    : 0
  const voteProgress = Math.min(
    1,
    Math.max(vote.yes || 0, vote.no || 0) / (vote.votes_needed || 1)
  )

  const songOptions = useMemo(() => {
    const era = library.eras.find((e) => e.name === selectedEra)
    if (!era) return []
    const needle = songFilter.toLowerCase()
    return era.tracks.filter((t) => {
      if (!needle) return true
      return t.title.toLowerCase().includes(needle) || t.artist.toLowerCase().includes(needle)
    })
  }, [library.eras, selectedEra, songFilter])

  const applyMeta = useCallback((data: RadioLiveState) => {
    if (!data || typeof data !== 'object') return
    setLive(data)
    if (data.now_playing && typeof data.now_playing.elapsed_ms === 'number') {
      setDisplayElapsed(data.now_playing.elapsed_ms)
    } else {
      setDisplayElapsed(0)
    }
    const v = data.vote || { active: false }
    const voteKey = v.active ? `${v.kind}:${v.track || ''}` : ''
    if (voteKey !== lastVoteKeyRef.current) {
      lastVoteKeyRef.current = voteKey
      setMyVote(null)
    }
    if (v.active && typeof v.seconds_left === 'number') {
      setVoteSecondsLeft(v.seconds_left)
    } else if (!v.active) {
      setVoteSecondsLeft(0)
    }
  }, [])

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }, [])

  const startPolling = useCallback(() => {
    if (pollTimerRef.current) return
    const fetchLive = async (): Promise<void> => {
      try {
        applyMeta(await fetchRadioLive())
      } catch {
        setLive((prev) => ({ ...prev, is_live: false, state: 'offline' }))
      }
    }
    fetchLive()
    pollTimerRef.current = setInterval(fetchLive, 5000)
  }, [applyMeta])

  const applyVolume = useCallback((v: number) => {
    if (audioRef.current) audioRef.current.volume = v / 100
  }, [])

  useEffect(() => {
    applyVolume(volume)
  }, [volume, applyVolume])

  useEffect(() => {
    const client = new RadioStreamClient({
      onMeta: applyMeta,
      onOpen: () => {
        wsOpenRef.current = true
        stopPolling()
      },
      onClose: () => {
        wsOpenRef.current = false
        startPolling()
      },
      onListening: (active) => {
        if (!active) setIsPlaying(false)
      },
    })
    clientRef.current = client
    if (audioRef.current) client.attach(audioRef.current)
    client.connect()

    const fallbackTimer = setTimeout(() => {
      if (!wsOpenRef.current) startPolling()
    }, 4000)

    tickTimerRef.current = setInterval(() => {
      const current = liveRef.current
      const np = current.now_playing
      const progress = !!np?.duration_ms && np.duration_ms > 0
      setDisplayElapsed((prev) => {
        if (current.state === 'playing' && progress && np?.duration_ms) {
          return Math.min(prev + 1000, np.duration_ms)
        }
        return prev
      })
      setVoteSecondsLeft((prev) => {
        if (current.vote?.active && prev > 0) return prev - 1
        return prev
      })
    }, 1000)

    return () => {
      clearTimeout(fallbackTimer)
      stopPolling()
      if (tickTimerRef.current) clearInterval(tickTimerRef.current)
      client.disconnect()
      clientRef.current = null
    }
  }, [])

  const toggleStream = async (): Promise<void> => {
    const client = clientRef.current
    if (!client || !live.is_live) return
    if (isPlaying) {
      client.stopListening()
      setIsPlaying(false)
      return
    }
    setAudioLoading(true)
    setStreamError(null)
    try {
      await client.startListening()
    } catch {
      setAudioLoading(false)
      setStreamError('Could not start the live stream.')
    }
  }

  const proposeSkip = (): void => {
    const client = clientRef.current
    if (!client || !canVote) return
    if (!client.proposeSkip()) setStreamError('Could not start the vote. Reconnecting...')
  }

  const loadLibrary = async (): Promise<void> => {
    if (libraryLoaded || libraryLoading) return
    setLibraryLoading(true)
    try {
      const data = await fetchRadioLibrary()
      setLibrary(data?.eras ? data : { eras: [] })
      setLibraryLoaded(true)
    } catch {
      setStreamError('Could not load the song library.')
    } finally {
      setLibraryLoading(false)
    }
  }

  const openSuggest = (): void => {
    if (!canVote) return
    setSelectedEra('')
    setSelectedTrackId('')
    setSongFilter('')
    setSuggestOpen(true)
    loadLibrary()
  }

  const submitSuggestion = (): void => {
    const client = clientRef.current
    if (!client || !selectedTrackId) return
    if (client.proposeQueue(selectedTrackId)) {
      setSuggestOpen(false)
    } else {
      setStreamError('Could not start the vote. Reconnecting...')
    }
  }

  const castVote = (value: 'yes' | 'no'): void => {
    const client = clientRef.current
    if (!client || !canVote) return
    if (client.castVote(value)) setMyVote(value)
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-6 md:px-6 md:py-8 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1
              className="text-4xl md:text-5xl font-bold text-text-primary tracking-wider leading-none"
              style={{ fontFamily: "'Josefin Sans', sans-serif" }}
            >
              999 FM
            </h1>
            <p className="text-text-muted text-sm mt-1">Live Juice WRLD Radio</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-surface-raised border border-[var(--border)] text-text-secondary">
              <Headphones size={14} />
              {totalListeners} listening
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-white ${
                live.is_live ? 'bg-red-600' : 'bg-neutral-600'
              }`}
            >
              <Radio size={14} />
              {live.is_live ? 'ON AIR' : 'OFFLINE'}
            </span>
          </div>
        </div>

        {streamError && (
          <div className="px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center justify-between gap-2">
            <span>{streamError}</span>
            <button onClick={() => setStreamError(null)} className="text-red-400/70 hover:text-red-400">
              <X size={16} />
            </button>
          </div>
        )}

        <div className="rounded-2xl border border-[var(--border)] bg-sidebar overflow-hidden">
          <div className="p-5 md:p-6">
            <p className="text-xs uppercase tracking-wider text-text-muted mb-1">{stateLabel}</p>
            <h2 className="text-xl md:text-2xl font-bold text-text-primary line-clamp-2">
              {nowPlaying?.title || 'Nothing playing'}
            </h2>
            <p className="text-text-secondary mt-1">
              {nowPlaying?.artist || ''}
              {nowPlaying?.album ? ` · ${nowPlaying.album}` : ''}
            </p>

            {hasProgress && (
              <div className="mt-4">
                <div className="h-2 rounded-full bg-surface-raised overflow-hidden">
                  <div
                    className="h-full rounded-full bg-red-500 transition-all duration-300"
                    style={{ width: `${progressRatio * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-text-muted mt-1">
                  <span>{formatTime(displayElapsed)}</span>
                  <span>{formatTime(nowPlaying?.duration_ms)}</span>
                </div>
              </div>
            )}

            {live.dj_enabled && (
              <p className="mt-3 text-sm text-purple-400 flex items-center gap-1.5">
                <Mic size={14} />
                DJ: {live.dj_line || 'On'}
              </p>
            )}
          </div>

          <div className="border-t border-[var(--border)] px-5 py-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => { void toggleStream() }}
                disabled={!live.is_live || audioLoading}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors disabled:opacity-40 ${
                  isPlaying ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-accent hover:bg-[var(--accent-hover)] text-white'
                }`}
              >
                {audioLoading ? (
                  <Loader2 size={22} className="animate-spin" />
                ) : isPlaying ? (
                  <Square size={18} fill="currentColor" />
                ) : (
                  <Play size={22} fill="currentColor" className="ml-0.5" />
                )}
              </button>
              <span className="text-xs text-text-muted">
                {live.is_live
                  ? isPlaying ? 'Streaming live' : 'Tap to listen'
                  : 'Stream offline'}
              </span>
            </div>
            <div className="flex items-center gap-2 min-w-[140px]">
              <Volume2 size={18} className="text-text-muted shrink-0" />
              <input
                type="range"
                min={0}
                max={100}
                value={volume}
                onChange={(e) => {
                  const v = Number(e.target.value)
                  setVolume(v)
                  applyVolume(v)
                }}
                className="flex-1 h-1 accent-[var(--accent)] cursor-pointer"
              />
            </div>
          </div>
        </div>

        {voteActive ? (
          <div className="rounded-2xl border border-red-500/40 bg-sidebar p-5">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                {vote.kind === 'skip' ? (
                  <SkipForward size={16} className="text-red-400" />
                ) : (
                  <ListPlus size={16} className="text-accent" />
                )}
                {vote.kind === 'skip' ? 'Vote to skip the current song' : 'Vote to queue a song'}
              </h3>
              <span className="text-xs text-text-muted">{voteSecondsLeft}s left</span>
            </div>
            {vote.kind === 'queue' && vote.track && (
              <p className="text-sm text-text-secondary mt-1">{vote.track}</p>
            )}
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                onClick={() => castVote('yes')}
                disabled={!canVote}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 ${
                  myVote === 'yes'
                    ? 'bg-green-600 text-white'
                    : 'border border-[var(--border)] text-text-secondary hover:bg-surface-raised'
                }`}
              >
                <Check size={16} />
                Yes ({vote.yes || 0})
              </button>
              <button
                onClick={() => castVote('no')}
                disabled={!canVote}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 ${
                  myVote === 'no'
                    ? 'bg-red-600 text-white'
                    : 'border border-[var(--border)] text-text-secondary hover:bg-surface-raised'
                }`}
              >
                <X size={16} />
                No ({vote.no || 0})
              </button>
            </div>
            <div className="mt-4 h-1.5 rounded-full bg-surface-raised overflow-hidden">
              <div
                className="h-full rounded-full bg-red-500 transition-all"
                style={{ width: `${voteProgress * 100}%` }}
              />
            </div>
            <p className="text-xs text-text-muted mt-2">
              Needs {vote.votes_needed || 1} of {vote.total_listeners || 0} listening
            </p>
            {!isPlaying && (
              <p className="text-xs text-orange-400 mt-1">Tap play to tune in and vote.</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={proposeSkip}
              disabled={!canVote}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-500/50 text-red-400 text-sm font-medium hover:bg-red-500/10 transition-colors disabled:opacity-40"
            >
              <SkipForward size={16} />
              Vote Skip
            </button>
            <button
              onClick={openSuggest}
              disabled={!canVote}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[var(--border)] text-text-secondary text-sm font-medium hover:bg-surface-raised transition-colors disabled:opacity-40"
            >
              <ListPlus size={16} />
              Suggest a Song
            </button>
            {live.is_live && !isPlaying && (
              <p className="col-span-2 text-center text-xs text-text-muted">
                Tap play to tune in, then you can start a vote.
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-2xl border border-[var(--border)] bg-sidebar p-4">
            <h3 className="text-sm font-semibold text-text-primary mb-2">Up Next</h3>
            {upNext ? (
              <>
                <p className="text-text-primary">{upNext.title}</p>
                <p className="text-xs text-text-muted">{upNext.artist}</p>
              </>
            ) : (
              <p className="text-text-muted text-sm">—</p>
            )}
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-sidebar p-4">
            <h3 className="text-sm font-semibold text-text-primary mb-2">Queue</h3>
            {live.queue_preview?.length ? (
              <ul className="space-y-1">
                {live.queue_preview.map((item, idx) => (
                  <li key={idx} className="text-sm text-text-secondary truncate">{item}</li>
                ))}
              </ul>
            ) : (
              <p className="text-text-muted text-sm">No upcoming tracks listed.</p>
            )}
          </div>
        </div>

        <div className="text-center pt-2 pb-4">
          <a
            href="https://discord.gg/jwa"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
          >
            Listen with the community on Discord
          </a>
        </div>
      </div>

      {suggestOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={() => setSuggestOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-sidebar p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-text-primary">Suggest a song</h3>
            <p className="text-xs text-text-muted mt-1 mb-4">Pick a song to start a queue vote.</p>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-text-muted mb-1 block">Era</label>
                <div className="relative">
                  <select
                    value={selectedEra}
                    onChange={(e) => {
                      setSelectedEra(e.target.value)
                      setSelectedTrackId('')
                    }}
                    disabled={libraryLoading}
                    className="w-full appearance-none bg-surface-raised border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-text-primary pr-8"
                  >
                    <option value="">Select era…</option>
                    {library.eras.map((era) => (
                      <option key={era.name} value={era.name}>{era.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="text-xs text-text-muted mb-1 block">Song</label>
                <input
                  type="text"
                  placeholder="Filter songs…"
                  value={songFilter}
                  onChange={(e) => setSongFilter(e.target.value)}
                  disabled={!selectedEra}
                  className="w-full bg-surface-raised border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-text-primary mb-2 disabled:opacity-40"
                />
                <div className="relative">
                  <select
                    value={selectedTrackId}
                    onChange={(e) => setSelectedTrackId(e.target.value)}
                    disabled={!selectedEra}
                    className="w-full appearance-none bg-surface-raised border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-text-primary pr-8 disabled:opacity-40"
                  >
                    <option value="">Select song…</option>
                    {songOptions.map((track) => (
                      <option key={track.id} value={track.id}>
                        {track.title} — {track.artist}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setSuggestOpen(false)}
                className="px-4 py-2 rounded-lg text-sm text-text-muted hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitSuggestion}
                disabled={!selectedTrackId}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-accent hover:bg-[var(--accent-hover)] text-white disabled:opacity-40 transition-colors"
              >
                Start Vote
              </button>
            </div>
          </div>
        </div>
      )}

      <audio
        ref={audioRef}
        preload="none"
        onPlaying={() => { setIsPlaying(true); setAudioLoading(false) }}
        onPause={() => setIsPlaying(false)}
        onError={() => {
          if (audioLoading || isPlaying) setStreamError('The radio stream is unavailable.')
          setAudioLoading(false)
          setIsPlaying(false)
        }}
      />
    </div>
  )
}
