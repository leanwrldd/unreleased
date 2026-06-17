import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Play, ChevronLeft, Pencil, Plus, ListOrdered, ListPlus, Columns3, Check, X as XIcon, ListMusic, LayoutGrid, LayoutList } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Track } from '../types'
import { AlbumArtThumbnail } from './AlbumArtThumbnail'
import { formatDuration } from '../lib/lyrics'
import { SongList } from './SongList'
import type { Cols, SortField, SortDir } from './SongList'

interface AlbumEntry {
  key: string; name: string; artist: string; tracks: Track[]; coverTrack: Track
}
interface ArtistEntry {
  name: string; tracks: Track[]; albumCount: number
}
interface GenreEntry {
  name: string; tracks: Track[]
}
type DrillDown =
  | { type: 'album'; label: string; tracks: Track[] }
  | { type: 'artist'; label: string; tracks: Track[] }
  | { type: 'genre'; label: string; tracks: Track[] }

const ALBUM_DRILL_COLS: Cols  = { art: true,  artist: true,  album: false, year: false, genre: false, duration: true }
const ARTIST_DRILL_COLS: Cols = { art: true,  artist: false, album: true,  year: false, genre: false, duration: true }
const GENRE_DRILL_COLS: Cols  = { art: true,  artist: true,  album: true,  year: false, genre: false, duration: true }

export default function BrowserView(): JSX.Element {
  const { library, activeView, playTrack, browseFilter, setBrowseFilter, playlists, addToPlaylist, addToQueue, addTracksToPlaylist } = useStore()
  const [drill, setDrill] = useState<DrillDown | null>(null)

  useEffect(() => { setDrill(null) }, [activeView])

  const albums = useMemo<AlbumEntry[]>(() => {
    const map = new Map<string, AlbumEntry>()
    for (const t of library) {
      const key = `${t.album}|||${t.albumArtist}`
      if (!map.has(key)) map.set(key, { key, name: t.album || 'Unknown Album', artist: t.albumArtist || t.artist, tracks: [], coverTrack: t })
      map.get(key)!.tracks.push(t)
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [library])

  const artists = useMemo<ArtistEntry[]>(() => {
    const map = new Map<string, ArtistEntry>()
    for (const t of library) {
      const name = t.albumArtist || t.artist || 'Unknown Artist'
      if (!map.has(name)) map.set(name, { name, tracks: [], albumCount: 0 })
      map.get(name)!.tracks.push(t)
    }
    const result = [...map.values()]
    for (const a of result) a.albumCount = new Set(a.tracks.map((t) => t.album)).size
    return result.sort((a, b) => a.name.localeCompare(b.name))
  }, [library])

  const genres = useMemo<GenreEntry[]>(() => {
    const map = new Map<string, GenreEntry>()
    for (const t of library) {
      const name = t.genre || 'Unknown Genre'
      if (!map.has(name)) map.set(name, { name, tracks: [] })
      map.get(name)!.tracks.push(t)
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [library])

  useEffect(() => {
    if (!browseFilter) return
    if (browseFilter.type === 'artist' && activeView === 'artists') {
      const found = artists.find((a) => a.name === browseFilter.name)
      if (found) { setDrill({ type: 'artist', label: found.name, tracks: found.tracks }); setBrowseFilter(null) }
    }
    if (browseFilter.type === 'album' && activeView === 'albums') {
      const found = albums.find((a) => a.name === browseFilter.name)
      if (found) { setDrill({ type: 'album', label: found.name, tracks: found.tracks }); setBrowseFilter(null) }
    }
    if (browseFilter.type === 'genre' && activeView === 'genres') {
      const found = genres.find((g) => g.name === browseFilter.name)
      if (found) { setDrill({ type: 'genre', label: found.name, tracks: found.tracks }); setBrowseFilter(null) }
    }
  }, [browseFilter, activeView, artists, albums, genres])

  if (drill) {
    const cols = drill.type === 'album' ? ALBUM_DRILL_COLS : drill.type === 'artist' ? ARTIST_DRILL_COLS : GENRE_DRILL_COLS
    return <DrillDownView label={drill.label} tracks={drill.tracks} defaultColumns={cols} playlists={playlists} onAddToPlaylist={addToPlaylist} onBack={() => setDrill(null)} onPlay={playTrack} />
  }
  if (activeView === 'albums') {
    return <AlbumsGrid albums={albums} playlists={playlists} onAddToPlaylist={addToPlaylist} onSelect={(a) => setDrill({ type: 'album', label: a.name, tracks: a.tracks })} onPlay={(a) => playTrack(a.tracks[0], a.tracks)} />
  }
  if (activeView === 'artists') {
    return <ArtistsList artists={artists} onSelect={(a) => setDrill({ type: 'artist', label: a.name, tracks: a.tracks })} onPlay={(a) => playTrack(a.tracks[0], a.tracks)} />
  }
  if (activeView === 'genres') {
    return <GenresList genres={genres} playlists={playlists} onSelect={(g) => setDrill({ type: 'genre', label: g.name, tracks: g.tracks })} onPlay={(g) => playTrack(g.tracks[0], g.tracks)} onAddToQueue={(g) => g.tracks.forEach((t) => addToQueue(t))} onAddToPlaylist={(playlistId, g) => addTracksToPlaylist(playlistId, g.tracks.map((t) => t.id))} />
  }
  return <div />
}

// ─── Drill-down column dropdown ───────────────────────────────────────────────

function DrillColsDropdown({ anchorRef, columns, onToggle, onClose }: {
  anchorRef: React.RefObject<HTMLButtonElement>
  columns: Cols
  onToggle: (k: keyof Cols) => void
  onClose: () => void
}): JSX.Element {
  const [pos, setPos] = useState({ top: 0, right: 0 })
  useEffect(() => {
    if (anchorRef.current) {
      const r = anchorRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, right: window.innerWidth - r.right })
    }
  }, [])

  return createPortal(
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="fixed z-50 bg-surface-highest border border-[var(--border)] rounded-xl shadow-2xl py-1 min-w-[160px] animate-scale-in"
        style={{ top: pos.top, right: pos.right }}
      >
        {([
          ['art', 'Album Art'], ['artist', 'Artist'], ['album', 'Album'],
          ['year', 'Year'], ['genre', 'Genre'], ['duration', 'Duration']
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => onToggle(key)}
            className="flex items-center gap-3 w-full px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-overlay transition-colors"
          >
            <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
              columns[key] ? 'bg-accent border-accent' : 'border-[var(--border)]'
            }`}>
              {columns[key] && <Check size={9} strokeWidth={3} className="text-black" />}
            </span>
            {label}
          </button>
        ))}
      </div>
    </>,
    document.body
  )
}

// ─── Drill-down view ─────────────────────────────────────────────────────────

function sortTracks(tracks: Track[], field: SortField, dir: SortDir): Track[] {
  if (field === 'default') return tracks
  return [...tracks].sort((a, b) => {
    let cmp = 0
    if (field === 'title') cmp = a.title.localeCompare(b.title)
    else if (field === 'artist') cmp = a.artist.localeCompare(b.artist)
    else if (field === 'album') cmp = a.album.localeCompare(b.album)
    else if (field === 'year') cmp = (a.year || 0) - (b.year || 0)
    else if (field === 'duration') cmp = a.duration - b.duration
    return dir === 'asc' ? cmp : -cmp
  })
}

function DrillDownView({ label, tracks, defaultColumns, playlists, onAddToPlaylist, onBack, onPlay }: {
  label: string; tracks: Track[]; defaultColumns: Cols
  playlists: { id: string; name: string }[]
  onAddToPlaylist: (playlistId: string, trackId: string) => void
  onBack: () => void; onPlay: (track: Track, context: Track[]) => void
}): JSX.Element {
  const { currentTrack, isPlaying, setShowMetadataEditor, setMetadataEditTrack, addToQueue, playNext, addTracksToPlaylist } = useStore()
  const [contextMenu, setContextMenu] = useState<{ track: Track; x: number; y: number } | null>(null)
  const [showAddAllMenu, setShowAddAllMenu] = useState(false)
  const [columns, setColumns] = useState<Cols>(defaultColumns)
  const [sortField, setSortField] = useState<SortField>('default')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [showColMenu, setShowColMenu] = useState(false)
  const colBtnRef = useRef<HTMLButtonElement>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [lastSelectedIdx, setLastSelectedIdx] = useState<number | null>(null)
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false)

  const toggleCol = (key: keyof Cols): void =>
    setColumns((prev) => ({ ...prev, [key]: !prev[key] }))

  const handleColSort = (field: SortField): void => {
    if (sortField === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  // Sort by track number first, then apply user sort on top
  const sorted = useMemo(() => {
    const byTrackNum = [...tracks].sort((a, b) => (a.trackNumber || 999) - (b.trackNumber || 999))
    return sortTracks(byTrackNum, sortField, sortDir)
  }, [tracks, sortField, sortDir])

  const totalDuration = sorted.reduce((acc, t) => acc + t.duration, 0)

  const closeAll = (): void => {
    setContextMenu(null); setShowAddAllMenu(false); setShowColMenu(false)
    setSelectedIds(new Set()); setLastSelectedIdx(null)
  }

  const handleRowClick = useCallback((track: Track, idx: number, e: React.MouseEvent): void => {
    if (e.shiftKey && lastSelectedIdx !== null) {
      const lo = Math.min(lastSelectedIdx, idx)
      const hi = Math.max(lastSelectedIdx, idx)
      setSelectedIds(new Set(sorted.slice(lo, hi + 1).map((t) => t.id)))
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        if (next.has(track.id)) next.delete(track.id)
        else next.add(track.id)
        return next
      })
      setLastSelectedIdx(idx)
    }
  }, [lastSelectedIdx, sorted])

  const contextTracks = contextMenu
    ? (selectedIds.size > 0 && selectedIds.has(contextMenu.track.id)
        ? sorted.filter((t) => selectedIds.has(t.id))
        : [contextMenu.track])
    : []

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden" onClick={closeAll}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-2 shrink-0">
        <button onClick={onBack} className="text-text-muted hover:text-text-primary transition-colors shrink-0">
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-text-primary font-semibold truncate">{label}</h2>
          <p className="text-text-muted text-xs">
            {sorted.length} track{sorted.length !== 1 ? 's' : ''} · {formatDuration(totalDuration)}
          </p>
        </div>

        {/* Column toggle */}
        <button
          ref={colBtnRef}
          onClick={(e) => { e.stopPropagation(); setShowColMenu(!showColMenu) }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary bg-surface-overlay hover:bg-surface-highest rounded-lg transition-colors shrink-0"
        >
          <Columns3 size={13} /> Columns
        </button>
        {showColMenu && (
          <DrillColsDropdown anchorRef={colBtnRef} columns={columns} onToggle={toggleCol} onClose={() => setShowColMenu(false)} />
        )}

        {playlists.length > 0 && (
          <div className="relative shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); setShowAddAllMenu(!showAddAllMenu) }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary bg-surface-overlay hover:bg-surface-highest rounded-lg transition-colors"
            >
              <Plus size={13} /> Add all
            </button>
            {showAddAllMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowAddAllMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 bg-surface-highest border border-[var(--border)] rounded-xl shadow-2xl py-1 min-w-[180px] animate-scale-in">
                  {playlists.map((pl) => (
                    <button key={pl.id}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-overlay transition-colors"
                      onClick={(e) => { e.stopPropagation(); sorted.forEach((t) => onAddToPlaylist(pl.id, t.id)); setShowAddAllMenu(false) }}>
                      <Plus size={13} /> {pl.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        <button
          onClick={() => onPlay(sorted[0], sorted)}
          className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-black text-sm font-semibold rounded-full transition-colors shrink-0"
        >
          <Play size={14} fill="black" /> Play all
        </button>
      </div>

      {/* Selection action bar */}
      {selectedIds.size > 0 && (
        <div
          className="mx-4 mb-1 flex items-center gap-2 px-4 py-2 rounded-xl bg-accent/10 border border-accent/20 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-sm font-medium text-accent mr-1">{selectedIds.size} selected</span>
          <button
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-accent text-black hover:bg-accent/80 transition-colors"
            onClick={() => {
              const toPlay = sorted.filter((t) => selectedIds.has(t.id))
              if (toPlay.length > 0) onPlay(toPlay[0], sorted)
              setSelectedIds(new Set()); setLastSelectedIdx(null)
            }}
          >
            <Play size={11} fill="currentColor" /> Play
          </button>
          <button
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-surface-overlay text-text-secondary hover:text-text-primary transition-colors"
            onClick={() => {
              sorted.filter((t) => selectedIds.has(t.id)).forEach((t) => addToQueue(t))
              setSelectedIds(new Set()); setLastSelectedIdx(null)
            }}
          >
            <ListPlus size={11} /> Add to queue
          </button>
          {playlists.length > 0 && (
            <div className="relative">
              <button
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-surface-overlay text-text-secondary hover:text-text-primary transition-colors"
                onClick={(e) => { e.stopPropagation(); setShowAddToPlaylist((v) => !v) }}
              >
                <ListMusic size={11} /> Add to playlist
              </button>
              {showAddToPlaylist && (
                <div className="absolute top-full mt-1 left-0 z-50 bg-surface-highest border border-[var(--border)] rounded-xl shadow-2xl py-1 min-w-[160px]"
                  onClick={(e) => e.stopPropagation()}>
                  {playlists.map((pl) => (
                    <button key={pl.id}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-overlay transition-colors"
                      onClick={() => {
                        addTracksToPlaylist(pl.id, Array.from(selectedIds))
                        setShowAddToPlaylist(false)
                        setSelectedIds(new Set()); setLastSelectedIdx(null)
                      }}
                    >
                      <ListMusic size={13} /> {pl.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button
            className="ml-auto text-text-muted hover:text-text-primary transition-colors"
            onClick={() => { setSelectedIds(new Set()); setLastSelectedIdx(null) }}
          >
            <XIcon size={14} />
          </button>
        </div>
      )}

      {/* Track list */}
      <SongList
        tracks={sorted}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        columns={columns}
        sortField={sortField}
        sortDir={sortDir}
        onColSort={handleColSort}
        useTrackNumber={sortField === 'default'}
        selectedIds={selectedIds}
        selectionMode={selectedIds.size > 0}
        onRowClick={handleRowClick}
        onPlay={(t) => { onPlay(t, sorted); setSelectedIds(new Set()) }}
        onDoubleClick={(t) => { onPlay(t, sorted); setSelectedIds(new Set()) }}
        onContextMenu={(e, t) => {
          e.preventDefault(); e.stopPropagation()
          // Right-click never changes selection
          setContextMenu({ track: t, x: e.clientX, y: e.clientY })
        }}
        onArtistClick={() => {}}
        onAlbumClick={() => {}}
      />

      {/* Context menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
          <div
            className="fixed z-50 bg-surface-highest border border-[var(--border)] rounded-xl shadow-2xl py-1 min-w-[200px] animate-scale-in"
            style={{ left: Math.min(contextMenu.x, window.innerWidth - 210), top: Math.min(contextMenu.y, window.innerHeight - 220) }}
            onClick={(e) => e.stopPropagation()}
          >
            {contextTracks.length > 1 && (
              <p className="px-4 py-1.5 text-xs text-text-muted border-b border-[var(--border)] mb-1">
                {contextTracks.length} songs selected
              </p>
            )}
            <button className="flex items-center gap-2 w-full px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-overlay transition-colors"
              onClick={() => { onPlay(contextTracks[0], sorted); setContextMenu(null); setSelectedIds(new Set()); setLastSelectedIdx(null) }}>
              <Play size={14} /> Play now
            </button>
            {contextTracks.length === 1 && (
              <button className="flex items-center gap-2 w-full px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-overlay transition-colors"
                onClick={() => { playNext(contextTracks[0]); setContextMenu(null) }}>
                <ListOrdered size={14} /> Play next
              </button>
            )}
            <button className="flex items-center gap-2 w-full px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-overlay transition-colors"
              onClick={() => { contextTracks.forEach((t) => addToQueue(t)); setContextMenu(null) }}>
              <ListPlus size={14} /> Add to queue
            </button>
            <div className="border-t border-[var(--border)] my-1" />
            {contextMenu && contextTracks.length === 1 && (
              <button className="flex items-center gap-2 w-full px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-overlay transition-colors"
                onClick={() => { setMetadataEditTrack(contextMenu.track); setShowMetadataEditor(true); setContextMenu(null) }}>
                <Pencil size={14} /> Edit info & lyrics
              </button>
            )}
            {playlists.length > 0 && (
              <>
                <div className="border-t border-[var(--border)] my-1" />
                <p className="px-4 py-1 text-xs text-text-muted uppercase tracking-wider">Add to playlist</p>
                {playlists.map((pl) => (
                  <button key={pl.id} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-overlay transition-colors"
                    onClick={() => {
                      contextTracks.forEach((t) => onAddToPlaylist(pl.id, t.id))
                      setContextMenu(null); setSelectedIds(new Set()); setLastSelectedIdx(null)
                    }}>
                    <Plus size={14} /> {pl.name}
                  </button>
                ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Albums grid / list ───────────────────────────────────────────────────────

type AlbumCols = { art: boolean; artist: boolean; year: boolean; tracks: boolean }
const DEFAULT_ALBUM_COLS: AlbumCols = { art: true, artist: true, year: true, tracks: true }

function AlbumColsDropdown({ anchorRef, columns, onToggle, onClose }: {
  anchorRef: React.RefObject<HTMLButtonElement>
  columns: AlbumCols
  onToggle: (k: keyof AlbumCols) => void
  onClose: () => void
}): JSX.Element {
  const [pos, setPos] = useState({ top: 0, right: 0 })
  useEffect(() => {
    if (anchorRef.current) {
      const r = anchorRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, right: window.innerWidth - r.right })
    }
  }, [])
  return createPortal(
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="fixed z-50 bg-surface-highest border border-[var(--border)] rounded-xl shadow-2xl py-1 min-w-[160px] animate-scale-in"
        style={{ top: pos.top, right: pos.right }}
      >
        {([['art', 'Album Art'], ['artist', 'Artist'], ['year', 'Year'], ['tracks', 'Tracks']] as const).map(([key, label]) => (
          <button key={key} onClick={() => onToggle(key)}
            className="flex items-center gap-3 w-full px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-overlay transition-colors">
            <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${columns[key] ? 'bg-accent border-accent' : 'border-[var(--border)]'}`}>
              {columns[key] && <Check size={9} strokeWidth={3} className="text-black" />}
            </span>
            {label}
          </button>
        ))}
      </div>
    </>,
    document.body
  )
}

function AlbumsGrid({ albums, playlists, onAddToPlaylist, onSelect, onPlay }: {
  albums: AlbumEntry[]; onSelect: (a: AlbumEntry) => void; onPlay: (a: AlbumEntry) => void
  playlists: { id: string; name: string }[]
  onAddToPlaylist: (playlistId: string, trackId: string) => void
}): JSX.Element {
  const [contextMenu, setContextMenu] = useState<{ album: AlbumEntry; x: number; y: number } | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [albumCols, setAlbumCols] = useState<AlbumCols>(DEFAULT_ALBUM_COLS)
  const [showColMenu, setShowColMenu] = useState(false)
  const colBtnRef = useRef<HTMLButtonElement>(null)

  const toggleAlbumCol = (k: keyof AlbumCols): void => setAlbumCols((p) => ({ ...p, [k]: !p[k] }))

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden" onClick={() => { setContextMenu(null); setShowColMenu(false) }}>
      {/* Header */}
      <div className="px-4 py-4 shrink-0 flex items-center gap-3">
        <h1 className="text-text-primary text-xl font-bold">Albums</h1>
        <span className="text-text-muted text-sm flex-1">{albums.length}</span>
        {viewMode === 'list' && (
          <button
            ref={colBtnRef}
            onClick={(e) => { e.stopPropagation(); setShowColMenu((v) => !v) }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary bg-surface-overlay hover:bg-surface-highest rounded-lg transition-colors"
          >
            <Columns3 size={13} /> Columns
          </button>
        )}
        {showColMenu && (
          <AlbumColsDropdown anchorRef={colBtnRef} columns={albumCols} onToggle={toggleAlbumCol} onClose={() => setShowColMenu(false)} />
        )}
        <div className="flex items-center gap-1 bg-surface-overlay rounded-lg p-1">
          <button onClick={(e) => { e.stopPropagation(); setViewMode('grid') }}
            className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-surface-highest text-text-primary' : 'text-text-muted hover:text-text-primary'}`}>
            <LayoutGrid size={14} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setViewMode('list') }}
            className={`p-1.5 rounded transition-colors ${viewMode === 'list' ? 'bg-surface-highest text-text-primary' : 'text-text-muted hover:text-text-primary'}`}>
            <LayoutList size={14} />
          </button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="flex-1 overflow-y-auto p-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px', alignContent: 'start' }}>
          {albums.map((album) => (
            <div key={album.key} className="group cursor-pointer" onClick={() => onSelect(album)}
              onContextMenu={(e) => { e.preventDefault(); setContextMenu({ album, x: e.clientX, y: e.clientY }) }}>
              <div className="relative aspect-square rounded-lg overflow-hidden bg-surface-overlay mb-2">
                <AlbumArtThumbnail track={album.coverTrack} size={0} className="w-full h-full" />
                <button className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => { e.stopPropagation(); onPlay(album) }}>
                  <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center shadow-lg">
                    <Play size={18} fill="black" className="text-black ml-0.5" />
                  </div>
                </button>
              </div>
              <p className="text-text-primary text-sm font-medium truncate">{album.name}</p>
              <p className="text-text-muted text-xs truncate">{album.artist}</p>
              <p className="text-text-muted text-xs">{album.tracks.length} track{album.tracks.length !== 1 ? 's' : ''}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {/* List header row */}
          <div className="flex items-center gap-3 px-4 py-2 text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-[var(--border)] bg-surface sticky top-0">
            {albumCols.art && <div className="w-10 shrink-0" />}
            <div className="flex-1 min-w-0">Album</div>
            {albumCols.artist && <div className="w-40 shrink-0">Artist</div>}
            {albumCols.year && <div className="w-16 shrink-0 text-right">Year</div>}
            {albumCols.tracks && <div className="w-16 shrink-0 text-right">Tracks</div>}
            <div className="w-8 shrink-0" />
          </div>
          {albums.map((album) => (
            <div key={album.key}
              className="group flex items-center gap-3 px-4 py-2 hover:bg-surface-overlay cursor-pointer border-b border-[var(--border)] transition-colors"
              onClick={() => onSelect(album)}
              onContextMenu={(e) => { e.preventDefault(); setContextMenu({ album, x: e.clientX, y: e.clientY }) }}>
              {albumCols.art && (
                <div className="w-10 h-10 rounded shrink-0 overflow-hidden bg-surface-overlay">
                  <AlbumArtThumbnail track={album.coverTrack} size={40} className="w-full h-full" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-text-primary text-sm font-medium truncate">{album.name}</p>
              </div>
              {albumCols.artist && <div className="w-40 shrink-0 text-text-muted text-sm truncate">{album.artist}</div>}
              {albumCols.year && <div className="w-16 shrink-0 text-text-muted text-sm text-right">{album.tracks[0]?.year || '—'}</div>}
              {albumCols.tracks && <div className="w-16 shrink-0 text-text-muted text-sm text-right">{album.tracks.length}</div>}
              <button className="w-8 h-8 shrink-0 flex items-center justify-center opacity-0 group-hover:opacity-100 rounded-full bg-accent transition-opacity"
                onClick={(e) => { e.stopPropagation(); onPlay(album) }}>
                <Play size={13} fill="black" className="text-black ml-0.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
          <div className="fixed z-50 bg-surface-highest border border-[var(--border)] rounded-xl shadow-2xl py-1 min-w-[200px] animate-scale-in"
            style={{ left: Math.min(contextMenu.x, window.innerWidth - 210), top: Math.min(contextMenu.y, window.innerHeight - 180) }}>
            <button className="flex items-center gap-2 w-full px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-overlay transition-colors"
              onClick={() => { onPlay(contextMenu.album); setContextMenu(null) }}>
              <Play size={14} /> Play album
            </button>
            {playlists.length > 0 && (
              <>
                <div className="border-t border-[var(--border)] my-1" />
                <p className="px-4 py-1 text-xs text-text-muted uppercase tracking-wider">Add album to playlist</p>
                {playlists.map((pl) => (
                  <button key={pl.id} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-overlay transition-colors"
                    onClick={() => { contextMenu.album.tracks.forEach((t) => onAddToPlaylist(pl.id, t.id)); setContextMenu(null) }}>
                    <Plus size={14} /> {pl.name}
                  </button>
                ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Artists list ─────────────────────────────────────────────────────────────

function ArtistsList({ artists, onSelect, onPlay }: {
  artists: ArtistEntry[]; onSelect: (a: ArtistEntry) => void; onPlay: (a: ArtistEntry) => void
}): JSX.Element {
  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <ViewHeader title="Artists" count={artists.length} />
      <div className="flex-1 overflow-y-auto">
        {artists.map((artist) => (
          <div key={artist.name} className="flex items-center gap-4 px-4 py-3 hover:bg-surface-overlay cursor-pointer group transition-colors border-b border-[var(--border)]"
            onClick={() => onSelect(artist)}>
            <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center shrink-0 text-accent font-bold text-lg">
              {artist.name[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-text-primary font-medium truncate">{artist.name}</p>
              <p className="text-text-muted text-xs">
                {artist.albumCount} album{artist.albumCount !== 1 ? 's' : ''} · {artist.tracks.length} track{artist.tracks.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button className="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 rounded-full bg-accent flex items-center justify-center"
              onClick={(e) => { e.stopPropagation(); onPlay(artist) }}>
              <Play size={14} fill="black" className="text-black ml-0.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Genres list ──────────────────────────────────────────────────────────────

function GenresList({ genres, playlists, onSelect, onPlay, onAddToQueue, onAddToPlaylist }: {
  genres: GenreEntry[]
  playlists: { id: string; name: string }[]
  onSelect: (g: GenreEntry) => void
  onPlay: (g: GenreEntry) => void
  onAddToQueue: (g: GenreEntry) => void
  onAddToPlaylist: (playlistId: string, g: GenreEntry) => void
}): JSX.Element {
  const { theme } = useStore()
  const [contextMenu, setContextMenu] = useState<{ genre: GenreEntry; x: number; y: number } | null>(null)
  const [showAddMenu, setShowAddMenu] = useState(false)

  // Hue-based colors that are vivid in both light and dark mode (no Tailwind dependency)
  const hues = [270, 215, 145, 40, 320, 25, 180, 0, 55, 190]
  const getCardStyle = (i: number): React.CSSProperties => {
    const hue = hues[i % hues.length]
    return theme === 'dark'
      ? { backgroundColor: `hsl(${hue}, 50%, 18%)`, color: `hsl(${hue}, 70%, 72%)` }
      : { backgroundColor: `hsl(${hue}, 55%, 78%)`, color: `hsl(${hue}, 60%, 20%)` }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden" onClick={() => { setContextMenu(null); setShowAddMenu(false) }}>
      <ViewHeader title="Genres" count={genres.length} />
      <div className="flex-1 overflow-y-auto p-4 flex flex-wrap gap-3 content-start">
        {genres.map((genre, i) => (
          <div
            key={genre.name}
            className="group cursor-pointer rounded-xl px-5 py-4 flex flex-col gap-1 min-w-[160px] hover:scale-[1.02] transition-transform"
            style={getCardStyle(i)}
            onClick={() => onSelect(genre)}
            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setShowAddMenu(false); setContextMenu({ genre, x: e.clientX, y: e.clientY }) }}
          >
            <p className="font-semibold text-sm">{genre.name}</p>
            <p className="text-xs opacity-70">{genre.tracks.length} track{genre.tracks.length !== 1 ? 's' : ''}</p>
            <button
              className="mt-2 w-8 h-8 rounded-full bg-black/20 dark:bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity self-start"
              onClick={(e) => { e.stopPropagation(); onPlay(genre) }}
            >
              <Play size={12} fill="currentColor" />
            </button>
          </div>
        ))}
      </div>

      {/* Genre context menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setContextMenu(null); setShowAddMenu(false) }} />
          <div
            className="fixed z-50 bg-surface-highest border border-[var(--border)] rounded-xl shadow-2xl py-1 min-w-[200px] animate-scale-in"
            style={{ left: Math.min(contextMenu.x, window.innerWidth - 210), top: Math.min(contextMenu.y, window.innerHeight - 220) }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="px-4 py-1.5 text-xs font-semibold text-text-muted border-b border-[var(--border)] mb-1 truncate">
              {contextMenu.genre.name}
            </p>
            <button
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-overlay transition-colors"
              onClick={() => { onPlay(contextMenu.genre); setContextMenu(null) }}
            >
              <Play size={14} /> Play genre
            </button>
            <button
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-overlay transition-colors"
              onClick={() => { onAddToQueue(contextMenu.genre); setContextMenu(null) }}
            >
              <ListPlus size={14} /> Add all to queue
            </button>
            {playlists.length > 0 && (
              <>
                <div className="border-t border-[var(--border)] my-1" />
                <button
                  className="flex items-center justify-between w-full px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-overlay transition-colors"
                  onClick={() => setShowAddMenu((v) => !v)}
                >
                  <span className="flex items-center gap-2"><ListMusic size={14} /> Add all to playlist</span>
                  <span className="text-text-muted text-xs">▶</span>
                </button>
                {showAddMenu && (
                  <div className="border-t border-[var(--border)] py-1">
                    {playlists.map((pl) => (
                      <button
                        key={pl.id}
                        className="flex items-center gap-2 w-full px-6 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-overlay transition-colors"
                        onClick={() => { onAddToPlaylist(pl.id, contextMenu.genre); setContextMenu(null); setShowAddMenu(false) }}
                      >
                        <ListMusic size={13} /> <span className="truncate">{pl.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function ViewHeader({ title, count }: { title: string; count: number }): JSX.Element {
  return (
    <div className="px-4 py-4 shrink-0 flex items-baseline gap-3">
      <h1 className="text-text-primary text-xl font-bold">{title}</h1>
      <span className="text-text-muted text-sm">{count}</span>
    </div>
  )
}
