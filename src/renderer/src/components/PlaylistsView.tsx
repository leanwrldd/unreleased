import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import {
  ListMusic, Play, Loader2, Plus, Trash2, Pencil, ArrowLeft,
  X, Check, Heart, Shuffle, Music2, Clock, GripVertical,
  ListPlus, Download, Share2, Archive, Info, FolderInput, MoreHorizontal,
  Search, ChevronUp, ChevronDown,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import * as userApi from '../lib/userApi'
import type { PlaylistDetail, PlaylistSummary } from '../lib/userApi'
import { Track } from '../types'
import { AlbumArtThumbnail } from './AlbumArtThumbnail'
import { buildImageUrl, buildStreamUrl, JWAPI_BASE, apiFetch, JWApiSong } from '../lib/juicewrldApi'
import { formatDuration } from '../lib/lyrics'
import LikedSongsView from './LikedSongsView'
import SongInfoModal from './SongInfoModal'

// ── PlaylistMosaic ────────────────────────────────────────────────────────────

function PlaylistMosaic({ tracks, className = '' }: { tracks: Track[]; className?: string }): JSX.Element {
  const artUrls = tracks.slice(0, 4).map(t => t.imageUrl).filter(Boolean) as string[]
  if (artUrls.length === 0) {
    return (
      <div className={`bg-gradient-to-br from-accent/40 to-accent/10 flex items-center justify-center ${className}`}>
        <Music2 size={48} className="text-accent/50" />
      </div>
    )
  }
  if (artUrls.length < 4) return <img src={artUrls[0]} alt="" className={`object-cover ${className}`} />
  return (
    <div className={`grid grid-cols-2 ${className}`} style={{ overflow: 'hidden' }}>
      {artUrls.map((url, i) => (
        <img key={i} src={url} alt="" className="w-full h-full object-cover" style={{ aspectRatio: '1' }} />
      ))}
    </div>
  )
}

function totalDurationLabel(tracks: Track[]): string {
  const secs = tracks.reduce((acc, t) => acc + (t.duration ?? 0), 0)
  if (secs === 0) return ''
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (h > 0) return `${h} hr ${m} min`
  return `${m} min`
}

// ── MenuItem helper ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MenuItem({ icon: Icon, label, onClick, destructive = false, disabled = false, trailing }: {
  icon: React.ElementType<any>
  label: string
  onClick: () => void
  destructive?: boolean
  disabled?: boolean
  trailing?: React.ReactNode
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-sm transition-colors hover:bg-surface-overlay disabled:opacity-40 disabled:cursor-not-allowed ${
        destructive ? 'text-red-400 hover:text-red-300' : 'text-text-primary'
      }`}
    >
      <Icon size={14} className={destructive ? 'text-red-400' : 'text-text-muted'} />
      <span className="flex-1 text-left">{label}</span>
      {trailing}
    </button>
  )
}

type SortField = 'default' | 'title' | 'artist' | 'duration'
interface SortState { field: SortField; dir: 'asc' | 'desc' }

interface TrackMenuState { track: Track; songId: number; i: number; x: number; y: number; showPlaylists: boolean }
interface LibMenuState   { playlist: PlaylistSummary; x: number; y: number; showPlaylists: boolean }

// ── Tracklist skeleton ────────────────────────────────────────────────────────

function TrackSkeleton(): JSX.Element {
  return (
    <div className="space-y-1 pt-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="grid items-center gap-3 px-4 py-2" style={{ gridTemplateColumns: '16px 28px 40px 1fr 56px 36px' }}>
          <span />
          <div className="w-4 h-3 rounded bg-surface-overlay animate-pulse" />
          <div className="w-10 h-10 rounded-md bg-surface-overlay animate-pulse" />
          <div className="space-y-1.5">
            <div className={`h-3 rounded bg-surface-overlay animate-pulse`} style={{ width: `${55 + (i * 17) % 35}%` }} />
            <div className="h-2.5 rounded bg-surface-overlay animate-pulse w-1/3" />
          </div>
          <div className="h-3 w-8 rounded bg-surface-overlay animate-pulse mx-auto" />
          <span />
        </div>
      ))}
    </div>
  )
}

// ── Sort header cell ──────────────────────────────────────────────────────────

function SortHeader({ label, field, sort, onSort }: {
  label: string | React.ReactNode
  field: SortField
  sort: SortState
  onSort: (f: SortField) => void
}): JSX.Element {
  const active = sort.field === field
  return (
    <button
      onClick={() => field !== 'default' && onSort(field)}
      className={`flex items-center gap-0.5 transition-colors ${field === 'default' ? 'cursor-default' : 'hover:text-text-primary'} ${active ? 'text-text-primary' : ''}`}
    >
      {label}
      {active && field !== 'default' && (
        sort.dir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />
      )}
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PlaylistsView(): JSX.Element {
  const { account, playlists, refreshPlaylists, playTrack, addToQueue, setShowUserAuth, likedTrackIds } = useStore()

  const [showLiked, setShowLiked] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<PlaylistDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // Create / rename
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')

  // Context menus
  const [trackMenu, setTrackMenu] = useState<TrackMenuState | null>(null)
  const [libMenu, setLibMenu] = useState<LibMenuState | null>(null)
  const [showAddAllMenu, setShowAddAllMenu] = useState(false)
  const addAllMenuRef = useRef<HTMLDivElement>(null)

  // Drag-to-reorder
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dropIdx, setDropIdx] = useState<number | null>(null)

  // Sort + search
  const [sort, setSort] = useState<SortState>({ field: 'default', dir: 'asc' })
  const [search, setSearch] = useState('')

  // Zip / share / bulk-add
  const [zipState, setZipState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [sharing, setSharing] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const [addingAll, setAddingAll] = useState(false)

  // Song info modal
  const [infoSong, setInfoSong] = useState<JWApiSong | null>(null)

  // Playlist membership cache: playlistId → Set<songId>
  const membershipCache = useRef<Map<number, Set<number>>>(new Map())

  // Race-condition guard: each loadDetail call gets a generation ID; stale responses are discarded
  const loadGen = useRef(0)

  // ── Derived data — ALL hooks at top level, no conditionals ────────────────

  const summary = useMemo(() => playlists.find(p => p.id === selectedId), [playlists, selectedId])
  const tracks: Track[] = useMemo(
    () => detail ? detail.items.map(it => userApi.liteSongToTrack(it.song)) : [],
    [detail]
  )
  const otherPlaylists = useMemo(() => playlists.filter(p => p.id !== selectedId), [playlists, selectedId])
  const dragEnabled = sort.field === 'default' && !search.trim()

  const displayTracks = useMemo(() => {
    let result = tracks
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(t => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q))
    }
    if (sort.field !== 'default') {
      result = [...result].sort((a, b) => {
        let cmp = 0
        if (sort.field === 'title') cmp = a.title.localeCompare(b.title)
        else if (sort.field === 'artist') cmp = a.artist.localeCompare(b.artist)
        else if (sort.field === 'duration') cmp = (a.duration || 0) - (b.duration || 0)
        return sort.dir === 'asc' ? cmp : -cmp
      })
    }
    return result
  }, [tracks, search, sort])

  // ── Effects ────────────────────────────────────────────────────────────────

  // Populate membership cache when a detail loads
  useEffect(() => {
    if (detail) {
      membershipCache.current.set(detail.id, new Set(detail.items.map(i => i.song.id)))
    }
  }, [detail])

  // Listen for sidebar "Playlists" re-click → go back to library
  useEffect(() => {
    const h = () => { setSelectedId(null); setRenaming(false); setSearch(''); setSort({ field: 'default', dir: 'asc' }) }
    window.addEventListener('playlists:back', h)
    return () => window.removeEventListener('playlists:back', h)
  }, [])

  // Close menus on outside click
  useEffect(() => {
    if (!trackMenu && !libMenu && !showAddAllMenu) return
    const h = () => { setTrackMenu(null); setLibMenu(null); setShowAddAllMenu(false) }
    window.addEventListener('click', h)
    return () => window.removeEventListener('click', h)
  }, [trackMenu, libMenu, showAddAllMenu])

  useEffect(() => { if (account) refreshPlaylists() }, [account, refreshPlaylists])

  const loadDetail = useCallback(async (id: number) => {
    const gen = ++loadGen.current
    setLoadingDetail(true)
    try {
      const result = await userApi.getPlaylist(id)
      if (gen !== loadGen.current) return   // stale — a newer load is in flight
      setDetail(result)
    } catch {
      if (gen === loadGen.current) setDetail(null)
    } finally {
      if (gen === loadGen.current) setLoadingDetail(false)
    }
  }, [])

  useEffect(() => {
    if (selectedId != null) loadDetail(selectedId)
    else setDetail(null)
  }, [selectedId, loadDetail])

  // Reset sort/search/infoSong when switching playlists
  useEffect(() => {
    setSort({ field: 'default', dir: 'asc' })
    setSearch('')
    setInfoSong(null)
  }, [selectedId])

  // ── Handlers ───────────────────────────────────────────────────────────────

  const createPlaylist = async () => {
    const name = newName.trim(); if (!name) return
    try { await userApi.createPlaylist(name); setNewName(''); setCreating(false); await refreshPlaylists() } catch {}
  }

  const deleteSelected = async () => {
    if (selectedId == null) return
    try { await userApi.deletePlaylist(selectedId); setSelectedId(null); await refreshPlaylists() } catch {}
  }

  const renameSelected = async () => {
    if (selectedId == null) return
    const name = renameValue.trim(); if (!name) return
    try {
      const u = await userApi.renamePlaylist(selectedId, name)
      setDetail(u)
      setRenaming(false)
      await refreshPlaylists()
    } catch {}
  }

  // Optimistic remove — no loading flash
  const removeTrack = useCallback(async (songId: number) => {
    if (selectedId == null) return
    setDetail(prev => prev ? { ...prev, items: prev.items.filter(i => i.song.id !== songId) } : null)
    membershipCache.current.get(selectedId)?.delete(songId)
    try { await userApi.removeFromPlaylist(selectedId, songId); await refreshPlaylists() }
    catch { await loadDetail(selectedId) }
  }, [selectedId, loadDetail, refreshPlaylists])

  const handleSort = (field: SortField) => {
    setSort(prev => {
      if (prev.field === field) {
        if (prev.dir === 'asc') return { field, dir: 'desc' }
        return { field: 'default', dir: 'asc' }
      }
      return { field, dir: 'asc' }
    })
  }

  const handleDrop = useCallback(async (toIdx: number) => {
    if (dragIdx === null || !detail || selectedId == null) return
    const from = dragIdx
    setDragIdx(null); setDropIdx(null)
    if (from === toIdx) return
    const newItems = [...detail.items]
    const [removed] = newItems.splice(from, 1)
    newItems.splice(toIdx, 0, removed)
    setDetail({ ...detail, items: newItems })
    try {
      const updated = await userApi.reorderPlaylist(selectedId, newItems.map(it => it.song.id))
      setDetail(updated)
    } catch { await loadDetail(selectedId) }
  }, [dragIdx, detail, selectedId, loadDetail])

  const openSongInfo = useCallback(async (songId: number) => {
    try { setInfoSong(await apiFetch<JWApiSong>(`/songs/${songId}/`)) } catch {}
  }, [])

  const isMember = (playlistId: number, songId: number): boolean | null => {
    const cache = membershipCache.current.get(playlistId)
    if (!cache) return null
    return cache.has(songId)
  }

  const handleZipDownload = useCallback(async (trackList: Track[], name: string) => {
    if (zipState === 'loading') return
    const paths = trackList.map(t => t.path).filter(Boolean)
    if (!paths.length) return
    setZipState('loading')
    try {
      const res = await fetch(`${JWAPI_BASE}/files/zip-selection/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths }),
      })
      if (!res.ok) throw new Error()
      const contentType = res.headers.get('content-type') || ''
      if (contentType.includes('zip') || contentType.includes('octet-stream')) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href = url; a.download = `${name}.zip`; a.click()
        URL.revokeObjectURL(url)
      } else {
        const data = await res.json()
        if (data.download_url) { const a = document.createElement('a'); a.href = data.download_url; a.download = `${name}.zip`; a.click() }
      }
      setZipState('done')
    } catch { setZipState('error') }
    setTimeout(() => setZipState('idle'), 3000)
  }, [zipState])

  const handleShare = useCallback(async (trackList: Track[]) => {
    if (sharing) return
    const paths = trackList.map(t => t.path).filter(Boolean)
    if (!paths.length) return
    setSharing(true)
    try {
      const res = await fetch(`${JWAPI_BASE}/playlists/share/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths }),
      })
      if (!res.ok) throw new Error()
      const { share_id } = await res.json() as { share_id: string }
      await navigator.clipboard.writeText(`${window.location.origin}/shared/${share_id}`)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2500)
    } catch {
      try { await navigator.clipboard.writeText(window.location.href) } catch {}
    } finally { setSharing(false) }
  }, [sharing])

  const handleAddAllTo = useCallback(async (targetId: number, srcDetail: PlaylistDetail) => {
    setAddingAll(true)
    await Promise.all(srcDetail.items.map(item => userApi.addToPlaylist(targetId, item.song.id).catch(() => {})))
    const targetSet = membershipCache.current.get(targetId) ?? new Set<number>()
    srcDetail.items.forEach(i => targetSet.add(i.song.id))
    membershipCache.current.set(targetId, targetSet)
    setAddingAll(false)
    await refreshPlaylists()
  }, [refreshPlaylists])

  // ── Liked Songs ────────────────────────────────────────────────────────────

  if (showLiked) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-5 pt-4 shrink-0">
          <button onClick={() => setShowLiked(false)} className="flex items-center gap-1.5 text-text-muted hover:text-text-primary text-sm transition-colors">
            <ArrowLeft size={15} /> Playlists
          </button>
        </div>
        <LikedSongsView />
      </div>
    )
  }

  // ── Auth guard ─────────────────────────────────────────────────────────────

  if (!account) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
        <ListMusic size={40} className="text-text-muted mb-4" />
        <h2 className="text-text-primary text-lg font-semibold mb-1">Playlists</h2>
        <p className="text-text-muted text-sm mb-5 max-w-xs">Log in to create playlists that stay in sync wherever you listen.</p>
        <button onClick={() => setShowUserAuth(true)} className="px-5 py-2.5 rounded-xl bg-accent/15 hover:bg-accent/25 text-accent text-sm font-semibold transition-colors">
          Log in
        </button>
      </div>
    )
  }

  // ── Playlist detail ────────────────────────────────────────────────────────

  if (selectedId != null) {
    const durLabel = totalDurationLabel(tracks)

    const playShuffle = () => {
      if (!tracks.length) return
      const shuffled = [...tracks].sort(() => Math.random() - 0.5)
      playTrack(shuffled[0], shuffled)
    }

    return (
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto" onClick={() => { setTrackMenu(null); setShowAddAllMenu(false) }}>
        {/* Back */}
        <div className="px-6 pt-5 shrink-0">
          <button onClick={() => { setSelectedId(null); setRenaming(false) }} className="flex items-center gap-1.5 text-text-muted hover:text-text-primary text-sm transition-colors mb-4">
            <ArrowLeft size={15} /> Playlists
          </button>
        </div>

        {/* ── Hero (shown immediately using summary data) ── */}
        <div className="relative px-6 pb-6 shrink-0">
          {tracks[0]?.imageUrl && (
            <div className="absolute inset-0 opacity-20 blur-3xl scale-110 pointer-events-none" style={{ background: `url(${tracks[0].imageUrl}) center/cover`, zIndex: 0 }} />
          )}
          <div className="relative z-10 flex gap-6 items-end">
            <div className="shrink-0 rounded-xl shadow-2xl overflow-hidden" style={{ width: 180, height: 180 }}>
              {loadingDetail && tracks.length === 0 ? (
                <div className="w-full h-full bg-surface-overlay animate-pulse" />
              ) : (
                <PlaylistMosaic tracks={tracks} className="w-full h-full" />
              )}
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <p className="text-text-muted text-xs uppercase tracking-widest font-semibold mb-2">Playlist</p>
              {renaming ? (
                <div className="flex items-center gap-2 mb-3">
                  <input value={renameValue} onChange={e => setRenameValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && renameSelected()} autoFocus className="bg-surface-overlay border border-[var(--border)] rounded-lg px-3 py-2 text-text-primary text-2xl font-black focus:outline-none focus:border-accent/50 w-full" />
                  <button onClick={renameSelected} className="p-2 rounded-lg bg-accent/15 text-accent shrink-0"><Check size={16} /></button>
                  <button onClick={() => setRenaming(false)} className="p-2 rounded-lg text-text-muted hover:text-text-primary shrink-0"><X size={16} /></button>
                </div>
              ) : (
                <h1 className="text-text-primary text-3xl md:text-4xl font-black truncate mb-2">
                  {detail?.name ?? summary?.name ?? <span className="bg-surface-overlay rounded animate-pulse text-transparent select-none">Loading…</span>}
                </h1>
              )}
              <div className="flex items-center gap-1.5 text-text-muted text-sm mb-4">
                <span className="font-medium text-text-secondary">{account.discord_username}</span>
                {!loadingDetail && (
                  <>
                    <span>·</span>
                    <span>{tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}</span>
                    {durLabel && <><span>·</span><span className="flex items-center gap-1"><Clock size={12} />{durLabel}</span></>}
                  </>
                )}
                {loadingDetail && <span className="ml-1 text-xs opacity-50">Loading…</span>}
              </div>
              {/* Action row */}
              <div className="flex items-center gap-2 flex-wrap">
                {tracks.length > 0 && (
                  <button onClick={() => playTrack(tracks[0], tracks)} className="flex items-center gap-2 px-6 py-3 rounded-full bg-accent text-black text-sm font-bold hover:scale-105 active:scale-95 transition-transform shadow-lg">
                    <Play size={17} fill="currentColor" /> Play
                  </button>
                )}
                {tracks.length > 1 && (
                  <button onClick={playShuffle} className="flex items-center gap-2 px-4 py-3 rounded-full bg-surface-overlay hover:bg-surface-raised text-text-primary text-sm font-semibold transition-colors border border-[var(--border)]">
                    <Shuffle size={15} /> Shuffle
                  </button>
                )}
                <button onClick={() => handleZipDownload(tracks, detail?.name ?? summary?.name ?? 'playlist')} disabled={zipState === 'loading' || tracks.length === 0}
                  title={zipState === 'done' ? 'Download started!' : zipState === 'error' ? 'Failed' : 'Download all as ZIP'}
                  className={`p-2.5 rounded-full text-sm transition-colors disabled:opacity-40 ${zipState === 'done' ? 'text-accent bg-accent/10' : zipState === 'error' ? 'text-red-400 bg-red-400/10' : 'text-text-muted hover:text-text-primary hover:bg-surface-overlay'}`}>
                  {zipState === 'loading' ? <Loader2 size={16} className="animate-spin" /> : <Archive size={16} />}
                </button>
                <button onClick={() => handleShare(tracks)} disabled={sharing || tracks.length === 0}
                  title={shareCopied ? 'Link copied!' : 'Copy share link'}
                  className={`p-2.5 rounded-full text-sm transition-colors disabled:opacity-40 ${shareCopied ? 'text-accent bg-accent/10' : 'text-text-muted hover:text-text-primary hover:bg-surface-overlay'}`}>
                  {sharing ? <Loader2 size={16} className="animate-spin" /> : shareCopied ? <Check size={16} /> : <Share2 size={16} />}
                </button>
                {otherPlaylists.length > 0 && tracks.length > 0 && detail && (
                  <div className="relative" ref={addAllMenuRef} onClick={e => e.stopPropagation()}>
                    <button onClick={() => setShowAddAllMenu(v => !v)} title="Add all to playlist" disabled={addingAll}
                      className={`p-2.5 rounded-full text-sm transition-colors disabled:opacity-40 ${addingAll ? 'text-accent' : 'text-text-muted hover:text-text-primary hover:bg-surface-overlay'}`}>
                      {addingAll ? <Loader2 size={16} className="animate-spin" /> : <FolderInput size={16} />}
                    </button>
                    {showAddAllMenu && (
                      <div className="absolute top-full mt-1 left-0 bg-surface border border-[var(--border)] rounded-xl shadow-2xl py-1 min-w-[180px] z-50 max-h-60 overflow-y-auto">
                        <p className="px-3.5 pt-1 pb-1.5 text-[10px] uppercase tracking-widest text-text-muted font-semibold">Add all tracks to…</p>
                        {otherPlaylists.map(p => (
                          <button key={p.id} onClick={async () => { setShowAddAllMenu(false); await handleAddAllTo(p.id, detail) }} className="w-full text-left px-3.5 py-2 text-sm text-text-primary hover:bg-surface-overlay transition-colors truncate">
                            {p.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {!renaming && detail && (
                  <button onClick={() => { setRenameValue(detail.name); setRenaming(true) }} className="p-2.5 rounded-full text-text-muted hover:text-text-primary hover:bg-surface-overlay text-sm transition-colors">
                    <Pencil size={15} />
                  </button>
                )}
                <button onClick={deleteSelected} className="p-2.5 rounded-full text-text-muted hover:text-red-400 hover:bg-red-500/10 text-sm transition-colors">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-[var(--border)] mx-6 mb-3 shrink-0" />

        {/* ── Tracklist ── */}
        {loadingDetail ? (
          <TrackSkeleton />
        ) : tracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-center px-8">
            <Music2 className="text-text-muted opacity-20" size={40} />
            <p className="text-text-muted text-sm">This playlist is empty.</p>
            <p className="text-text-muted text-xs">Add tracks from the Tracker or Liked Songs.</p>
          </div>
        ) : (
          <div className="px-2 pb-8">
            {/* Search */}
            <div className="px-2 mb-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={`Search ${tracks.length} tracks…`}
                  className="w-full bg-surface-overlay border border-[var(--border)] rounded-xl pl-8 pr-4 py-2 text-text-primary text-sm focus:outline-none focus:border-accent/50 placeholder:text-text-muted"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Column headers */}
            <div className="grid items-center gap-3 px-4 pb-2 text-text-muted text-xs uppercase tracking-widest" style={{ gridTemplateColumns: '16px 28px 40px 1fr 56px 36px' }}>
              <span />
              <span>#</span>
              <span />
              <SortHeader label="Title" field="title" sort={sort} onSort={handleSort} />
              <div className="flex justify-center">
                <SortHeader label={<Clock size={12} className="inline" />} field="duration" sort={sort} onSort={handleSort} />
              </div>
              <span />
            </div>

            {displayTracks.length === 0 && (
              <p className="text-text-muted text-sm text-center py-8">No tracks match "{search}"</p>
            )}

            {displayTracks.map((track, displayIdx) => {
              const originalIdx = tracks.indexOf(track)
              const songId = track.id ? (userApi.trackIdToSongId(track.id) ?? -1) : -1
              const isDragging = dragEnabled && dragIdx === originalIdx
              const isDropTarget = dragEnabled && dropIdx === displayIdx && dragIdx !== null && dragIdx !== displayIdx

              return (
                <div
                  key={track.id}
                  draggable={dragEnabled}
                  onDragStart={() => dragEnabled && setDragIdx(originalIdx)}
                  onDragOver={e => { if (!dragEnabled) return; e.preventDefault(); setDropIdx(displayIdx) }}
                  onDragEnd={() => { setDragIdx(null); setDropIdx(null) }}
                  onDrop={() => dragEnabled && handleDrop(displayIdx)}
                  onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setTrackMenu({ track, songId, i: originalIdx, x: e.clientX, y: e.clientY, showPlaylists: false }) }}
                  className={`group grid items-center gap-3 px-4 py-2 rounded-lg transition-colors cursor-default select-none ${
                    isDragging ? 'opacity-40 bg-surface-raised' : isDropTarget ? 'border-t-2 border-accent bg-surface-overlay' : 'hover:bg-surface-raised'
                  }`}
                  style={{ gridTemplateColumns: '16px 28px 40px 1fr 56px 36px' }}
                >
                  <span className={`flex items-center justify-center text-text-muted ${dragEnabled ? 'opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing' : 'opacity-0'}`}>
                    <GripVertical size={14} />
                  </span>
                  <span className="text-center text-xs text-text-muted tabular-nums group-hover:hidden">{displayIdx + 1}</span>
                  <button className="hidden group-hover:flex items-center justify-center text-text-primary" onClick={() => playTrack(track, displayTracks)}>
                    <Play size={14} fill="currentColor" />
                  </button>
                  <AlbumArtThumbnail track={track} size={40} className="rounded-md" shimmer={false} />
                  <div className="min-w-0" onDoubleClick={() => playTrack(track, displayTracks)}>
                    <p className="text-text-primary text-sm font-medium truncate">{track.title}</p>
                    <p className="text-text-muted text-xs truncate">{track.artist}{track.album ? ` · ${track.album}` : ''}</p>
                  </div>
                  <span className="text-text-muted text-xs tabular-nums text-center">
                    {track.duration ? formatDuration(track.duration) : '--:--'}
                  </span>
                  <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={e => { e.stopPropagation(); setTrackMenu({ track, songId, i: originalIdx, x: e.clientX, y: e.clientY, showPlaylists: false }) }}
                      className="p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-surface-overlay transition-colors hidden md:flex" title="More options">
                      <MoreHorizontal size={13} />
                    </button>
                    <button onClick={() => removeTrack(songId)} className="p-1.5 text-text-muted hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors" title="Remove">
                      <X size={13} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Track context menu ── */}
        {trackMenu && (
          <div
            className="fixed z-50 bg-surface border border-[var(--border)] rounded-xl shadow-2xl py-1 min-w-[200px]"
            style={{ left: Math.min(trackMenu.x, window.innerWidth - 220), top: Math.min(trackMenu.y, window.innerHeight - 340) }}
            onClick={e => e.stopPropagation()}
          >
            <MenuItem icon={Play} label="Play" onClick={() => { playTrack(trackMenu.track, displayTracks); setTrackMenu(null) }} />
            <MenuItem icon={ListPlus} label="Add to queue" onClick={() => { addToQueue(trackMenu.track); setTrackMenu(null) }} />
            <MenuItem icon={Info} label="Song info" onClick={() => { openSongInfo(trackMenu.songId); setTrackMenu(null) }} disabled={trackMenu.songId < 0} />
            <div className="border-t border-[var(--border)] my-1" />
            <button
              className="w-full flex items-center justify-between gap-2.5 px-3.5 py-2 text-sm text-text-primary transition-colors hover:bg-surface-overlay"
              onClick={e => { e.stopPropagation(); setTrackMenu(prev => prev ? { ...prev, showPlaylists: !prev.showPlaylists } : null) }}
            >
              <span className="flex items-center gap-2.5"><FolderInput size={14} className="text-text-muted" />Add to playlist</span>
              <span className="text-text-muted text-xs">›</span>
            </button>
            {trackMenu.showPlaylists && (
              <div className="border-t border-[var(--border)] max-h-48 overflow-y-auto">
                {otherPlaylists.length === 0 ? (
                  <p className="px-3.5 py-2 text-xs text-text-muted">No other playlists</p>
                ) : otherPlaylists.map(p => {
                  const membership = isMember(p.id, trackMenu.songId)
                  return (
                    <button key={p.id} onClick={async () => {
                      if (membership) return
                      await userApi.addToPlaylist(p.id, trackMenu.songId)
                      const targetSet = membershipCache.current.get(p.id) ?? new Set<number>()
                      targetSet.add(trackMenu.songId)
                      membershipCache.current.set(p.id, targetSet)
                      setTrackMenu(null)
                      await refreshPlaylists()
                    }}
                      className={`w-full text-left px-3.5 py-2 text-sm transition-colors flex items-center justify-between gap-2 ${
                        membership ? 'text-text-muted cursor-default' : 'text-text-primary hover:bg-surface-overlay'
                      }`}
                    >
                      <span className="truncate">{p.name}</span>
                      {membership && <Check size={12} className="text-accent shrink-0" />}
                      {membership === null && <span className="text-[10px] text-text-muted shrink-0">?</span>}
                    </button>
                  )
                })}
              </div>
            )}
            <div className="border-t border-[var(--border)] my-1" />
            <MenuItem icon={Download} label="Download" onClick={() => {
              const a = document.createElement('a')
              a.href = buildStreamUrl(trackMenu.track.path); a.download = `${trackMenu.track.title}.mp3`; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.click()
              setTrackMenu(null)
            }} />
            <MenuItem icon={Trash2} label="Remove from playlist" destructive onClick={() => { removeTrack(trackMenu.songId); setTrackMenu(null) }} />
          </div>
        )}

        <SongInfoModal song={infoSong} onClose={() => setInfoSong(null)} />
      </div>
    )
  }

  // ── Playlist library ───────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto" onClick={() => setLibMenu(null)}>
      <div className="px-5 pt-5 pb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-text-primary text-xl font-bold">Your Library</h1>
            <p className="text-text-muted text-sm mt-0.5">Playlists and saved songs</p>
          </div>
          {!creating && (
            <button onClick={() => setCreating(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent/15 hover:bg-accent/25 text-accent text-sm font-semibold transition-colors">
              <Plus size={16} /> New
            </button>
          )}
        </div>

        {creating && (
          <div className="flex items-center gap-2 mb-5">
            <input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createPlaylist()} placeholder="Playlist name" autoFocus className="flex-1 bg-surface-overlay border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent/50" />
            <button onClick={createPlaylist} className="px-4 py-2.5 rounded-xl bg-accent text-black text-sm font-semibold">Create</button>
            <button onClick={() => { setCreating(false); setNewName('') }} className="p-2.5 rounded-xl text-text-muted hover:text-text-primary"><X size={16} /></button>
          </div>
        )}

        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
          <button onClick={() => setShowLiked(true)} className="group text-left">
            <div className="aspect-square rounded-xl bg-gradient-to-br from-accent/50 to-accent/10 flex items-center justify-center mb-2.5 group-hover:scale-[1.03] transition-transform shadow-md">
              <Heart size={48} className="text-accent" fill="currentColor" />
            </div>
            <p className="text-text-primary text-sm font-semibold truncate">Liked Songs</p>
            <p className="text-text-muted text-xs mt-0.5">{likedTrackIds.length} {likedTrackIds.length === 1 ? 'track' : 'tracks'}</p>
          </button>

          {playlists.map(p => (
            <button key={p.id} onClick={() => setSelectedId(p.id)}
              onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setLibMenu({ playlist: p, x: e.clientX, y: e.clientY, showPlaylists: false }) }}
              className="group text-left"
            >
              <div className="aspect-square rounded-xl overflow-hidden bg-surface-overlay flex items-center justify-center mb-2.5 group-hover:scale-[1.03] transition-transform shadow-md">
                {p.cover_image_url ? (
                  <img src={buildImageUrl(p.cover_image_url)} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-surface-raised to-surface-overlay flex items-center justify-center">
                    <Music2 size={40} className="text-text-muted opacity-40" />
                  </div>
                )}
              </div>
              <p className="text-text-primary text-sm font-semibold truncate">{p.name}</p>
              <p className="text-text-muted text-xs mt-0.5">{p.track_count} {p.track_count === 1 ? 'track' : 'tracks'}</p>
            </button>
          ))}
        </div>

        {playlists.length === 0 && <p className="text-text-muted text-sm mt-4">No playlists yet — create one to get started.</p>}
      </div>

      {/* Library card context menu */}
      {libMenu && (
        <div
          className="fixed z-50 bg-surface border border-[var(--border)] rounded-xl shadow-2xl py-1 min-w-[200px]"
          style={{ left: Math.min(libMenu.x, window.innerWidth - 220), top: Math.min(libMenu.y, window.innerHeight - 220) }}
          onClick={e => e.stopPropagation()}
        >
          <MenuItem icon={Play} label="Open" onClick={() => { setSelectedId(libMenu.playlist.id); setLibMenu(null) }} />
          <div className="border-t border-[var(--border)] my-1" />
          <button
            className="w-full flex items-center justify-between gap-2.5 px-3.5 py-2 text-sm text-text-primary transition-colors hover:bg-surface-overlay"
            onClick={e => { e.stopPropagation(); setLibMenu(prev => prev ? { ...prev, showPlaylists: !prev.showPlaylists } : null) }}
          >
            <span className="flex items-center gap-2.5"><FolderInput size={14} className="text-text-muted" />Add all to playlist</span>
            <span className="text-text-muted text-xs">›</span>
          </button>
          {libMenu.showPlaylists && (
            <div className="border-t border-[var(--border)] max-h-48 overflow-y-auto">
              {playlists.filter(p => p.id !== libMenu.playlist.id).length === 0 ? (
                <p className="px-3.5 py-2 text-xs text-text-muted">No other playlists</p>
              ) : playlists.filter(p => p.id !== libMenu.playlist.id).map(p => (
                <button key={p.id} onClick={async () => {
                  setLibMenu(null)
                  const srcDetail = await userApi.getPlaylist(libMenu.playlist.id)
                  await Promise.all(srcDetail.items.map(item => userApi.addToPlaylist(p.id, item.song.id).catch(() => {})))
                  await refreshPlaylists()
                }} className="w-full text-left px-3.5 py-2 text-sm text-text-primary hover:bg-surface-overlay transition-colors truncate">
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
