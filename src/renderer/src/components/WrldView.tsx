import { useEffect, useRef, useMemo } from 'react'
import { Music } from 'lucide-react'
import { useStore } from '../store/useStore'
import { parseLrc, getCurrentLineIndex, isLrcFormat } from '../lib/lyrics'
import { seekAudio } from './Player'

export default function WrldView(): JSX.Element {
  const { currentTrack, currentTrackFull, currentTime, account } = useStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const activeRef    = useRef<HTMLDivElement>(null)

  const artSrc       = currentTrackFull?.albumArt ?? currentTrack?.imageUrl
  const lyrics       = currentTrackFull?.lyrics
  const syncedLyrics = currentTrackFull?.syncedLyrics
  const rawLyrics    = syncedLyrics || lyrics
  const isSynced     = rawLyrics ? isLrcFormat(rawLyrics) : false
  const isEditor     = account?.is_editor || account?.is_administrator

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

  if (!currentTrack) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-black h-full">
        <div className="text-6xl opacity-10">&#9834;</div>
        <p className="text-white/30 text-sm">Play a track to see lyrics</p>
      </div>
    )
  }

  return (
    <div className="relative flex h-full overflow-hidden">
      {/* Full-bleed blurred background */}
      <div className="absolute inset-0 overflow-hidden">
        {artSrc ? (
          <img
            src={artSrc}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: 'blur(60px) brightness(0.22) saturate(2.4)', transform: 'scale(1.2)' }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black" />
        )}
        {/* Top + bottom vignette */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/70" />
      </div>

      {/* Left column — art + meta */}
      <div
        className="relative z-10 flex flex-col items-center justify-center shrink-0 px-10 gap-6"
        style={{ width: '38%', minWidth: 240 }}
      >
        {/* Cover art */}
        <div
          className="rounded-3xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.8)] w-full"
          style={{ aspectRatio: '1' }}
        >
          {artSrc ? (
            <img src={artSrc} alt="Album art" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-white/8 flex items-center justify-center">
              <Music className="text-white/20 w-16 h-16" />
            </div>
          )}
        </div>

        {/* Track info */}
        <div className="text-center w-full px-2">
          <p className="text-white font-bold text-xl leading-tight">{currentTrack.title}</p>
          <p className="text-white/50 text-sm mt-1">{currentTrack.artist}</p>
          {currentTrack.album && (
            <p className="text-white/30 text-xs mt-0.5">{currentTrack.album}</p>
          )}
        </div>
      </div>

      {/* Vertical divider */}
      <div className="relative z-10 w-px bg-white/8 shrink-0 my-10" />

      {/* Right column — lyrics */}
      <div className="relative z-10 flex-1 overflow-hidden flex flex-col">
        {!rawLyrics ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 px-12">
            <div className="text-5xl opacity-10">&#9834;</div>
            <p className="text-white/30 text-sm text-center">No lyrics available</p>
            {isEditor && (
              <p className="text-white/20 text-xs text-center mt-1">
                Open the editor to add lyrics for this track
              </p>
            )}
          </div>
        ) : isSynced && syncedLines.length > 0 ? (
          <div
            ref={containerRef}
            className="flex-1 overflow-y-auto py-20 pr-16 pl-8"
            style={{ scrollbarWidth: 'none' }}
          >
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
                      color:      isActive
                        ? 'rgba(255,255,255,1)'
                        : isPast
                        ? 'rgba(255,255,255,0.28)'
                        : 'rgba(255,255,255,0.18)',
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
            <pre className="text-white/50 text-base leading-8 whitespace-pre-wrap font-sans">
              {rawLyrics}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
