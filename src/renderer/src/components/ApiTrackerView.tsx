import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Search, Play, ChevronLeft, ChevronRight, Loader2, Music2, X, LayoutList, LayoutGrid, Layers } from 'lucide-react'
import { useStore } from '../store/useStore'
import { AlbumArtThumbnail } from './AlbumArtThumbnail'
import {
  apiFetch,
  songToTrack,
  parseDuration,
  CATEGORY_LABELS,
  JWApiSong,
  JWApiPaginatedResponse,
  JWApiStats,
  JWApiEra,
} from '../lib/juicewrldApi'

type Category = 'released' | 'unreleased' | 'unsurfaced' | 'recording_session' | ''
type ViewMode = 'list' | 'grid'

const PAGE_SIZE = 50

function formatDur(secs: number): string {
  if (!secs) return '--:--'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
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

// ─── Song row (list mode) ─────────────────────────────────────────────────────
function SongRow({ song, onPlay, onCategoryClick }: { song: JWApiSong; onPlay: (song: JWApiSong) => void; onCategoryClick: () => void }): JSX.Element {
  const track = songToTrack(song)
  const title = song.track_titles?.[0] || song.name
  const altTitles = song.track_titles?.slice(1) ?? []

  return (
    <div className="group flex items-center gap-3 px-3 py-2.5 md:py-2 hover:bg-surface-overlay active:bg-surface-overlay rounded-lg transition-colors cursor-default">
      {/* Cover art */}
      <div className="relative shrink-0 w-10 h-10 md:w-9 md:h-9 rounded overflow-hidden bg-surface-overlay">
        <AlbumArtThumbnail track={track} size={36} shimmer={false} />
        {/* Desktop: hover overlay play button */}
        <button
          className="absolute inset-0 items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex"
          onClick={() => onPlay(song)}
          title="Play"
        >
          <Play size={14} fill="white" className="text-white ml-0.5" />
        </button>
      </div>

      {/* Title + mobile subtitle */}
      <div className="flex-1 min-w-0">
        <p className="text-text-primary text-sm font-medium truncate">{title}</p>
        {/* Mobile: artist + era under title */}
        <p className="md:hidden text-text-muted text-xs truncate mt-0.5">
          {song.credited_artists || 'Juice WRLD'}
          {song.era?.name ? ` · ${song.era.name}` : ''}
        </p>
        {/* Desktop: alt titles */}
        {altTitles.length > 0 && (
          <p className="hidden md:block text-text-muted text-xs truncate">{altTitles.join(' · ')}</p>
        )}
      </div>

      {/* Desktop-only columns */}
      <span className="hidden md:block text-text-muted text-xs truncate w-32 shrink-0">{song.credited_artists || 'Juice WRLD'}</span>
      <span className="hidden md:block text-text-muted text-xs truncate w-36 shrink-0">{song.era?.name ?? '—'}</span>
      <button
        onClick={onCategoryClick}
        className="hidden md:block text-xs px-1.5 py-0.5 rounded bg-surface-overlay text-text-muted shrink-0 w-24 text-center hover:bg-surface-raised hover:text-accent transition-colors"
        title="Go to Categories"
      >
        {CATEGORY_LABELS[song.category] ?? song.category}
      </button>
      <span className="hidden md:block text-text-muted text-xs w-10 text-right shrink-0">{formatDur(parseDuration(song.length))}</span>

      {/* Mobile: play button */}
      <button
        className="md:hidden p-2 text-text-muted active:text-accent transition-colors shrink-0"
        onClick={() => onPlay(song)}
        title="Play"
      >
        <Play size={17} />
      </button>
    </div>
  )
}

// ─── Song card (grid mode) ────────────────────────────────────────────────────
function SongCard({ song, onPlay, onCategoryClick }: { song: JWApiSong; onPlay: (song: JWApiSong) => void; onCategoryClick: () => void }): JSX.Element {
  const track = songToTrack(song)
  const title = song.track_titles?.[0] || song.name

  return (
    <div className="group flex flex-col rounded-xl overflow-hidden bg-surface-overlay hover:bg-surface-raised transition-colors cursor-default">
      {/* Cover art */}
      <div className="relative w-full aspect-square bg-surface-raised">
        <AlbumArtThumbnail track={track} size={160} shimmer={false} />
        {/* Desktop: hover overlay */}
        <button
          className="absolute inset-0 items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex"
          onClick={() => onPlay(song)}
          title="Play"
        >
          <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center shadow-lg">
            <Play size={18} fill="black" className="text-black ml-0.5" />
          </div>
        </button>
        {/* Mobile: always-visible play button in corner */}
        <button
          className="md:hidden absolute bottom-1.5 right-1.5 w-8 h-8 rounded-full bg-accent flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          onClick={() => onPlay(song)}
        >
          <Play size={14} fill="black" className="text-black ml-0.5" />
        </button>
      </div>

      {/* Info */}
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
            onClick={(e) => { e.stopPropagation(); onCategoryClick() }}
            className="text-[9px] uppercase tracking-wide text-accent/80 bg-accent/10 px-1.5 py-0.5 rounded shrink-0 hover:bg-accent/20 transition-colors"
            title="Go to Categories"
          >
            {CATEGORY_LABELS[song.category] ?? song.category}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Jump-to-page input ───────────────────────────────────────────────────────
function PageJumper({ page, totalPages, onJump }: { page: number; totalPages: number; onJump: (p: number) => void }): JSX.Element {
  const [value, setValue] = useState(String(page))
  useEffect(() => { setValue(String(page)) }, [page])

  const commit = (): void => {
    const n = parseInt(value, 10)
    if (!isNaN(n) && n >= 1 && n <= totalPages) {
      onJump(n)
    } else {
      setValue(String(page))
    }
  }

  return (
    <div className="flex items-center gap-1 text-xs text-text-muted">
      <input
        type="text" inputMode="numeric"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') { commit(); (e.target as HTMLInputElement).blur() } }}
        className="w-10 text-center bg-surface-overlay text-text-primary text-xs py-0.5 rounded outline-none focus:ring-1 ring-accent border border-transparent focus:border-accent/40"
        title="Jump to page"
      />
      <span>/ {totalPages}</span>
    </div>
  )
}

const LS_TRACKER_VIEW = 'api-tracker:viewMode'
const LS_TRACKER_GROUP = 'api-tracker:groupByAlbum'

// ─── Main view ────────────────────────────────────────────────────────────────
export default function ApiTrackerView(): JSX.Element {
  const { playTrack, apiTrackerCategory, setApiTrackerCategory, apiTrackerEra, setApiTrackerEra, setActiveView } = useStore()

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
  const [groupByAlbum, setGroupByAlbumState] = useState<boolean>(
    () => localStorage.getItem(LS_TRACKER_GROUP) === 'true'
  )

  const setViewMode = (v: ViewMode): void => { setViewModeState(v); localStorage.setItem(LS_TRACKER_VIEW, v) }
  const setGroupByAlbum = (v: boolean): void => { setGroupByAlbumState(v); localStorage.setItem(LS_TRACKER_GROUP, String(v)) }

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [category, setCategory] = useState<Category>('')
  const [era, setEra] = useState('')

  useEffect(() => {
    if (apiTrackerCategory) { setCategory(apiTrackerCategory as Category); setApiTrackerCategory('') }
    if (apiTrackerEra) { setEra(apiTrackerEra); setApiTrackerEra('') }
  }, [])

  const handleCategoryClick = useCallback(() => { setActiveView('api-categories') }, [setActiveView])
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
    setLoading(true)
    setError(null)
    apiFetch<JWApiPaginatedResponse>('/songs/', {
      search: debouncedSearch || undefined,
      category: category || undefined,
      era: era || undefined,
      page,
      page_size: PAGE_SIZE,
    })
      .then((data) => { if (!cancelled) { setSongs(data.results); setCount(data.count) } })
      .catch((err) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [debouncedSearch, category, era, page])

  const handlePlay = useCallback((song: JWApiSong) => {
    const track = songToTrack(song)
    playTrack(track, [track])
  }, [playTrack])

  const groupedSongs = useMemo(() => {
    if (!groupByAlbum) return null
    const groups = new Map<string, JWApiSong[]>()
    for (const song of songs) {
      const key = song.era?.name || '—'
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(song)
    }
    return groups
  }, [songs, groupByAlbum])

  const totalPages = Math.ceil(count / PAGE_SIZE)

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <div className="px-4 md:px-5 pt-4 md:pt-5 pb-3 shrink-0">
        <h1 className="text-text-primary text-xl font-bold mb-1">Tracker</h1>
        <StatsBar stats={stats} />

        {/* Filters */}
        <div className="flex flex-col gap-2">
          {/* Search — full width */}
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
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Second row: selects + toggles */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="flex-1 min-w-0 bg-surface-overlay text-text-primary text-sm px-3 py-2.5 md:py-2 rounded-lg outline-none border border-transparent focus:ring-1 ring-accent focus:border-accent/40 cursor-pointer"
            >
              <option value="">All categories</option>
              <option value="released">Released</option>
              <option value="unreleased">Unreleased</option>
              <option value="unsurfaced">Unsurfaced</option>
              <option value="recording_session">Sessions</option>
            </select>

            <select
              value={era}
              onChange={(e) => setEra(e.target.value)}
              className="flex-1 min-w-0 bg-surface-overlay text-text-primary text-sm px-3 py-2.5 md:py-2 rounded-lg outline-none border border-transparent focus:ring-1 ring-accent focus:border-accent/40 cursor-pointer"
            >
              <option value="">All eras</option>
              {(Array.isArray(eras) ? eras : []).map((e) => (
                <option key={e.id} value={e.name}>{e.name}</option>
              ))}
            </select>

            <button
              onClick={() => setGroupByAlbum(!groupByAlbum)}
              className={`flex items-center gap-1.5 px-2.5 py-2.5 md:py-2 rounded-lg text-xs transition-colors shrink-0 ${
                groupByAlbum
                  ? 'bg-accent/15 text-accent border border-accent/30'
                  : 'bg-surface-overlay text-text-muted hover:text-text-secondary border border-transparent'
              }`}
              title="Group by album/era"
            >
              <Layers size={13} />
              <span className="hidden sm:inline">By album</span>
            </button>

            <div className="flex items-center bg-surface-overlay rounded-lg p-0.5 shrink-0">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 md:p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-surface-raised text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
                title="List view"
              >
                <LayoutList size={16} md-size={15} />
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
        </div>
      </div>

      {/* Column headers — desktop list only */}
      {viewMode === 'list' && (
        <div className="hidden md:block px-5 pb-1 shrink-0">
          <div className="flex items-center gap-3 px-3 py-1 text-xs text-text-muted font-medium uppercase tracking-wider">
            <div className="w-9 shrink-0" />
            <div className="flex-1">Title</div>
            <div className="w-32 shrink-0">Artist</div>
            <div className="w-36 shrink-0">Era</div>
            <div className="w-24 shrink-0 text-center">Category</div>
            <div className="w-10 shrink-0 text-right">Time</div>
          </div>
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
            {groupedSongs ? (
              Array.from(groupedSongs.entries()).map(([albumName, groupSongs]) => (
                <div key={albumName}>
                  <div className="sticky top-0 z-10 px-3 py-1.5 text-xs font-semibold text-text-muted uppercase tracking-wider bg-surface/90 backdrop-blur-sm border-b border-[var(--border)] mb-0.5">
                    {albumName}
                    <span className="ml-2 font-normal opacity-60">{groupSongs.length}</span>
                  </div>
                  {groupSongs.map((song) => (
                    <SongRow key={song.id} song={song} onPlay={handlePlay} onCategoryClick={handleCategoryClick} />
                  ))}
                </div>
              ))
            ) : (
              songs.map((song) => (
                <SongRow key={song.id} song={song} onPlay={handlePlay} onCategoryClick={handleCategoryClick} />
              ))
            )}
          </div>
        ) : (
          groupedSongs ? (
            <div className="space-y-4 pt-1">
              {Array.from(groupedSongs.entries()).map(([albumName, groupSongs]) => (
                <div key={albumName}>
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider px-1 mb-2">
                    {albumName}
                    <span className="ml-2 font-normal opacity-60">{groupSongs.length}</span>
                  </p>
                  <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
                    {groupSongs.map((song) => (
                      <SongCard key={song.id} song={song} onPlay={handlePlay} onCategoryClick={handleCategoryClick} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-3 pt-1" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
              {songs.map((song) => (
                <SongCard key={song.id} song={song} onPlay={handlePlay} onCategoryClick={handleCategoryClick} />
              ))}
            </div>
          )
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="px-4 md:px-5 py-3 shrink-0 border-t border-[var(--border)] flex items-center justify-between gap-2">
          <span className="text-text-muted text-xs">
            {((page - 1) * PAGE_SIZE + 1).toLocaleString()}–{Math.min(page * PAGE_SIZE, count).toLocaleString()} of {count.toLocaleString()}
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="p-2 rounded-lg hover:bg-surface-overlay disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft size={16} className="text-text-muted" />
            </button>
            <PageJumper page={page} totalPages={totalPages} onJump={setPage} />
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="p-2 rounded-lg hover:bg-surface-overlay disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronRight size={16} className="text-text-muted" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
