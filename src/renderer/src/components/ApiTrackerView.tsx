import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  Search, Play, Loader2, Music2, X, Check,
  LayoutList, LayoutGrid, Info, Download, ListPlus, PanelLeft,
  ChevronUp, ChevronDown, MoreHorizontal, Folder, Pencil, Plus, ListMusic, HardDrive, PackageOpen,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { useShallow } from 'zustand/react/shallow'
import { AlbumArtThumbnail } from './AlbumArtThumbnail'
import SongInfoModal from './SongInfoModal'
import {
  apiFetch, songToTrack, parseDuration, CATEGORY_LABELS, buildStreamUrl, findSessionZips,
  JWApiSong, JWApiPaginatedResponse, JWApiStats, JWApiEra, JWApiFileEntry,
} from '../lib/juicewrldApi'
import { fisherYates } from '../store/queueSlice'
import { Track } from '../types'
import * as userApi from '../lib/userApi'

type Category = 'released' | 'unreleased' | 'unsurfaced' | 'recording_session' | ''
type ViewMode = 'list' | 'grid'

const CATEGORY_COLORS: Record<string, string> = {
  released:          'text-emerald-400 bg-emerald-400/10 border-emerald-400/25',
  unreleased:        'text-blue-400   bg-blue-400/10   border-blue-400/25',
  unsurfaced:        'text-amber-400  bg-amber-400/10  border-amber-400/25',
  recording_session: 'text-purple-400 bg-purple-400/10 border-purple-400/25',
}

const PAGE_SIZE = 50
const LS_TRACKER_VIEW = 'api-tracker:viewMode'
const LS_TRACKER_SIDEBAR = 'api-tracker:showSidebar'
const LS_TRACKER_SEARCH  = 'api-tracker:search'

function formatDur(secs: number): string {
  if (!secs) return '--:--'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function downloadSong(song: JWApiSong): void {
  const url = buildStreamUrl(song.path)
  const a = document.createElement('a')
  a.href = url
  a.download = (song.track_titles?.[0] || song.name) + '.mp3'
  a.target = '_blank'
  a.rel = 'noopener noreferrer'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

function downloadZipEntry(entry: JWApiFileEntry): void {
  const url = buildStreamUrl(entry.path)
  const a = document.createElement('a')
  a.href = url
  a.download = entry.name
  a.target = '_blank'
  a.rel = 'noopener noreferrer'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

// ─── Stats bar ────────────────────────────────────────────────────────────────
function StatsBar({ stats }: { stats: JWApiStats | null }): JSX.Element {
  if (!stats) return <div className="h-8 bg-surface-raised animate-pulse rounded-xl mb-3" />
  const cats: [string, number][] = [
    ['Released', stats.category_stats.released],
    ['Unreleased', stats.category_stats.unreleased],
    ['Unsurfaced', stats.category_stats.unsurfaced],
    ['Sessions', stats.category_stats.recording_session],
  ]
  return (
    <div className="flex items-center gap-3 mb-3 px-1 overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-text-primary font-bold text-base">{stats.total_songs.toLocaleString()}</span>
        <span className="text-text-muted text-xs">songs</span>
      </div>
      <div className="w-px h-4 bg-[var(--border)] shrink-0" />
      {cats.map(([label, count]) => (
        <div key={label} className="flex items-center gap-1 shrink-0">
          <span className="text-text-muted text-xs">{label}</span>
          <span className="text-text-secondary text-xs font-medium">{count.toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Category sidebar ─────────────────────────────────────────────────────────
const CAT_SIDEBAR = [
  { key: '' as Category,                label: 'All' },
  { key: 'released' as Category,        label: 'Released' },
  { key: 'unreleased' as Category,      label: 'Unreleased' },
  { key: 'unsurfaced' as Category,      label: 'Unsurfaced' },
  { key: 'recording_session' as Category, label: 'Sessions' },
]

function CategorySidebar({
  stats, eras, selectedCategory, selectedEra, onCategory, onEra,
}: {
  stats: JWApiStats | null
  eras: JWApiEra[]
  selectedCategory: Category
  selectedEra: string
  onCategory: (c: Category) => void
  onEra: (e: string) => void
}): JSX.Element {
  const counts: Record<string, number | undefined> = {
    '':                stats?.total_songs,
    released:          stats?.category_stats.released,
    unreleased:        stats?.category_stats.unreleased,
    unsurfaced:        stats?.category_stats.unsurfaced,
    recording_session: stats?.category_stats.recording_session,
  }

  return (
    <div className="w-44 shrink-0 border-r border-[var(--border)] overflow-y-auto flex flex-col py-2">
      <p className="text-[9px] font-bold uppercase tracking-widest text-text-muted px-3 pt-1 pb-2">Category</p>
      {CAT_SIDEBAR.map((cat) => (
        <button
          key={cat.key}
          onClick={() => onCategory(cat.key)}
          className={`flex items-center justify-between px-3 py-1.5 text-sm transition-colors text-left ${
            selectedCategory === cat.key
              ? 'text-accent font-semibold bg-accent/5'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised'
          }`}
        >
          <span className="truncate">{cat.label}</span>
          {counts[cat.key] !== undefined && (
            <span className="text-text-muted text-[10px] tabular-nums ml-1">{counts[cat.key]!.toLocaleString()}</span>
          )}
        </button>
      ))}

      {eras.length > 0 && (
        <>
          <p className="text-[9px] font-bold uppercase tracking-widest text-text-muted px-3 pt-4 pb-2">Era</p>
          <button
            onClick={() => onEra('')}
            className={`flex items-center px-3 py-1.5 text-sm transition-colors text-left ${
              !selectedEra ? 'text-accent font-semibold bg-accent/5' : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised'
            }`}
          >
            All eras
          </button>
          {eras.map((era) => (
            <button
              key={era.id}
              onClick={() => onEra(era.name)}
              className={`flex items-center px-3 py-1.5 text-sm transition-colors text-left ${
                selectedEra === era.name ? 'text-accent font-semibold bg-accent/5' : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised'
              }`}
            >
              <span className="truncate">{era.name}</span>
            </button>
          ))}
        </>
      )}
    </div>
  )
}

// ─── Context menu ─────────────────────────────────────────────────────────────
interface ContextMenuState {
  song: JWApiSong
  x: number
  y: number
  showPlaylists: boolean
}

// Hoisted to module scope — defining this inside SongContextMenu's render body
// would give it a new function identity every render, causing React to
// unmount/remount every menu item button (and flicker any :hover state) on
// each re-render rather than just updating it.
function MenuItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }): JSX.Element {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick() }}
      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors"
    >
      {icon}
      {label}
    </button>
  )
}

function SongContextMenu({
  state,
  onClose,
  onInfo,
  onQueue,
  onShowInFiles,
  onEdit,
  canEdit,
  onTogglePlaylists,
}: {
  state: ContextMenuState
  onClose: () => void
  onInfo: () => void
  onQueue: () => void
  onShowInFiles: () => void
  onEdit: () => void
  canEdit: boolean
  onTogglePlaylists: () => void
}): JSX.Element {
  const { playlists, account, refreshPlaylists, setShowUserAuth } = useStore(
    useShallow(s => ({ playlists: s.playlists, account: s.account, refreshPlaylists: s.refreshPlaylists, setShowUserAuth: s.setShowUserAuth }))
  )
  const menuRef = useRef<HTMLDivElement>(null)
  const songId = userApi.trackIdToSongId(`jw-${state.song.id}`)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [doneId, setDoneId] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [addingToLib, setAddingToLib] = useState(false)
  const [addedToLib, setAddedToLib] = useState(false)
  const [contained, setContained] = useState<Set<number>>(new Set())
  const [zipLoading, setZipLoading] = useState(false)
  const [zipCandidates, setZipCandidates] = useState<JWApiFileEntry[] | null>(null)
  const [showZipList, setShowZipList] = useState(false)
  const el = (window as any).electron

  const loadSessionZips = async (): Promise<void> => {
    if (zipLoading) return
    setZipLoading(true)
    try {
      const candidates = await findSessionZips(state.song)
      if (candidates.length === 1) {
        downloadZipEntry(candidates[0])
        onClose()
      } else {
        setZipCandidates(candidates)
        setShowZipList(true)
      }
    } catch {
      setZipCandidates([])
      setShowZipList(true)
    } finally {
      setZipLoading(false)
    }
  }

  useEffect(() => {
    const handle = (e: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose()
    }
    const handleKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', handle)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handle)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  // Check which playlists already contain this song
  useEffect(() => {
    if (!account || songId == null || playlists.length === 0) return
    Promise.all(
      playlists.map(p =>
        userApi.getPlaylist(p.id)
          .then(d => ({ id: p.id, has: (d.items ?? []).some(it => it.song.id === songId) }))
          .catch(() => ({ id: p.id, has: false }))
      )
    ).then(results => {
      setContained(new Set(results.filter(r => r.has).map(r => r.id)))
    })
  }, [playlists, songId, account])

  const addTo = async (id: number): Promise<void> => {
    if (songId == null) return
    setBusyId(id)
    try {
      await userApi.addToPlaylist(id, songId)
      setDoneId(id)
      setContained(prev => new Set([...prev, id]))
      await refreshPlaylists()
    } catch {}
    finally { setBusyId(null) }
  }

  const createAndAdd = async (): Promise<void> => {
    const name = newName.trim()
    if (!name || songId == null) return
    setBusyId(-1)
    try {
      const playlist = await userApi.createPlaylist(name)
      await userApi.addToPlaylist(playlist.id, songId)
      await refreshPlaylists()
      onClose()
    } catch {}
    finally { setBusyId(null) }
  }

  // Adjust to stay on screen
  const menuWidth = 208
  const menuHeight = state.showPlaylists || showZipList ? 320 : 200
  const top = Math.max(8, Math.min(state.y, window.innerHeight - menuHeight - 8))
  const left = Math.max(8, Math.min(state.x, window.innerWidth - menuWidth - 8))

  return (
    <div
      ref={menuRef}
      style={{ position: 'fixed', zIndex: 9999, top, left }}
      className="w-52 bg-surface border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden py-1"
    >
      {/* Song header */}
      <div className="px-3 py-2 border-b border-[var(--border)] mb-1">
        <p className="text-text-primary text-xs font-semibold truncate">{state.song.name}</p>
        <p className="text-text-muted text-[10px] truncate">{state.song.credited_artists || 'Juice WRLD'}</p>
      </div>

      {state.showPlaylists ? (
        /* Playlist sub-panel */
        <>
          <button
            onClick={(e) => { e.stopPropagation(); onTogglePlaylists() }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-muted hover:text-text-primary transition-colors"
          >
            <ChevronDown size={12} className="rotate-90" /> Back
          </button>
          {!account ? (
            <div className="px-3 pb-2">
              <p className="text-xs text-text-muted mb-2">Log in to save to playlists.</p>
              <button
                onClick={() => { setShowUserAuth(true); onClose() }}
                className="w-full py-1.5 rounded-lg bg-accent/15 text-accent text-xs font-semibold"
              >
                Log in
              </button>
            </div>
          ) : (
            <div className="max-h-44 overflow-y-auto">
              {playlists.length === 0 && (
                <p className="px-3 py-2 text-xs text-text-muted">No playlists yet.</p>
              )}
              {playlists.map((p) => {
                const alreadyIn = contained.has(p.id)
                return (
                  <button
                    key={p.id}
                    onClick={(e) => { e.stopPropagation(); addTo(p.id) }}
                    disabled={busyId === p.id}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors"
                  >
                    <ListMusic size={13} className={`shrink-0 ${alreadyIn ? 'text-accent' : 'text-text-muted'}`} />
                    <span className="flex-1 truncate text-xs">{p.name}</span>
                    {busyId === p.id
                      ? <Loader2 size={12} className="animate-spin" />
                      : (doneId === p.id || alreadyIn)
                        ? <Check size={12} className="text-accent shrink-0" />
                        : null}
                  </button>
                )
              })}
            </div>
          )}
          {account && (
            <div className="border-t border-[var(--border)] pt-1 px-2 pb-1">
              {creating ? (
                <div className="flex gap-1">
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && createAndAdd()}
                    placeholder="Playlist name"
                    autoFocus
                    className="flex-1 min-w-0 bg-surface-overlay border border-[var(--border)] rounded px-2 py-1 text-xs text-text-primary focus:outline-none"
                  />
                  <button onClick={createAndAdd} disabled={busyId === -1} className="p-1.5 rounded bg-accent/15 text-accent">
                    {busyId === -1 ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setCreating(true)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-accent hover:bg-surface-raised rounded transition-colors"
                >
                  <Plus size={12} /> New playlist
                </button>
              )}
            </div>
          )}
        </>
      ) : showZipList ? (
        /* Recording-session ZIP candidates — shown when the search found
           more than one .zip match and we can't safely auto-pick. */
        <>
          <button
            onClick={(e) => { e.stopPropagation(); setShowZipList(false) }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-muted hover:text-text-primary transition-colors"
          >
            <ChevronDown size={12} className="rotate-90" /> Back
          </button>
          {zipCandidates && zipCandidates.length > 0 ? (
            <div className="max-h-44 overflow-y-auto">
              <p className="px-3 pb-1 text-[10px] text-text-muted">Multiple matches found — pick one:</p>
              {zipCandidates.map(c => (
                <button
                  key={c.path}
                  onClick={(e) => { e.stopPropagation(); downloadZipEntry(c); onClose() }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors"
                >
                  <PackageOpen size={13} className="shrink-0 text-text-muted" />
                  <span className="flex-1 truncate text-xs">{c.name}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="px-3 py-3 text-xs text-text-muted">No matching ZIP found for this session.</p>
          )}
        </>
      ) : (
        /* Main menu */
        <>
          <MenuItem icon={<Info size={14} />} label="Song info" onClick={() => { onInfo(); onClose() }} />
          {state.song.path && (
            <MenuItem icon={<ListPlus size={14} />} label="Add to queue" onClick={() => { onQueue(); onClose() }} />
          )}
          {!['recording_session', 'unsurfaced'].includes(state.song.category) && (
            <MenuItem icon={<Plus size={14} />} label="Add to playlist" onClick={onTogglePlaylists} />
          )}
          {state.song.path && (
            <MenuItem icon={<Folder size={14} />} label="Show in Files" onClick={() => { onShowInFiles(); onClose() }} />
          )}
          {canEdit && (
            <MenuItem icon={<Pencil size={14} />} label="Edit" onClick={() => { onEdit(); onClose() }} />
          )}
          {!state.song.path && state.song.category === 'recording_session' && (
            <>
              <div className="my-1 border-t border-[var(--border)]" />
              <MenuItem
                icon={zipLoading ? <Loader2 size={14} className="animate-spin" /> : <PackageOpen size={14} />}
                label={zipLoading ? 'Finding files…' : 'Download session (ZIP)'}
                onClick={loadSessionZips}
              />
            </>
          )}
          {state.song.path && (
            <>
              <div className="my-1 border-t border-[var(--border)]" />
              <MenuItem icon={<Download size={14} />} label="Download" onClick={() => { downloadSong(state.song); onClose() }} />
              {el && (
                <MenuItem
                  icon={addingToLib ? <Loader2 size={14} className="animate-spin" /> : addedToLib ? <Check size={14} className="text-accent" /> : <HardDrive size={14} />}
                  label={addedToLib ? 'Added to library' : addingToLib ? 'Adding...' : 'Add to library'}
                  onClick={async () => {
                    if (addingToLib || addedToLib) return
                    setAddingToLib(true)
                    try {
                      const url = 'https://juicewrldapi.com/juicewrld/files/download/?path=' + encodeURIComponent(state.song.path!)
                      const result = await el.ipcRenderer.invoke('download-to-library', {
                        url,
                        songName: state.song.name,
                        artist: state.song.credited_artists || 'Juice WRLD',
                        songPath: state.song.path
                      })
                      if (!result.error) setAddedToLib(true)
                    } finally { setAddingToLib(false) }
                  }}
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

// ─── Action buttons (shared) ──────────────────────────────────────────────────
function SongActions({
  onInfo, onContextMenu, size = 14,
}: {
  onInfo: () => void
  onContextMenu: (e: React.MouseEvent) => void
  size?: number
}): JSX.Element {
  return (
    <>
      <button
        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-surface-raised text-text-muted hover:text-text-primary transition-all shrink-0"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onInfo() }}
        title="Song info"
      >
        <Info size={size} />
      </button>
      <button
        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-surface-raised text-text-muted hover:text-text-primary transition-all shrink-0"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onContextMenu(e) }}
        title="More options"
      >
        <MoreHorizontal size={size} />
      </button>
    </>
  )
}

// ─── Song row (list mode) ─────────────────────────────────────────────────────
function SongRow({
  song, onPlay, onCategoryClick, onEraClick, onInfo, onContextMenu,
}: {
  song: JWApiSong
  onPlay: (song: JWApiSong) => void
  onCategoryClick: (cat: Category) => void
  onEraClick: (era: string) => void
  onInfo: (song: JWApiSong) => void
  onContextMenu: (song: JWApiSong, e: React.MouseEvent) => void
}): JSX.Element {
  const track = songToTrack(song)
  const title = song.name
  const altTitles = song.track_titles ?? []
  const canPlay = !!song.path

  return (
    <div
      className="group flex items-center gap-3 px-3 py-2.5 md:py-2 hover:bg-surface-overlay active:bg-surface-overlay rounded-lg transition-colors cursor-default"
      onDoubleClick={() => onInfo(song)}
      onContextMenu={(e) => { e.preventDefault(); onContextMenu(song, e) }}
    >
      {/* Cover art */}
      <div className="relative shrink-0 w-10 h-10 md:w-9 md:h-9 rounded overflow-hidden bg-surface-overlay">
        <AlbumArtThumbnail track={track} size={36} shimmer={false} />
        {canPlay && (
          <button
            className="absolute inset-0 items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex"
            onClick={() => onPlay(song)}
            title="Play"
          >
            <Play size={14} fill="white" className="text-white ml-0.5" />
          </button>
        )}
      </div>

      {/* Title */}
      <div className="flex-1 min-w-[100px]">
        <p className="text-text-primary text-sm font-medium truncate">{title}</p>
        <p className="md:hidden text-text-muted text-xs truncate mt-0.5">
          {song.credited_artists || 'Juice WRLD'}
          {song.era?.name ? ` · ${song.era.name}` : ''}
        </p>
        {altTitles.length > 0 && (
          <p className="hidden md:block text-text-muted text-xs truncate">{altTitles.join(' · ')}</p>
        )}
      </div>

      {/* Desktop-only columns */}
      <span className="hidden md:block text-text-muted text-xs truncate w-32 shrink-0">{song.credited_artists || 'Juice WRLD'}</span>
      {song.era?.name ? (
        <button
          onClick={() => onEraClick(song.era!.name)}
          className="hidden md:block text-text-muted text-xs truncate w-36 shrink-0 text-left hover:text-accent transition-colors"
          title={`Filter by era: ${song.era.name}`}
        >
          {song.era.name}
        </button>
      ) : (
        <span className="hidden md:block text-text-muted text-xs truncate w-36 shrink-0">—</span>
      )}
      <button
        onClick={() => onCategoryClick(song.category as Category)}
        className={`hidden md:block text-xs px-1.5 py-0.5 rounded border shrink-0 w-24 text-center transition-colors hover:opacity-80 ${CATEGORY_COLORS[song.category] ?? 'text-text-muted bg-surface border-[var(--border)]'}`}
        title="Filter by category"
      >
        {CATEGORY_LABELS[song.category] ?? song.category}
      </button>
      <span className="hidden md:block text-text-muted text-xs w-12 text-right shrink-0 tabular-nums">{formatDur(parseDuration(song.length))}</span>

      {/* Desktop action buttons */}
      <div className="hidden md:flex items-center gap-0.5 shrink-0">
        <SongActions onInfo={() => onInfo(song)} onContextMenu={(e) => onContextMenu(song, e)} />
      </div>

      {/* Mobile: more + play */}
      <div className="md:hidden flex items-center shrink-0">
        <button
          className="p-2 text-text-muted active:text-accent transition-colors"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onContextMenu(song, e) }}
          title="More options"
        >
          <MoreHorizontal size={16} />
        </button>
        {canPlay && (
          <button
            className="p-2 text-text-muted active:text-accent transition-colors"
            onClick={() => onPlay(song)}
            title="Play"
          >
            <Play size={17} />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Song card (grid mode) ────────────────────────────────────────────────────
function SongCard({
  song, onPlay, onCategoryClick, onEraClick, onInfo, onContextMenu,
}: {
  song: JWApiSong
  onPlay: (song: JWApiSong) => void
  onCategoryClick: (cat: Category) => void
  onEraClick: (era: string) => void
  onInfo: (song: JWApiSong) => void
  onContextMenu: (song: JWApiSong, e: React.MouseEvent) => void
}): JSX.Element {
  const track = songToTrack(song)
  const title = song.name
  const canPlay = !!song.path

  return (
    <div
      className="group flex flex-col rounded-xl overflow-hidden bg-surface-overlay hover:bg-surface-raised transition-colors cursor-default"
      onContextMenu={(e) => { e.preventDefault(); onContextMenu(song, e) }}
    >
      <div className="relative w-full aspect-square bg-surface-raised">
        <AlbumArtThumbnail track={track} size={160} shimmer={false} />
        {canPlay && (
          <button
            className="absolute inset-0 items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex"
            onClick={() => onPlay(song)}
            title="Play"
          >
            <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center shadow-lg">
              <Play size={18} fill="black" className="text-black ml-0.5" />
            </div>
          </button>
        )}
        {canPlay && (
          <button
            className="md:hidden absolute bottom-1.5 right-1.5 w-8 h-8 rounded-full bg-accent flex items-center justify-center shadow-lg active:scale-95 transition-transform"
            onClick={() => onPlay(song)}
          >
            <Play size={14} fill="black" className="text-black ml-0.5" />
          </button>
        )}
        <button
          className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 md:flex hidden transition-opacity"
          onClick={(e) => { e.stopPropagation(); onContextMenu(song, e) }}
          title="More options"
        >
          <MoreHorizontal size={13} className="text-white" />
        </button>
      </div>

      <div className="p-2.5 flex flex-col gap-1 min-w-0">
        <p className="text-text-primary text-xs font-semibold truncate leading-tight">{title}</p>
        <p className="text-text-muted text-[10px] truncate">{song.credited_artists || 'Juice WRLD'}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {song.era?.name && (
            <button
              onClick={(e) => { e.stopPropagation(); onEraClick(song.era!.name) }}
              className="text-[9px] uppercase tracking-wide text-text-muted bg-surface px-1.5 py-0.5 rounded border border-[var(--border)] truncate max-w-full hover:text-accent hover:border-accent/40 transition-colors"
              title={`Filter by era: ${song.era.name}`}
            >
              {song.era.name}
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onCategoryClick(song.category as Category) }}
            className={`text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded border shrink-0 transition-colors hover:opacity-80 ${CATEGORY_COLORS[song.category] ?? 'text-accent/80 bg-accent/10 border-accent/20'}`}
          >
            {CATEGORY_LABELS[song.category] ?? song.category}
          </button>
          <div className="ml-auto flex items-center gap-0.5">
            <button
              onClick={(e) => { e.stopPropagation(); onInfo(song) }}
              className="p-1 rounded hover:bg-surface-raised text-text-muted hover:text-text-primary transition-colors"
              title="Song info"
            >
              <Info size={11} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onContextMenu(song, e) }}
              className="p-1 rounded hover:bg-surface-raised text-text-muted hover:text-text-primary transition-colors"
              title="More options"
            >
              <MoreHorizontal size={11} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────
export default function ApiTrackerView(): JSX.Element {
  const {
    playTrack, startRadio, addToQueue, account, shuffle,
    apiTrackerCategory, setApiTrackerCategory,
    apiTrackerEra, setApiTrackerEra,
    setActiveView, setApiFilesPath, setPendingEditorSongId,
  } = useStore(useShallow(s => ({
    playTrack: s.playTrack, startRadio: s.startRadio, addToQueue: s.addToQueue,
    account: s.account, shuffle: s.shuffle,
    apiTrackerCategory: s.apiTrackerCategory, setApiTrackerCategory: s.setApiTrackerCategory,
    apiTrackerEra: s.apiTrackerEra, setApiTrackerEra: s.setApiTrackerEra,
    setActiveView: s.setActiveView, setApiFilesPath: s.setApiFilesPath,
    setPendingEditorSongId: s.setPendingEditorSongId,
  })))

  const canEdit = !!(account?.is_editor || account?.is_administrator)

  const [selectedSong, setSelectedSong] = useState<JWApiSong | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [stats, setStats] = useState<JWApiStats | null>(null)
  const [eras, setEras] = useState<JWApiEra[]>([])
  const [songs, setSongs] = useState<JWApiSong[]>([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const sentinelRef = useRef<HTMLDivElement>(null)
  // Refs for scroll logic — avoids stale closure issues in observer callback
  const hasMoreRef = useRef(false)
  const loadingRef = useRef(true)
  const sentinelVisibleRef = useRef(false)

  const [viewMode, setViewModeState] = useState<ViewMode>(
    () => (localStorage.getItem(LS_TRACKER_VIEW) as ViewMode) || 'list'
  )
  const [showSidebar, setShowSidebarState] = useState<boolean>(
    () => localStorage.getItem(LS_TRACKER_SIDEBAR) !== 'false'
  )

  const setViewMode = (v: ViewMode): void => { setViewModeState(v); localStorage.setItem(LS_TRACKER_VIEW, v) }
  const setShowSidebar = (v: boolean): void => { setShowSidebarState(v); localStorage.setItem(LS_TRACKER_SIDEBAR, String(v)) }

  type OrderField = 'name' | 'credited_artists' | 'era__name' | 'category' | 'length'
  const [orderField, setOrderField] = useState<OrderField | null>(null)
  const [orderDir, setOrderDir] = useState<'asc' | 'desc'>('asc')

  // Reset accumulated songs and go back to page 1
  const resetSongs = useCallback((): void => {
    setSongs([])
    setPage(1)
  }, [])

  const handleSort = (field: OrderField): void => {
    if (orderField === field) {
      if (orderDir === 'desc') {
        // Third click: clear sort, go back to infinite scroll
        setOrderField(null); setOrderDir('asc'); resetSongs()
      } else {
        setOrderDir('desc')
      }
    } else {
      setOrderField(field); setOrderDir('asc')
    }
  }

  const [search, setSearch] = useState(() => localStorage.getItem(LS_TRACKER_SEARCH) || '')
  const [debouncedSearch, setDebouncedSearch] = useState(() => localStorage.getItem(LS_TRACKER_SEARCH) || '')
  const [category, setCategory] = useState<Category>('')
  const [era, setEra] = useState('')

  useEffect(() => {
    if (apiTrackerCategory) { setCategory(apiTrackerCategory as Category); setApiTrackerCategory('') }
    if (apiTrackerEra) { setEra(apiTrackerEra); setApiTrackerEra('') }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCategoryClick = useCallback((cat: Category) => { setCategory(cat); resetSongs() }, [resetSongs])
  const handleEraClick = useCallback((eraName: string) => { setEra(eraName); resetSongs() }, [resetSongs])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstDebounce = useRef(true)

  useEffect(() => { localStorage.setItem(LS_TRACKER_SEARCH, search) }, [search])

  useEffect(() => {
    apiFetch<JWApiStats>('/stats/').then(setStats).catch(console.error)
    apiFetch<JWApiEra[] | { results: JWApiEra[] }>('/eras/')
      .then((data) => setEras(Array.isArray(data) ? data : (data as { results: JWApiEra[] }).results ?? []))
      .catch(console.error)
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search)
      // Skip resetSongs on initial mount — only reset when user actually types
      if (isFirstDebounce.current) { isFirstDebounce.current = false; return }
      resetSongs()
    }, 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search, resetSongs])

  // ── SORT MODE: load the entire library sequentially, sort client-side ──────────
  // The API has no ordering param, so we fetch all pages and sort in memory.
  useEffect(() => {
    if (!orderField) return
    let cancelled = false
    loadingRef.current = true
    setLoading(true); setError(null); setSongs([]); setHasMore(false); setCount(0)
    ;(async () => {
      const all: JWApiSong[] = []
      let p = 1
      try {
        while (!cancelled) {
          const data = await apiFetch<JWApiPaginatedResponse>('/songs/', {
            searchall: debouncedSearch || undefined,
            category: category || undefined,
            era: era || undefined,
            page: p,
            page_size: 200, // bigger batches to reduce round-trips
          })
          if (cancelled) return
          all.push(...data.results)
          setSongs([...all]) // progressive display while loading
          setCount(data.count)
          if (!data.next) break
          p++
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) { loadingRef.current = false; setLoading(false) }
      }
    })()
    return () => { cancelled = true }
  }, [orderField, debouncedSearch, category, era])

  // ── SCROLL MODE: infinite scroll, accumulates pages ──────────────────────────
  useEffect(() => {
    if (orderField) return // sort mode handles fetching
    let cancelled = false
    loadingRef.current = true
    setLoading(true); setError(null)
    apiFetch<JWApiPaginatedResponse>('/songs/', {
      searchall: debouncedSearch || undefined,
      category: category || undefined,
      era: era || undefined,
      page,
      page_size: PAGE_SIZE,
    })
      .then((data) => {
        if (!cancelled) {
          setSongs((prev) => page === 1 ? data.results : [...prev, ...data.results])
          setCount(data.count)
          const more = data.next !== null
          setHasMore(more)
          hasMoreRef.current = more
        }
      })
      .catch((err) => { if (!cancelled) setError(err.message) })
      .finally(() => {
        if (!cancelled) {
          loadingRef.current = false
          setLoading(false)
          if (sentinelVisibleRef.current && hasMoreRef.current) {
            setPage((p) => p + 1)
          }
        }
      })
    return () => { cancelled = true }
  }, [debouncedSearch, category, era, page, orderField])

  // Observe sentinel for infinite scroll
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => {
      sentinelVisibleRef.current = entry.isIntersecting
      // User scrolled to sentinel while we weren't loading
      if (entry.isIntersecting && hasMoreRef.current && !loadingRef.current) {
        setPage((p) => p + 1)
      }
    }, { threshold: 0.1 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Client-side sort applied over accumulated songs (sort mode only)
  const sortedSongs = useMemo(() => {
    if (!orderField) return songs
    return [...songs].sort((a, b) => {
      let av: string | number, bv: string | number
      switch (orderField) {
        case 'name':
          av = (a.track_titles?.[0] || a.name).toLowerCase()
          bv = (b.track_titles?.[0] || b.name).toLowerCase()
          break
        case 'credited_artists':
          av = (a.credited_artists || '').toLowerCase()
          bv = (b.credited_artists || '').toLowerCase()
          break
        case 'era__name':
          av = (a.era?.name || '').toLowerCase()
          bv = (b.era?.name || '').toLowerCase()
          break
        case 'category':
          av = a.category; bv = b.category
          break
        case 'length':
          av = parseDuration(a.length); bv = parseDuration(b.length)
          break
        default: return 0
      }
      const cmp = typeof av === 'number' ? av - (bv as number) : (av as string).localeCompare(bv as string)
      return orderDir === 'desc' ? -cmp : cmp
    })
  }, [songs, orderField, orderDir])

  const handlePlay = useCallback((song: JWApiSong) => {
    const track = songToTrack(song)
    // If shuffle is already on, start radio mode from this track instead of
    // loading the visible page into the queue.
    if (shuffle) {
      const rf = (!orderField && hasMore)
        ? { category, era, search: debouncedSearch, total: count }
        : null
      startRadio(track, rf)
      return
    }
    const playable = sortedSongs.filter((s) => !!s.path)
    const context = playable.map(songToTrack)
    const needsLazy = !orderField && hasMore
    playTrack(track, context.length > 0 ? context : [track], needsLazy ? {
      category, era, search: debouncedSearch,
      page: page + 1, hasMore: true, total: count,
    } : null, 'tracker')
  }, [playTrack, startRadio, shuffle, sortedSongs, category, era, debouncedSearch, count, hasMore, orderField, page])

  const handleInfo = useCallback((song: JWApiSong) => { setSelectedSong(song) }, [])
  const handleQueue = useCallback((track: Track) => { addToQueue(track) }, [addToQueue])

  const handleContextMenu = useCallback((song: JWApiSong, e: React.MouseEvent): void => {
    setContextMenu({ song, x: e.clientX, y: e.clientY, showPlaylists: false })
  }, [])

  const handleShowInFiles = useCallback((song: JWApiSong): void => {
    if (!song.path) return
    const parts = song.path.split('/')
    const folderPath = parts.slice(0, -1).join('/')
    setApiFilesPath(folderPath)
    setActiveView('api-files')
  }, [setApiFilesPath, setActiveView])

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <div className="px-4 md:px-5 pt-4 md:pt-5 pb-3 shrink-0">
        <h1 className="text-text-primary text-xl font-bold mb-1">Tracker</h1>
        <StatsBar stats={stats} />

        <div className="flex flex-col gap-2">
          {/* Search — uses searchall to include producers */}
          <div className="relative w-full">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Search songs, artists, producers…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface-overlay text-text-primary text-sm pl-8 pr-8 py-2.5 md:py-2 rounded-lg outline-none focus:ring-1 ring-accent border border-transparent focus:border-accent/40 placeholder:text-text-muted"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Second row */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className={`hidden md:flex items-center gap-1.5 px-2.5 py-2.5 md:py-2 rounded-lg text-xs transition-colors shrink-0 ${
                showSidebar
                  ? 'bg-accent/15 text-accent border border-accent/30'
                  : 'bg-surface-overlay text-text-muted hover:text-text-secondary border border-transparent'
              }`}
              title="Toggle search settings"
            >
              <PanelLeft size={13} />
              <span className="hidden sm:inline">Search Settings</span>
            </button>

            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value as Category); resetSongs() }}
              className="md:hidden flex-1 min-w-0 bg-surface-overlay text-text-primary text-sm px-3 py-2.5 rounded-lg outline-none border border-transparent focus:ring-1 ring-accent focus:border-accent/40 cursor-pointer"
            >
              <option value="">All categories</option>
              <option value="released">Released</option>
              <option value="unreleased">Unreleased</option>
              <option value="unsurfaced">Unsurfaced</option>
              <option value="recording_session">Sessions</option>
            </select>

            <div className="flex items-center bg-surface-overlay rounded-lg p-0.5 shrink-0 ml-auto">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 md:p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-surface-raised text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
                title="List view"
              >
                <LayoutList size={16} />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 md:p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-surface-raised text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
                title="Grid view"
              >
                <LayoutGrid size={16} />
              </button>
            </div>
          </div>

          {/* Active filter chips */}
          {(category || era) && (
            <div className="flex gap-1.5 flex-wrap">
              {category && (
                <button
                  onClick={() => { setCategory(''); resetSongs() }}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/15 text-accent text-xs font-medium"
                >
                  {CATEGORY_LABELS[category] ?? category}
                  <X size={10} />
                </button>
              )}
              {era && (
                <button
                  onClick={() => { setEra(''); resetSongs() }}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/15 text-accent text-xs font-medium"
                >
                  {era}
                  <X size={10} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {showSidebar && (
          <div className="hidden md:flex min-h-0">
            <CategorySidebar
              stats={stats}
              eras={eras}
              selectedCategory={category}
              selectedEra={era}
              onCategory={(c) => { setCategory(c); resetSongs() }}
              onEra={(e) => { setEra(e); resetSongs() }}
            />
          </div>
        )}

        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Column headers */}
          {viewMode === 'list' && (
            <div className="hidden md:block px-5 pb-1 shrink-0">
              {(() => {
                const SortBtn = ({ field, label, className }: { field: OrderField; label: string; className?: string }): JSX.Element => {
                  const active = orderField === field
                  return (
                    <button
                      onClick={() => handleSort(field)}
                      className={`flex items-center gap-0.5 text-xs font-medium uppercase tracking-wider transition-colors ${active ? 'text-accent' : 'text-text-muted hover:text-text-secondary'} ${className ?? ''}`}
                    >
                      {label}
                      {active
                        ? orderDir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />
                        : <span className="w-2.5" />}
                    </button>
                  )
                }
                return (
                  <div className="flex items-center gap-3 px-3 py-1">
                    <div className="w-9 shrink-0" />
                    <SortBtn field="name" label="Title" className="flex-1" />
                    <SortBtn field="credited_artists" label="Artist" className="w-32 shrink-0" />
                    <SortBtn field="era__name" label="Era" className="w-36 shrink-0" />
                    <SortBtn field="category" label="Category" className="w-24 shrink-0 justify-center" />
                    <SortBtn field="length" label="Time" className="w-12 shrink-0 justify-end" />
                    <div className="w-14 shrink-0" />
                  </div>
                )
              })()}
            </div>
          )}

          {/* Song list / grid */}
          <div className="flex-1 overflow-y-auto px-3 md:px-5 pb-4">
            {loading && sortedSongs.length === 0 ? (
              <div className="flex items-center justify-center h-40 gap-2 text-text-muted">
                <Loader2 size={18} className="animate-spin" />
                <span className="text-sm">{orderField ? 'Loading full library for sorting…' : 'Loading…'}</span>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2 text-center">
                <p className="text-text-muted text-sm">Failed to load: {error}</p>
                <button onClick={resetSongs} className="text-accent text-sm underline">Retry</button>
              </div>
            ) : sortedSongs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2">
                <Music2 size={32} className="text-text-muted opacity-30" />
                <p className="text-text-muted text-sm">No songs found</p>
              </div>
            ) : viewMode === 'list' ? (
              <div className="space-y-0.5">
                {sortedSongs.map((song) => (
                  <SongRow
                    key={song.id}
                    song={song}
                    onPlay={handlePlay}
                    onCategoryClick={handleCategoryClick}
                    onEraClick={handleEraClick}
                    onInfo={handleInfo}
                    onContextMenu={handleContextMenu}
                  />
                ))}
              </div>
            ) : (
              <div className="grid gap-3 pt-1" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
                {sortedSongs.map((song) => (
                  <SongCard
                    key={song.id}
                    song={song}
                    onPlay={handlePlay}
                    onCategoryClick={handleCategoryClick}
                    onEraClick={handleEraClick}
                    onInfo={handleInfo}
                    onContextMenu={handleContextMenu}
                  />
                ))}
              </div>
            )}
            {/* Sentinel always in DOM so IntersectionObserver is set up from mount */}
            <div ref={sentinelRef} className="h-4" />
            {loading && sortedSongs.length > 0 && (
              <div className="flex items-center justify-center gap-2 py-4 text-text-muted">
                <Loader2 size={16} className="animate-spin" />
                {orderField && <span className="text-xs">{sortedSongs.length.toLocaleString()} / {count.toLocaleString()} loaded</span>}
              </div>
            )}
            {!loading && !hasMore && sortedSongs.length > 0 && (
              <p className="text-center text-text-muted text-xs py-4">{count.toLocaleString()} songs total</p>
            )}
          </div>
        </div>
      </div>

      {selectedSong && (
        <SongInfoModal
          song={selectedSong}
          onClose={() => setSelectedSong(null)}
          onEdit={canEdit ? (songId) => {
            setSelectedSong(null)
            setPendingEditorSongId(songId)
            setActiveView('editor')
          } : undefined}
        />
      )}

      {contextMenu && (
        <SongContextMenu
          state={contextMenu}
          onClose={() => setContextMenu(null)}
          onInfo={() => handleInfo(contextMenu.song)}
          onQueue={() => handleQueue(songToTrack(contextMenu.song))}
          onShowInFiles={() => handleShowInFiles(contextMenu.song)}
          onEdit={() => { setPendingEditorSongId(contextMenu.song.id); setActiveView('editor') }}
          canEdit={canEdit}
          onTogglePlaylists={() => setContextMenu((prev) => prev ? { ...prev, showPlaylists: !prev.showPlaylists } : null)}
        />
      )}
    </div>
  )
}
