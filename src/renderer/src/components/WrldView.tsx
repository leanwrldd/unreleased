import { useEffect, useRef, useMemo, useState } from 'react'
import { Music, Radio, Search, SkipForward, ThumbsUp, ThumbsDown } from 'lucide-react'
import { useStore } from '../store/useStore'
import { parseLrc, getCurrentLineIndex, isLrcFormat } from '../lib/lyrics'
import { seekAudio } from './Player'
import { buildImageUrl, apiFetch } from '../lib/juicewrldApi'
import { getActiveRadioClient } from '../lib/radioSocketService'
import type { JWApiSong } from '../lib/juicewrldApi'

export default function WrldView(): JSX.Element {
  const {
    currentTrack, currentTrackFull, currentTime, account,
    radioFmActive, setRadioFmActive, radioFmIsLive, radioFmNowPlaying,
    radioFmVote, radioFmUpNext, radioFmQueuePreview,
  } = useStore()

  const containerRef = useRef<HTMLDivElement>(null)
  const activeRef    = useRef<HTMLDivElement>(null)

  // Art error state (for onError fallback)
  const [artError, setArtError] = useState(false)

  // Suggest song state
  const [suggestQuery, setSuggestQuery]     = useState('')
  const [suggestResults, setSuggestResults] = useState<JWApiSong[]>([])
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [proposed, setProposed]             = useState<string | null>(null)
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced search
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
    const t = setTimeout(() => setProposed(null), 4000)
    return () => clearTimeout(t)
  }

  // Art source
  const artSrc = radioFmActive
    ? (buildImageUrl(radioFmNowPlaying?.image_url) ?? null)
    : (buildImageUrl(currentTrackFull?.albumArt ?? currentTrack?.imageUrl ?? null) ?? null)

  useEffect(() => { setArtError(false) }, [artSrc])

  // Lyrics
  const rawLyrics = !radioFmActive ? (currentTrackFull?.syncedLyrics || currentTrackFull?.lyrics) : null
  const isSynced  = rawLyrics ? isLrcFormat(rawLyrics) : false
  const isEditor  = account?.is_editor || account?.is_administrator

  const syncedLines = useMemo(() => {
    if (rawLyrics && isSynced) return parseLrc(rawLyrics)
    return []
  }, [rawLyrics, isSynced])

  const currentLineIdx = isSynced ? getCurrentLineIndex(syncedLines, currentTime) : -1

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [currentLineIdx])

  const fmLabel    = radioFmActive
    ? (radioFmIsLive ? '999 FM · LIVE' : '999 FM · OFFLINE')
    : radioFmIsLive === false ? '999 FM · OFFLINE' : '999 FM'
  const fmDisabled = radioFmIsLive === false && !radioFmActive
  const hasContent = radioFmActive || !!currentTrack

  const displayTitle  = radioFmActive && radioFmNowPlaying ? radioFmNowPlaying.title  : currentTrack?.title
  const displayArtist = radioFmActive && radioFmNowPlaying ? radioFmNowPlaying.artist : currentTrack?.artist
  const displayAlbum  = radioFmActive && radioFmNowPlaying ? radioFmNowPlaying.album  : currentTrack?.album

  return (
    <div className="relative flex flex-1 h-full w-full overflow-hidden">

      {/* 999 FM toggle */}
      <button
        onClick={() => setRadioFmActive(!radioFmActive)}
        disabled={fmDisabled}
        className={`absolute top-4 left-4 z-30 flex items-center gap-2 text-xs font-medium rounded-full px-3 py-1.5 transition-all disabled:opacity-40 ${
          radioFmActive && radioFmIsLive
            ? 'bg-red-600/80 text-white backdrop-blur-sm ring-1 ring-red-400/50'
            : radioFmActive
            ? 'bg-white/10 text-white/50 backdrop-blur-sm'
            : 'bg-black/25 text-white/50 hover:text-white/90 hover:bg-black/50 backdrop-blur-sm'
        }`}
        title={radioFmActive ? 'Turn off 999 FM' : 'Turn on 999 FM'}
      >
        <Radio size={13} className={radioFmActive && radioFmIsLive ? 'animate-pulse' : ''} />
        <span>{fmLabel}</span>
      </button>

      {!hasContent ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-black">
          <div className="text-6xl opacity-10">&#9834;</div>
          <p className="text-white/30 text-sm">Play a track to see lyrics</p>
        </div>
      ) : (
        <>
          {/* Blurred background */}
          <div className="absolute inset-0 overflow-hidden">
            {artSrc && !artError ? (
              <img src={artSrc} alt=""
                className="absolute inset-0 w-full h-full object-cover"
                style={{ filter: 'blur(60px) brightness(0.22) saturate(2.4)', transform: 'scale(1.2)' }}
                onError={() => setArtError(true)}
              />
            ) : (
              <div className={`absolute inset-0 ${radioFmActive ? 'bg-gradient-to-br from-red-950/60 to-black' : 'bg-gradient-to-br from-gray-900 to-black'}`} />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/70" />
          </div>

          {/* Left column — art + meta */}
          <div
            className="relative z-10 flex flex-col items-center justify-center shrink-0 px-10 gap-6"
            style={{ width: '38%', minWidth: 240 }}
          >
            <div className="rounded-3xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.8)] w-full" style={{ aspectRatio: '1' }}>
              {artSrc && !artError ? (
                <img src={artSrc} alt="Album art" className="w-full h-full object-cover" onError={() => setArtError(true)} />
              ) : radioFmActive ? (
                <div className="w-full h-full bg-gradient-to-br from-red-900/60 to-black flex flex-col items-center justify-center gap-3">
                  <Radio className="text-red-400 w-16 h-16 opacity-70" />
                  <span className="text-red-300/70 text-2xl font-bold tracking-widest">999 FM</span>
                </div>
              ) : (
                <div className="w-full h-full bg-white/8 flex items-center justify-center">
                  <Music className="text-white/20 w-16 h-16" />
                </div>
              )}
            </div>

            <div className="text-center w-full px-2">
              {displayTitle  && <p className="text-white font-bold text-xl leading-tight">{displayTitle}</p>}
              {displayArtist && <p className="text-white/50 text-sm mt-1">{displayArtist}</p>}
              {displayAlbum  && <p className="text-white/30 text-xs mt-0.5">{displayAlbum}</p>}
              {radioFmActive && !radioFmNowPlaying && <p className="text-white/30 text-sm mt-1">Tuning in…</p>}
            </div>
          </div>

          {/* Vertical divider */}
          <div className="relative z-10 w-px bg-white/8 shrink-0 my-10" />

          {/* Right column */}
          <div className="relative z-10 flex-1 overflow-hidden flex flex-col">
            {radioFmActive ? (

              /* ── 999 FM interactive panel ────────────────────────────────── */
              <div className="flex-1 overflow-y-auto py-8 px-8 flex flex-col gap-6" style={{ scrollbarWidth: 'none' }}>

                {/* Vote */}
                {radioFmVote?.active ? (
                  <div className="bg-white/5 border border-white/8 rounded-2xl p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <p className="text-white/45 text-[11px] font-semibold uppercase tracking-widest">
                        {radioFmVote.kind === 'skip' ? 'Vote to Skip' : 'Vote to Queue'}
                      </p>
                      {radioFmVote.seconds_left != null && (
                        <span className="text-white/25 text-xs tabular-nums">{radioFmVote.seconds_left}s left</span>
                      )}
                    </div>
                    {radioFmVote.track && (
                      <p className="text-white/80 text-sm font-medium">{radioFmVote.track}</p>
                    )}
                    <p className="text-white/30 text-xs">
                      {radioFmVote.yes ?? 0} yes &middot; {radioFmVote.no ?? 0} no
                      {radioFmVote.votes_needed != null && <span> &middot; need {radioFmVote.votes_needed}</span>}
                    </p>
                    <div className="flex gap-2">
                      <button onClick={() => getActiveRadioClient()?.castVote('yes')}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-green-600/15 hover:bg-green-600/30 text-green-400 text-sm font-medium transition-colors">
                        <ThumbsUp size={13} /> Yes
                      </button>
                      <button onClick={() => getActiveRadioClient()?.castVote('no')}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-900/15 hover:bg-red-900/30 text-red-400 text-sm font-medium transition-colors">
                        <ThumbsDown size={13} /> No
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => getActiveRadioClient()?.proposeSkip()}
                    className="flex items-center gap-2 text-sm text-white/30 hover:text-white/65 transition-colors self-start"
                  >
                    <SkipForward size={14} /> Vote to skip
                  </button>
                )}

                {/* Suggest next song */}
                <div className="flex flex-col gap-2">
                  <p className="text-white/40 text-[11px] font-semibold uppercase tracking-widest">Suggest next song</p>
                  {proposed ? (
                    <div className="flex items-center gap-2 text-green-400/80 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0 animate-pulse" />
                      Proposed: {proposed}
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
                        <input
                          type="text"
                          value={suggestQuery}
                          onChange={(e) => setSuggestQuery(e.target.value)}
                          placeholder="Search songs…"
                          className="w-full bg-white/5 text-white/80 placeholder-white/20 text-sm rounded-xl py-2 pl-8 pr-3 border border-white/10 focus:outline-none focus:border-white/25 transition-colors"
                        />
                      </div>
                      {suggestLoading && <p className="text-white/25 text-xs pl-1">Searching…</p>}
                      {suggestResults.length > 0 && (
                        <div className="flex flex-col -mx-1">
                          {suggestResults.map(song => (
                            <button key={song.id} onClick={() => handlePropose(song)}
                              className="text-left px-3 py-2 rounded-xl hover:bg-white/8 transition-colors group">
                              <p className="text-white/70 text-sm truncate group-hover:text-white/90 transition-colors">
                                {song.track_titles?.[0] || song.name}
                              </p>
                              <p className="text-white/28 text-xs truncate">{song.credited_artists}</p>
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
                    <div className="bg-white/5 border border-white/5 rounded-xl px-4 py-3">
                      <p className="text-white/80 text-sm font-medium truncate">{radioFmUpNext.title}</p>
                      {radioFmUpNext.artist && <p className="text-white/35 text-xs mt-0.5">{radioFmUpNext.artist}</p>}
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
                          <span className="text-white/18 text-xs w-4 text-right shrink-0">{i + 1}</span>
                          <p className="text-white/45 text-sm truncate">{title}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

            ) : !rawLyrics ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 px-12">
                <div className="text-5xl opacity-10">&#9834;</div>
                <p className="text-white/30 text-sm text-center">No lyrics available</p>
                {isEditor && (
                  <p className="text-white/20 text-xs text-center mt-1">Open the editor to add lyrics for this track</p>
                )}
              </div>
            ) : isSynced && syncedLines.length > 0 ? (
              <div ref={containerRef} className="flex-1 overflow-y-auto py-20 pr-16 pl-8" style={{ scrollbarWidth: 'none' }}>
                <style>{`.wrld-scroll::-webkit-scrollbar { display: none; }`}</style>
                <div className="wrld-scroll">
                  {syncedLines.map((line, i) => {
                    const isActive = i === currentLineIdx
                    const isPast   = i < currentLineIdx
                    if (!line.text) return <div key={i} className="h-5" />
                    return (
                      <div
                        key={i}
                        ref={isActive ? activeRef : undefined}
                        onClick={() => seekAudio(line.time)}
                        className="cursor-pointer leading-tight transition-all duration-300 mb-5"
                        style={{
                          fontSize:   isActive ? '2rem' : '1.25rem',
                          fontWeight: isActive ? 800 : 500,
                          lineHeight: isActive ? 1.2 : 1.35,
                          color:      isActive ? 'rgba(255,255,255,1)' : isPast ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.18)',
                          textShadow: isActive ? '0 0 40px rgba(255,255,255,0.2)' : 'none',
                          transform:  isActive ? 'translateX(6px)' : 'none',
                        }}
                      >
                        {line.text}
                      </div>
                    )
                  })}
                  <div className="h-40" />
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto py-16 pr-16 pl-8" style={{ scrollbarWidth: 'none' }}>
                <pre className="text-white/50 text-base leading-8 whitespace-pre-wrap font-sans">{rawLyrics}</pre>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
