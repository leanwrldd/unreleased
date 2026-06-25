import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import {
  ListMusic, Play, Loader2, Plus, Trash2, Pencil, ArrowLeft,
  X, Check, Heart, Shuffle, Music2, Clock, GripVertical,
  ListPlus, Download, Share2, Archive, Info, FolderInput, MoreHorizontal,
  Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ImageOff, Globe, Lock, Link, ListEnd, HardDrive,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import * as userApi from '../lib/userApi'
import type { PlaylistDetail, PlaylistSummary } from '../lib/userApi'
import { Track, LocalPlaylist, LibraryTrack } from '../types'
import { AlbumArtThumbnail } from './AlbumArtThumbnail'
import { buildImageUrl, buildStreamUrl, JWAPI_BASE, apiFetch, JWApiSong, playlistCoverUrl } from '../lib/juicewrldApi'
import { formatDuration } from '../lib/lyrics'
import LikedSongsView from './LikedSongsView'
import { AlbumArtThumb } from './LibraryTab'
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
interface LibMenuState   { playlist: PlaylistSummary; x: number; y: number; showPlaylists: boolean; renaming?: boolean; renameVal?: string }

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

// ── Local-library helpers ─────────────────────────────────────────────────────

function libTrackToTrack(t: LibraryTrack): Track {
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
  } as Track
}

function LocalPlaylistMosaic({ trackIds, libraryTracks, className = '' }: {
  trackIds: string[]; libraryTracks: LibraryTrack[]; className?: string
}): JSX.Element {
  const artTracks = trackIds
    .map(id => libraryTracks.find(t => t.id === id))
    .filter((t): t is LibraryTrack => !!t?.albumArt)
    .slice(0, 4)
  if (artTracks.length === 0) {
    return (
      <div className={`bg-gradient-to-br from-accent/40 to-accent/10 flex items-center justify-center ${className}`}>
        <HardDrive size={32} className="text-accent/50" />
      </div>
    )
  }
  if (artTracks.length < 4) {
    return <img src={artTracks[0].albumArt!} alt="" className={`object-cover ${className}`} />
  }
  return (
    <div className={`grid grid-cols-2 ${className}`} style={{ overflow: 'hidden' }}>
      {artTracks.map((t, i) => (
        <img key={i} src={t.albumArt!} alt="" className="w-full h-full object-cover" style={{ aspectRatio: '1' }} />
      ))}
    </div>
  )
}


export default function PlaylistsView(): JSX.Element {
  const { account, playlists, refreshPlaylists, playTrack, addToQueue, setShowUserAuth, likedTrackIds, setActiveView, setPendingEditorSongId,
    localPlaylists, libraryTracks, loadLibrary, deleteLocalPlaylist, renameLocalPlaylist, updateLocalPlaylist, addToLocalPlaylist } = useStore()
  const canEdit = !!(account?.is_editor || account?.is_administrator)

  const [showLiked, setShowLiked] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [localSelectedId, setLocalSelectedId] = useState<string | null>(null)
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
  const [localCardMenu, setLocalCardMenu] = useState<{ id: string; name: string; x: number; y: number } | null>(null)
  const [localRenaming, setLocalRenaming] = useState(false)
  const [localRenameVal, setLocalRenameVal] = useState('')
  const [localCardMenuAddPl, setLocalCardMenuAddPl] = useState(false)
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
  const [shareCopied, setShareCopied] = useState(false)
  const [togglingPublic, setTogglingPublic] = useState(false)
  const [addingAll, setAddingAll] = useState(false)
  const [isSharedView, setIsSharedView] = useState(false)
  const [importState, setImportState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  // Song info modal
  const [infoSong, setInfoSong] = useState<JWApiSong | null>(null)

  // Cover upload
  const coverInputRef = useRef<HTMLInputElement>(null)
  const [coverUploading, setCoverUploading] = useState(false)
  // Cover is fetched separately so tracks render without waiting for it
  type CoverData = { cover_image?: string | null; cover_image_url?: string | null }
  const [coverData, setCoverData] = useState<CoverData | null>(null)
  const [coverLoading, setCoverLoading] = useState(false)
  const [coverImgError, setCoverImgError] = useState(false)

  // Async cover thumbnails for the grid (keyed by playlist id)
  const [covers, setCovers] = useState<Record<number, string | null>>({})
  const [mosaicImages, setMosaicImages] = useState<Record<number, string[]>>({})
  const coversLoadedRef = useRef<Set<number>>(new Set())

  // Description editing
  const [editingDesc, setEditingDesc] = useState(false)
  const [descValue, setDescValue] = useState('')

  // Playlist membership cache: playlistId → Set<songId>
  const membershipCache = useRef<Map<number, Set<number>>>(new Map())

  // Race-condition guard: each loadDetail call gets a generation ID; stale responses are discarded
  const loadGen = useRef(0)

  // ── Async cover loading for grid ─────────────────────────────────────────
  useEffect(() => {
    const unloaded = playlists.filter(p => !coversLoadedRef.current.has(p.id))
    if (!unloaded.length) return
    unloaded.forEach(p => coversLoadedRef.current.add(p.id))

    const CONCURRENCY = 4
    let idx = 0
    const run = async (): Promise<void> => {
      while (idx < unloaded.length) {
        const p = unloaded[idx++]
        await userApi.getPlaylistCover(p.id)
          .then(c => {
            const url = c.cover_image_url ?? c.cover_image ?? null
            setCovers(prev => ({ ...prev, [p.id]: url }))
            if (c.trackImages.length) setMosaicImages(prev => ({ ...prev, [p.id]: c.trackImages }))
          })
          .catch(() => setCovers(prev => ({ ...prev, [p.id]: null })))
      }
    }
    const workers = Array.from({ length: Math.min(CONCURRENCY, unloaded.length) }, run)
    Promise.all(workers).catch(() => undefined)
  }, [playlists])

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

  // Load local library so playlist tracks resolve
  useEffect(() => { loadLibrary() }, [])

  // Listen for sidebar "Playlists" re-click → go back to library
  useEffect(() => {
    const h = () => { setSelectedId(null); setLocalSelectedId(null); setRenaming(false); setSearch(''); setSort({ field: 'default', dir: 'asc' }); setIsSharedView(false) }
    window.addEventListener('playlists:back', h)
    return () => window.removeEventListener('playlists:back', h)
  }, [])

  // Auto-open playlist from URL params (e.g. /playlists?id=123&view=shared)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const id = params.get('id')
    const view = params.get('view')
    if (id) { setSelectedId(Number(id)) }
    if (view === 'shared') { setIsSharedView(true) }
  }, [])

  // Close menus on outside click
  useEffect(() => {
    if (!trackMenu && !libMenu && !showAddAllMenu && !localCardMenu) return
    const h = () => { setTrackMenu(null); setLibMenu(null); setShowAddAllMenu(false); setLocalCardMenu(null); setLocalCardMenuAddPl(false) }
    setTimeout(() => window.addEventListener('click', h), 0)
    return () => window.removeEventListener('click', h)
  }, [trackMenu, libMenu, showAddAllMenu, localCardMenu])


  const loadDetail = useCallback(async (id: number, shared = false) => {
    const gen = ++loadGen.current
    setLoadingDetail(true)
    setCoverData(null)
    setCoverLoading(true)
    try {
      const result = shared ? await userApi.getPublicPlaylist(id) : await userApi.getPlaylist(id)
      if (gen !== loadGen.current) return
      setDetail(result)
      setLoadingDetail(false)
      // Load cover separately so tracks render immediately
      const coverFetch = shared ? userApi.getPublicPlaylistCover(id) : userApi.getPlaylistCover(id)
      coverFetch.then(c => {
        if (gen !== loadGen.current) return
        setCoverImgError(false)
        setCoverData({ cover_image: c.cover_image, cover_image_url: c.cover_image_url })
        setCoverLoading(false)
      }).catch(() => { if (gen === loadGen.current) setCoverLoading(false) })
    } catch {
      if (gen === loadGen.current) setDetail(null)
    } finally {
      if (gen === loadGen.current) setLoadingDetail(false)
    }
  }, [])

  useEffect(() => {
    if (selectedId != null) loadDetail(selectedId, isSharedView)
    else setDetail(null)
  }, [selectedId, loadDetail, isSharedView])

  // Reset sort/search/infoSong/editing when switching playlists
  useEffect(() => {
    setSort({ field: 'default', dir: 'asc' })
    setSearch('')
    setInfoSong(null)
    setEditingDesc(false)
    setDescValue('')
    setCoverImgError(false)
    setCoverData(null)
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

  const handleCoverUpload = useCallback(async (file: File) => {
    if (!selectedId || coverUploading) return
    setCoverUploading(true)
    try {
      const result = await userApi.uploadPlaylistCover(selectedId, file)
      setCoverImgError(false)
      setCoverData({ cover_image: result.cover_image, cover_image_url: result.cover_image_url })
      await refreshPlaylists()
    } catch {}
    setCoverUploading(false)
  }, [selectedId, coverUploading, refreshPlaylists])

  const handleRemoveCover = useCallback(async () => {
    if (!selectedId) return
    setCoverData(null) // optimistic clear
    try {
      await userApi.removePlaylistCover(selectedId)
      await refreshPlaylists()
    } catch {
      // restore on failure by re-fetching
      const c = await userApi.getPlaylistCover(selectedId).catch(() => null)
      if (c) setCoverData({ cover_image: c.cover_image, cover_image_url: c.cover_image_url })
    }
  }, [selectedId, refreshPlaylists])

  const saveDescription = useCallback(async () => {
    if (!selectedId) return
    setEditingDesc(false)
    try {
      const updated = await userApi.updatePlaylist(selectedId, { description: descValue })
      setDetail(updated)
      await refreshPlaylists()
    } catch {}
  }, [selectedId, descValue, refreshPlaylists])

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

  const handleTogglePublic = useCallback(async () => {
    if (!selectedId || !detail) return
    setTogglingPublic(true)
    try {
      const updated = await userApi.updatePlaylist(selectedId, { is_public: !detail.is_public })
      setDetail(updated)
    } catch (e) { console.error('toggle public failed', e) }
    finally { setTogglingPublic(false) }
  }, [selectedId, detail])

  const handleShare = useCallback(async () => {
    if (!selectedId || !detail) return
    try {
      // Ensure playlist is public before sharing
      if (!detail.is_public) {
        const updated = await userApi.updatePlaylist(selectedId, { is_public: true })
        setDetail(updated)
      }
      await navigator.clipboard.writeText(`${window.location.origin}/playlists?id=${selectedId}&view=shared`)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2500)
    } catch {}
  }, [selectedId, detail])

  const handleAddAllTo = useCallback(async (targetId: number, srcDetail: PlaylistDetail) => {
    setAddingAll(true)
    await Promise.all(srcDetail.items.filter(item => !['recording_session', 'unsurfaced'].includes(item.song.category)).map(item => userApi.addToPlaylist(targetId, item.song.id).catch(() => {})))
    const targetSet = membershipCache.current.get(targetId) ?? new Set<number>()
    srcDetail.items.forEach(i => targetSet.add(i.song.id))
    membershipCache.current.set(targetId, targetSet)
    setAddingAll(false)
    await refreshPlaylists()
  }, [refreshPlaylists])

  const handleImportPlaylist = useCallback(async () => {
    if (!detail) return
    setImportState('loading')
    try {
      const allowedIds = detail.items
        .filter(item => !['recording_session', 'unsurfaced'].includes(item.song.category))
        .map(item => item.song.id)

      // Request 1: create playlist with name + description + song_ids in one shot
      const newPl = await userApi.createPlaylist(detail.name, {
        description: detail.description,
        song_ids: allowedIds,
      })

      // Request 2 (optional): cover — use existing base64 directly, or fetch from URL
      const b64 = coverData?.cover_image
      const url = coverData?.cover_image_url
      if (b64) {
        await userApi.setPlaylistCoverBase64(newPl.id, b64)
      } else if (url) {
        try {
          const res = await fetch(url)
          const blob = await res.blob()
          const file = new File([blob], 'cover.jpg', { type: blob.type || 'image/jpeg' })
          await userApi.uploadPlaylistCover(newPl.id, file)
        } catch { /* skip cover on CORS/network failure */ }
      }

      await refreshPlaylists()
      setImportState('done')
      setTimeout(() => setImportState('idle'), 2500)
    } catch {
      setImportState('error')
      setTimeout(() => setImportState('idle'), 2500)
    }
  }, [detail, coverData, refreshPlaylists])

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

  // ── Auth guard ─────────────────────────────────────────────────────────────────────────

  if (!account) {
    // show local playlists + login prompt even when not logged in
    if (localSelectedId !== null) {
      const localPl = localPlaylists.find(p => p.id === localSelectedId)
      if (!localPl) { setLocalSelectedId(null); return <div /> }
      const localTracks = localPl.trackIds.map(id => libraryTracks.find(t => t.id === id)).filter(Boolean) as LibraryTrack[]
      const localQTracks: Track[] = localTracks.map(libTrackToTrack)
      return (
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden">
          <div className="px-6 pt-5 shrink-0">
            <button onClick={() => setLocalSelectedId(null)} className="flex items-center gap-1.5 text-text-muted hover:text-text-primary text-sm transition-colors mb-4">
              <ArrowLeft size={15} /> Playlists
            </button>
          </div>
          <div className="relative px-6 pb-6 shrink-0">
            <div className="relative z-10 flex gap-6 items-end">
              <div className="shrink-0 rounded-xl shadow-2xl overflow-hidden bg-surface-overlay flex items-center justify-center" style={{ width: 180, height: 180 }}>
                <LocalPlaylistMosaic trackIds={localPl.trackIds} libraryTracks={libraryTracks} className="w-full h-full" />
              </div>
              <div className="pb-2">
                <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">Local Playlist</p>
                <h1 className="text-text-primary text-3xl font-bold mb-1">{localPl.name}</h1>
                <p className="text-text-muted text-sm">{localTracks.length} songs</p>
              </div>
            </div>
            <div className="relative z-10 flex items-center gap-3 mt-5">
              <button onClick={() => localQTracks.length && playTrack(localQTracks[0], localQTracks)} className="flex items-center gap-2 px-5 py-2.5 bg-accent text-white rounded-full text-sm font-semibold hover:bg-accent-hover transition-colors shadow-lg">
                <Play size={16} fill="white" className="ml-0.5" /> Play
              </button>
              <button onClick={() => { const sh = [...localQTracks].sort(() => Math.random()-0.5); sh.length && playTrack(sh[0], sh) }} className="flex items-center gap-2 px-5 py-2.5 bg-surface-overlay text-text-primary rounded-full text-sm font-semibold hover:bg-surface-raised transition-colors border border-[var(--border)]">
                <Shuffle size={16} /> Shuffle
              </button>
            </div>
          </div>
          <div className="border-t border-[var(--border)] mx-6 mb-3 shrink-0" />
          <div className="px-2 pb-8">
            <div className="grid items-center gap-3 px-4 pb-2 text-text-muted text-xs uppercase tracking-widest" style={{ gridTemplateColumns: '28px 40px 1fr 56px' }}>
              <span>#</span><span /><span>Title</span><div className="flex justify-center"><Clock size={12} /></div>
            </div>
            {localTracks.map((lt, i) => {
              const qt = libTrackToTrack(lt)
              return (
                <div key={lt.id} className="group grid items-center gap-3 px-4 py-2 rounded-lg hover:bg-surface-raised transition-colors cursor-default select-none"
                  style={{ gridTemplateColumns: '28px 40px 1fr 56px' }}
                  onDoubleClick={() => playTrack(qt, localQTracks)}
                >
                  <span className="text-center text-xs text-text-muted tabular-nums group-hover:hidden">{i + 1}</span>
                  <button className="hidden group-hover:flex items-center justify-center text-text-primary" onClick={() => playTrack(qt, localQTracks)}><Play size={14} fill="currentColor" /></button>
                  <div className="w-10 h-10 rounded-md overflow-hidden shrink-0">
                    <AlbumArtThumb track={lt} size={40} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-text-primary text-sm font-medium truncate">{lt.title}</p>
                    <p className="text-text-muted text-xs truncate">{lt.artist || 'Unknown Artist'}{lt.album ? ` · ${lt.album}` : ''}</p>
                  </div>
                  <span className="text-text-muted text-xs tabular-nums text-center">
                    {lt.duration ? (() => { const m = Math.floor(lt.duration / 60); const s = Math.floor(lt.duration % 60); return `${m}:${s.toString().padStart(2,'0')}` })() : '--:--'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )
    }
    return (
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden">
        <div className="px-5 pt-5 pb-8">
          <h1 className="text-text-primary text-xl font-bold mb-1">Your Library</h1>
          <p className="text-text-muted text-sm mb-6">Local playlists</p>
          {localPlaylists.length === 0 ? (
            <p className="text-text-muted text-sm">No local playlists yet. Add music to your library first.</p>
          ) : (
            <div className="grid gap-4 mb-8" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
              {localPlaylists.map(lp => (
                <div key={lp.id} className="group text-left relative cursor-pointer" onClick={() => setLocalSelectedId(lp.id)} onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setLocalCardMenu({ id: lp.id, name: lp.name, x: e.clientX, y: e.clientY }) }}>
                  <div className="aspect-square rounded-xl overflow-hidden bg-surface-overlay flex items-center justify-center mb-2.5 group-hover:scale-[1.03] transition-transform shadow-md">
                    {lp.coverImage
                      ? <img src={lp.coverImage} alt="" className="w-full h-full object-cover" />
                      : <LocalPlaylistMosaic trackIds={lp.trackIds} libraryTracks={libraryTracks} className="w-full h-full" />
                    }
                  </div>
                  <span className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-md">
                    <HardDrive size={9} /> Local
                  </span>
                  <button
                    className="absolute top-1.5 right-1.5 md:opacity-0 md:group-hover:opacity-100 p-1 rounded-lg bg-black/60 text-white hover:bg-black/80 transition-opacity"
                    onClick={e => { e.stopPropagation(); setLocalCardMenu({ id: lp.id, name: lp.name, x: e.clientX, y: e.clientY }) }}
                  >
                    <MoreHorizontal size={13} />
                  </button>
                  <p className="text-text-primary text-sm font-semibold truncate">{lp.name}</p>
                  <p className="text-text-muted text-xs mt-0.5">{lp.trackIds.length} {lp.trackIds.length === 1 ? 'track' : 'tracks'}</p>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-col items-center text-center gap-3 py-6 border-t border-[var(--border)]">
            <p className="text-text-muted text-sm max-w-xs">Log in to create synced playlists and access your full library.</p>
            <button onClick={() => setShowUserAuth(true)} className="px-5 py-2.5 rounded-xl bg-accent/15 hover:bg-accent/25 text-accent text-sm font-semibold transition-colors">
              Log in
            </button>
          </div>
        </div>
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
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden" onClick={() => { setTrackMenu(null); setShowAddAllMenu(false) }}>
        {/* Back */}
        <div className="px-6 pt-5 shrink-0">
          <button onClick={() => {
            setSelectedId(null); setRenaming(false)
            if (isSharedView) { setIsSharedView(false); window.history.pushState({}, '', '/playlists') }
          }} className="flex items-center gap-1.5 text-text-muted hover:text-text-primary text-sm transition-colors mb-4">
            <ArrowLeft size={15} /> Playlists
          </button>
        </div>

        {/* ── Hero (shown immediately using summary data) ── */}
        <div className="relative px-6 pb-6 shrink-0">
          {(playlistCoverUrl(coverData ?? {}) ?? tracks[0]?.imageUrl) && (
            <div className="absolute inset-0 opacity-20 blur-3xl scale-110 pointer-events-none" style={{ background: `url(${playlistCoverUrl(coverData ?? {}) ?? tracks[0]?.imageUrl}) center/cover`, zIndex: 0 }} />
          )}

          {/* Hidden file input */}
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleCoverUpload(f); e.target.value = '' }}
          />

          <div className="relative z-10 flex gap-6 items-end">
            {/* Cover image — clickable to upload (owner only) */}
            <div className={`shrink-0 group/cover relative rounded-xl shadow-2xl overflow-hidden ${isSharedView ? "cursor-default" : "cursor-pointer"}`} style={{ width: 180, height: 180 }} onClick={() => !isSharedView && coverInputRef.current?.click()}>
              {loadingDetail && tracks.length === 0 ? (
                <div className="w-full h-full bg-surface-overlay animate-pulse" />
              ) : coverLoading ? (
                <div className="w-full h-full bg-surface-overlay flex items-center justify-center">
                  <Loader2 size={28} className="text-text-muted opacity-50 animate-spin" />
                </div>
              ) : playlistCoverUrl(coverData ?? {}) && !coverImgError ? (
                <img
                  src={playlistCoverUrl(coverData ?? {})}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={() => setCoverImgError(true)}
                />
              ) : (
                <PlaylistMosaic tracks={tracks} className="w-full h-full" />
              )}
              {/* Upload overlay (owner only) */}
              <div className={`absolute inset-0 bg-black/50 transition-opacity flex flex-col items-center justify-center gap-2 ${isSharedView ? "opacity-0 pointer-events-none" : "opacity-0 group-hover/cover:opacity-100"}`}>
                {coverUploading ? (
                  <Loader2 size={24} className="text-white animate-spin" />
                ) : (
                  <>
                    <Pencil size={24} className="text-white" />
                    <span className="text-white text-xs font-medium">Change cover</span>
                  </>
                )}
              </div>
              {/* Remove cover button (owner only) */}
              {!isSharedView && (coverData?.cover_image_url || coverData?.cover_image) && !coverImgError && (
                <button
                  className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/60 text-white opacity-0 group-hover/cover:opacity-100 transition-opacity hover:bg-red-500/80"
                  onClick={e => { e.stopPropagation(); handleRemoveCover() }}
                  title="Remove cover"
                >
                  <ImageOff size={12} />
                </button>
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
              <div className="flex items-center gap-1.5 text-text-muted text-sm mb-2">
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

              {/* Description */}
              {editingDesc ? (
                <div className="flex items-start gap-2 mb-3">
                  <textarea
                    value={descValue}
                    onChange={e => setDescValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveDescription() } if (e.key === 'Escape') setEditingDesc(false) }}
                    autoFocus
                    rows={2}
                    placeholder="Add a description…"
                    className="flex-1 bg-surface-overlay border border-[var(--border)] rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent/50 resize-none"
                  />
                  <div className="flex flex-col gap-1 shrink-0">
                    <button onClick={saveDescription} className="p-1.5 rounded-lg bg-accent/15 text-accent"><Check size={14} /></button>
                    <button onClick={() => setEditingDesc(false)} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary"><X size={14} /></button>
                  </div>
                </div>
              ) : isSharedView ? (
                detail?.description ? (
                  <p className="text-text-muted text-sm line-clamp-2 mb-3">{detail.description}</p>
                ) : null
              ) : (
                <button
                  className="text-left mb-3 group/desc flex items-start gap-1.5"
                  onClick={() => { setDescValue(detail?.description ?? ''); setEditingDesc(true) }}
                >
                  {detail?.description ? (
                    <>
                      <p className="text-text-muted text-sm line-clamp-2 group-hover/desc:text-text-secondary transition-colors">{detail.description}</p>
                      <Pencil size={11} className="text-text-muted opacity-0 group-hover/desc:opacity-60 transition-opacity shrink-0 mt-1" />
                    </>
                  ) : (
                    <p className="text-text-muted text-sm opacity-40 hover:opacity-70 transition-opacity italic">+ Add description</p>
                  )}
                </button>
              )}

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
                <button onClick={() => handleShare()} disabled={tracks.length === 0 || isSharedView}
                  title={shareCopied ? 'Link copied!' : 'Copy share link'}
                  className={`p-2.5 rounded-full text-sm transition-colors disabled:opacity-40 ${shareCopied ? 'text-accent bg-accent/10' : 'text-text-muted hover:text-text-primary hover:bg-surface-overlay'}`}>
                  {shareCopied ? <Check size={16} /> : <Share2 size={16} />}
                </button>
                {!isSharedView && (
                  <button onClick={handleTogglePublic} disabled={togglingPublic}
                    title={detail?.is_public ? 'Public — click to make private' : 'Private — click to make public'}
                    className={`p-2.5 rounded-full text-sm transition-colors disabled:opacity-40 ${detail?.is_public ? 'text-accent bg-accent/10' : 'text-text-muted hover:text-text-primary hover:bg-surface-overlay'}`}>
                    {togglingPublic ? <Loader2 size={16} className="animate-spin" /> : detail?.is_public ? <Globe size={16} /> : <Lock size={16} />}
                  </button>
                )}
                {!isSharedView && otherPlaylists.length > 0 && tracks.length > 0 && detail && (
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
                {isSharedView && account && tracks.length > 0 && detail && (
                  <button
                    onClick={handleImportPlaylist}
                    disabled={importState === 'loading' || importState === 'done'}
                    title={importState === 'done' ? 'Saved to library!' : importState === 'error' ? 'Import failed' : 'Save to my library'}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors disabled:opacity-60 ${
                      importState === 'done' ? 'text-accent bg-accent/10' :
                      importState === 'error' ? 'text-red-400 bg-red-400/10' :
                      'text-text-primary bg-surface-raised hover:bg-surface-overlay'
                    }`}
                  >
                    {importState === 'loading' ? <Loader2 size={14} className="animate-spin" /> :
                     importState === 'done' ? <Check size={14} /> :
                     <FolderInput size={14} />}
                    {importState === 'loading' ? 'Saving…' : importState === 'done' ? 'Saved!' : importState === 'error' ? 'Failed' : 'Save to library'}
                  </button>
                )}
                {!isSharedView && !renaming && detail && (
                  <button onClick={() => { setRenameValue(detail.name); setRenaming(true) }} className="p-2.5 rounded-full text-text-muted hover:text-text-primary hover:bg-surface-overlay text-sm transition-colors">
                    <Pencil size={15} />
                  </button>
                )}
                {!isSharedView && (
                  <button onClick={deleteSelected} className="p-2.5 rounded-full text-text-muted hover:text-red-400 hover:bg-red-500/10 text-sm transition-colors">
                    <Trash2 size={15} />
                  </button>
                )}
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
                  draggable={!isSharedView && dragEnabled}
                  onDragStart={() => !isSharedView && dragEnabled && setDragIdx(originalIdx)}
                  onDragOver={e => { if (!dragEnabled) return; e.preventDefault(); setDropIdx(displayIdx) }}
                  onDragEnd={() => { setDragIdx(null); setDropIdx(null) }}
                  onDrop={() => dragEnabled && handleDrop(displayIdx)}
                  onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setTrackMenu({ track, songId, i: originalIdx, x: e.clientX, y: e.clientY, showPlaylists: false }) }}
                  className={`group grid items-center gap-3 px-4 py-2 rounded-lg transition-colors cursor-default select-none ${
                    isDragging ? 'opacity-40 bg-surface-raised' : isDropTarget ? 'border-t-2 border-accent bg-surface-overlay' : 'hover:bg-surface-raised'
                  }`}
                  style={{ gridTemplateColumns: '16px 28px 40px 1fr 56px 36px' }}
                >
                  <span className={`flex items-center justify-center text-text-muted ${!isSharedView && dragEnabled ? 'opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing' : 'opacity-0 pointer-events-none'}`}>
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
                    {!isSharedView && (
                      <button onClick={() => removeTrack(songId)} className="p-1.5 text-text-muted hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors" title="Remove">
                        <X size={13} />
                      </button>
                    )}
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
            {canEdit && trackMenu.songId > 0 && (
              <MenuItem icon={Pencil} label="Edit" onClick={() => { setPendingEditorSongId(trackMenu.songId); setActiveView('editor'); setTrackMenu(null) }} />
            )}
            <div className="border-t border-[var(--border)] my-1" />
            {!['recording_session', 'unsurfaced'].includes(trackMenu.track.genre) && (
              <>
                <button
                  className="w-full flex items-center justify-between gap-2.5 px-3.5 py-2 text-sm text-text-primary transition-colors hover:bg-surface-overlay"
                  onClick={e => { e.stopPropagation(); setTrackMenu(prev => prev ? { ...prev, showPlaylists: !prev.showPlaylists } : null) }}
                >
                  <span className="flex items-center gap-2.5"><FolderInput size={14} className="text-text-muted" />Add to playlist</span>
                  <span className="text-text-muted text-xs">›</span>
                </button>
              </>
            )}
            {trackMenu.showPlaylists && !['recording_session', 'unsurfaced'].includes(trackMenu.track.genre) && (
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
            {!isSharedView && <MenuItem icon={Trash2} label="Remove from playlist" destructive onClick={() => { removeTrack(trackMenu.songId); setTrackMenu(null) }} />}
          </div>
        )}

        <SongInfoModal song={infoSong} onClose={() => setInfoSong(null)} />
      </div>
    )
  }

  // ── Local playlist detail ─────────────────────────────────────────────────

  if (localSelectedId !== null) {
    const localPl = localPlaylists.find(p => p.id === localSelectedId)
    if (!localPl) { setLocalSelectedId(null); return <div /> }
    const localTracks = localPl.trackIds.map(id => libraryTracks.find(t => t.id === id)).filter(Boolean) as LibraryTrack[]
    const localQTracks: Track[] = localTracks.map(libTrackToTrack)
    const localDurLabel = totalDurationLabel(localQTracks)

    return (
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden">
        {/* Back */}
        <div className="px-6 pt-5 shrink-0">
          <button onClick={() => setLocalSelectedId(null)} className="flex items-center gap-1.5 text-text-muted hover:text-text-primary text-sm transition-colors mb-4">
            <ArrowLeft size={15} /> Playlists
          </button>
        </div>

        {/* Hero */}
        <div className="relative px-6 pb-6 shrink-0">
          <div className="relative z-10 flex gap-6 items-end">
            <div
              className="shrink-0 rounded-xl shadow-2xl overflow-hidden relative group cursor-pointer"
              style={{ width: 180, height: 180 }}
              onClick={async () => {
                const el = (window as any).electron
                if (!el) return
                const dataUrl = await el.selectImageFile()
                if (dataUrl) updateLocalPlaylist(localPl.id, { coverImage: dataUrl })
              }}
              title="Click to change cover"
            >
              {localPl.coverImage
                ? <img src={localPl.coverImage} alt="" className="w-full h-full object-cover" />
                : <LocalPlaylistMosaic trackIds={localPl.trackIds} libraryTracks={libraryTracks} className="w-full h-full" />
              }
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                <ImageOff size={22} className="text-white" />
              </div>
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <p className="text-text-muted text-xs uppercase tracking-widest font-semibold mb-2">Local Playlist</p>
              {localRenaming ? (
                <div className="flex items-center gap-2 mb-3">
                  <input value={localRenameVal} onChange={e => setLocalRenameVal(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { renameLocalPlaylist(localPl.id, localRenameVal.trim() || localPl.name); setLocalRenaming(false) } }}
                    autoFocus className="bg-surface-overlay border border-[var(--border)] rounded-lg px-3 py-2 text-text-primary text-2xl font-black focus:outline-none focus:border-accent/50 w-full" />
                  <button onClick={() => { renameLocalPlaylist(localPl.id, localRenameVal.trim() || localPl.name); setLocalRenaming(false) }} className="p-2 rounded-lg bg-accent/15 text-accent shrink-0"><Check size={16} /></button>
                  <button onClick={() => setLocalRenaming(false)} className="p-2 rounded-lg text-text-muted hover:text-text-primary shrink-0"><X size={16} /></button>
                </div>
              ) : (
                <h1 className="text-text-primary text-3xl md:text-4xl font-black truncate mb-2">{localPl.name}</h1>
              )}
              <div className="flex items-center gap-1.5 text-text-muted text-sm mb-4">
                <HardDrive size={12} className="shrink-0" />
                <span>Local</span>
                <span>·</span>
                <span>{localTracks.length} {localTracks.length === 1 ? 'track' : 'tracks'}</span>
                {localDurLabel && <><span>·</span><span className="flex items-center gap-1"><Clock size={12} />{localDurLabel}</span></>}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {localQTracks.length > 0 && (
                  <button onClick={() => playTrack(localQTracks[0], localQTracks)} className="flex items-center gap-2 px-6 py-3 rounded-full bg-accent text-black text-sm font-bold hover:scale-105 active:scale-95 transition-transform shadow-lg">
                    <Play size={17} fill="currentColor" /> Play
                  </button>
                )}
                {localQTracks.length > 1 && (
                  <button onClick={() => { const s = [...localQTracks].sort(() => Math.random() - 0.5); playTrack(s[0], s) }} className="flex items-center gap-2 px-4 py-3 rounded-full bg-surface-overlay hover:bg-surface-raised text-text-primary text-sm font-semibold transition-colors border border-[var(--border)]">
                    <Shuffle size={15} /> Shuffle
                  </button>
                )}
                {!localRenaming && (
                  <button onClick={() => { setLocalRenameVal(localPl.name); setLocalRenaming(true) }} className="p-2.5 rounded-full text-text-muted hover:text-text-primary hover:bg-surface-overlay text-sm transition-colors" title="Rename">
                    <Pencil size={15} />
                  </button>
                )}
                {localPl.coverImage && (
                  <button onClick={() => updateLocalPlaylist(localPl.id, { coverImage: null })} className="p-2.5 rounded-full text-text-muted hover:text-text-primary hover:bg-surface-overlay text-sm transition-colors" title="Remove custom cover">
                    <ImageOff size={15} />
                  </button>
                )}
                <button onClick={() => { deleteLocalPlaylist(localPl.id); setLocalSelectedId(null) }} className="p-2.5 rounded-full text-text-muted hover:text-red-400 hover:bg-red-500/10 text-sm transition-colors" title="Delete playlist">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-[var(--border)] mx-6 mb-3 shrink-0" />

        {/* Track list */}
        {localTracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-center px-8">
            <Music2 className="text-text-muted opacity-20" size={40} />
            <p className="text-text-muted text-sm">This playlist is empty.</p>
            <p className="text-text-muted text-xs">Add tracks from the Library tab.</p>
          </div>
        ) : (
          <div className="px-2 pb-8">
            <div className="grid items-center gap-3 px-4 pb-2 text-text-muted text-xs uppercase tracking-widest" style={{ gridTemplateColumns: '28px 40px 1fr 56px' }}>
              <span>#</span>
              <span />
              <span>Title</span>
              <div className="flex justify-center"><Clock size={12} /></div>
            </div>
            {localTracks.map((lt, i) => {
              const qt = libTrackToTrack(lt)
              return (
                <div key={lt.id} className="group grid items-center gap-3 px-4 py-2 rounded-lg hover:bg-surface-raised transition-colors cursor-default select-none"
                  style={{ gridTemplateColumns: '28px 40px 1fr 56px' }}
                  onDoubleClick={() => playTrack(qt, localQTracks)}
                >
                  <span className="text-center text-xs text-text-muted tabular-nums group-hover:hidden">{i + 1}</span>
                  <button className="hidden group-hover:flex items-center justify-center text-text-primary" onClick={() => playTrack(qt, localQTracks)}>
                    <Play size={14} fill="currentColor" />
                  </button>
                  <div className="w-10 h-10 rounded-md overflow-hidden shrink-0">
                    <AlbumArtThumb track={lt} size={40} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-text-primary text-sm font-medium truncate">{lt.title}</p>
                    <p className="text-text-muted text-xs truncate">{lt.artist || 'Unknown Artist'}{lt.album ? ` · ${lt.album}` : ''}</p>
                  </div>
                  <span className="text-text-muted text-xs tabular-nums text-center">
                    {lt.duration ? (() => { const m = Math.floor(lt.duration / 60); const s = Math.floor(lt.duration % 60); return `${m}:${s.toString().padStart(2,'0')}` })() : '--:--'}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ── Playlist library ───────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden" onClick={() => setLibMenu(null)}>
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
            <div key={p.id} className="group text-left relative cursor-pointer"
              onClick={() => setSelectedId(p.id)}
              onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setLibMenu({ playlist: p, x: e.clientX, y: e.clientY, showPlaylists: false }) }}
            >
              <div className="aspect-square rounded-xl overflow-hidden bg-surface-overlay flex items-center justify-center mb-2.5 group-hover:scale-[1.03] transition-transform shadow-md">
                {covers[p.id] === undefined ? (
                  <div className="w-full h-full bg-surface-raised animate-pulse" />
                ) : covers[p.id] ? (
                  <img src={covers[p.id]!} alt={p.name} className="w-full h-full object-cover" onError={() => setCovers(prev => ({ ...prev, [p.id]: null }))} />
                ) : (() => {
                  const imgs = mosaicImages[p.id] ?? []
                  if (imgs.length >= 4) return (
                    <div className="w-full h-full grid grid-cols-2" style={{ overflow: 'hidden' }}>
                      {imgs.map((url, i) => <img key={i} src={url} alt="" className="w-full h-full object-cover" style={{ aspectRatio: '1' }} />)}
                    </div>
                  )
                  if (imgs.length > 0) return <img src={imgs[0]} alt="" className="w-full h-full object-cover" />
                  return (
                    <div className="w-full h-full bg-gradient-to-br from-accent/40 to-accent/10 flex items-center justify-center">
                      <Music2 size={40} className="text-accent/50" />
                    </div>
                  )
                })()}
              </div>
              {/* Context menu button */}
              <button
                className="absolute top-1.5 right-1.5 md:opacity-0 md:group-hover:opacity-100 p-1 rounded-lg bg-black/60 text-white hover:bg-black/80 transition-opacity"
                onClick={e => { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); setLibMenu({ playlist: p, x: e.clientX, y: e.clientY, showPlaylists: false }) }}
              >
                <MoreHorizontal size={13} />
              </button>
              <p className="text-text-primary text-sm font-semibold truncate">{p.name}</p>
              <p className="text-text-muted text-xs mt-0.5">{p.track_count} {p.track_count === 1 ? 'track' : 'tracks'}</p>
            </div>
          ))}

          {/* Local playlists */}
          {localPlaylists.map(lp => (
            <div key={lp.id} className="group text-left relative cursor-pointer" onClick={() => setLocalSelectedId(lp.id)} onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setLocalCardMenu({ id: lp.id, name: lp.name, x: e.clientX, y: e.clientY }) }}>
              <div className="aspect-square rounded-xl overflow-hidden bg-surface-overlay flex items-center justify-center mb-2.5 group-hover:scale-[1.03] transition-transform shadow-md">
                {lp.coverImage
                  ? <img src={lp.coverImage} alt="" className="w-full h-full object-cover" />
                  : <LocalPlaylistMosaic trackIds={lp.trackIds} libraryTracks={libraryTracks} className="w-full h-full" />
                }
              </div>
              {/* Local badge */}
              <span className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-md">
                <HardDrive size={9} /> Local
              </span>
              {/* Context menu button */}
              <button
                className="absolute top-1.5 right-1.5 md:opacity-0 md:group-hover:opacity-100 p-1 rounded-lg bg-black/60 text-white hover:bg-black/80 transition-opacity"
                onClick={e => { e.stopPropagation(); setLocalCardMenu({ id: lp.id, name: lp.name, x: e.clientX, y: e.clientY }) }}
              >
                <MoreHorizontal size={13} />
              </button>
              <p className="text-text-primary text-sm font-semibold truncate">{lp.name}</p>
              <p className="text-text-muted text-xs mt-0.5">{lp.trackIds.length} {lp.trackIds.length === 1 ? 'track' : 'tracks'}</p>
            </div>
          ))}
        </div>

        {playlists.length === 0 && localPlaylists.length === 0 && <p className="text-text-muted text-sm mt-4">No playlists yet — create one to get started.</p>}
      </div>

      {/* Local playlist card context menu */}
      {localCardMenu && createPortal(

        <div
          className="fixed z-[200] bg-surface border border-[var(--border)] rounded-xl shadow-2xl py-1 min-w-[190px]"
          style={{ left: Math.min(localCardMenu.x, window.innerWidth - 210), top: Math.max(8, Math.min(localCardMenu.y, window.innerHeight - 280)) }}
          onClick={e => e.stopPropagation()}
        >
          {!localCardMenuAddPl ? (
            <>
              <MenuItem icon={Play} label="Open" onClick={() => { setLocalSelectedId(localCardMenu.id); setLocalCardMenu(null); setLocalCardMenuAddPl(false) }} />
              <MenuItem icon={Play} label="Play all" onClick={() => {
                const lp = localPlaylists.find(p => p.id === localCardMenu.id)
                if (lp) { const tracks = lp.trackIds.map(id => libraryTracks.find(t => t.id === id)).filter(Boolean) as LibraryTrack[]; const q = tracks.map(libTrackToTrack); if (q.length) playTrack(q[0], q) }
                setLocalCardMenu(null); setLocalCardMenuAddPl(false)
              }} />
              <MenuItem icon={Shuffle} label="Shuffle" onClick={() => {
                const lp = localPlaylists.find(p => p.id === localCardMenu.id)
                if (lp) { const tracks = lp.trackIds.map(id => libraryTracks.find(t => t.id === id)).filter(Boolean) as LibraryTrack[]; const q = [...tracks].sort(() => Math.random() - 0.5).map(libTrackToTrack); if (q.length) playTrack(q[0], q) }
                setLocalCardMenu(null); setLocalCardMenuAddPl(false)
              }} />
              <MenuItem icon={ListEnd} label="Add all to queue" onClick={() => {
                const lp = localPlaylists.find(p => p.id === localCardMenu.id)
                if (lp) lp.trackIds.map(id => libraryTracks.find(t => t.id === id)).filter(Boolean).map(t => libTrackToTrack(t as LibraryTrack)).forEach(t => addToQueue(t))
                setLocalCardMenu(null); setLocalCardMenuAddPl(false)
              }} />
              <button className="w-full flex items-center justify-between px-3 py-2 text-sm text-text-primary hover:bg-surface-overlay" onClick={() => setLocalCardMenuAddPl(true)}>
                <span className="flex items-center gap-2 text-sm"><ListPlus size={14} /> Add all to playlist</span>
                <ChevronRight size={12} className="text-text-muted" />
              </button>
              <div className="h-px bg-[var(--border)] my-1" />
              <MenuItem icon={Pencil} label="Rename" onClick={() => { setLocalSelectedId(localCardMenu.id); setLocalCardMenu(null); setLocalCardMenuAddPl(false) }} />
              <div className="h-px bg-[var(--border)] my-1" />
              <MenuItem icon={Trash2} label="Delete" destructive onClick={() => { deleteLocalPlaylist(localCardMenu.id); setLocalCardMenu(null); setLocalCardMenuAddPl(false) }} />
            </>
          ) : (
            <>
              <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-muted hover:text-text-primary hover:bg-surface-overlay" onClick={() => setLocalCardMenuAddPl(false)}>
                <ChevronLeft size={12} /> Back
              </button>
              <div className="h-px bg-[var(--border)] my-1" />
              {localPlaylists.filter(p => p.id !== localCardMenu.id).length === 0
                ? <p className="text-text-muted text-xs px-3 py-2">No other playlists</p>
                : localPlaylists.filter(p => p.id !== localCardMenu.id).map(p => (
                  <button key={p.id} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-overlay"
                    onClick={() => {
                      const lp = localPlaylists.find(x => x.id === localCardMenu.id)
                      if (lp) lp.trackIds.filter(id => !p.trackIds.includes(id)).forEach(id => addToLocalPlaylist(p.id, id))
                      setLocalCardMenu(null); setLocalCardMenuAddPl(false)
                    }}>
                    <ListMusic size={14} className="text-text-muted" /> {p.name}
                  </button>
                ))
              }
            </>
          )}
        </div>
, document.body)}

      {/* Library card context menu */}
      {libMenu && (
        <div
          className="fixed z-50 bg-surface border border-[var(--border)] rounded-xl shadow-2xl py-1 min-w-[210px]"
          style={{ left: Math.min(libMenu.x, window.innerWidth - 230), top: Math.min(libMenu.y, window.innerHeight - 320) }}
          onClick={e => e.stopPropagation()}
        >
          {/* Inline rename input */}
          {libMenu.renaming ? (
            <div className="px-3 py-2 flex gap-2" onClick={e => e.stopPropagation()}>
              <input
                autoFocus
                value={libMenu.renameVal ?? libMenu.playlist.name}
                onChange={e => setLibMenu(prev => prev ? { ...prev, renameVal: e.target.value } : null)}
                onKeyDown={async e => {
                  if (e.key === 'Enter') {
                    const val = libMenu.renameVal?.trim() || libMenu.playlist.name
                    await userApi.renamePlaylist(libMenu.playlist.id, val)
                    await refreshPlaylists()
                    setLibMenu(null)
                  } else if (e.key === 'Escape') {
                    setLibMenu(prev => prev ? { ...prev, renaming: false } : null)
                  }
                }}
                className="flex-1 bg-surface-overlay rounded-lg px-2.5 py-1.5 text-sm text-text-primary focus:outline-none border border-[var(--border)]"
              />
              <button
                onClick={async () => {
                  const val = libMenu.renameVal?.trim() || libMenu.playlist.name
                  await userApi.renamePlaylist(libMenu.playlist.id, val)
                  await refreshPlaylists()
                  setLibMenu(null)
                }}
                className="px-2.5 py-1.5 rounded-lg bg-accent text-white text-xs font-medium"
              >Save</button>
            </div>
          ) : (
            <>
              <MenuItem icon={Play} label="Open" onClick={() => { setSelectedId(libMenu.playlist.id); setLibMenu(null) }} />
              <MenuItem
                icon={Shuffle}
                label="Play all"
                onClick={async () => {
                  const d = await userApi.getPlaylist(libMenu.playlist.id)
                  const tracks = d.items.map(i => userApi.liteSongToTrack(i.song))
                  if (tracks.length) { playTrack(tracks[0], tracks) }
                  setLibMenu(null)
                }}
              />
              <MenuItem
                icon={ListEnd}
                label="Add all to queue"
                onClick={async () => {
                  const d = await userApi.getPlaylist(libMenu.playlist.id)
                  d.items.forEach(i => addToQueue(userApi.liteSongToTrack(i.song)))
                  setLibMenu(null)
                }}
              />
              <div className="border-t border-[var(--border)] my-1" />
              <MenuItem
                icon={Link}
                label="Copy share link"
                onClick={async () => {
                  try {
                    if (!libMenu.playlist.is_public) {
                      await userApi.updatePlaylist(libMenu.playlist.id, { is_public: true })
                      await refreshPlaylists()
                    }
                    await navigator.clipboard.writeText(
                      `${window.location.origin}/playlists?id=${libMenu.playlist.id}&view=shared`
                    )
                  } catch {}
                  setLibMenu(null)
                }}
              />
              <MenuItem
                icon={libMenu.playlist.is_public ? Globe : Lock}
                label={libMenu.playlist.is_public ? 'Make private' : 'Make public'}
                onClick={async () => {
                  await userApi.updatePlaylist(libMenu.playlist.id, { is_public: !libMenu.playlist.is_public })
                  await refreshPlaylists()
                  setLibMenu(null)
                }}
              />
              <div className="border-t border-[var(--border)] my-1" />
              <MenuItem
                icon={Pencil}
                label="Rename"
                onClick={() => setLibMenu(prev => prev ? { ...prev, renaming: true, renameVal: prev.playlist.name } : null)}
              />
              <button
                className="w-full flex items-center justify-between gap-2.5 px-3.5 py-2 text-sm text-text-primary transition-colors hover:bg-surface-overlay"
                onClick={e => { e.stopPropagation(); setLibMenu(prev => prev ? { ...prev, showPlaylists: !prev.showPlaylists } : null) }}
              >
                <span className="flex items-center gap-2.5"><FolderInput size={14} className="text-text-muted" />Add all to playlist</span>
                <span className="text-text-muted text-xs">›</span>
              </button>
              {libMenu.showPlaylists && (
                <div className="border-t border-[var(--border)] max-h-40 overflow-y-auto">
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
              <div className="border-t border-[var(--border)] my-1" />
              <MenuItem
                icon={Trash2}
                label="Delete playlist"
                destructive
                onClick={async () => {
                  await userApi.deletePlaylist(libMenu.playlist.id)
                  if (selectedId === libMenu.playlist.id) setSelectedId(null)
                  await refreshPlaylists()
                  setLibMenu(null)
                }}
              />
            </>
          )}
        </div>
      )}
    </div>
  )
}
