import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Play, Music, LayoutList, LayoutGrid, Columns3, Check, Plus, Pencil, Search, X as XIcon, ListOrdered, ListPlus, ListMusic } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Track } from '../types'
import { AlbumArtThumbnail } from './AlbumArtThumbnail'
import { formatDuration } from '../lib/lyrics'
import { SongList, buildGrid, AnimatedBars } from './SongList'
import type { SortField, SortDir, Cols } from './SongList'

function sortTracks(tracks: Track[], field: SortField, dir: SortDir): Track[] {
  if (field === 'default') return tracks
  return [...tracks].sort((a, b) => {
    let cmp = 0
    if (field === 'title') cmp = a.title.localeCompare(b.title)
    else if (field === 'artist') cmp = a.artist.localeCompare(b.artist)
    else if (field === 'album') cmp = a.album.localeCompare(b.album)
    else if (field === 'year') cmp = (a.year || 0) - (b.year || 0)
    else if (field === 'genre') cmp = (a.genre || '').localeCompare(b.genre || '')
    else if (field === 'duration') cmp = a.duration - b.duration
    return dir === 'asc' ? cmp : -cmp
  })
}

function ColumnsDropdown({ anchorRef, onToggle, columns }: {
  anchorRef: React.RefObject<HTMLButtonElement>
  onToggle: (k: keyof Cols) => void
  columns: Cols
}): JSX.Element {
  const [pos, setPos] = useState({ top: 0, right: 0 })
  useEffect(() => {
    if (anchorRef.current) {
      const r = anchorRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, right: window.innerWidth - r.right })
    }
  }, [])

  return createPortal(
    <div
      onMouseDown={(e) => e.stopPropagation()}
      className="fixed z-[9999] bg-surface-highest border border-[var(--border)] rounded-xl shadow-2xl py-1 min-w-[160px] animate-scale-in"
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
    </div>,
    document.body
  )
}

export default function TrackList(): JSX.Element {
  const {
    library, playlists, activeView, activePlaylistId, currentTrack, isPlaying,
    searchQuery, viewMode, sortField, sortDir, columns, likedTrackIds,
    setViewMode, setSort, toggleColumn, playTrack, addToPlaylist,
    removeFromPlaylist, setShowMetadataEditor, setMetadataEditTrack, setBrowseFilter, setActiveView,
    setSearchQuery, addToQueue, playNext, addTracksToPlaylist
  } = useStore()

  const [contextMenu, setContextMenu] = useState<{ track: Track; x: number; y: number } | null>(null)
  const [showColMenu, setShowColMenu] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [lastSelectedIdx, setLastSelectedIdx] = useState<number | null>(null)
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false)
  const colBtnRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!showColMenu) return
    const handler = (e: MouseEvent): void => {
      if (colBtnRef.current && !colBtnRef.current.contains(e.target as Node)) setShowColMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showColMenu])

  // Clear selection when view changes
  useEffect(() => {
    setSelectedIds(new Set())
    setLastSelectedIdx(null)
  }, [activeView, activePlaylistId])

  let tracks: Track[] = []
  let title = 'Library'
  let subtitle = ''

  if (activeView === 'library') {
    tracks = library; title = 'Library'; subtitle = `${library.length} songs`
  } else if (activeView === 'liked') {
    const likedSet = new Set(likedTrackIds)
    tracks = library.filter((t) => likedSet.has(t.id))
    title = 'Liked Songs'; subtitle = `${tracks.length} songs`
  } else if (activeView === 'playlist' && activePlaylistId) {
    const pl = playlists.find((p) => p.id === activePlaylistId)
    if (pl) {
      tracks = pl.trackIds.map((id) => library.find((t) => t.id === id)).filter(Boolean) as Track[]
      title = pl.name; subtitle = `${tracks.length} songs`
    }
  }

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return sortTracks(tracks, sortField, sortDir)

    const q = searchQuery.toLowerCase().trim()
    const words = q.split(/\s+/)

    const score = (t: Track): number => {
      const title = t.title.toLowerCase()
      const artist = t.artist.toLowerCase()
      const album = t.album.toLowerCase()

      let s = 0
      for (const w of words) {
        // Title (weight 3)
        if (title === w) s += 300
        else if (title.startsWith(w)) s += 150
        else if (title.split(/\s+/).some((p) => p.startsWith(w))) s += 80
        else if (title.includes(w)) s += 40

        // Artist (weight 2)
        if (artist === w) s += 200
        else if (artist.startsWith(w)) s += 100
        else if (artist.split(/\s+/).some((p) => p.startsWith(w))) s += 60
        else if (artist.includes(w)) s += 30

        // Album (weight 1)
        if (album === w) s += 100
        else if (album.startsWith(w)) s += 50
        else if (album.split(/\s+/).some((p) => p.startsWith(w))) s += 30
        else if (album.includes(w)) s += 15
      }
      return s
    }

    return tracks
      .map((t) => ({ t, s: score(t) }))
      .filter(({ s }) => s > 0)
      .sort((a, b) => b.s - a.s)
      .map(({ t }) => t)
  }, [tracks, searchQuery, sortField, sortDir])

  const navArtist = (name: string): void => { setBrowseFilter({ type: 'artist', name }); setActiveView('artists') }
  const navAlbum = (name: string): void => { setBrowseFilter({ type: 'album', name }); setActiveView('albums') }
  const navGenre = (name: string): void => { setBrowseFilter({ type: 'genre', name }); setActiveView('genres') }

  const handleColSort = (field: SortField): void => {
    if (sortField === field) setSort(field, sortDir === 'asc' ? 'desc' : 'asc')
    else setSort(field, 'asc')
  }

  const handleRowClick = useCallback((track: Track, idx: number, e: React.MouseEvent): void => {
    if (e.shiftKey && lastSelectedIdx !== null) {
      // Shift: range select
      const lo = Math.min(lastSelectedIdx, idx)
      const hi = Math.max(lastSelectedIdx, idx)
      setSelectedIds(new Set(filtered.slice(lo, hi + 1).map((t) => t.id)))
    } else {
      // Plain click or Ctrl+click: toggle this track
      setSelectedIds((prev) => {
        const next = new Set(prev)
        if (next.has(track.id)) next.delete(track.id)
        else next.add(track.id)
        return next
      })
      setLastSelectedIdx(idx)
    }
  }, [lastSelectedIdx, filtered])

  const openContextMenu = (e: React.MouseEvent, track: Track): void => {
    e.preventDefault(); e.stopPropagation()
    // Right-click never changes selection — menu operates on selected tracks or just this track
    setContextMenu({ track, x: e.clientX, y: e.clientY })
  }

  // Tracks involved in context menu action (selected set, or the clicked track)
  const contextTracks = contextMenu
    ? (selectedIds.size > 0 && selectedIds.has(contextMenu.track.id)
        ? filtered.filter((t) => selectedIds.has(t.id))
        : [contextMenu.track])
    : []

  if (library.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8 animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-surface-overlay flex items-center justify-center">
          <Music className="text-text-muted w-10 h-10" />
        </div>
        <p className="text-text-primary text-lg font-semibold">No music yet</p>
        <p className="text-text-muted text-sm">Add a folder or files from Settings to get started</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0" onClick={() => { setContextMenu(null); setSelectedIds(new Set()); setLastSelectedIdx(null) }}>
      {/* Selection action bar */}
      {selectedIds.size > 0 && (
        <div
          className="mx-6 mt-4 mb-1 flex items-center gap-2 px-4 py-2 rounded-xl bg-accent/10 border border-accent/20 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-sm font-medium text-accent mr-1">{selectedIds.size} selected</span>
          <button
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-accent text-black hover:bg-accent/80 transition-colors"
            onClick={() => {
              const toPlay = filtered.filter((t) => selectedIds.has(t.id))
              if (toPlay.length > 0) playTrack(toPlay[0], filtered)
              setSelectedIds(new Set())
            }}
          >
            <Play size={11} fill="currentColor" /> Play
          </button>
          <button
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-surface-overlay text-text-secondary hover:text-text-primary transition-colors"
            onClick={() => {
              filtered.filter((t) => selectedIds.has(t.id)).forEach((t) => addToQueue(t))
              setSelectedIds(new Set())
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
                        setSelectedIds(new Set())
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

      {/* Header */}
      <div className="px-6 pt-6 pb-3 flex items-end justify-between gap-4 shrink-0">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-text-primary truncate">{title}</h1>
          <p className="text-text-muted text-sm mt-0.5">{subtitle}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Search */}
          <div className="relative flex items-center group" onClick={() => searchRef.current?.focus()}>
            <Search size={13} className="absolute left-3 text-text-muted group-focus-within:text-accent transition-colors pointer-events-none" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setSearchQuery('')}
              className="w-40 focus:w-56 h-8 bg-surface-overlay border border-transparent focus:border-accent/40 text-text-primary text-xs rounded-lg pl-8 pr-7 outline-none placeholder:text-text-muted transition-all duration-200"
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); searchRef.current?.focus() }}
                className="absolute right-2.5 text-text-muted hover:text-text-primary transition-colors">
                <XIcon size={12} />
              </button>
            )}
          </div>

          {viewMode === 'list' && (
            <div className="relative">
              <button ref={colBtnRef}
                onClick={(e) => { e.stopPropagation(); setShowColMenu(!showColMenu) }}
                className="flex items-center gap-1.5 px-3 py-1.5 h-8 rounded-lg text-xs font-medium bg-surface-overlay text-text-secondary hover:text-text-primary transition-colors">
                <Columns3 size={12} /> Columns
              </button>
              {showColMenu && (
                <ColumnsDropdown anchorRef={colBtnRef} onToggle={(k) => toggleColumn(k)} columns={columns} />
              )}
            </div>
          )}

          <div className="flex items-center gap-0.5 bg-surface-overlay rounded-lg p-1">
            {(['list', 'grid'] as const).map((mode) => (
              <button key={mode} onClick={() => setViewMode(mode)}
                className={`p-1.5 rounded transition-colors ${viewMode === mode ? 'bg-surface-highest text-text-primary' : 'text-text-muted hover:text-text-primary'}`}>
                {mode === 'list' ? <LayoutList size={15} /> : <LayoutGrid size={15} />}
              </button>
            ))}
          </div>

        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-text-muted text-sm">
          {searchQuery ? `No results for "${searchQuery}"` : activeView === 'playlist' ? 'Playlist is empty' : activeView === 'liked' ? 'No liked songs yet — heart a track to add it' : 'No songs'}
        </div>
      ) : viewMode === 'list' ? (
        <SongList
          tracks={filtered}
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          columns={columns}
          sortField={sortField}
          sortDir={sortDir}
          onColSort={handleColSort}
          selectedIds={selectedIds}
          selectionMode={selectedIds.size > 0}
          onRowClick={handleRowClick}
          onPlay={(t) => { playTrack(t, filtered); setSelectedIds(new Set()) }}
          onDoubleClick={(t) => { playTrack(t, filtered); setSelectedIds(new Set()) }}
          onContextMenu={openContextMenu}
          onArtistClick={navArtist}
          onAlbumClick={navAlbum}
          onGenreClick={navGenre}
        />
      ) : (
        <GridView tracks={filtered} currentTrack={currentTrack} isPlaying={isPlaying}
          onPlay={(t) => playTrack(t, filtered)} onDoubleClick={(t) => playTrack(t, filtered)}
          onContextMenu={openContextMenu} onArtistClick={navArtist} onAlbumClick={navAlbum} />
      )}

      {/* Context menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
          <div className="fixed z-50 bg-surface-highest border border-[var(--border)] rounded-xl shadow-2xl py-1 min-w-[200px] animate-scale-in"
            style={{ left: Math.min(contextMenu.x, window.innerWidth - 210), top: Math.min(contextMenu.y, window.innerHeight - 280) }}
            onClick={(e) => e.stopPropagation()}>
            {contextTracks.length > 1 && (
              <p className="px-4 py-1.5 text-xs text-text-muted border-b border-[var(--border)] mb-1">
                {contextTracks.length} songs selected
              </p>
            )}
            <button className="flex items-center gap-2 w-full px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-overlay transition-colors"
              onClick={() => { playTrack(contextTracks[0], filtered); setContextMenu(null); setSelectedIds(new Set()); setLastSelectedIdx(null) }}>
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
                      addTracksToPlaylist(pl.id, contextTracks.map((t) => t.id))
                      setContextMenu(null); setSelectedIds(new Set()); setLastSelectedIdx(null)
                    }}>
                    <Plus size={14} /> {pl.name}
                  </button>
                ))}
              </>
            )}
            {activeView === 'playlist' && activePlaylistId && (
              <>
                <div className="border-t border-[var(--border)] my-1" />
                <button className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-500 hover:text-red-400 hover:bg-surface-overlay transition-colors"
                  onClick={() => {
                    contextTracks.forEach((t) => removeFromPlaylist(activePlaylistId!, t.id))
                    setContextMenu(null)
                    setSelectedIds(new Set())
                  }}>
                  Remove from playlist
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Grid view ────────────────────────────────────────────────────────────────

function GridView({ tracks, currentTrack, isPlaying, onPlay, onDoubleClick, onContextMenu, onArtistClick, onAlbumClick }: {
  tracks: Track[]; currentTrack: Track | null; isPlaying: boolean
  onPlay: (t: Track) => void; onDoubleClick: (t: Track) => void
  onContextMenu: (e: React.MouseEvent, t: Track) => void
  onArtistClick: (n: string) => void; onAlbumClick: (n: string) => void
}): JSX.Element {
  return (
    <div className="flex-1 overflow-y-auto px-6 pb-6">
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
        {tracks.map((track) => {
          const isActive = currentTrack?.id === track.id
          return (
            <GridCard key={track.id} track={track} isActive={isActive} isPlaying={isActive && isPlaying}
              onDoubleClick={() => onDoubleClick(track)} onPlay={() => onPlay(track)}
              onContextMenu={(e) => onContextMenu(e, track)}
              onArtistClick={onArtistClick} onAlbumClick={onAlbumClick} />
          )
        })}
      </div>
    </div>
  )
}

function GridCard({ track, isActive, isPlaying, onDoubleClick, onPlay, onContextMenu, onArtistClick, onAlbumClick }: {
  track: Track; isActive: boolean; isPlaying: boolean
  onDoubleClick: () => void; onPlay: () => void; onContextMenu: (e: React.MouseEvent) => void
  onArtistClick: (n: string) => void; onAlbumClick: (n: string) => void
}): JSX.Element {
  const [hovered, setHovered] = useState(false)
  return (
    <div className={`rounded-xl overflow-hidden cursor-pointer group transition-all hover:scale-[1.02] ${isActive ? 'ring-2 ring-accent' : ''}`}
      onDoubleClick={onDoubleClick} onContextMenu={onContextMenu}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div className="relative aspect-square w-full">
        <AlbumArtThumbnail track={track} size={0} className="w-full h-full" />
        {(hovered || isPlaying) && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            {isPlaying && !hovered
              ? <span className="text-white"><AnimatedBars /></span>
              : <button onClick={(e) => { e.stopPropagation(); onPlay() }}
                  className="w-10 h-10 rounded-full bg-accent flex items-center justify-center hover:scale-110 active:scale-95 transition-transform shadow-lg">
                  <Play size={18} fill="white" className="ml-0.5" />
                </button>
            }
          </div>
        )}
      </div>
      <div className="p-3 bg-surface-raised">
        <p className={`text-sm font-semibold truncate ${isActive ? 'text-accent' : 'text-text-primary'}`}>{track.title}</p>
        <button className="text-xs text-text-muted truncate mt-0.5 hover:text-accent hover:underline transition-colors text-left w-full block"
          onClick={(e) => { e.stopPropagation(); onArtistClick(track.artist) }}>{track.artist}</button>
        <button className="text-xs text-text-muted truncate hover:text-accent hover:underline transition-colors text-left w-full block"
          onClick={(e) => { e.stopPropagation(); onAlbumClick(track.album) }}>{track.album}</button>
      </div>
    </div>
  )
}
