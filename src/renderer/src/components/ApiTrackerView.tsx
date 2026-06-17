import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Search, Play, ChevronLeft, ChevronRight, Loader2, Music2, X,
  LayoutList, LayoutGrid, Info, Download, ListPlus, PanelLeft,
  ChevronUp, ChevronDown,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { AlbumArtThumbnail } from './AlbumArtThumbnail'
import SongInfoModal from './SongInfoModal'
import {
  apiFetch, songToTrack, parseDuration, CATEGORY_LABELS, buildStreamUrl,
  JWApiSong, JWApiPaginatedResponse, JWApiStats, JWApiEra,
} from '../lib/juicewrldApi'
import { Track } from '../types'

type Category = 'released' | 'unreleased' | 'unsurfaced' | 'recording_session' | ''
type ViewMode = 'list' | 'grid'

const PAGE_SIZE = 50
const LS_TRACKER_VIEW = 'api-tracker:viewMode'
const LS_TRACKER_SIDEBAR = 'api-tracker:showSidebar'

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
      {/* Categories */}
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

      {/* Eras */}
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

// ─── Action buttons (shared) ──────────────────────────────────────────────────
function SongActions({
  song, onInfo, onQueue, size = 14,
}: {
  song: JWApiSong
  onInfo: () => void
  onQueue: (track: Track) => void
  size?: number
}): JSX.Element {
  return (
    <>
      <button
        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-surface-raised text-text-muted hover:text-text-primary transition-all shrink-0"
        onClick={(e) => { e.stopPropagation(); onInfo() }}
        title="Song info"
      >
        <Info size={size} />
      </button>
      {song.path && (
        <>
          <button
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-surface-raised text-text-muted hover:text-text-primary transition-all shrink-0"
            onClick={(e) => { e.stopPropagation(); onQueue(songToTrack(song)) }}
            title="Add to queue"
          >
            <ListPlus size={size} />
          </button>
          <button
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-surface-raised text-text-muted hover:text-text-primary transition-all shrink-0"
            onClick={(e) => { e.stopPropagation(); downloadSong(song) }}
            title="Download"
          >
            <Download size={size} />
          </button>
        </>
      )}
    </>
  )
}

// ─── Song row (list mode) ─────────────────────────────────────────────────────
function SongRow({
  song, onPlay, onCategoryClick, onInfo, onQueue,
}: {
  song: JWApiSong
  onPlay: (song: JWApiSong) => void
  onCategoryClick: (cat: Category) => void
  onInfo: (song: JWApiSong) => void
  onQueue: (track: Track) => void
}): JSX.Element {
  const track = songToTrack(song)
  const title = song.track_titles?.[0] || song.name
  const altTitles = song.track_titles?.slice(1) ?? []
  const canPlay = !!song.path

  return (
    <div
      className="group flex items-center gap-3 px-3 py-2.5 md:py-2 hover:bg-surface-overlay active:bg-surface-overlay rounded-lg transition-colors cursor-default"
      onDoubleClick={() => onInfo(song)}
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
      <span className="hidden md:block text-text-muted text-xs truncate w-36 shrink-0">{song.era?.name ?? '—'}</span>
      <button
        onClick={() => onCategoryClick(song.category as Category)}
        className="hidden md:block text-xs px-1.5 py-0.5 rounded bg-surface-overlay text-text-muted shrink-0 w-24 text-center hover:bg-surface-raised hover:text-accent transition-colors"
        title="Filter by category"
      >
        {CATEGORY_LABELS[song.category] ?? song.category}
      </button>
      <span className="hidden md:block text-text-muted text-xs w-10 text-right shrink-0">{formatDur(parseDuration(song.length))}</span>

      {/* Desktop action buttons */}
      <div className="hidden md:flex items-center gap-0.5 shrink-0">
        <SongActions song={song} onInfo={() => onInfo(song)} onQueue={onQueue} />
      </div>

      {/* Mobile: info + play buttons */}
      <div className="md:hidden flex items-center shrink-0">
        <button
          className="p-2 text-text-muted active:text-accent transition-colors"
          onClick={(e) => { e.stopPropagation(); onInfo(song) }}
          title="Song info"
        >
          <Info size={16} />
        </button>
        {canPlay && (
          <>
            <button
              className="p-2 text-text-muted active:text-accent transition-colors"
              onClick={() => onQueue(songToTrack(song))}
              title="Add to queue"
            >
              <ListPlus size={16} />
            </button>
            <button
              className="p-2 text-text-muted active:text-accent transition-colors"
              onClick={() => onPlay(song)}
              title="Play"
            >
              <Play size={17} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Song card (grid mode) ────────────────────────────────────────────────────
function SongCard({
  song, onPlay, onCategoryClick, onInfo, onQueue,
}: {
  song: JWApiSong
  onPlay: (song: JWApiSong) => void
  onCategoryClick: (cat: Category) => void
  onInfo: (song: JWApiSong) => void
  onQueue: (track: Track) => void
}): JSX.Element {
  const track = songToTrack(song)
  const title = song.track_titles?.[0] || song.name
  const canPlay = !!song.path

  return (
    <div className="group flex flex-col rounded-xl overflow-hidden bg-surface-overlay hover:bg-surface-raised transition-colors cursor-default">
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
      </div>

      <div className="p-2.5 flex flex-col gap-1 min-w-0">
        <p className="text-text-primary text-xs font-semibold truncate leading-tight">{title}</p>
        <p className="text-text-muted text-[10px] truncate">{song.credited_artists || 'Juice WRLD'}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {song.era?.name && (
            <span className="text-[9px] uppercase tracking-wide text-text-muted bg-surface-overlay px-1.5 py-0.5 rounded truncate max-w-full">
              {song.era.name}
            </span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onCategoryClick(song.category as Category) }}
            className="text-[9px] uppercase tracking-wide text-accent/80 bg-accent/10 px-1.5 py-0.5 rounded shrink-0 hover:bg-accent/20 transition-colors"
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
            {canPlay && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); onQueue(songToTrack(song)) }}
                  className="p-1 rounded hover:bg-surface-raised text-text-muted hover:text-text-primary transition-colors"
                  title="Add to queue"
                >
                  <ListPlus size={11} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); downloadSong(song) }}
                  className="p-1 rounded hover:bg-surface-raised text-text-muted hover:text-text-primary transition-colors"
                  title="Download"
                >
                  <Download size={11} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Page jumper ──────────────────────────────────────────────────────────────
function PageJumper({ page, totalPages, onJump }: { page: number; totalPages: number; onJump: (p: number) => void }): JSX.Element {
  const [value, setValue] = useState(String(page))
  useEffect(() => { setValue(String(page)) }, [page])

  const commit = (): void => {
    const n = parseInt(value, 10)
    if (!isNaN(n) && n >= 1 && n <= totalPages) onJump(n)
    else setValue(String(page))
  }

  return (
    <div className="flex items-center gap-1 text-xs text-text-muted">
      <input
        type="text" inputMode="numeric" value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') { commit(); (e.target as HTMLInputElement).blur() } }}
        className="w-10 text-center bg-surface-overlay text-text-primary text-xs py-0.5 rounded outline-none focus:ring-1 ring-accent border border-transparent focus:border-accent/40"
      />
      <span>/ {totalPages}</span>
    </div>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────
export default function ApiTrackerView(): JSX.Element {
  const { playTrack, addToQueue, apiTrackerCategory, setApiTrackerCategory, apiTrackerEra, setApiTrackerEra } = useStore()

  const [selectedSong, setSelectedSong] = useState<JWApiSong | null>(null)
  const [stats, setStats] = useState<JWApiStats | null>(null)
  const [eras, setEras] = useState<JWApiEra[]>([])
  const [songs, setSongs] = useState<JWApiSong[]>([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [viewMode, setViewModeState] = useState<ViewMode>(
    () => (localStorage.getItem(LS_TRACKER_VIEW) as ViewMode) || 'list'
  )
  const [showSidebar, setShowSidebarState] = useState<boolean>(
    () => localStorage.getItem(LS_TRACKER_SIDEBAR) !== 'false'
  )

  const setViewMode = (v: ViewMode): void => { setViewModeState(v); localStorage.setItem(LS_TRACKER_VIEW, v) }
  const setShowSidebar = (v: boolean): void => { setShowSidebarState(v); localStorage.setItem(LS_TRACKER_SIDEBAR, String(v)) }

  // Column sort: field name maps to DRF `ordering` param; prefix `-` for desc
  type OrderField = 'name' | 'credited_artists' | 'era__name' | 'category' | 'length'
  const [orderField, setOrderField] = useState<OrderField | null>(null)
  const [orderDir, setOrderDir] = useState<'asc' | 'desc'>('asc')

  const handleSort = (field: OrderField): void => {
    if (orderField === field) {
      setOrderDir((d) => d === 'asc' ? 'desc' : 'asc')
    } else {
      setOrderField(field)
      setOrderDir('asc')
    }
    setPage(1)
  }

  const ordering = orderField ? (orderDir === 'desc' ? `-${orderField}` : orderField) : undefined

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [category, setCategory] = useState<Category>('')
  const [era, setEra] = useState('')

  useEffect(() => {
    if (apiTrackerCategory) { setCategory(apiTrackerCategory as Category); setApiTrackerCategory('') }
    if (apiTrackerEra) { setEra(apiTrackerEra); setApiTrackerEra('') }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCategoryClick = useCallback((cat: Category) => { setCategory(cat); setPage(1) }, [])
  const handleEraClick = useCallback((eraName: string) => { setEra(eraName); setPage(1) }, [])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    apiFetch<JWApiStats>('/stats/').then(setStats).catch(console.error)
    apiFetch<JWApiEra[] | { results: JWApiEra[] }>('/eras/')
      .then((data) => setEras(Array.isArray(data) ? data : (data as { results: JWApiEra[] }).results ?? []))
      .catch(console.error)
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { setDebouncedSearch(search); setPage(1) }, 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search])

  useEffect(() => { setPage(1) }, [category, era])

  useEffect(() => {
    let cancelled = false
    setLoading(true); setError(null)
    apiFetch<JWApiPaginatedResponse>('/songs/', {
      search: debouncedSearch || undefined,
      category: category || undefined,
      era: era || undefined,
      ordering,
      page,
      page_size: PAGE_SIZE,
    })
      .then((data) => { if (!cancelled) { setSongs(data.results); setCount(data.count) } })
      .catch((err) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [debouncedSearch, category, era, ordering, page])

  const handlePlay = useCallback((song: JWApiSong) => {
    const track = songToTrack(song)
    const allTracks = songs.map(songToTrack)
    playTrack(track, allTracks)
  }, [playTrack, songs])

  const handleInfo = useCallback((song: JWApiSong) => { setSelectedSong(song) }, [])
  const handleQueue = useCallback((track: Track) => { addToQueue(track) }, [addToQueue])

  const totalPages = Math.ceil(count / PAGE_SIZE)

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <div className="px-4 md:px-5 pt-4 md:pt-5 pb-3 shrink-0">
        <h1 className="text-text-primary text-xl font-bold mb-1">Tracker</h1>
        <StatsBar stats={stats} />

        <div className="flex flex-col gap-2">
          {/* Search */}
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

          {/* Second row: era + toggles */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Categories sidebar toggle — desktop only */}
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className={`hidden md:flex items-center gap-1.5 px-2.5 py-2.5 md:py-2 rounded-lg text-xs transition-colors shrink-0 ${
                showSidebar
                  ? 'bg-accent/15 text-accent border border-accent/30'
                  : 'bg-surface-overlay text-text-muted hover:text-text-secondary border border-transparent'
              }`}
              title="Toggle category sidebar"
            >
              <PanelLeft size={13} />
              <span className="hidden sm:inline">Categories</span>
            </button>

            {/* Mobile: category dropdown */}
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="md:hidden flex-1 min-w-0 bg-surface-overlay text-text-primary text-sm px-3 py-2.5 rounded-lg outline-none border border-transparent focus:ring-1 ring-accent focus:border-accent/40 cursor-pointer"
            >
              <option value="">All categories</option>
              <option value="released">Released</option>
              <option value="unreleased">Unreleased</option>
              <option value="unsurfaced">Unsurfaced</option>
              <option value="recording_session">Sessions</option>
            </select>

            <div className="flex items-center bg-surface-overlay rounded-lg p-0.5 shrink-0">
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

          {/* Active filters chips */}
          {(category || era) && (
            <div className="flex gap-1.5 flex-wrap">
              {category && (
                <button
                  onClick={() => setCategory('')}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/15 text-accent text-xs font-medium"
                >
                  {CATEGORY_LABELS[category] ?? category}
                  <X size={10} />
                </button>
              )}
              {era && (
                <button
                  onClick={() => setEra('')}
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

      {/* Body: sidebar + list */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Category sidebar — desktop only */}
        {showSidebar && (
          <div className="hidden md:block">
            <CategorySidebar
              stats={stats}
              eras={eras}
              selectedCategory={category}
              selectedEra={era}
              onCategory={(c) => { setCategory(c); setPage(1) }}
              onEra={(e) => { setEra(e); setPage(1) }}
            />
          </div>
        )}

        {/* Main content */}
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Column headers — desktop list only */}
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
                    <SortBtn field="length" label="Time" className="w-10 shrink-0 justify-end" />
                    <div className="w-20 shrink-0" />
                  </div>
                )
              })()}
            </div>
          )}

          {/* Song list / grid */}
          <div className="flex-1 overflow-y-auto px-3 md:px-5 pb-4">
            {loading ? (
              <div className="flex items-center justify-center h-40 gap-2 text-text-muted">
                <Loader2 size={18} className="animate-spin" />
                <span className="text-sm">Loading…</span>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2 text-center">
                <p className="text-text-muted text-sm">Failed to load: {error}</p>
                <button onClick={() => setPage((p) => p)} className="text-accent text-sm underline">Retry</button>
              </div>
            ) : songs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2">
                <Music2 size={32} className="text-text-muted opacity-30" />
                <p className="text-text-muted text-sm">No songs found</p>
              </div>
            ) : viewMode === 'list' ? (
              <div className="space-y-0.5">
                {songs.map((song) => (
                  <SongRow key={song.id} song={song} onPlay={handlePlay} onCategoryClick={handleCategoryClick} onInfo={handleInfo} onQueue={handleQueue} />
                ))}
              </div>
            ) : (
              <div className="grid gap-3 pt-1" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
                {songs.map((song) => (
                  <SongCard key={song.id} song={song} onPlay={handlePlay} onCategoryClick={handleCategoryClick} onInfo={handleInfo} onQueue={handleQueue} />
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="px-4 md:px-5 py-3 shrink-0 border-t border-[var(--border)] flex items-center justify-between gap-2">
              <span className="text-text-muted text-xs">
                {((page - 1) * PAGE_SIZE + 1).toLocaleString()}–{Math.min(page * PAGE_SIZE, count).toLocaleString()} of {count.toLocaleString()}
              </span>
              <div className="flex items-center gap-1">
                <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="p-2 rounded-lg hover:bg-surface-overlay disabled:opacity-30 disabled:pointer-events-none transition-colors">
                  <ChevronLeft size={16} className="text-text-muted" />
                </button>
                <PageJumper page={page} totalPages={totalPages} onJump={setPage} />
                <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="p-2 rounded-lg hover:bg-surface-overlay disabled:opacity-30 disabled:pointer-events-none transition-colors">
                  <ChevronRight size={16} className="text-text-muted" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <SongInfoModal song={selectedSong} onClose={() => setSelectedSong(null)} />
    </div>
  )
}
