import { useState, useEffect, useRef, useMemo } from 'react'
import {
  Music, Play, Shuffle, Search, Plus, MoreHorizontal, Edit2, Trash2, X,
  ChevronLeft, ListMusic, LayoutGrid, List,
  FolderOpen, Clock, Loader2, Check, GripVertical, ChevronDown, ChevronUp, FileText,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { LibraryTrack, LocalPlaylist } from '../types'
import MetadataEditor from './MetadataEditor'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDur(s: number): string {
  if (!s || isNaN(s)) return '--:--'
  const m = Math.floor(s / 60), sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function fmtBytes(b: number): string {
  if (b < 1048576) return `${(b / 1024).toFixed(0)} KB`
  return `${(b / 1048576).toFixed(1)} MB`
}

function libraryTrackToQueueTrack(t: LibraryTrack) {
  return {
    id: t.id,
    path: t.filePath,
    streamUrl: 'file:///' + t.filePath.replace(/\\/g, '/'),
    imageUrl: t.albumArt || '',
    title: t.title,
    artist: t.artist,
    album: t.album,
    albumArtist: t.albumArtist,
    year: t.year,
    trackNumber: t.trackNumber,
    duration: t.duration,
    genre: t.genre,
    hasAlbumArt: t.hasAlbumArt,
  }
}

// ─── Album Art thumbnail ──────────────────────────────────────────────────────

function AlbumArtThumb({ track, size = 48 }: { track: LibraryTrack; size?: number }): JSX.Element {
  const el = (window as any).electron
  const { updateLibraryTrack } = useStore()
  const [art, setArt] = useState<string | null>(track.albumArt ?? null)

  useEffect(() => {
    if (!el || !track.hasAlbumArt || track.albumArt) return
    el.readAlbumArt(track.filePath).then((a: string | null) => {
      if (a) { setArt(a); updateLibraryTrack(track.id, { albumArt: a }) }
    })
  }, [track.id])

  if (art) return <img src={art} alt="" className="w-full h-full object-cover" style={{ width: size, height: size }} />
  return (
    <div className="flex items-center justify-center bg-[var(--surface-overlay)] text-[var(--text-muted)]" style={{ width: size, height: size }}>
      <Music size={size * 0.4} />
    </div>
  )
}

// ─── Sidebar: Local Playlists ─────────────────────────────────────────────────

function PlaylistsSidebar({ onSelect, activeId }: {
  onSelect: (id: string | null) => void
  activeId: string | null
}): JSX.Element {
  const { localPlaylists, createLocalPlaylist, deleteLocalPlaylist, renameLocalPlaylist, libraryTracks } = useStore()
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameVal, setRenameVal] = useState('')
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const renameRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (creating) inputRef.current?.focus() }, [creating])
  useEffect(() => { if (renaming) renameRef.current?.focus() }, [renaming])

  const handleCreate = () => {
    if (!newName.trim()) { setCreating(false); return }
    createLocalPlaylist(newName.trim())
    setNewName(''); setCreating(false)
  }

  const startRename = (pl: LocalPlaylist) => {
    setRenameVal(pl.name); setRenaming(pl.id); setMenuOpen(null)
  }

  const commitRename = () => {
    if (renaming && renameVal.trim()) renameLocalPlaylist(renaming, renameVal.trim())
    setRenaming(null)
  }

  const handleDelete = (id: string) => {
    deleteLocalPlaylist(id)
    if (activeId === id) onSelect(null)
    setMenuOpen(null)
  }

  return (
    <div className="w-56 shrink-0 border-r border-[var(--border)] flex flex-col">
      <div className="px-3 pt-4 pb-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Playlists</span>
        <button
          onClick={() => { setCreating(true); setMenuOpen(null) }}
          className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
          title="New playlist"
        >
          <Plus size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5">
        {/* All tracks */}
        <button
          onClick={() => onSelect(null)}
          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors ${
            activeId === null ? 'bg-[var(--accent)]/15 text-[var(--accent)]' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-overlay)] hover:text-[var(--text-primary)]'
          }`}
        >
          <ListMusic size={14} className="shrink-0" />
          <span className="truncate">All Tracks</span>
          <span className="ml-auto text-[10px] text-[var(--text-muted)]">{libraryTracks.length}</span>
        </button>

        {/* Playlists */}
        {localPlaylists.map((pl) => (
          <div key={pl.id} className="relative">
            {renaming === pl.id ? (
              <input
                ref={renameRef}
                value={renameVal}
                onChange={e => setRenameVal(e.target.value)}
                onBlur={commitRename}
                onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenaming(null) }}
                className="w-full px-2 py-1.5 rounded-lg text-sm bg-[var(--surface-overlay)] border border-[var(--accent)] text-[var(--text-primary)] outline-none"
              />
            ) : (
              <button
                onClick={() => onSelect(pl.id)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors group ${
                  activeId === pl.id ? 'bg-[var(--accent)]/15 text-[var(--accent)]' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-overlay)] hover:text-[var(--text-primary)]'
                }`}
              >
                <ListMusic size={14} className="shrink-0" />
                <span className="truncate flex-1 text-left">{pl.name}</span>
                <span className="text-[10px] text-[var(--text-muted)] group-hover:hidden">{pl.trackIds.length}</span>
                <button
                  onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === pl.id ? null : pl.id) }}
                  className="hidden group-hover:flex p-0.5 rounded hover:bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <MoreHorizontal size={12} />
                </button>
              </button>
            )}
            {menuOpen === pl.id && (
              <div className="absolute right-0 top-full mt-0.5 z-50 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-xl py-1 w-36">
                <button onClick={() => startRename(pl)} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--text-primary)] hover:bg-[var(--surface-overlay)]">
                  <Edit2 size={11} /> Rename
                </button>
                <button onClick={() => handleDelete(pl.id)} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-[var(--surface-overlay)]">
                  <Trash2 size={11} /> Delete
                </button>
              </div>
            )}
          </div>
        ))}

        {/* New playlist input */}
        {creating && (
          <input
            ref={inputRef}
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onBlur={handleCreate}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') { setCreating(false); setNewName('') } }}
            placeholder="Playlist name"
            className="w-full px-2 py-1.5 rounded-lg text-sm bg-[var(--surface-overlay)] border border-[var(--accent)] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
          />
        )}
      </div>
    </div>
  )
}

// ─── Album grid ───────────────────────────────────────────────────────────────

interface Album {
  name: string
  artist: string
  year: number | null
  tracks: LibraryTrack[]
  coverTrack: LibraryTrack
}

function AlbumCard({ album, onPlay, onOpen }: { album: Album; onPlay: () => void; onOpen: () => void }): JSX.Element {
  const [hovered, setHovered] = useState(false)
  const el = (window as any).electron
  const { updateLibraryTrack } = useStore()
  const [art, setArt] = useState<string | null>(album.coverTrack.albumArt ?? null)

  useEffect(() => {
    if (!el || !album.coverTrack.hasAlbumArt || album.coverTrack.albumArt) return
    el.readAlbumArt(album.coverTrack.filePath).then((a: string | null) => {
      if (a) { setArt(a); updateLibraryTrack(album.coverTrack.id, { albumArt: a }) }
    })
  }, [album.coverTrack.id])

  return (
    <div
      className="group cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onOpen}
    >
      <div className="relative rounded-xl overflow-hidden bg-[var(--surface-overlay)] aspect-square mb-2.5 shadow-lg">
        {art
          ? <img src={art} alt={album.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
          : <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]"><Music size={40} /></div>
        }
        {/* Play overlay */}
        <div className={`absolute inset-0 bg-black/40 flex items-end p-3 transition-opacity duration-200 ${hovered ? 'opacity-100' : 'opacity-0'}`}>
          <button
            onClick={e => { e.stopPropagation(); onPlay() }}
            className="ml-auto w-10 h-10 rounded-full bg-[var(--accent)] flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
          >
            <Play size={16} fill="white" className="text-white ml-0.5" />
          </button>
        </div>
      </div>
      <p className="text-[var(--text-primary)] text-sm font-medium truncate">{album.name}</p>
      <p className="text-[var(--text-muted)] text-xs truncate">{album.artist}{album.year ? ` · ${album.year}` : ''}</p>
      <p className="text-[var(--text-muted)] text-[11px]">{album.tracks.length} {album.tracks.length === 1 ? 'song' : 'songs'}</p>
    </div>
  )
}

// ─── Song row ─────────────────────────────────────────────────────────────────

function SongRow({ track, index, queue, onEdit, onAddToPlaylist, showAlbum = true, draggable = false, onDragStart, onDragOver, onDrop }: {
  track: LibraryTrack
  index: number
  queue: LibraryTrack[]
  onEdit: (t: LibraryTrack) => void
  onAddToPlaylist: (t: LibraryTrack) => void
  showAlbum?: boolean
  draggable?: boolean
  onDragStart?: () => void
  onDragOver?: (e: React.DragEvent) => void
  onDrop?: () => void
}): JSX.Element {
  const { playTrack } = useStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [lyricsOpen, setLyricsOpen] = useState(false)
  const [lyrics, setLyrics] = useState<string | null>(null)
  const [lyricsLoading, setLyricsLoading] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const el = (window as any).electron

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const handlePlay = () => {
    const qTracks = queue.map(libraryTrackToQueueTrack)
    const thisTrack = libraryTrackToQueueTrack(track)
    playTrack(thisTrack, qTracks)
  }

  const toggleLyrics = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (lyricsOpen) { setLyricsOpen(false); return }
    setLyricsOpen(true)
    if (lyrics !== null || !el) return
    setLyricsLoading(true)
    try {
      const meta = await el.readTrackMetadata(track.filePath)
      setLyrics(meta?.lyrics || '')
    } catch { setLyrics('') }
    finally { setLyricsLoading(false) }
  }

  return (
    <div>
      <div
        className={`group flex items-center gap-3 px-4 py-2 hover:bg-[var(--surface-overlay)] rounded-lg transition-colors cursor-pointer ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onDoubleClick={handlePlay}
        draggable={draggable}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        {draggable && (
          <GripVertical size={14} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 shrink-0" />
        )}
        {/* Index / play button */}
        <div className="w-5 shrink-0 flex items-center justify-center">
          {hovered
            ? <button onClick={handlePlay}><Play size={13} fill="currentColor" className="text-[var(--text-primary)]" /></button>
            : <span className="text-[var(--text-muted)] text-xs">{index + 1}</span>
          }
        </div>
        {/* Art */}
        <div className="w-9 h-9 rounded overflow-hidden shrink-0">
          <AlbumArtThumb track={track} size={36} />
        </div>
        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-[var(--text-primary)] text-sm truncate">{track.title}</p>
          <p className="text-[var(--text-muted)] text-xs truncate">{track.artist || 'Unknown Artist'}</p>
        </div>
        {showAlbum && (
          <span className="text-[var(--text-muted)] text-xs truncate max-w-[160px] hidden lg:block">{track.album}</span>
        )}
        <span className="text-[var(--text-muted)] text-xs shrink-0">{fmtDur(track.duration)}</span>
        {/* Lyrics toggle */}
        <button
          onClick={toggleLyrics}
          className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-colors shrink-0 ${lyricsOpen ? 'text-[var(--accent)] opacity-100' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
          title={lyricsOpen ? 'Hide lyrics' : 'Show lyrics'}
        >
          <FileText size={13} />
        </button>
        {/* Menu */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            onClick={e => { e.stopPropagation(); setMenuOpen(v => !v) }}
            className="p-1 rounded opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <MoreHorizontal size={14} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 z-50 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl py-1 w-44">
              <button onClick={() => { handlePlay(); setMenuOpen(false) }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-primary)] hover:bg-[var(--surface-overlay)]">
                <Play size={12} /> Play now
              </button>
              <button onClick={() => { onEdit(track); setMenuOpen(false) }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-primary)] hover:bg-[var(--surface-overlay)]">
                <Edit2 size={12} /> Edit info
              </button>
              <button onClick={() => { onAddToPlaylist(track); setMenuOpen(false) }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-primary)] hover:bg-[var(--surface-overlay)]">
                <ListMusic size={12} /> Add to playlist
              </button>
            </div>
          )}
        </div>
      </div>
      {/* Expandable lyrics */}
      {lyricsOpen && (
        <div className="mx-4 mb-2 px-3 py-2.5 rounded-lg bg-[var(--surface-overlay)] border border-[var(--border)]">
          {lyricsLoading ? (
            <div className="flex items-center gap-2 text-[var(--text-muted)] text-xs">
              <Loader2 size={12} className="animate-spin" /> Loading lyrics…
            </div>
          ) : lyrics ? (
            <pre className="text-[var(--text-primary)] text-xs font-sans whitespace-pre-wrap leading-relaxed">{lyrics}</pre>
          ) : (
            <p className="text-[var(--text-muted)] text-xs italic">No lyrics found for this track.</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Add to Playlist picker ───────────────────────────────────────────────────

function AddToPlaylistPicker({ track, onClose }: { track: LibraryTrack; onClose: () => void }): JSX.Element {
  const { localPlaylists, addToLocalPlaylist, createLocalPlaylist } = useStore()
  const [newName, setNewName] = useState('')
  const [added, setAdded] = useState<string | null>(null)

  const add = (playlistId: string) => {
    addToLocalPlaylist(playlistId, track.id)
    setAdded(playlistId)
    setTimeout(onClose, 800)
  }

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-72 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <h3 className="text-[var(--text-primary)] font-semibold text-sm">Add to Playlist</h3>
          <button onClick={onClose} className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)]"><X size={14} /></button>
        </div>
        <div className="max-h-64 overflow-y-auto py-1">
          {localPlaylists.length === 0 && (
            <p className="text-[var(--text-muted)] text-xs text-center py-4">No playlists yet</p>
          )}
          {localPlaylists.map(pl => (
            <button key={pl.id} onClick={() => add(pl.id)} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--surface-overlay)] transition-colors">
              <ListMusic size={14} className="text-[var(--text-muted)]" />
              <span className="text-[var(--text-primary)] text-sm flex-1 text-left truncate">{pl.name}</span>
              {added === pl.id && <Check size={13} className="text-emerald-400" />}
            </button>
          ))}
        </div>
        <div className="px-4 py-3 border-t border-[var(--border)]">
          <div className="flex gap-2">
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && newName.trim()) { createLocalPlaylist(newName.trim()); setNewName('') } }}
              placeholder="New playlist name…"
              className="flex-1 bg-[var(--surface-overlay)] border border-[var(--border)] rounded-lg text-sm px-3 py-1.5 text-[var(--text-primary)] outline-none focus:border-[var(--accent)] placeholder:text-[var(--text-muted)]"
            />
            <button
              onClick={() => { if (newName.trim()) { createLocalPlaylist(newName.trim()); setNewName('') } }}
              className="px-3 py-1.5 bg-[var(--accent)] text-white text-sm rounded-lg hover:bg-[var(--accent-hover)]"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Album detail view ────────────────────────────────────────────────────────

function AlbumDetail({ album, onBack, onEdit, onAddToPlaylist }: {
  album: Album; onBack: () => void; onEdit: (t: LibraryTrack) => void; onAddToPlaylist: (t: LibraryTrack) => void
}): JSX.Element {
  const { playTrack } = useStore()
  const el = (window as any).electron
  const { updateLibraryTrack } = useStore()
  const [art, setArt] = useState<string | null>(album.coverTrack.albumArt ?? null)

  useEffect(() => {
    if (!el || !album.coverTrack.hasAlbumArt || album.coverTrack.albumArt) return
    el.readAlbumArt(album.coverTrack.filePath).then((a: string | null) => {
      if (a) { setArt(a); updateLibraryTrack(album.coverTrack.id, { albumArt: a }) }
    })
  }, [album.coverTrack.id])

  const totalDur = album.tracks.reduce((s, t) => s + t.duration, 0)
  const sortedTracks = [...album.tracks].sort((a, b) => (a.trackNumber ?? 999) - (b.trackNumber ?? 999))

  const playAll = () => {
    const q = sortedTracks.map(libraryTrackToQueueTrack)
    if (q.length) playTrack(q[0], q)
  }

  const shuffle = () => {
    const q = [...sortedTracks].sort(() => Math.random() - 0.5).map(libraryTrackToQueueTrack)
    if (q.length) playTrack(q[0], q)
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="flex items-end gap-6 p-6 pb-4">
        <button onClick={onBack} className="absolute top-4 left-4 p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-overlay)] transition-colors">
          <ChevronLeft size={18} />
        </button>
        <div className="w-44 h-44 rounded-2xl overflow-hidden shadow-2xl shrink-0 bg-[var(--surface-overlay)] flex items-center justify-center">
          {art ? <img src={art} alt={album.name} className="w-full h-full object-cover" /> : <Music size={48} className="text-[var(--text-muted)]" />}
        </div>
        <div className="pb-1">
          <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">Album</p>
          <h1 className="text-[var(--text-primary)] text-3xl font-bold mb-1">{album.name}</h1>
          <p className="text-[var(--text-muted)] text-sm">{album.artist}{album.year ? ` · ${album.year}` : ''}</p>
          <p className="text-[var(--text-muted)] text-xs mt-1">{album.tracks.length} songs · {fmtDur(totalDur)}</p>
        </div>
      </div>
      {/* Controls */}
      <div className="flex items-center gap-3 px-6 pb-4">
        <button onClick={playAll} className="flex items-center gap-2 px-5 py-2 bg-[var(--accent)] text-white rounded-full text-sm font-semibold hover:bg-[var(--accent-hover)] transition-colors shadow-lg">
          <Play size={16} fill="white" className="ml-0.5" /> Play
        </button>
        <button onClick={shuffle} className="flex items-center gap-2 px-5 py-2 bg-[var(--surface-overlay)] text-[var(--text-primary)] rounded-full text-sm font-semibold hover:bg-[var(--surface-raised)] transition-colors border border-[var(--border)]">
          <Shuffle size={16} /> Shuffle
        </button>
      </div>
      {/* Tracks */}
      <div className="px-2 pb-6">
        {sortedTracks.map((t, i) => (
          <SongRow key={t.id} track={t} index={i} queue={sortedTracks} onEdit={onEdit} onAddToPlaylist={onAddToPlaylist} showAlbum={false} />
        ))}
      </div>
    </div>
  )
}

// ─── Playlist detail view ─────────────────────────────────────────────────────

function PlaylistDetail({ playlist, onEdit, onAddToPlaylist }: {
  playlist: LocalPlaylist; onEdit: (t: LibraryTrack) => void; onAddToPlaylist: (t: LibraryTrack) => void
}): JSX.Element {
  const { libraryTracks, playTrack, reorderLocalPlaylist, removeFromLocalPlaylist } = useStore()
  const tracks = playlist.trackIds.map(id => libraryTracks.find(t => t.id === id)).filter(Boolean) as LibraryTrack[]
  const dragRef = useRef<number | null>(null)

  const playAll = () => {
    const q = tracks.map(libraryTrackToQueueTrack)
    if (q.length) playTrack(q[0], q)
  }

  const handleDragStart = (i: number) => { dragRef.current = i }
  const handleDrop = (i: number) => {
    if (dragRef.current === null || dragRef.current === i) return
    const from = dragRef.current
    const newOrder = [...playlist.trackIds]
    const [moved] = newOrder.splice(from, 1)
    newOrder.splice(i, 0, moved)
    reorderLocalPlaylist(playlist.id, newOrder)
    dragRef.current = null
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex items-center gap-4 p-6 pb-4">
        <div className="w-32 h-32 rounded-xl bg-[var(--surface-overlay)] border border-[var(--border)] flex items-center justify-center shrink-0 shadow-xl">
          <ListMusic size={40} className="text-[var(--text-muted)]" />
        </div>
        <div>
          <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">Playlist</p>
          <h1 className="text-[var(--text-primary)] text-3xl font-bold">{playlist.name}</h1>
          <p className="text-[var(--text-muted)] text-xs mt-1">{tracks.length} songs</p>
        </div>
      </div>
      {tracks.length > 0 && (
        <div className="flex items-center gap-3 px-6 pb-4">
          <button onClick={playAll} className="flex items-center gap-2 px-5 py-2 bg-[var(--accent)] text-white rounded-full text-sm font-semibold hover:bg-[var(--accent-hover)] transition-colors shadow-lg">
            <Play size={16} fill="white" className="ml-0.5" /> Play
          </button>
        </div>
      )}
      {tracks.length === 0 ? (
        <p className="text-[var(--text-muted)] text-sm text-center py-16">This playlist is empty.<br />Add tracks from the library.</p>
      ) : (
        <div className="px-2 pb-6">
          {tracks.map((t, i) => (
            <div key={t.id} className="relative group/row">
              <SongRow
                track={t} index={i} queue={tracks} onEdit={onEdit} onAddToPlaylist={onAddToPlaylist}
                showAlbum draggable
                onDragStart={() => handleDragStart(i)}
                onDragOver={e => e.preventDefault()}
                onDrop={() => handleDrop(i)}
              />
              <button
                onClick={() => removeFromLocalPlaylist(playlist.id, t.id)}
                className="absolute right-8 top-1/2 -translate-y-1/2 p-1 rounded text-red-400/70 hover:text-red-400 opacity-0 group-hover/row:opacity-100 transition-opacity"
                title="Remove from playlist"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onOpenSettings }: { onOpenSettings: () => void }): JSX.Element {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="w-20 h-20 rounded-full bg-[var(--surface-overlay)] flex items-center justify-center">
        <Music size={36} className="text-[var(--text-muted)]" />
      </div>
      <div>
        <h2 className="text-[var(--text-primary)] text-xl font-semibold mb-1">Your library is empty</h2>
        <p className="text-[var(--text-muted)] text-sm max-w-xs">Add folders in Settings → Library Folders, then scan to import your music.</p>
      </div>
      <button
        onClick={onOpenSettings}
        className="flex items-center gap-2 px-5 py-2.5 bg-[var(--accent)] text-white rounded-full text-sm font-semibold hover:bg-[var(--accent-hover)] transition-colors shadow-lg"
      >
        <FolderOpen size={15} /> Add Folders
      </button>
    </div>
  )
}

// ─── Main LibraryTab ──────────────────────────────────────────────────────────

type LibView = 'albums' | 'songs'

export default function LibraryTab(): JSX.Element {
  const {
    libraryTracks, libraryScanning, localPlaylists,
    activeLocalPlaylistId, setActiveLocalPlaylistId,
    scanLibrary, libraryFolders, loadLibrary,
    setShowSettings, playTrack,
  } = useStore()
  const isElectron = !!(window as any).electron

  const [libView, setLibView] = useState<LibView>('albums')
  const [searchQ, setSearchQ] = useState('')
  const [editingTrack, setEditingTrack] = useState<LibraryTrack | null>(null)
  const [addToPlaylistTrack, setAddToPlaylistTrack] = useState<LibraryTrack | null>(null)
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null)

  // Load persisted library on mount
  useEffect(() => { loadLibrary() }, [])

  // Build albums map
  const albums = useMemo<Album[]>(() => {
    const map = new Map<string, Album>()
    for (const t of libraryTracks) {
      const key = `${t.album || 'Unknown Album'}__${t.albumArtist || t.artist || 'Unknown Artist'}`
      if (!map.has(key)) {
        map.set(key, { name: t.album || 'Unknown Album', artist: t.albumArtist || t.artist || 'Unknown Artist', year: t.year, tracks: [], coverTrack: t })
      }
      const alb = map.get(key)!
      alb.tracks.push(t)
      if (t.trackNumber === 1 || !alb.coverTrack.hasAlbumArt && t.hasAlbumArt) alb.coverTrack = t
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [libraryTracks])

  // Filtered tracks/albums
  const filteredTracks = useMemo(() => {
    if (!searchQ) return libraryTracks
    const q = searchQ.toLowerCase()
    return libraryTracks.filter(t => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q) || t.album.toLowerCase().includes(q))
  }, [libraryTracks, searchQ])

  const filteredAlbums = useMemo(() => {
    if (!searchQ) return albums
    const q = searchQ.toLowerCase()
    return albums.filter(a => a.name.toLowerCase().includes(q) || a.artist.toLowerCase().includes(q))
  }, [albums, searchQ])

  const activePlaylist = localPlaylists.find(p => p.id === activeLocalPlaylistId) ?? null

  const playAll = () => {
    if (!filteredTracks.length) return
    const q = filteredTracks.map(libraryTrackToQueueTrack)
    playTrack(q[0], q)
  }

  const shuffle = () => {
    if (!filteredTracks.length) return
    const q = [...filteredTracks].sort(() => Math.random() - 0.5).map(libraryTrackToQueueTrack)
    playTrack(q[0], q)
  }

  const showEmpty = libraryTracks.length === 0 && !libraryScanning

  return (
    <div className="flex-1 flex overflow-hidden bg-[var(--bg)]">
      {/* Playlists sidebar */}
      <PlaylistsSidebar onSelect={setActiveLocalPlaylistId} activeId={activeLocalPlaylistId} />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="shrink-0 flex items-center gap-3 px-5 py-3 border-b border-[var(--border)]" style={{ WebkitAppRegion: 'no-drag', paddingRight: isElectron ? '148px' : undefined } as React.CSSProperties}>
          {selectedAlbum && (
            <button onClick={() => setSelectedAlbum(null)} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-overlay)] transition-colors">
              <ChevronLeft size={16} />
            </button>
          )}

          {!selectedAlbum && !activePlaylist && (
            <>
              <div className="flex items-center gap-1 bg-[var(--surface-overlay)] rounded-lg p-0.5">
                <button onClick={() => setLibView('albums')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${libView === 'albums' ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
                  <LayoutGrid size={13} /> Albums
                </button>
                <button onClick={() => setLibView('songs')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${libView === 'songs' ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
                  <List size={13} /> Songs
                </button>
              </div>

              {/* Search */}
              <div className="relative flex-1 max-w-xs">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  placeholder="Search library…"
                  className="w-full pl-8 pr-3 py-1.5 bg-[var(--surface-overlay)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                />
              </div>

              <div className="flex items-center gap-2 ml-auto">
                {libraryTracks.length > 0 && (
                  <>
                    <button onClick={playAll} className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--accent)] text-white rounded-lg text-xs font-medium hover:bg-[var(--accent-hover)] transition-colors">
                      <Play size={12} fill="white" /> Play
                    </button>
                    <button onClick={shuffle} className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface-overlay)] text-[var(--text-muted)] border border-[var(--border)] rounded-lg text-xs font-medium hover:text-[var(--text-primary)] transition-colors">
                      <Shuffle size={12} /> Shuffle
                    </button>
                  </>
                )}
                <button
                  onClick={() => scanLibrary()}
                  disabled={libraryScanning || libraryFolders.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface-overlay)] border border-[var(--border)] text-[var(--text-muted)] rounded-lg text-xs font-medium hover:text-[var(--text-primary)] transition-colors disabled:opacity-40"
                  title={libraryFolders.length === 0 ? 'Add folders in Settings first' : 'Scan library'}
                >
                  {libraryScanning ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
                  {libraryScanning ? 'Scanning…' : 'Scan'}
                </button>
              </div>
            </>
          )}

          {(selectedAlbum || activePlaylist) && (
            <h2 className="text-[var(--text-primary)] font-semibold text-base">
              {selectedAlbum?.name ?? activePlaylist?.name}
            </h2>
          )}
        </div>

        {/* Content */}
        {showEmpty ? (
          <EmptyState onOpenSettings={() => setShowSettings(true)} />
        ) : libraryScanning ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <Loader2 size={32} className="animate-spin text-[var(--accent)]" />
            <p className="text-[var(--text-muted)] text-sm">Scanning your library…</p>
          </div>
        ) : activePlaylist ? (
          <PlaylistDetail playlist={activePlaylist} onEdit={setEditingTrack} onAddToPlaylist={setAddToPlaylistTrack} />
        ) : selectedAlbum ? (
          <AlbumDetail album={selectedAlbum} onBack={() => setSelectedAlbum(null)} onEdit={setEditingTrack} onAddToPlaylist={setAddToPlaylistTrack} />
        ) : libView === 'albums' ? (
          <div className="flex-1 overflow-y-auto p-5">
            {filteredAlbums.length === 0 ? (
              <p className="text-[var(--text-muted)] text-sm text-center py-16">No albums found</p>
            ) : (
              <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
                {filteredAlbums.map((alb) => (
                  <AlbumCard
                    key={`${alb.name}__${alb.artist}`}
                    album={alb}
                    onPlay={() => {
                      const q = [...alb.tracks].sort((a,b) => (a.trackNumber ?? 999)-(b.trackNumber ?? 999)).map(libraryTrackToQueueTrack)
                      playTrack(q[0], q)
                    }}
                    onOpen={() => setSelectedAlbum(alb)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Songs list */
          <div className="flex-1 overflow-y-auto py-2 px-2">
            {/* Header row */}
            <div className="flex items-center gap-3 px-4 py-1 mb-1">
              <div className="w-5 text-[10px] text-[var(--text-muted)] uppercase tracking-wider text-center">#</div>
              <div className="w-9 shrink-0" />
              <div className="flex-1 text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Title</div>
              <div className="hidden lg:block max-w-[160px] text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Album</div>
              <Clock size={11} className="text-[var(--text-muted)]" />
              <div className="w-5" />
            </div>
            {filteredTracks.length === 0 ? (
              <p className="text-[var(--text-muted)] text-sm text-center py-16">No songs found</p>
            ) : (
              filteredTracks.map((t, i) => (
                <SongRow key={t.id} track={t} index={i} queue={filteredTracks} onEdit={setEditingTrack} onAddToPlaylist={setAddToPlaylistTrack} />
              ))
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {editingTrack && <MetadataEditor track={editingTrack} onClose={() => setEditingTrack(null)} />}
      {addToPlaylistTrack && <AddToPlaylistPicker track={addToPlaylistTrack} onClose={() => setAddToPlaylistTrack(null)} />}
    </div>
  )
}
