import { useEffect, useRef, useMemo, useState, memo, useCallback } from 'react'
import { Music, Radio, Search, SkipForward, ThumbsUp, ThumbsDown, X, ChevronDown, ChevronLeft, Play, Pause, SkipBack, SkipForward as SkipFwd, Shuffle, Repeat, Repeat1, Volume2, VolumeX } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useShallow } from 'zustand/react/shallow'
import { parseLrc, getCurrentLineIndex, isLrcFormat } from '../lib/lyrics'
import { seekAudio, getAudioDuration } from './Player'
import { buildImageUrl, apiFetch, songToTrack, JWAPI_BASE, playlistCoverUrl } from '../lib/juicewrldApi'
import { getActiveRadioClient } from '../lib/radioSocketService'
import type { JWApiSong } from '../lib/juicewrldApi'
import * as userApi from '../lib/userApi'

// ── WrldData types ────────────────────────────────────────────────────────────

interface WrldSong { name: string; id: number }
interface WrldVersion { name: string; year: number; cover_url: string; songs: WrldSong[] }
interface WrldAlbum { id: number; name: string; versions: WrldVersion[] }

export default function WrldView(): JSX.Element {
  const {
    currentTrack, currentTrackFull, account, theme,
    radioFmActive, setRadioFmActive, radioFmIsLive, radioFmNowPlaying,
    radioFmVote, radioFmUpNext, radioFmQueuePreview,
    radioFmMatchedSong,
    playlists,
    playTrack,
    isPlaying, setIsPlaying, volume, setVolume,
    shuffle, repeat, toggleShuffle, toggleRepeat,
    nextTrack, prevTrack,
  } = useStore(useShallow(s => ({
    currentTrack: s.currentTrack,
    currentTrackFull: s.currentTrackFull,
    account: s.account,
    theme: s.theme,
    radioFmActive: s.radioFmActive,
    setRadioFmActive: s.setRadioFmActive,
    radioFmIsLive: s.radioFmIsLive,
    radioFmNowPlaying: s.radioFmNowPlaying,
    radioFmVote: s.radioFmVote,
    radioFmUpNext: s.radioFmUpNext,
    radioFmQueuePreview: s.radioFmQueuePreview,
    radioFmMatchedSong: s.radioFmMatchedSong,
    playlists: s.playlists,
    playTrack: s.playTrack,
    isPlaying: s.isPlaying,
    setIsPlaying: s.setIsPlaying,
    volume: s.volume,
    setVolume: s.setVolume,
    shuffle: s.shuffle,
    repeat: s.repeat,
    toggleShuffle: s.toggleShuffle,
    toggleRepeat: s.toggleRepeat,
    nextTrack: s.nextTrack,
    prevTrack: s.prevTrack,
  })))

  const containerRef = useRef<HTMLDivElement>(null)
  const activeRef    = useRef<HTMLDivElement>(null)
  const [artError, setArtError] = useState(false)
  const [fmTab, setFmTab] = useState<'radio' | 'lyrics'>('radio')
  const [suggestQuery, setSuggestQuery]     = useState('')
  const [suggestResults, setSuggestResults] = useState<JWApiSong[]>([])
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [voteDismissed, setVoteDismissed]    = useState(false)
  const [myVote, setMyVote]                 = useState<'yes' | 'no' | null>(null)
  const [localSecondsLeft, setLocalSecondsLeft] = useState<number | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [proposed, setProposed]             = useState<string | null>(null)
  const [textIsDark, setTextIsDark]          = useState(false)
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const proposeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Albums state ─────────────────────────────────────────────────────────────
  const [wrldAlbums, setWrldAlbums] = useState<WrldAlbum[]>([])
  const [selectedAlbumId, setSelectedAlbumId] = useState<number | null>(null)
  const [selectedVersionIdx, setSelectedVersionIdx] = useState(0)
  const [playingAlbumSongId, setPlayingAlbumSongId] = useState<number | null>(null)

  useEffect(() => {
    fetch('/wrlddata.json')
      .then(r => r.json())
      .then(d => setWrldAlbums(d.albums ?? []))
      .catch(() => {})
  }, [])

  const handlePlayAlbumSong = async (songId: number) => {
    setPlayingAlbumSongId(songId)
    try {
      const res = await fetch(`${JWAPI_BASE}/songs/${songId}/`)
      if (res.ok) {
        const song: JWApiSong = await res.json()
        playTrack(songToTrack(song))
      }
    } catch {}
    setPlayingAlbumSongId(null)
  }

  // ─────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (suggestTimer.current) clearTimeout(suggestTimer.current)
    if (!suggestQuery.trim()) { setSuggestResults([]); setSuggestLoading(false); return }
    setSuggestLoading(true)
    suggestTimer.current = setTimeout(async () => {
      try {
        const data = await apiFetch<{ results: JWApiSong[] }>('/songs/', { search: suggestQuery, page_size: 5 })
        setSuggestResults(data.results ?? [])
      } catch { setSuggestResults([]) }
      setSuggestLoading(false)
    }, 400)
    return () => { if (suggestTimer.current) clearTimeout(suggestTimer.current) }
  }, [suggestQuery])

  const handlePropose = (song: JWApiSong) => {
    getActiveRadioClient()?.proposeQueue(String(song.id))
    const name = song.track_titles?.[0] || song.name
    setProposed(name)
    setSuggestQuery('')
    setSuggestResults([])
    if (proposeTimer.current) clearTimeout(proposeTimer.current)
    proposeTimer.current = setTimeout(() => setProposed(null), 4000)
  }

  const artSrc = radioFmActive
    ? (radioFmMatchedSong?.imageUrl ?? buildImageUrl(radioFmNowPlaying?.image_url) ?? null)
    : (buildImageUrl(currentTrackFull?.albumArt ?? currentTrack?.imageUrl ?? null) ?? null)

  useEffect(() => { setArtError(false) }, [artSrc])

  useEffect(() => {
    if (!artSrc || artError) {
      setTextIsDark(theme === 'light' && !radioFmActive)
      return
    }
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = 50; canvas.height = 50
        const ctx = canvas.getContext('2d')
        if (!ctx) { setTextIsDark(false); return }
        ctx.drawImage(img, 0, 0, 50, 50)
        const data = ctx.getImageData(0, 0, 50, 50).data
        let sum = 0
        for (let i = 0; i < data.length; i += 4)
          sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
        const avg = sum / (data.length / 4)
        const factor = theme === 'dark' ? 0.22 : 0.45
        setTextIsDark(avg * factor > 90)
      } catch { setTextIsDark(false) }
    }
    img.onerror = () => setTextIsDark(false)
    img.src = artSrc
  }, [artSrc, artError, theme, radioFmActive])

  const rawLyrics = radioFmActive
    ? (radioFmMatchedSong?.syncedLyrics || radioFmMatchedSong?.lyrics || null)
    : (currentTrackFull?.syncedLyrics || currentTrackFull?.lyrics || null)
  const isSynced  = rawLyrics ? isLrcFormat(rawLyrics) : false
  const isEditor  = account?.is_editor || account?.is_administrator

  const txtPri   = textIsDark ? 'rgba(0,0,0,0.85)'  : 'rgba(255,255,255,1)'
  const txtSec   = textIsDark ? 'rgba(0,0,0,0.5)'   : 'rgba(255,255,255,0.5)'
  const txtTer   = textIsDark ? 'rgba(0,0,0,0.35)'  : 'rgba(255,255,255,0.3)'
  const txtFaint = textIsDark ? 'rgba(0,0,0,0.22)'  : 'rgba(255,255,255,0.2)'

  const handleAddToPlaylist = async (playlistId: number) => {
    if (!currentTrack?.id) return
    const numericId = parseInt(currentTrack.id.replace('jw-', ''), 10)
    if (isNaN(numericId)) return
    try { await userApi.addToPlaylist(playlistId, numericId) } catch { /* silent */ }
  }

  const syncedLines = useMemo(() => {
    if (rawLyrics && isSynced) return parseLrc(rawLyrics)
    return []
  }, [rawLyrics, isSynced])

  type NotchCategory = 'albums' | 'mixtapes' | 'unreleased' | 'playlists'
  const [notchCategory, setNotchCategory] = useState<NotchCategory>('albums')
  const [notchDropdownOpen, setNotchDropdownOpen] = useState(false)
  const NOTCH_LABELS: Record<NotchCategory, string> = { albums: 'Released Albums', mixtapes: 'Mixtapes & Singles', unreleased: 'Unreleased', playlists: 'Playlists' }
  const NOTCH_OPTIONS: { value: NotchCategory; label: string }[] = [
    { value: 'albums', label: 'Released Albums' },
    { value: 'mixtapes', label: 'Mixtapes & Singles' },
    { value: 'unreleased', label: 'Unreleased' },
    { value: 'playlists', label: 'Playlists' },
  ]
  useEffect(() => { setVoteDismissed(false); setMyVote(null) }, [radioFmVote?.track, radioFmVote?.kind])

  // Locally interpolate the countdown so it ticks every second between server updates
  useEffect(() => {
    if (countdownRef.current) clearInterval(countdownRef.current)
    if (radioFmVote?.seconds_left == null) { setLocalSecondsLeft(null); return }
    setLocalSecondsLeft(radioFmVote.seconds_left)
    countdownRef.current = setInterval(() => {
      setLocalSecondsLeft(s => (s != null && s > 0) ? s - 1 : 0)
    }, 1000)
    return () => { if (countdownRef.current) clearInterval(countdownRef.current) }
  }, [radioFmVote?.seconds_left])

  const fmLabel    = radioFmActive
    ? (radioFmIsLive ? '999 FM · LIVE' : '999 FM · OFF')
    : radioFmIsLive === false ? '999 FM · OFF' : '999 FM'
  const fmDisabled = radioFmIsLive === false && !radioFmActive

  const displayTitle  = radioFmActive && radioFmNowPlaying ? radioFmNowPlaying.title  : currentTrack?.title
  const displayArtist = radioFmActive && radioFmNowPlaying ? radioFmNowPlaying.artist : currentTrack?.artist
  const displayAlbum  = radioFmActive && radioFmNowPlaying ? radioFmNowPlaying.album  : currentTrack?.album

  const ArtBox = ({ mobile }: { mobile: boolean }) => (
    <div
      className={mobile
        ? 'w-14 h-14 rounded-xl overflow-hidden shrink-0 shadow-lg'
        : 'rounded-3xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.8)] w-full'}
      style={mobile ? {} : { aspectRatio: '1' }}
    >
      {artSrc && !artError ? (
        <img src={artSrc} alt="Album art" className="w-full h-full object-cover" onError={() => setArtError(true)} />
      ) : radioFmActive ? (
        <div className="w-full h-full bg-gradient-to-br from-red-900/60 to-black flex flex-col items-center justify-center gap-2">
          <Radio className={`text-red-400 opacity-70 ${mobile ? 'w-6 h-6' : 'w-16 h-16'}`} />
          {!mobile && <span className="text-red-300/70 text-2xl font-bold tracking-widest">999 FM</span>}
        </div>
      ) : (
        <div className="w-full h-full bg-white/10 flex items-center justify-center">
          <Music className={`text-white/20 ${mobile ? 'w-6 h-6' : 'w-16 h-16'}`} />
        </div>
      )}
    </div>
  )

  const FmRadioPanel = () => (
    <div className="flex-1 overflow-y-auto pb-8 px-4 md:px-6 flex flex-col gap-4 md:gap-5" style={{ scrollbarWidth: 'none' }}>
      {/* Vote */}
      {radioFmVote?.active && !voteDismissed ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-white/50 text-[11px] font-semibold uppercase tracking-widest">
              {radioFmVote.kind === 'skip' ? 'Vote to Skip' : 'Vote to Queue'}
            </p>
            <div className="flex items-center gap-2">
              {localSecondsLeft != null && (
                <span className={`text-xs tabular-nums font-mono transition-colors ${localSecondsLeft <= 5 ? 'text-red-400/70' : 'text-white/30'}`}>
                  {localSecondsLeft}s
                </span>
              )}
              <button onClick={() => setVoteDismissed(true)} className="text-white/20 hover:text-white/60 transition-colors">
                <X size={13} />
              </button>
            </div>
          </div>
          {radioFmVote.track && <p className="text-white/80 text-sm font-medium">{radioFmVote.track}</p>}
          <p className="text-white/30 text-xs">
            {radioFmVote.yes ?? 0} yes · {radioFmVote.no ?? 0} no
            {radioFmVote.votes_needed != null && <span> · need {radioFmVote.votes_needed}</span>}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => { setMyVote('yes'); getActiveRadioClient()?.castVote('yes') }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-all ${
                myVote === 'yes'
                  ? 'bg-green-600/40 text-green-300 ring-1 ring-green-500/50'
                  : 'bg-green-600/15 hover:bg-green-600/30 text-green-400'
              }`}>
              <ThumbsUp size={13} /> Yes
            </button>
            <button
              onClick={() => { setMyVote('no'); getActiveRadioClient()?.castVote('no') }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-all ${
                myVote === 'no'
                  ? 'bg-red-600/40 text-red-300 ring-1 ring-red-500/50'
                  : 'bg-red-900/15 hover:bg-red-900/30 text-red-400'
              }`}>
              <ThumbsDown size={13} /> No
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => getActiveRadioClient()?.proposeSkip()}
          className="flex items-center gap-2 text-sm text-white/30 hover:text-white/65 transition-colors self-start">
          <SkipForward size={14} /> Vote to skip
        </button>
      )}

      {/* Suggest */}
      <div className="flex flex-col gap-2">
        <p className="text-white/40 text-[11px] font-semibold uppercase tracking-widest">Suggest next song</p>
        {proposed ? (
          <div className="flex items-center justify-between bg-green-900/20 border border-green-500/20 rounded-xl px-3 py-2">
            <div className="flex items-center gap-2 text-green-400 text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0 animate-pulse" />
              Proposed: <span className="text-green-300 font-medium">{proposed}</span>
            </div>
            <button onClick={() => { setProposed(null); if (proposeTimer.current) clearTimeout(proposeTimer.current) }}
              className="text-green-500/50 hover:text-green-400 transition-colors ml-2 shrink-0">
              <X size={13} />
            </button>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
              <input
                type="text" value={suggestQuery}
                onChange={(e) => setSuggestQuery(e.target.value)}
                placeholder="Search songs…"
                className="w-full bg-white/5 text-white/80 text-sm rounded-xl py-2 pl-8 pr-3 border border-white/10 focus:outline-none focus:border-white/25 transition-colors"
                style={{ colorScheme: 'dark' }}
              />
            </div>
            {suggestLoading && <p className="text-white/25 text-xs pl-1">Searching…</p>}
            {suggestResults.length > 0 && (
              <div className="flex flex-col -mx-1">
                {suggestResults.map(song => (
                  <button key={song.id} onClick={() => handlePropose(song)}
                    className="text-left px-3 py-2 rounded-xl hover:bg-white/10 transition-colors group">
                    <p className="text-white/70 text-sm truncate group-hover:text-white/90 transition-colors">
                      {song.track_titles?.[0] || song.name}
                    </p>
                    <p className="text-white/35 text-xs truncate">{song.credited_artists}</p>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Up next */}
      {radioFmUpNext && (
        <div className="flex flex-col gap-2">
          <p className="text-white/40 text-[11px] font-semibold uppercase tracking-widest">Up next</p>
          <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
            <p className="text-white/80 text-sm font-medium truncate">{radioFmUpNext.title}</p>
            {radioFmUpNext.artist && <p className="text-white/40 text-xs mt-0.5">{radioFmUpNext.artist}</p>}
          </div>
        </div>
      )}

      {/* Queue preview */}
      {radioFmQueuePreview.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-white/40 text-[11px] font-semibold uppercase tracking-widest">Coming up</p>
          <div className="flex flex-col">
            {radioFmQueuePreview.map((title, i) => (
              <div key={i} className="flex items-center gap-3 px-1 py-1.5 rounded-lg">
                <span className="text-white/20 text-xs w-4 text-right shrink-0">{i + 1}</span>
                <p className="text-white/50 text-sm truncate">{title}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  // LyricsPanel is now a module-level component (see below WrldView) — call via JSX.

  // ── Albums notch content ──────────────────────────────────────────────────────

  const AlbumsGrid = () => (
    <div className="grid grid-cols-2 gap-2.5 pb-2">
      {wrldAlbums.map(album => {
        const primaryVersion = album.versions[0]
        return (
          <button
            key={album.id}
            onClick={() => { setSelectedAlbumId(album.id); setSelectedVersionIdx(0) }}
            className="flex flex-col gap-1.5 text-left group/album"
          >
            <div className="relative w-full aspect-square rounded-xl overflow-hidden shadow-lg ring-1 ring-white/[0.06] group-hover/album:ring-white/25 transition-all duration-200">
              <img
                src={primaryVersion.cover_url}
                alt={album.name}
                className="w-full h-full object-cover transition-transform duration-300 group-hover/album:scale-[1.04]"
              />
              {/* Play overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover/album:bg-black/30 transition-colors duration-200 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-white/0 group-hover/album:bg-white flex items-center justify-center transition-all duration-200 opacity-0 group-hover/album:opacity-100 shadow-xl translate-y-1 group-hover/album:translate-y-0">
                  <Play size={10} className="text-black ml-0.5" fill="black" />
                </div>
              </div>
            </div>
            <div className="px-0.5">
              <p className="text-white/85 text-[10px] font-semibold leading-tight line-clamp-2">{album.name}</p>
              <p className="text-white/35 text-[9px] mt-0.5 tabular-nums">{primaryVersion.year}</p>
            </div>
          </button>
        )
      })}
    </div>
  )

  const AlbumDetail = ({ albumId }: { albumId: number }) => {
    const album = wrldAlbums.find(a => a.id === albumId)
    if (!album) return null
    const version = album.versions[selectedVersionIdx] ?? album.versions[0]

    return (
      <div className="flex flex-col gap-3">
        {/* Back button */}
        <button
          onClick={() => setSelectedAlbumId(null)}
          className="flex items-center gap-1.5 text-[10px] text-white/40 hover:text-white/75 transition-colors -ml-0.5 self-start"
        >
          <ChevronLeft size={11} />
          <span>Albums</span>
        </button>

        {/* Cover art */}
        <div className="w-full aspect-square rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
          <img src={version.cover_url} alt={album.name} className="w-full h-full object-cover" />
        </div>

        {/* Album info */}
        <div>
          <p className="text-white/95 text-xs font-bold leading-snug">{album.name}</p>
          <p className="text-white/40 text-[10px] mt-0.5">Juice WRLD · {version.year}</p>
        </div>

        {/* Version tabs */}
        {album.versions.length > 1 && (
          <div className="flex gap-1.5">
            {album.versions.map((v, i) => (
              <button
                key={i}
                onClick={() => setSelectedVersionIdx(i)}
                className={`px-2.5 py-1 rounded-lg text-[9px] font-semibold transition-all duration-150 ${
                  selectedVersionIdx === i
                    ? 'bg-white/15 text-white/95 ring-1 ring-white/20'
                    : 'bg-white/[0.04] text-white/35 hover:bg-white/10 hover:text-white/65'
                }`}
              >
                {v.name.includes('Deluxe') ? 'Deluxe' : 'Standard'}
              </button>
            ))}
          </div>
        )}

        {/* Divider */}
        <div className="h-px bg-white/[0.07]" />

        {/* Track list */}
        <div className="flex flex-col -mx-1.5">
          {version.songs.map((song, idx) => {
            const isActive = currentTrack?.id === `jw-${song.id}`
            const isLoading = playingAlbumSongId === song.id

            return (
              <button
                key={`${song.id}-${idx}`}
                onClick={() => handlePlayAlbumSong(song.id)}
                className="flex items-center gap-2 px-2 py-[5px] rounded-lg hover:bg-white/[0.07] active:bg-white/10 transition-colors group/song text-left"
              >
                {/* Track number / playing indicator */}
                <div className="w-5 shrink-0 flex items-center justify-center">
                  {isLoading ? (
                    <div className="w-2.5 h-2.5 rounded-full border border-white/30 border-t-white/80 animate-spin" />
                  ) : isActive ? (
                    <span className="text-[var(--accent)] text-[9px]">▶</span>
                  ) : (
                    <>
                      <span className="text-white/25 text-[10px] tabular-nums group-hover/song:hidden">{idx + 1}</span>
                      <Play size={9} className="text-white/50 hidden group-hover/song:block" fill="currentColor" />
                    </>
                  )}
                </div>

                {/* Song name */}
                <span
                  className={`text-[11px] truncate transition-colors leading-tight ${
                    isActive
                      ? 'text-[var(--accent)] font-semibold'
                      : 'text-white/70 group-hover/song:text-white/95'
                  }`}
                >
                  {song.name}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="relative flex flex-col md:flex-row flex-1 h-full w-full overflow-hidden">

      {/* 999 FM toggle */}
      <button
        onClick={() => setRadioFmActive(!radioFmActive)}
        disabled={fmDisabled}
        className={`absolute z-30 flex items-center gap-2 text-xs font-medium rounded-full px-3 py-1.5 transition-all disabled:opacity-40
          top-3 right-3 md:top-4 md:left-4 md:right-auto
          ${radioFmActive && radioFmIsLive
            ? 'bg-red-600/80 text-white backdrop-blur-sm ring-1 ring-red-400/50'
            : radioFmActive
            ? 'bg-white/10 text-white/50 backdrop-blur-sm'
            : 'bg-black/10 dark:bg-black/25 text-black/50 dark:text-white/50 hover:text-black/80 dark:hover:text-white/90 hover:bg-black/20 dark:hover:bg-black/50 backdrop-blur-sm'}`}
        title={radioFmActive ? 'Turn off 999 FM' : 'Turn on 999 FM'}
      >
        <Radio size={13} className={radioFmActive && radioFmIsLive ? 'animate-pulse' : ''} />
        <span>{fmLabel}</span>
      </button>

      <>
          {/* Blurred background */}
          <div className="absolute inset-0 overflow-hidden">
            {artSrc && !artError ? (
              <img src={artSrc} alt=""
                className="absolute inset-0 w-full h-full object-cover"
                style={{ filter: `blur(60px) brightness(${theme === 'dark' ? 0.22 : 0.45}) saturate(${theme === 'dark' ? 2.4 : 1.8})`, transform: 'scale(1.2)' }}
                onError={() => setArtError(true)}
              />
            ) : (
              <div className={`absolute inset-0 ${radioFmActive ? 'bg-gradient-to-br from-red-950/60 to-black dark:from-red-950/60 dark:to-black' : 'bg-gradient-to-br from-gray-200 to-gray-100 dark:from-gray-900 dark:to-black'}`} />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20 dark:from-black/40 dark:via-transparent dark:to-black/70" />
          </div>

          {/* Mobile layout */}
          <div className="md:hidden relative z-10 flex flex-col h-full">

            {/* Header: art + title */}
            <div className="flex items-center gap-3 px-4 pt-12 pb-3 shrink-0">
              <ArtBox mobile />
              <div className="flex-1 min-w-0">
                {displayTitle  && <p className="font-bold text-sm leading-tight truncate" style={{ color: txtPri }}>{displayTitle}</p>}
                {displayArtist && <p className="text-xs mt-0.5 truncate" style={{ color: txtSec }}>{displayArtist}</p>}
                {displayAlbum  && <p className="text-xs mt-0.5 truncate" style={{ color: txtTer }}>{displayAlbum}</p>}
                {radioFmActive && !radioFmNowPlaying && <p className="text-xs mt-0.5" style={{ color: txtTer }}>Tuning in…</p>}
              </div>
            </div>

            {/* Tab bar (FM mode) or divider line */}
            {radioFmActive ? (
              <div className="flex items-center gap-1 px-4 pb-2 shrink-0 border-b border-white/5">
                {(['radio', 'lyrics'] as const).map(tab => (
                  <button key={tab} onClick={() => setFmTab(tab)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                      fmTab === tab ? 'bg-white/10 text-white/90' : 'text-white/35 hover:text-white/65 hover:bg-white/5'
                    }`}>
                    {tab === 'radio' ? 'Radio' : 'Lyrics'}
                  </button>
                ))}
              </div>
            ) : (
              <div className="mx-4 h-px bg-white/10 shrink-0" />
            )}

            {/* Content */}
            {radioFmActive
              ? (fmTab === 'radio' ? FmRadioPanel() : <LyricsPanel rawLyrics={rawLyrics} isSynced={isSynced} syncedLines={syncedLines} radioFmActive={radioFmActive} currentTrack={currentTrack} isEditor={isEditor} txtPri={txtPri} txtSec={txtSec} txtTer={txtTer} txtFaint={txtFaint} />)
              : <LyricsPanel rawLyrics={rawLyrics} isSynced={isSynced} syncedLines={syncedLines} radioFmActive={radioFmActive} currentTrack={currentTrack} isEditor={isEditor} txtPri={txtPri} txtSec={txtSec} txtTer={txtTer} txtFaint={txtFaint} />
            }
          </div>

          {/* Desktop layout */}
          <div className="hidden md:flex relative z-10 flex-1 h-full overflow-hidden">

            {/* Left column — Apple Music style */}
            <div className="flex flex-col items-center justify-center shrink-0 px-8 xl:px-12 gap-5"
              style={{ width: '40%', minWidth: 260, maxWidth: 440 }}>

              {/* Album art */}
              <div className="w-full" style={{ maxWidth: 320 }}>
                <ArtBox mobile={false} />
              </div>

              {/* Title + artist */}
              <div className="w-full px-1" style={{ maxWidth: 320 }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {displayTitle  && <p className="font-bold text-xl leading-tight truncate" style={{ color: txtPri }}>{displayTitle}</p>}
                    {displayArtist && <p className="text-sm mt-0.5 truncate" style={{ color: txtSec }}>{displayArtist}</p>}
                    {radioFmActive && !radioFmNowPlaying && <p className="text-sm mt-0.5" style={{ color: txtTer }}>Tuning in…</p>}
                  </div>
                </div>
              </div>

              {/* Progress bar (hidden during FM — no scrubbing on live radio) */}
              {!radioFmActive && (
                <div className="w-full" style={{ maxWidth: 320 }}>
                  <ProgressBar txtPri={txtPri} txtTer={txtTer} />
                </div>
              )}

              {/* Playback controls */}
              <div className="w-full flex flex-col gap-4" style={{ maxWidth: 320 }}>
                {/* Main controls row */}
                <div className="flex items-center justify-between">
                  {/* Shuffle */}
                  {!radioFmActive && (
                    <button
                      onClick={toggleShuffle}
                      title={shuffle ? 'Shuffle on' : 'Shuffle off'}
                      className="p-2 rounded-full transition-colors"
                      style={{ color: shuffle ? txtPri : txtTer, opacity: shuffle ? 1 : 0.6 }}
                    >
                      <Shuffle size={16} />
                    </button>
                  )}

                  {/* Prev */}
                  <button
                    onClick={() => radioFmActive ? getActiveRadioClient()?.proposeSkip() : prevTrack()}
                    className="p-2 rounded-full transition-opacity hover:opacity-70"
                    style={{ color: txtPri }}
                    title={radioFmActive ? 'Vote to skip' : 'Previous'}
                  >
                    {radioFmActive
                      ? <SkipForward size={26} />
                      : <SkipBack size={26} fill="currentColor" />}
                  </button>

                  {/* Play / Pause — disabled during 999FM, live stream can't be locally paused */}
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    disabled={radioFmActive}
                    className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-opacity hover:opacity-80 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:opacity-30"
                    style={{ background: txtPri, color: textIsDark ? 'white' : 'black' }}
                  >
                    {radioFmActive
                      ? <Pause size={24} fill="currentColor" />
                      : isPlaying
                        ? <Pause size={24} fill="currentColor" />
                        : <Play  size={24} fill="currentColor" className="ml-0.5" />}
                  </button>

                  {/* Next */}
                  {!radioFmActive && (
                    <button
                      onClick={() => nextTrack()}
                      className="p-2 rounded-full transition-opacity hover:opacity-70"
                      style={{ color: txtPri }}
                      title="Next"
                    >
                      <SkipFwd size={26} fill="currentColor" />
                    </button>
                  )}

                  {/* Repeat */}
                  {!radioFmActive && (
                    <button
                      onClick={toggleRepeat}
                      title={repeat === 'none' ? 'No repeat' : repeat === 'all' ? 'Repeat all' : 'Repeat one'}
                      className="p-2 rounded-full transition-colors"
                      style={{ color: repeat !== 'none' ? txtPri : txtTer, opacity: repeat !== 'none' ? 1 : 0.6 }}
                    >
                      {repeat === 'one' ? <Repeat1 size={16} /> : <Repeat size={16} />}
                    </button>
                  )}

                  {/* FM spacers to keep play button centered */}
                  {radioFmActive && <div className="w-10" />}
                  {radioFmActive && <div className="w-10" />}
                </div>

                {/* Volume row */}
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setVolume(volume === 0 ? 0.5 : 0)}
                    className="shrink-0 transition-opacity hover:opacity-70"
                    style={{ color: txtTer }}
                  >
                    {volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
                  </button>
                  <div className="relative flex-1 h-1 rounded-full cursor-pointer group/vol"
                    style={{ background: 'rgba(255,255,255,0.18)' }}
                    onMouseDown={e => {
                      const track = e.currentTarget
                      const compute = (clientX: number) => {
                        const rect = track.getBoundingClientRect()
                        setVolume(Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)))
                      }
                      compute(e.clientX)
                      const onMove = (ev: MouseEvent) => compute(ev.clientX)
                      const onUp = () => {
                        document.removeEventListener('mousemove', onMove)
                        document.removeEventListener('mouseup', onUp)
                      }
                      document.addEventListener('mousemove', onMove)
                      document.addEventListener('mouseup', onUp)
                    }}
                  >
                    <div className="h-full rounded-full" style={{ width: `${volume * 100}%`, background: txtTer }} />
                    <div
                      className="absolute top-1/2 w-2.5 h-2.5 rounded-full opacity-0 group-hover/vol:opacity-100 transition-opacity pointer-events-none"
                      style={{ left: `${volume * 100}%`, transform: 'translate(-50%, -50%)', background: txtPri }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Divider — FM only */}
            {radioFmActive && <div className="w-px bg-white/10 shrink-0 my-10" />}

            {/* Right column */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {radioFmActive ? (
                <>
                  <div className="flex items-center gap-1 px-6 pt-5 pb-3 shrink-0">
                    {(['radio', 'lyrics'] as const).map(tab => (
                      <button key={tab} onClick={() => setFmTab(tab)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                          fmTab === tab ? 'bg-white/10 text-white/90' : 'text-white/35 hover:text-white/65 hover:bg-white/5'
                        }`}>
                        {tab === 'radio' ? 'Radio' : 'Lyrics'}
                      </button>
                    ))}
                  </div>
                  {fmTab === 'radio' ? FmRadioPanel() : <LyricsPanel padded rawLyrics={rawLyrics} isSynced={isSynced} syncedLines={syncedLines} radioFmActive={radioFmActive} currentTrack={currentTrack} isEditor={isEditor} txtPri={txtPri} txtSec={txtSec} txtTer={txtTer} txtFaint={txtFaint} />}
                </>
              ) : (
                <LyricsPanel padded rawLyrics={rawLyrics} isSynced={isSynced} syncedLines={syncedLines} radioFmActive={radioFmActive} currentTrack={currentTrack} isEditor={isEditor} txtPri={txtPri} txtSec={txtSec} txtTer={txtTer} txtFaint={txtFaint} />
              )}
            </div>
          </div>

      </>

      {/* ── Notch menu ── */}
      <div className="group absolute right-0 top-0 bottom-0 z-20 flex items-center">

        {/* Expanded panel — slides in on hover */}
        <div className="overflow-hidden max-w-0 group-hover:max-w-[272px] transition-[max-width] duration-200 ease-out">
          <div
            className="w-64 opacity-0 group-hover:opacity-100 transition-opacity duration-150 delay-75
              bg-black/85 backdrop-blur-2xl rounded-l-2xl border-l border-t border-b border-white/[0.07]
              flex flex-col overflow-hidden"
            style={{ height: 'calc(100vh - 180px)', maxHeight: 560 }}
          >

            {/* Category selector */}
            <div className="relative px-3 pt-3 pb-2 shrink-0">
              <button
                onClick={() => setNotchDropdownOpen(o => !o)}
                className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] transition-colors"
              >
                <span className="text-white/60 text-[10px] font-semibold tracking-wide truncate leading-none">
                  {NOTCH_LABELS[notchCategory]}
                </span>
                <ChevronDown size={10} className={`text-white/30 shrink-0 transition-transform duration-150 ${notchDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {notchDropdownOpen && (
                <div className="absolute top-full left-3 right-3 mt-1 z-10 bg-black/95 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden py-1 shadow-2xl">
                  {(account ? NOTCH_OPTIONS : NOTCH_OPTIONS.filter(o => o.value !== 'playlists')).map(opt => (
                    <button key={opt.value}
                      onClick={() => {
                        setNotchCategory(opt.value)
                        setNotchDropdownOpen(false)
                        setSelectedAlbumId(null)
                      }}
                      className={`w-full px-3 py-2 text-left text-[10px] font-medium transition-colors ${
                        notchCategory === opt.value
                          ? 'text-white/90 bg-white/[0.08]'
                          : 'text-white/45 hover:text-white/80 hover:bg-white/[0.05]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Thin separator */}
            <div className="h-px bg-white/[0.06] mx-3 shrink-0" />

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-3 py-3" style={{ scrollbarWidth: 'none' }}>

              {/* ── Albums ── */}
              {notchCategory === 'albums' ? (
                selectedAlbumId !== null
                  ? <AlbumDetail albumId={selectedAlbumId} />
                  : <AlbumsGrid />

              /* ── Playlists ── */
              ) : notchCategory === 'playlists' && account && playlists.length > 0 ? (
                <div className="grid grid-cols-2 gap-2.5">
                  {playlists.slice(0, 6).map(pl => (
                    <button key={pl.id} onClick={() => handleAddToPlaylist(pl.id)} title={pl.name}
                      className="flex flex-col gap-1.5 text-left group/pl">
                      <div className="w-full aspect-square rounded-xl overflow-hidden ring-1 ring-white/[0.06] group-hover/pl:ring-white/25 transition-all shadow-md">
                        {playlistCoverUrl(pl)
                          ? <img src={playlistCoverUrl(pl)} className="w-full h-full object-cover" />
                          : <div className="w-full h-full bg-white/[0.06] flex items-center justify-center">
                              <Music size={18} className="text-white/15" />
                            </div>}
                      </div>
                      <p className="text-white/55 text-[9px] font-medium truncate px-0.5">{pl.name}</p>
                    </button>
                  ))}
                </div>

              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-2 py-8">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center">
                    <Music size={16} className="text-white/15" />
                  </div>
                  <p className="text-white/20 text-[10px] text-center">Coming soon</p>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Notch handle — pill tab */}
        <div className="w-[5px] group-hover:w-[3px] h-16 group-hover:h-24 rounded-l-full bg-white/20 group-hover:bg-white/50 transition-all duration-200 ease-out shrink-0" />
      </div>
    </div>
  )
}

// ── ProgressBar — module-level so currentTime ticks don't re-render WrldView ──

import { memo as _memo2, useRef as _useRef2, useCallback as _cb2 } from 'react'
// (re-exports already imported above; using same imports)

const ProgressBar = memo(function ProgressBar({ txtPri, txtTer }: { txtPri: string; txtTer: string }) {
  const { progress, currentTime } = useStore(useShallow(s => ({ progress: s.progress, currentTime: s.currentTime })))
  const dragging = useRef(false)
  const barRef   = useRef<HTMLDivElement>(null)

  const fmt = (s: number) => {
    if (!isFinite(s) || isNaN(s) || s < 0) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const seekFromEvent = useCallback((e: React.MouseEvent) => {
    const bar = barRef.current
    if (!bar) return
    const rect = bar.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const dur = getAudioDuration()
    if (dur > 0) seekAudio(pct * dur)
  }, [])

  const duration  = getAudioDuration()
  const remaining = duration > 0 ? duration - currentTime : 0
  const pct       = Math.min(100, (progress || 0) * 100)

  return (
    <div className="w-full flex flex-col gap-1.5 select-none">
      <div
        ref={barRef}
        className="relative h-1 rounded-full cursor-pointer group/bar"
        style={{ background: 'rgba(255,255,255,0.18)' }}
        onMouseDown={e => { dragging.current = true; seekFromEvent(e) }}
        onMouseMove={e => { if (dragging.current) seekFromEvent(e) }}
        onMouseUp={() => { dragging.current = false }}
        onMouseLeave={() => { dragging.current = false }}
      >
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: txtPri }} />
        <div
          className="absolute top-1/2 w-3 h-3 rounded-full shadow-lg opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none"
          style={{ left: `${pct}%`, transform: 'translate(-50%, -50%)', background: txtPri }}
        />
      </div>
      <div className="flex justify-between">
        <span className="text-[10px] tabular-nums" style={{ color: txtTer }}>{fmt(currentTime)}</span>
        <span className="text-[10px] tabular-nums" style={{ color: txtTer }}>{duration > 0 ? `-${fmt(remaining)}` : '-∞'}</span>
      </div>
    </div>
  )
})

// ── LyricsPanel — module-level component so it has its own Zustand selector ──

import type { SyncedLyricLine, Track } from '../types'

interface LyricsPanelProps {
  rawLyrics: string | null
  isSynced: boolean
  syncedLines: SyncedLyricLine[]
  padded?: boolean
  radioFmActive: boolean
  currentTrack: Track | null
  isEditor: boolean | null | undefined
  txtPri: string; txtSec: string; txtTer: string; txtFaint: string
}

const LyricsPanel = memo(function LyricsPanel({
  rawLyrics, isSynced, syncedLines, padded,
  radioFmActive, currentTrack, isEditor,
  txtPri, txtSec, txtTer,
}: LyricsPanelProps) {
  const activeRef = useRef<HTMLDivElement>(null)

  const currentLineIdx = useStore(s => {
    if (!isSynced || syncedLines.length === 0) return -1
    return getCurrentLineIndex(syncedLines, s.currentTime)
  })

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [currentLineIdx])

  if (!rawLyrics) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 px-8">
        {!radioFmActive && !currentTrack
          ? <p className="text-sm text-center" style={{ color: txtTer }}>No track playing</p>
          : radioFmActive
            ? <p className="text-sm text-center" style={{ color: txtTer }}>No lyrics found for this track</p>
            : <>
                <div className="text-5xl opacity-10">♪</div>
                <p className="text-sm text-center" style={{ color: txtTer }}>No lyrics available</p>
                {isEditor && <p className="text-xs text-center mt-1" style={{ color: txtTer }}>Open the editor to add lyrics</p>}
              </>
        }
      </div>
    )
  }

  if (isSynced && syncedLines.length > 0) {
    return (
      <div className="relative flex-1 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none" style={{ height: 80, background: 'linear-gradient(to bottom, rgba(0,0,0,0.55), transparent)' }} />
        <div className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none" style={{ height: 80, background: 'linear-gradient(to top, rgba(0,0,0,0.55), transparent)' }} />
        <div
          className={`h-full overflow-y-auto ${padded ? 'py-24 px-10' : 'py-20 px-5 md:px-8'}`}
          style={{ scrollbarWidth: 'none' }}
        >
          <style>{`::-webkit-scrollbar{display:none}`}</style>
          <div className={`flex flex-col ${padded ? 'gap-5' : 'gap-4'}`}>
            {syncedLines.map((line, i) => {
              if (!line.text) return <div key={i} className="h-3" />
              const isActive = i === currentLineIdx
              const isPast   = i < currentLineIdx
              const dist     = Math.abs(i - currentLineIdx)
              return (
                <div
                  key={i}
                  ref={isActive ? activeRef : undefined}
                  onClick={() => seekAudio(line.time)}
                  className="cursor-pointer select-none"
                  style={{
                    fontSize:   padded ? (isActive ? '1.75rem' : '1.4rem') : (isActive ? '1.4rem' : '1.15rem'),
                    fontWeight: isActive ? 800 : dist === 1 ? 600 : 400,
                    lineHeight: 1.25,
                    color:      isActive ? txtPri : txtSec,
                    opacity:    isActive ? 1 : dist === 1 ? 0.55 : dist === 2 ? 0.35 : 0.2,
                    filter:     (!isActive && !isPast && dist >= 2) ? 'blur(0.6px)' : 'none',
                    transition: 'opacity 0.4s cubic-bezier(0.4,0,0.2,1), color 0.4s cubic-bezier(0.4,0,0.2,1), font-size 0.4s cubic-bezier(0.4,0,0.2,1), font-weight 0.4s cubic-bezier(0.4,0,0.2,1), filter 0.4s cubic-bezier(0.4,0,0.2,1)',
                    textShadow: isActive ? '0 0 30px rgba(255,255,255,0.12)' : 'none',
                  }}
                >
                  {line.text}
                </div>
              )
            })}
            <div className={padded ? 'h-40' : 'h-28'} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex-1 overflow-y-auto ${padded ? 'py-16 pr-16 pl-8' : 'py-4 px-4 md:py-8 md:pr-12 md:pl-6'}`} style={{ scrollbarWidth: 'none' }}>
      <pre className="text-xs md:text-sm leading-6 md:leading-7 whitespace-pre-wrap font-sans" style={{ color: txtSec }}>{rawLyrics}</pre>
    </div>
  )
})
