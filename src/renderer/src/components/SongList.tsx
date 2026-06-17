import { useState } from 'react'
import { Play, MoreHorizontal, Clock, ArrowUp, ArrowDown, Check } from 'lucide-react'
import { Track } from '../types'
import type { SortField, SortDir, Cols } from '../types'
import { AlbumArtThumbnail } from './AlbumArtThumbnail'
import { formatDuration } from '../lib/lyrics'

export type { SortField, SortDir, Cols }

export function buildGrid(cols: Cols): string {
  return (
    ['32px', cols.art ? '48px' : null, '1fr',
      cols.artist ? '1fr' : null, cols.album ? '1fr' : null,
      cols.year ? '52px' : null, cols.genre ? '100px' : null,
      cols.duration ? '60px' : null
    ].filter(Boolean) as string[]
  ).join(' ')
}

export function AnimatedBars(): JSX.Element {
  return (
    <span className="flex items-end gap-[2px] h-3.5">
      {[0, 1, 2].map((i) => (
        <span key={i} className="w-[3px] bg-accent rounded-sm"
          style={{ height: '100%', animation: `bar-bounce 0.8s ease-in-out ${i * 0.15}s infinite alternate` }} />
      ))}
      <style>{`@keyframes bar-bounce { from { transform: scaleY(0.2); } to { transform: scaleY(1); } }`}</style>
    </span>
  )
}

interface SongListProps {
  tracks: Track[]
  currentTrack: Track | null
  isPlaying: boolean
  columns: Cols
  sortField?: SortField
  sortDir?: SortDir
  onColSort?: (f: SortField) => void
  useTrackNumber?: boolean
  selectedIds?: Set<string>
  selectionMode?: boolean
  onRowClick?: (t: Track, idx: number, e: React.MouseEvent) => void
  onPlay: (t: Track) => void
  onDoubleClick: (t: Track) => void
  onContextMenu: (e: React.MouseEvent, t: Track) => void
  onArtistClick: (n: string) => void
  onAlbumClick: (n: string) => void
  onGenreClick?: (genre: string) => void
}

export function SongList({
  tracks, currentTrack, isPlaying, columns,
  sortField, sortDir, onColSort, useTrackNumber,
  selectedIds, selectionMode, onRowClick,
  onPlay, onDoubleClick, onContextMenu, onArtistClick, onAlbumClick, onGenreClick
}: SongListProps): JSX.Element {
  const grid = buildGrid(columns)
  return (
    <>
      {/* Column headers */}
      <div
        className="px-6 pb-2 border-b border-[var(--border)] shrink-0 grid gap-4 items-center"
        style={{ gridTemplateColumns: grid }}
      >
        <div className="w-8" />
        {columns.art && <div />}
        <ColHeader label="Title" field="title" sortField={sortField} sortDir={sortDir} onSort={onColSort} />
        {columns.artist && <ColHeader label="Artist" field="artist" sortField={sortField} sortDir={sortDir} onSort={onColSort} />}
        {columns.album && <ColHeader label="Album" field="album" sortField={sortField} sortDir={sortDir} onSort={onColSort} />}
        {columns.year && <ColHeader label="Year" field="year" sortField={sortField} sortDir={sortDir} onSort={onColSort} />}
        {columns.genre && <ColHeader label="Genre" field="genre" sortField={sortField} sortDir={sortDir} onSort={onColSort} />}
        {columns.duration && (
          <div className="flex justify-end">
            <ColHeader label={<Clock size={12} />} field="duration" sortField={sortField} sortDir={sortDir} onSort={onColSort} className="justify-end" />
          </div>
        )}
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto px-2">
        {tracks.map((track, idx) => {
          const isActive = currentTrack?.id === track.id
          const isSelected = selectedIds?.has(track.id) ?? false
          return (
            <TrackRow
              key={track.id}
              track={track}
              index={useTrackNumber ? (track.trackNumber || idx + 1) : idx + 1}
              isActive={isActive}
              isPlaying={isActive && isPlaying}
              isSelected={isSelected}
              selectionMode={selectionMode}
              columns={columns}
              grid={grid}
              onDoubleClick={() => onDoubleClick(track)}
              onPlay={() => onPlay(track)}
              onContextMenu={(e) => onContextMenu(e, track)}
              onRowClick={onRowClick ? (e) => onRowClick(track, idx, e) : undefined}
              onArtistClick={onArtistClick}
              onAlbumClick={onAlbumClick}
              onGenreClick={onGenreClick}
            />
          )
        })}
      </div>
    </>
  )
}

function ColHeader({ label, field, sortField, sortDir, onSort, className = '' }: {
  label: React.ReactNode
  field: SortField
  sortField?: SortField
  sortDir?: SortDir
  onSort?: (f: SortField) => void
  className?: string
}): JSX.Element {
  const active = sortField === field && !!onSort
  return (
    <button
      onClick={() => onSort?.(field)}
      className={`flex items-center gap-1 text-xs font-semibold uppercase tracking-wider transition-colors select-none ${
        active ? 'text-accent' : 'text-text-muted hover:text-text-secondary'
      } ${!onSort ? 'cursor-default' : 'cursor-pointer'} ${className}`}
    >
      {label}
      {active && (sortDir === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />)}
    </button>
  )
}

function TrackRow({
  track, index, isActive, isPlaying, isSelected, selectionMode, columns, grid,
  onDoubleClick, onPlay, onContextMenu, onRowClick, onArtistClick, onAlbumClick, onGenreClick
}: {
  track: Track; index: number; isActive: boolean; isPlaying: boolean; isSelected: boolean
  selectionMode?: boolean
  columns: Cols; grid: string
  onDoubleClick: () => void; onPlay: () => void
  onContextMenu: (e: React.MouseEvent) => void
  onRowClick?: (e: React.MouseEvent) => void
  onArtistClick: (n: string) => void; onAlbumClick: (n: string) => void
  onGenreClick?: (genre: string) => void
}): JSX.Element {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      className={`grid gap-4 items-center px-4 py-2 rounded-lg cursor-pointer group transition-colors ${
        isSelected
          ? 'bg-accent/15 hover:bg-accent/20'
          : isActive
          ? 'bg-surface-overlay'
          : 'hover:bg-surface-raised'
      }`}
      style={{ gridTemplateColumns: grid }}
      onClick={onRowClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Index / select circle / play button */}
      <div className="w-8 flex items-center justify-center">
        {isPlaying && !hovered
          ? <span className="text-accent"><AnimatedBars /></span>
          : selectionMode && hovered && !isSelected
          ? <button onClick={(e) => { e.stopPropagation(); onRowClick?.(e) }} className="w-5 h-5 rounded-full border-2 border-text-muted hover:border-accent transition-colors" />
          : isSelected
          ? <button onClick={(e) => { e.stopPropagation(); onRowClick?.(e) }} className="w-5 h-5 rounded-full bg-accent flex items-center justify-center">
              <Check size={10} strokeWidth={3} className="text-black" />
            </button>
          : hovered
          ? <button onClick={(e) => { e.stopPropagation(); onPlay() }} className="text-text-primary hover:text-accent transition-colors"><Play size={15} fill="currentColor" /></button>
          : <span className={`text-sm tabular-nums ${isActive ? 'text-accent' : 'text-text-muted'}`}>{index}</span>
        }
      </div>

      {/* Art */}
      {columns.art && <AlbumArtThumbnail track={track} size={44} className="rounded" />}

      {/* Title (+ artist subtitle when artist col hidden) */}
      <div className="min-w-0">
        <p className={`text-sm font-medium truncate ${isActive ? 'text-accent' : 'text-text-primary'}`}>{track.title}</p>
        {!columns.artist && (
          <button
            className="text-xs text-text-muted hover:text-accent hover:underline transition-colors text-left inline-block max-w-full truncate"
            onClick={(e) => { e.stopPropagation(); onArtistClick(track.artist) }}
          >
            {track.artist}
          </button>
        )}
      </div>

      {/* Artist column */}
      {columns.artist && (
        <div className="min-w-0">
          <button
            className="text-sm text-text-secondary hover:text-accent hover:underline transition-colors text-left inline-block max-w-full truncate"
            onClick={(e) => { e.stopPropagation(); onArtistClick(track.artist) }}
          >
            {track.artist}
          </button>
        </div>
      )}

      {/* Album column */}
      {columns.album && (
        <div className="min-w-0">
          <button
            className="text-sm text-text-secondary hover:text-accent hover:underline transition-colors text-left inline-block max-w-full truncate"
            onClick={(e) => { e.stopPropagation(); onAlbumClick(track.album) }}
          >
            {track.album}
          </button>
        </div>
      )}

      {columns.year && <span className="text-sm text-text-muted tabular-nums">{track.year || '—'}</span>}
      {columns.genre && (
        onGenreClick && track.genre
          ? <button
              className="text-sm text-text-secondary hover:text-accent hover:underline transition-colors text-left inline-block max-w-full truncate"
              onClick={(e) => { e.stopPropagation(); onGenreClick(track.genre) }}
            >
              {track.genre}
            </button>
          : <span className="text-sm text-text-secondary truncate">{track.genre || '—'}</span>
      )}

      {/* Duration + overflow menu */}
      {columns.duration && (
        <div className="flex items-center justify-end gap-1.5">
          <span className="text-sm text-text-muted tabular-nums">{formatDuration(track.duration)}</span>
          <button
            className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-text-primary transition-all"
            onClick={(e) => { e.stopPropagation(); onContextMenu(e) }}
          >
            <MoreHorizontal size={15} />
          </button>
        </div>
      )}
    </div>
  )
}
