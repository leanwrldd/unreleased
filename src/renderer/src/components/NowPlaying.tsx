import { useState, useEffect, useRef, useMemo } from 'react'
import { useResizablePanel } from '../hooks/useResizablePanel'
import { X, Music, Pencil, Info } from 'lucide-react'
import { useStore } from '../store/useStore'
import LyricsDisplay from './LyricsDisplay'
import SongInfoModal from './SongInfoModal'
import { apiFetch, JWApiSong } from '../lib/juicewrldApi'
import { parseLrc, getCurrentLineIndex, isLrcFormat } from '../lib/lyrics'
import { seekAudio } from './Player'

// ── WRLD immersive lyrics ─────────────────────────────────────────────────────

function WrldLyrics({ artSrc }: { artSrc: string | null | undefined }): JSX.Element {
  const { currentTrackFull, currentTime, currentTrack, account } = useStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLDivElement>(null)

  const lyrics      = currentTrackFull?.lyrics
  const syncedLyrics = currentTrackFull?.syncedLyrics
  const rawLyrics   = syncedLyrics || lyrics
  const isSynced    = rawLyrics ? isLrcFormat(rawLyrics) : false

  const syncedLines = useMemo(() => {
    if (rawLyrics && isSynced) return parseLrc(rawLyrics)
    return []
  }, [rawLyrics, isSynced])

  const currentLineIdx = isSynced ? getCurrentLineIndex(syncedLines, currentTime) : -1
  const isEditor = account?.is_editor || account?.is_administrator

  useEffect(() => {
    if (activeRef.current && containerRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [currentLineIdx])

  return (
    <div className="relative flex flex-col h-full overflow-hidden">
      {/* Full-bleed blurred background */}
      <div className="absolute inset-0 overflow-hidden">
        {artSrc ? (
          <img
            src={artSrc}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: 'blur(48px) brightness(0.28) saturate(2.2)', transform: 'scale(1.15)' }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black" />
        )}
        {/* Vignette overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />
      </div>

      {/* Content */}
      <div className="relative flex flex-col h-full z-10">
        {/* Album art + track info */}
        <div className="flex flex-col items-center px-6 pt-6 pb-4 shrink-0">
          <div
            className="rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.7)] mb-4"
            style={{ width: '72%', aspectRatio: '1' }}
          >
            {artSrc ? (
              <img src={artSrc} alt="Album art" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-white/10 flex items-center justify-center">
                <Music className="text-white/30 w-12 h-12" />
              </div>
            )}
          </div>
          <p className="text-white font-bold text-lg text-center leading-tight truncate w-full px-2">
            {currentTrack?.title}
          </p>
          <p className="text-white/50 text-sm text-center mt-0.5 truncate w-full px-2">
            {currentTrack?.artist}
          </p>
        </div>

        {/* Divider */}
        <div className="mx-6 h-px bg-white/10 shrink-0" />

        {/* Lyrics */}
        {!rawLyrics ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 px-8">
            <div className="text-4xl opacity-20">♪</div>
            <p className="text-white/40 text-sm text-center">No lyrics available</p>
            {isEditor && (
              <p className="text-white/25 text-xs text-center mt-1">
                Right-click a track → Edit info &amp; lyrics
              </p>
            )}
          </div>
        ) : isSynced && syncedLines.length > 0 ? (
          <div
            ref={containerRef}
            className="flex-1 overflow-y-auto px-6 py-6 space-y-3"
            style={{ scrollbarWidth: 'none' }}
          >
            <style>{`.wrld-lyrics::-webkit-scrollbar { display: none; }`}</style>
            <div className="wrld-lyrics h-full">
              {syncedLines.map((line, i) => {
                const isActive = i === currentLineIdx
                const isPast   = i < currentLineIdx
                if (!line.text) return <div key={i} className="h-3" />
                return (
                  <div
                    key={i}
                    ref={isActive ? activeRef : undefined}
                    onClick={() => seekAudio(line.time)}
                    className="cursor-pointer leading-snug transition-all duration-300 mb-3"
                    style={{
                      fontSize:   isActive ? '1.45rem' : '1.1rem',
                      fontWeight: isActive ? 700 : 500,
                      color:      isActive ? 'rgba(255,255,255,1)' : isPast ? 'rgba(255,255,255,0.32)' : 'rgba(255,255,255,0.22)',
                      textShadow: isActive ? '0 0 30px rgba(255,255,255,0.25)' : 'none',
                      transform:  isActive ? 'translateX(4px)' : 'none',
                    }}
                  >
                    {line.text}
                  </div>
                )
              })}
              <div className="h-24" />
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-6" style={{ scrollbarWidth: 'none' }}>
            <pre
              className="text-white/55 text-sm leading-7 whitespace-pre-wrap font-sans"
            >
              {rawLyrics}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main NowPlaying ───────────────────────────────────────────────────────────

export default function NowPlaying(): JSX.Element {
  const {
    currentTrack,
    currentTrackFull,
    setShowNowPlaying,
    account,
    setPendingEditorSongId,
    setActiveView,
  } = useStore()

  const [panelWidth, dragHandle] = useResizablePanel(380, 300, 560)
  const [isMobile, setIsMobile]  = useState(window.innerWidth < 768)
  const [infoSong, setInfoSong]  = useState<JWApiSong | null>(null)
  const [loadingInfo, setLoadingInfo] = useState(false)
  const [tab, setTab]            = useState<'default' | 'wrld'>('default')

  useEffect(() => {
    const check = (): void => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => { setInfoSong(null) }, [currentTrack?.id])

  const handleInfo = async (): Promise<void> => {
    const jwMatch = currentTrack?.id.match(/^jw-(\d+)$/)
    if (!jwMatch) return
    setLoadingInfo(true)
    try {
      const song = await apiFetch<JWApiSong>(`/songs/${jwMatch[1]}/`)
      setInfoSong(song)
    } catch { /* silently fail */ }
    finally { setLoadingInfo(false) }
  }

  const jwMatch = currentTrack?.id.match(/^jw-(\d+)$/)
  const canEdit  = !!account?.is_editor
  const artSrc   = currentTrackFull?.albumArt ?? currentTrack?.imageUrl

  return (
    <div
      className="bg-surface-raised flex shrink-0 overflow-hidden animate-slide-in-right"
      style={isMobile
        ? { position: 'fixed', inset: 0, zIndex: 50 }
        : { width: panelWidth, borderLeft: '1px solid var(--border)' }
      }
    >
      {/* Resize handle — desktop only */}
      {!isMobile && (
        <div className="w-1 shrink-0 relative group/handle" {...dragHandle}>
          <div className="absolute inset-y-0 -left-1 -right-1 group-hover/handle:bg-accent/30 transition-colors rounded-full" />
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0 relative z-20"
          style={tab === 'wrld' && artSrc ? { background: 'transparent' } : undefined}
        >
          {/* Tab switcher */}
          <div className="flex items-center gap-1 bg-surface-overlay rounded-full p-0.5">
            <button
              onClick={() => setTab('default')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                tab === 'default'
                  ? 'bg-surface text-text-primary shadow-sm'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              Playing
            </button>
            <button
              onClick={() => setTab('wrld')}
              className={`px-3 py-1 rounded-full text-xs font-medium tracking-wide transition-all ${
                tab === 'wrld'
                  ? 'bg-surface text-text-primary shadow-sm'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              WRLD
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {jwMatch && (
              <button
                onClick={handleInfo}
                disabled={loadingInfo}
                className={`transition-colors disabled:opacity-40 ${
                  tab === 'wrld' && artSrc ? 'text-white/60 hover:text-white' : 'text-text-muted hover:text-text-primary'
                }`}
                title="Song info"
              >
                <Info size={16} />
              </button>
            )}
            {jwMatch && canEdit && (
              <button
                onClick={() => { setPendingEditorSongId(parseInt(jwMatch[1])); setActiveView('editor') }}
                className={`transition-colors ${
                  tab === 'wrld' && artSrc ? 'text-white/60 hover:text-white' : 'text-text-muted hover:text-text-primary'
                }`}
                title="Edit this song"
              >
                <Pencil size={15} />
              </button>
            )}
            <button
              onClick={() => setShowNowPlaying(false)}
              className={`transition-colors ${
                tab === 'wrld' && artSrc ? 'text-white/60 hover:text-white' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Content ───────────────────────────────────────────────────── */}
        {!currentTrack ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 px-8">
            <div className="w-24 h-24 rounded-full bg-surface-overlay flex items-center justify-center">
              <Music className="text-text-muted w-10 h-10" />
            </div>
            <p className="text-text-muted text-sm text-center">Play a track to see it here</p>
          </div>
        ) : tab === 'wrld' ? (
          // ── WRLD tab ──────────────────────────────────────────────────
          <div className="flex-1 overflow-hidden -mt-14 pt-14">
            <WrldLyrics artSrc={artSrc} />
          </div>
        ) : (
          // ── Default tab ───────────────────────────────────────────────
          <>
            <div className="px-6 shrink-0">
              <div className={`${isMobile ? 'h-48' : 'aspect-square'} w-full rounded-xl overflow-hidden bg-surface-overlay shadow-2xl`}>
                {artSrc ? (
                  <img src={artSrc} alt="Album Art" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music className="text-text-muted w-16 h-16" />
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-3 shrink-0">
              <p className="text-text-primary font-bold text-lg truncate">{currentTrack.title}</p>
              <p className="text-text-muted text-sm truncate mt-0.5">{currentTrack.artist}</p>
              <p className="text-text-muted text-xs truncate mt-0.5">{currentTrack.album}</p>
            </div>
            <div className="flex-1 overflow-hidden">
              <LyricsDisplay />
            </div>
          </>
        )}
      </div>

      {/* Song info modal */}
      {infoSong && (
        <SongInfoModal
          song={infoSong}
          onClose={() => setInfoSong(null)}
          onEdit={canEdit ? (songId) => {
            setInfoSong(null)
            setPendingEditorSongId(songId)
            setActiveView('editor')
          } : undefined}
        />
      )}
    </div>
  )
}
