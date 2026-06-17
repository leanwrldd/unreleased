import { useRef, useState, useEffect } from 'react'
import { X, GripVertical, ListMusic, Trash2 } from 'lucide-react'
import { useStore } from '../store/useStore'
import { AlbumArtThumbnail } from './AlbumArtThumbnail'
import { formatDuration } from '../lib/lyrics'
import { Track } from '../types'
import { useResizablePanel } from '../hooks/useResizablePanel'

export default function QueuePanel(): JSX.Element {
  const {
    queue, queueIndex, currentTrack, isPlaying,
    setShowQueue, removeFromQueue, clearQueue, reorderQueue, playTrack
  } = useStore()

  const [panelWidth, dragHandle] = useResizablePanel(300, 240, 480)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const check = (): void => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const upcoming = queue.slice(queueIndex + 1)
  const past = queue.slice(0, queueIndex)

  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  const handleDragStart = (e: React.DragEvent, idx: number): void => {
    setDragIdx(idx)
    e.dataTransfer.effectAllowed = 'move'
  }
  const handleDragOver = (e: React.DragEvent, idx: number): void => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIdx(idx)
  }
  const handleDrop = (idx: number): void => {
    if (dragIdx !== null && dragIdx !== idx) reorderQueue(dragIdx, idx)
    setDragIdx(null)
    setDragOverIdx(null)
  }
  const handleDragEnd = (): void => { setDragIdx(null); setDragOverIdx(null) }

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

      {/* Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <ListMusic size={16} className="text-text-muted" />
            <h2 className="text-text-primary font-semibold text-sm uppercase tracking-widest">Queue</h2>
          </div>
          <div className="flex items-center gap-2">
            {upcoming.length > 0 && (
              <button
                onClick={clearQueue}
                className="text-text-muted hover:text-red-400 transition-colors text-xs flex items-center gap-1"
                title="Clear upcoming"
              >
                <Trash2 size={13} /> Clear
              </button>
            )}
            <button onClick={() => setShowQueue(false)} className="text-text-muted hover:text-text-primary transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
          {/* Now Playing */}
          {currentTrack && (
            <div className="px-4 pb-3">
              <p className="text-text-muted text-xs uppercase tracking-widest px-1 mb-2">Now Playing</p>
              <QueueRow track={currentTrack} isActive isPlaying={isPlaying} onRemove={undefined} />
            </div>
          )}

          {/* Upcoming */}
          {upcoming.length > 0 ? (
            <div className="px-4 pb-6">
              <p className="text-text-muted text-xs uppercase tracking-widest px-1 mb-2">
                Next Up · {upcoming.length}
              </p>
              {upcoming.map((track, i) => (
                <div
                  key={`${track.id}-${queueIndex + 1 + i}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, i)}
                  onDragOver={(e) => handleDragOver(e, i)}
                  onDrop={() => handleDrop(i)}
                  onDragEnd={handleDragEnd}
                  className={`transition-all ${dragOverIdx === i && dragIdx !== i ? 'translate-y-0.5 opacity-70' : ''} ${dragIdx === i ? 'opacity-30' : ''}`}
                >
                  <QueueRow
                    track={track}
                    isActive={false}
                    isPlaying={false}
                    showDrag
                    onPlay={() => playTrack(track, queue.slice(queueIndex + 1 + i))}
                    onRemove={() => removeFromQueue(queueIndex + 1 + i)}
                  />
                </div>
              ))}
            </div>
          ) : (
            !currentTrack && (
              <div className="flex flex-col items-center justify-center h-40 gap-2 text-center px-8">
                <ListMusic className="text-text-muted w-8 h-8 opacity-30" />
                <p className="text-text-muted text-sm">Queue is empty</p>
                <p className="text-text-muted text-xs">Right-click a track to add it</p>
              </div>
            )
          )}

          {upcoming.length === 0 && currentTrack && (
            <div className="px-5 py-3 text-text-muted text-xs text-center opacity-60">
              Nothing up next
            </div>
          )}

          {/* History */}
          {past.length > 0 && (
            <div className="px-4 pb-6 opacity-50">
              <p className="text-text-muted text-xs uppercase tracking-widest px-1 mb-2">History</p>
              {[...past].reverse().slice(0, 8).map((track, i) => (
                <QueueRow
                  key={`past-${track.id}-${i}`}
                  track={track}
                  isActive={false}
                  isPlaying={false}
                  onPlay={() => playTrack(track)}
                  onRemove={undefined}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function QueueRow({ track, isActive, isPlaying, showDrag, onPlay, onRemove }: {
  track: Track
  isActive: boolean
  isPlaying: boolean
  showDrag?: boolean
  onPlay?: () => void
  onRemove?: () => void
}): JSX.Element {
  return (
    <div
      className={`flex items-center gap-2 px-1 py-1.5 rounded-lg group transition-colors ${
        isActive ? 'bg-surface-overlay' : 'hover:bg-surface-overlay'
      } ${onPlay ? 'cursor-pointer' : ''}`}
      onDoubleClick={onPlay}
    >
      {showDrag ? (
        <div className="text-text-muted opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing shrink-0 transition-opacity">
          <GripVertical size={14} />
        </div>
      ) : (
        <div className="w-3.5 shrink-0" />
      )}

      <div className="w-9 h-9 rounded shrink-0 overflow-hidden bg-surface-overlay">
        <AlbumArtThumbnail track={track} size={36} className="w-full h-full" shimmer={false} rootMargin="200px" />
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium truncate ${isActive ? 'text-accent' : 'text-text-primary'}`}>
          {track.title}
        </p>
        <p className="text-xs text-text-muted truncate">{track.artist}</p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <span className="text-text-muted text-xs tabular-nums opacity-60">
          {formatDuration(track.duration)}
        </span>
        {onRemove && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemove() }}
            className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-400 transition-all ml-1"
          >
            <X size={12} />
          </button>
        )}
      </div>
    </div>
  )
}
