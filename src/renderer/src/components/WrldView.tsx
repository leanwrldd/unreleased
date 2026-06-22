import { useEffect, useRef, useMemo, useState } from 'react'
import { Music, Radio, Search, SkipForward, ThumbsUp, ThumbsDown, X, LocateFixed } from 'lucide-react'
import { useStore } from '../store/useStore'
import { parseLrc, getCurrentLineIndex, isLrcFormat } from '../lib/lyrics'
import { seekAudio } from './Player'
import { buildImageUrl, apiFetch } from '../lib/juicewrldApi'
import { getActiveRadioClient } from '../lib/radioSocketService'
import type { JWApiSong } from '../lib/juicewrldApi'
import * as userApi from '../lib/userApi'

export default function WrldView(): JSX.Element {
  const {
    currentTrack, currentTrackFull, currentTime, account,
    radioFmActive, setRadioFmActive, radioFmIsLive, radioFmNowPlaying,
    radioFmVote, radioFmUpNext, radioFmQueuePreview,
    radioFmMatchedSong,
    playlists,
  } = useStore()

  const containerRef = useRef<HTMLDivElement>(null)
  const activeRef    = useRef<HTMLDivElement>(null)
  const [artError, setArtError] = useState(false)
  const [fmTab, setFmTab] = useState<'radio' | 'lyrics'>('radio')
  const [suggestQuery, setSuggestQuery]     = useState('')
  const [suggestResults, setSuggestResults] = useState<JWApiSong[]>([])
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [proposed, setProposed]             = useState<string | null>(null)
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const proposeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  const rawLyrics = radioFmActive
    ? (radioFmMatchedSong?.syncedLyrics || radioFmMatchedSong?.lyrics || null)
    : (currentTrackFull?.syncedLyrics || currentTrackFull?.lyrics || null)
  const isSynced  = rawLyrics ? isLrcFormat(rawLyrics) : false
  const isEditor  = account?.is_editor || account?.is_administrator

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

  const currentLineIdx = isSynced ? getCurrentLineIndex(syncedLines, currentTime) : -1

  const [autoFollow, setAutoFollow] = useState(true)
  const [manualCenter, setManualCenter] = useState(0)
  // Reset to auto-follow when the track or lyrics change
  useEffect(() => { setAutoFollow(true) }, [rawLyrics])

  const fmLabel    = radioFmActive
    ? (radioFmIsLive ? '999 FM · LIVE' : '999 FM · OFF')
    : radioFmIsLive === false ? '999 FM · OFF' : '999 FM'
  const fmDisabled = radioFmIsLive === false && !radioFmActive
  const hasContent = radioFmActive || !!currentTrack

  const displayTitle  = radioFmActive && radioFmNowPlaying ? radioFmNowPlaying.title  : currentTrack?.title
  const displayArtist = radioFmActive && radioFmNowPlaying ? radioFmNowPlaying.artist : currentTrack?.artist
  const displayAlbum  = radioFmActive && radioFmNowPlaying ? radioFmNowPlaying.album  : currentTrack?.album

  /* ── Shared sub-components ─────────────────────────────────────────────── */

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
      {radioFmVote?.active ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-white/50 text-[11px] font-semibold uppercase tracking-widest">
              {radioFmVote.kind === 'skip' ? 'Vote to Skip' : 'Vote to Queue'}
            </p>
            {radioFmVote.seconds_left != null && (
              <span className="text-white/30 text-xs tabular-nums">{radioFmVote.seconds_left}s left</span>
            )}
          </div>
          {radioFmVote.track && <p className="text-white/80 text-sm font-medium">{radioFmVote.track}</p>}
          <p className="text-white/30 text-xs">
            {radioFmVote.yes ?? 0} yes · {radioFmVote.no ?? 0} no
            {radioFmVote.votes_needed != null && <span> · need {radioFmVote.votes_needed}</span>}
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

  const LyricsPanel = ({ padded }: { padded?: boolean }) => {
    const noLyricsMsg = radioFmActive
      ? <p className="text-white/30 text-sm text-center">No lyrics found for this track</p>
      : <>
          <div className="text-5xl opacity-10">&#9834;</div>
          <p className="text-white/30 text-sm text-center">No lyrics available</p>
          {isEditor && <p className="text-white/20 text-xs text-center mt-1">Open the editor to add lyrics</p>}
        </>

    if (!rawLyrics) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-8">
          {!radioFmActive && !currentTrack
            ? <p className="text-white/30 text-sm text-center">No track playing</p>
            : noLyricsMsg}
        </div>
      )
    }

    // ── Synced lyrics ─────────────────────────────────────────────────────────
    if (isSynced && syncedLines.length > 0) {
      // centerIdx: live when auto-following, frozen+scrollable when manual
      const centerIdx = autoFollow ? currentLineIdx : manualCenter
      const winStart  = Math.max(0, centerIdx - 2)
      const winEnd    = Math.min(syncedLines.length - 1, centerIdx + 2)
      const visible   = syncedLines.slice(winStart, winEnd + 1)

      return (
        <div
          className={`flex-1 flex flex-col select-none overflow-hidden relative ${padded ? 'justify-start pt-[14%] pl-6 pr-10 gap-5' : 'justify-center pl-3 pr-5 md:pl-4 md:pr-8 gap-3 md:gap-4'}`}
          onWheel={(e) => {
            e.preventDefault()
            if (autoFollow) {
              setAutoFollow(false)
              setManualCenter(currentLineIdx)
            } else {
              const dir = e.deltaY > 0 ? 1 : -1
              setManualCenter(c => Math.max(0, Math.min(syncedLines.length - 1, c + dir)))
            }
          }}
        >
          {visible.map((line, i) => {
            const absIdx   = winStart + i
            const isCenter = absIdx === centerIdx
            const dist     = absIdx - centerIdx
            if (!line.text) return null
            return (
              <div
                key={absIdx}
                onClick={() => seekAudio(line.time)}
                className="cursor-pointer leading-tight transition-all duration-300"
                style={{
                  fontSize:   isCenter ? (padded ? '1.65rem' : '1.2rem')
                            : Math.abs(dist) === 1 ? (padded ? '1.1rem' : '0.95rem')
                            : (padded ? '0.9rem' : '0.8rem'),
                  fontWeight: isCenter ? 800 : Math.abs(dist) === 1 ? 500 : 400,
                  lineHeight: 1.3,
                  color:      isCenter ? 'rgba(255,255,255,1)'
                            : dist < 0  ? 'rgba(255,255,255,0.28)'
                            :             'rgba(255,255,255,0.18)',
                  opacity:    Math.abs(dist) === 2 ? 0.55 : 1,
                  textShadow: isCenter ? '0 0 40px rgba(255,255,255,0.15)' : 'none',
                  transform:  isCenter ? (padded ? 'translateX(8px)' : 'translateX(4px)') : 'none',
                }}
              >
                {line.text}
              </div>
            )
          })}
          {!autoFollow && (
            <button
              onClick={() => setAutoFollow(true)}
              className="mt-2 self-start flex items-center gap-1.5 text-[11px] text-white/20 hover:text-white/60 transition-colors"
            >
              <LocateFixed size={10} />
              Follow
            </button>
          )}
        </div>
      )
    }

    // ── Plain lyrics ──────────────────────────────────────────────────────────
    return (
      <div className={`flex-1 overflow-y-auto ${padded ? 'py-16 pr-16 pl-8' : 'py-4 px-4 md:py-8 md:pr-12 md:pl-6'}`} style={{ scrollbarWidth: 'none' }}>
        <pre className="text-white/50 text-xs md:text-sm leading-6 md:leading-7 whitespace-pre-wrap font-sans">{rawLyrics}</pre>
      </div>
    )
  }

  /* ── Render ────────────────────────────────────────────────────────────── */

  return (
    <div className="relative flex flex-col md:flex-row flex-1 h-full w-full overflow-hidden">

      {/* 999 FM toggle — top-right on mobile, top-left on desktop */}
      <button
        onClick={() => setRadioFmActive(!radioFmActive)}
        disabled={fmDisabled}
        className={`absolute z-30 flex items-center gap-2 text-xs font-medium rounded-full px-3 py-1.5 transition-all disabled:opacity-40
          top-3 right-3 md:top-4 md:left-4 md:right-auto
          ${radioFmActive && radioFmIsLive
            ? 'bg-red-600/80 text-white backdrop-blur-sm ring-1 ring-red-400/50'
            : radioFmActive
            ? 'bg-white/10 text-white/50 backdrop-blur-sm'
            : 'bg-black/25 text-white/50 hover:text-white/90 hover:bg-black/50 backdrop-blur-sm'}`}
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

          {/* ── Mobile layout ─────────────────────────────────────────────── */}
          <div className="md:hidden relative z-10 flex flex-col h-full">

            {/* Header: art + title */}
            <div className="flex items-center gap-3 px-4 pt-12 pb-3 shrink-0">
              <ArtBox mobile />
              <div className="flex-1 min-w-0">
                {displayTitle  && <p className="text-white font-bold text-sm leading-tight truncate">{displayTitle}</p>}
                {displayArtist && <p className="text-white/50 text-xs mt-0.5 truncate">{displayArtist}</p>}
                {displayAlbum  && <p className="text-white/30 text-xs mt-0.5 truncate">{displayAlbum}</p>}
                {radioFmActive && !radioFmNowPlaying && <p className="text-white/30 text-xs mt-0.5">Tuning in…</p>}
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
              ? (fmTab === 'radio' ? <FmRadioPanel /> : <LyricsPanel />)
              : <LyricsPanel />
            }
          </div>

          {/* ── Desktop layout ─────────────────────────────────────────────── */}
          <div className="hidden md:flex relative z-10 flex-1 h-full overflow-hidden">

            {/* Left column */}
            <div className="flex flex-col items-center justify-center shrink-0 px-10 gap-6"
              style={{ width: '38%', minWidth: 240 }}>
              <ArtBox mobile={false} />
              <div className="text-center w-full px-2">
                {displayTitle  && <p className="text-white font-bold text-xl leading-tight">{displayTitle}</p>}
                {displayArtist && <p className="text-white/50 text-sm mt-1">{displayArtist}</p>}
                {displayAlbum  && <p className="text-white/30 text-xs mt-0.5">{displayAlbum}</p>}
                {radioFmActive && !radioFmNowPlaying && <p className="text-white/30 text-sm mt-1">Tuning in…</p>}
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
                  {fmTab === 'radio' ? <FmRadioPanel /> : <LyricsPanel padded />}
                </>
              ) : (
                <LyricsPanel padded />
              )}
            </div>
          </div>

          {/* ── Playlist notch ────────────────────────────────────────────── */}
          {account && playlists.length > 0 && currentTrack && (
            <div className="group absolute right-0 top-1/2 -translate-y-1/2 z-20 flex items-center">
              {/* Expanded panel — width opens first, content fades in behind */}
              <div className="overflow-hidden max-w-0 group-hover:max-w-[160px] transition-[max-width] duration-200 ease-out">
                <div className="w-36 opacity-0 group-hover:opacity-100 transition-opacity duration-150 delay-75
                  bg-black/80 backdrop-blur-xl rounded-l-2xl border-l border-t border-b border-white/[0.08]
                  flex flex-col gap-0 py-2 px-2">
                  {playlists.slice(0, 6).map(pl => (
                    <button key={pl.id} onClick={() => handleAddToPlaylist(pl.id)}
                      className="flex items-center gap-2 px-2 py-2.5 rounded-lg hover:bg-white/10 transition-colors text-left group/pl">
                      <div className="w-5 h-5 rounded shrink-0 bg-white/10 overflow-hidden">
                        {(pl.cover_image_url || pl.cover_image) &&
                          <img src={pl.cover_image_url ?? pl.cover_image ?? ''} className="w-full h-full object-cover" />}
                      </div>
                      <span className="text-white/55 group-hover/pl:text-white/90 text-[11px] font-medium truncate transition-colors">{pl.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              {/* Notch handle — always visible, grows on hover */}
              <div className="w-px group-hover:w-[2px] h-40 group-hover:h-60 rounded-sm bg-white/[0.18] group-hover:bg-white/50 transition-all duration-200 ease-out shrink-0" />
            </div>
          )}

        </>
      )}
    </div>
  )
}
