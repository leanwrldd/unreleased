import { useEffect, useRef, useMemo } from 'react'
import { parseLrc, getCurrentLineIndex, isLrcFormat } from '../lib/lyrics'
import { useStore } from '../store/useStore'
import { seekAudio } from './Player'

export default function LyricsDisplay(): JSX.Element {
  const { currentTrackFull, currentTime, account } = useStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLDivElement>(null)

  const lyrics = currentTrackFull?.lyrics
  const syncedLyrics = currentTrackFull?.syncedLyrics

  const rawLyrics = syncedLyrics || lyrics
  const isSynced = rawLyrics ? isLrcFormat(rawLyrics) : false

  const syncedLines = useMemo(() => {
    if (rawLyrics && isSynced) return parseLrc(rawLyrics)
    return []
  }, [rawLyrics, isSynced])

  const currentLineIdx = isSynced ? getCurrentLineIndex(syncedLines, currentTime) : -1

  // Auto-scroll to active line
  useEffect(() => {
    if (activeRef.current && containerRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [currentLineIdx])

  const isEditor = account?.is_editor || account?.is_administrator

  if (!rawLyrics) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
        <div className="text-5xl opacity-20">♪</div>
        <p className="text-text-muted text-sm">No lyrics available</p>
        {isEditor && (
          <p className="text-text-muted text-xs">
            Right-click a track → "Edit info & lyrics" to add lyrics
          </p>
        )}
      </div>
    )
  }

  if (isSynced && syncedLines.length > 0) {
    return (
      <div
        ref={containerRef}
        className="h-full overflow-y-auto py-16 px-8 space-y-4"
        style={{ scrollbarWidth: 'none' }}
      >
        <style>{`::-webkit-scrollbar { display: none; }`}</style>
        {syncedLines.map((line, i) => {
          const state =
            i === currentLineIdx ? 'active' : i < currentLineIdx ? 'past' : 'future'

          // Empty line = visual spacer between verses
          if (!line.text) {
            return <div key={i} className="h-4" />
          }

          return (
            <div
              key={i}
              ref={i === currentLineIdx ? activeRef : undefined}
              onClick={() => seekAudio(line.time)}
              className={`lyric-line text-left leading-relaxed cursor-pointer transition-opacity hover:opacity-100 ${
                state === 'active'
                  ? 'text-text-primary text-2xl font-bold'
                  : state === 'past'
                  ? 'text-text-muted text-xl opacity-60'
                  : 'text-text-secondary text-xl opacity-50'
              }`}
            >
              {line.text}
            </div>
          )
        })}
        <div className="h-32" />
      </div>
    )
  }

  // Plain text lyrics
  return (
    <div className="h-full overflow-y-auto py-8 px-8">
      <pre className="text-text-secondary text-sm leading-8 whitespace-pre-wrap font-sans">
        {rawLyrics}
      </pre>
    </div>
  )
}
