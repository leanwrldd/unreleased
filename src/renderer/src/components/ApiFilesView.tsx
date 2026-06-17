import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Folder, Music2, ChevronRight, ArrowLeft, Home, Play, Loader2,
  FolderOpen, HardDrive, LayoutList, LayoutGrid, ImageIcon, Video,
  Download, ArrowUpDown, ArrowUp, ArrowDown, Link, Check,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import {
  apiFetch,
  buildStreamUrl,
  buildCoverArtUrl,
  JWApiFileEntry,
  JWApiBrowseResponse,
} from '../lib/juicewrldApi'
import { getFileExt, getMediaType } from '../lib/fileTypes'
import { Track } from '../types'
import MediaLightbox, { LightboxItem } from './MediaLightbox'

type ViewMode = 'list' | 'grid'
type SortBy = 'name' | 'type' | 'size'
type SortDir = 'asc' | 'desc'

const LS_SORT_BY = 'api-files:sortBy'
const LS_SORT_DIR = 'api-files:sortDir'
const LS_VIEW_MODE = 'api-files:viewMode'

function parseEntries(data: JWApiBrowseResponse): JWApiFileEntry[] {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object' && 'items' in data && Array.isArray(data.items)) return data.items
  return []
}

function breadcrumbs(path: string): { label: string; path: string }[] {
  if (!path) return []
  const parts = path.split('/').filter(Boolean)
  return parts.map((label, i) => ({ label, path: parts.slice(0, i + 1).join('/') }))
}

function parentFolder(path: string): string {
  const i = path.lastIndexOf('/')
  return i > 0 ? path.slice(0, i) : ''
}

function fileToTrack(entry: JWApiFileEntry): Track {
  const title = entry.name.replace(/\.[^.]+$/, '')
  const album = parentFolder(entry.path).split('/').pop() ?? ''
  return {
    id: `jw-file-${entry.path}`,
    path: entry.path,
    streamUrl: buildStreamUrl(entry.path),
    imageUrl: buildCoverArtUrl(entry.path),
    title,
    artist: 'Juice WRLD',
    album,
    albumArtist: 'Juice WRLD',
    year: null,
    trackNumber: null,
    duration: 0,
    genre: '',
    hasAlbumArt: true,
  }
}

function ApiCoverThumb({ path, size = 36 }: { path: string; size?: number }): JSX.Element {
  const [errored, setErrored] = useState(false)
  if (errored) {
    return (
      <div className="flex items-center justify-center bg-surface-overlay rounded" style={{ width: size, height: size }}>
        <Music2 size={size * 0.5} className="text-text-muted opacity-40" />
      </div>
    )
  }
  return (
    <img
      src={buildCoverArtUrl(path)}
      alt=""
      className="rounded object-cover"
      style={{ width: size, height: size }}
      onError={() => setErrored(true)}
    />
  )
}

function ApiImageThumb({ path, size = 36 }: { path: string; size?: number }): JSX.Element {
  const [errored, setErrored] = useState(false)
  if (errored) {
    return (
      <div className="flex items-center justify-center" style={{ width: size, height: size }}>
        <ImageIcon size={size * 0.5} className="text-text-muted opacity-40" />
      </div>
    )
  }
  return (
    <img
      src={buildStreamUrl(path)}
      alt=""
      className="rounded object-cover"
      style={{ width: size, height: size }}
      onError={() => setErrored(true)}
    />
  )
}

function sortEntries(entries: JWApiFileEntry[], by: SortBy, dir: SortDir): JWApiFileEntry[] {
  return [...entries].sort((a, b) => {
    // Dirs always first
    const aDir = a.type === 'directory'
    const bDir = b.type === 'directory'
    if (aDir !== bDir) return aDir ? -1 : 1

    let cmp = 0
    if (by === 'name') {
      cmp = a.name.localeCompare(b.name)
    } else if (by === 'type') {
      const aExt = getFileExt(a.name)
      const bExt = getFileExt(b.name)
      cmp = aExt.localeCompare(bExt) || a.name.localeCompare(b.name)
    } else if (by === 'size') {
      cmp = (a.size ?? 0) - (b.size ?? 0)
    }
    return dir === 'asc' ? cmp : -cmp
  })
}

function pathToUrl(folderPath: string): string {
  if (!folderPath) return '/files'
  return '/files/' + folderPath.split('/').map(encodeURIComponent).join('/')
}

function urlToPath(pathname: string): string {
  if (!pathname.startsWith('/files/')) return ''
  return decodeURIComponent(pathname.slice('/files/'.length))
}

export default function ApiFilesView(): JSX.Element {
  const { playTrack } = useStore()

  const [currentPath, setCurrentPath] = useState('')
  const [entries, setEntries] = useState<JWApiFileEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<string[]>([])
  const [playing, setPlaying] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [lightboxItems, setLightboxItems] = useState<LightboxItem[]>([])
  const [lightboxIndex, setLightboxIndex] = useState(-1)
  const [copiedPath, setCopiedPath] = useState<string | null>(null)

  // Persisted view settings
  const [viewMode, setViewModeState] = useState<ViewMode>(
    () => (localStorage.getItem(LS_VIEW_MODE) as ViewMode) || 'list'
  )
  const [sortBy, setSortByState] = useState<SortBy>(
    () => (localStorage.getItem(LS_SORT_BY) as SortBy) || 'name'
  )
  const [sortDir, setSortDirState] = useState<SortDir>(
    () => (localStorage.getItem(LS_SORT_DIR) as SortDir) || 'asc'
  )

  const setViewMode = (v: ViewMode): void => { setViewModeState(v); localStorage.setItem(LS_VIEW_MODE, v) }
  const setSortBy = (v: SortBy): void => { setSortByState(v); localStorage.setItem(LS_SORT_BY, v) }
  const setSortDir = (v: SortDir): void => { setSortDirState(v); localStorage.setItem(LS_SORT_DIR, v) }

  const toggleSort = (by: SortBy): void => {
    if (sortBy === by) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(by)
      setSortDir('asc')
    }
  }

  const navigate = useCallback(async (path: string, pushHistory = true) => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch<JWApiBrowseResponse>('/files/browse/', path ? { path } : {})
      const items = parseEntries(data)
      if (pushHistory) {
        setHistory((h) => [...h, currentPath])
        window.history.pushState({ view: 'api-files', folderPath: path }, '', pathToUrl(path))
      }
      setCurrentPath(path)
      setEntries(items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [currentPath])

  // Keep a ref to navigate so popstate listener always has the latest version
  const navigateRef = useRef(navigate)
  useEffect(() => { navigateRef.current = navigate }, [navigate])

  // On mount: read path from URL; listen for browser back/forward within /files
  useEffect(() => {
    const initialPath = urlToPath(window.location.pathname)
    navigateRef.current(initialPath, false)

    const handlePopstate = (): void => {
      const p = window.location.pathname
      if (p.startsWith('/files')) {
        const fp = urlToPath(p)
        setHistory([])
        navigateRef.current(fp, false)
      }
    }
    window.addEventListener('popstate', handlePopstate)
    return () => window.removeEventListener('popstate', handlePopstate)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const goBack = (): void => {
    if (history.length > 0) {
      const prev = history[history.length - 1]
      setHistory((h) => h.slice(0, -1))
      navigate(prev, false)
    } else if (currentPath) {
      navigate(parentFolder(currentPath), false)
    }
  }

  const goHome = (): void => { setHistory([]); navigate('', true) }

  const copyLink = (entry: JWApiFileEntry): void => {
    const url = entry.type === 'file'
      ? buildStreamUrl(entry.path)
      : window.location.origin + pathToUrl(entry.path)
    navigator.clipboard.writeText(url).then(() => {
      setCopiedPath(entry.path)
      setTimeout(() => setCopiedPath(null), 1800)
    })
  }

  const handlePlay = async (entry: JWApiFileEntry): Promise<void> => {
    if (playing === entry.path) return
    setPlaying(entry.path)
    try {
      const track = fileToTrack(entry)
      const queue = entries
        .filter((e) => e.type === 'file' && getMediaType(e.name) === 'audio')
        .map(fileToTrack)
      playTrack(track, queue.length > 0 ? queue : [track])
    } finally {
      setPlaying(null)
    }
  }

  const handleDownload = (entry: JWApiFileEntry): void => {
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

  const openLightbox = (entry: JWApiFileEntry): void => {
    const mediaEntries = entries.filter((e) => {
      const mt = getMediaType(e.name)
      return e.type === 'file' && (mt === 'image' || mt === 'video')
    })
    const items: LightboxItem[] = mediaEntries.map((e) => ({
      url: buildStreamUrl(e.path),
      type: getMediaType(e.name) as 'image' | 'video',
      name: e.name,
    }))
    const idx = mediaEntries.findIndex((e) => e.path === entry.path)
    setLightboxItems(items)
    setLightboxIndex(idx >= 0 ? idx : 0)
  }

  const sortedEntries = useMemo(
    () => sortEntries(entries, sortBy, sortDir),
    [entries, sortBy, sortDir]
  )

  const crumbs = breadcrumbs(currentPath)

  const SortIcon = ({ by }: { by: SortBy }): JSX.Element => {
    if (sortBy !== by) return <ArrowUpDown size={11} className="opacity-40" />
    return sortDir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />
  }

  return (
    <>
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-5 pb-3 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <HardDrive size={18} className="text-text-muted" />
              <h1 className="text-text-primary text-xl font-bold">API Files</h1>
            </div>
            <div className="flex items-center gap-2">
              {/* Sort controls */}
              <div className="flex items-center gap-1 text-text-muted">
                {(['name', 'type', 'size'] as SortBy[]).map((by) => (
                  <button
                    key={by}
                    onClick={() => toggleSort(by)}
                    className={`flex items-center gap-0.5 text-xs px-2 py-1 rounded-md transition-colors capitalize ${
                      sortBy === by
                        ? 'bg-surface-raised text-text-primary'
                        : 'hover:text-text-secondary hover:bg-surface-overlay'
                    }`}
                    title={`Sort by ${by}`}
                  >
                    {by}
                    <SortIcon by={by} />
                  </button>
                ))}
              </div>
              {/* View toggle */}
              <div className="flex items-center bg-surface-overlay rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-surface-raised text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
                  title="List view"
                ><LayoutList size={15} /></button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-surface-raised text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
                  title="Grid view"
                ><LayoutGrid size={15} /></button>
              </div>
            </div>
          </div>

          {/* Nav bar */}
          <div className="flex items-center gap-1.5">
            <button onClick={goBack} disabled={history.length === 0 && !currentPath}
              className="p-1.5 rounded-lg hover:bg-surface-overlay disabled:opacity-30 disabled:pointer-events-none transition-colors" title="Back">
              <ArrowLeft size={15} className="text-text-muted" />
            </button>
            <button onClick={goHome} className="p-1.5 rounded-lg hover:bg-surface-overlay transition-colors" title="Root">
              <Home size={15} className="text-text-muted" />
            </button>
            <div className="flex items-center gap-0.5 overflow-hidden ml-1 flex-1 min-w-0">
              <button
                onClick={goHome}
                className={`text-xs px-1.5 py-0.5 rounded transition-colors shrink-0 ${
                  crumbs.length === 0 ? 'text-text-primary font-medium' : 'text-text-muted hover:text-text-primary hover:bg-surface-overlay'
                }`}
              >Root</button>
              {crumbs.map((crumb, i) => (
                <div key={crumb.path} className="flex items-center gap-0.5 min-w-0 shrink-0">
                  <ChevronRight size={12} className="text-text-muted shrink-0" />
                  <button
                    onClick={() => navigate(crumb.path)}
                    className={`text-xs px-1.5 py-0.5 rounded transition-colors truncate max-w-[140px] ${
                      i === crumbs.length - 1 ? 'text-text-primary font-medium' : 'text-text-muted hover:text-text-primary hover:bg-surface-overlay'
                    }`}
                    title={crumb.path}
                  >{crumb.label}</button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 pb-4">
          {loading ? (
            <div className="flex items-center justify-center h-40 gap-2 text-text-muted">
              <Loader2 size={18} className="animate-spin" /><span className="text-sm">Loading…</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <p className="text-text-muted text-sm">{error}</p>
              <button onClick={() => navigate(currentPath, false)} className="text-accent text-sm underline">Retry</button>
            </div>
          ) : sortedEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <Music2 size={32} className="text-text-muted opacity-30" />
              <p className="text-text-muted text-sm">Nothing here</p>
            </div>
          ) : viewMode === 'list' ? (
            /* ── List view ─────────────────────────────────────────────────── */
            <div className="space-y-0.5">
              {currentPath && (
                <button onClick={goBack} className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-surface-overlay transition-colors text-left">
                  <div className="w-9 h-9 flex items-center justify-center shrink-0"><FolderOpen size={18} className="text-text-muted" /></div>
                  <span className="text-text-muted text-sm">..</span>
                </button>
              )}
              {sortedEntries.map((entry) => {
                const isDir = entry.type === 'directory'
                const mt = isDir ? 'folder' : getMediaType(entry.name)
                const ext = getFileExt(entry.name).slice(1).toUpperCase()
                const isMedia = mt === 'image' || mt === 'video'
                return (
                  <div key={entry.path}
                    className="group flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-overlay transition-colors cursor-default"
                    onClick={() => { if (isDir) navigate(entry.path); else if (isMedia) openLightbox(entry) }}
                  >
                    {/* Icon / thumbnail */}
                    <div className="relative shrink-0 w-9 h-9">
                      {isDir ? (
                        <div className="w-9 h-9 flex items-center justify-center">
                          <Folder size={20} className="text-text-secondary group-hover:text-accent transition-colors" />
                        </div>
                      ) : mt === 'audio' ? (
                        <>
                          <ApiCoverThumb path={entry.path} size={36} />
                          {/* Desktop: hover overlay */}
                          <button
                            className="absolute inset-0 items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded hidden md:flex"
                            onClick={(e) => { e.stopPropagation(); handlePlay(entry) }}
                            title="Play"
                          >
                            {playing === entry.path ? <Loader2 size={14} className="text-white animate-spin" /> : <Play size={14} fill="white" className="text-white ml-0.5" />}
                          </button>
                          {/* Mobile: corner play button */}
                          <button
                            className="md:hidden absolute bottom-0.5 right-0.5 w-5 h-5 rounded-full bg-accent flex items-center justify-center"
                            onClick={(e) => { e.stopPropagation(); handlePlay(entry) }}
                          >
                            {playing === entry.path ? <Loader2 size={10} className="text-black animate-spin" /> : <Play size={10} fill="black" className="text-black" />}
                          </button>
                        </>
                      ) : mt === 'image' ? (
                        <div className="w-9 h-9"><ApiImageThumb path={entry.path} size={36} /></div>
                      ) : mt === 'video' ? (
                        <div className="w-9 h-9 flex items-center justify-center"><Video size={18} className="text-text-muted" /></div>
                      ) : (
                        <div className="w-9 h-9 flex items-center justify-center"><Music2 size={18} className="text-text-muted opacity-40" /></div>
                      )}
                    </div>
                    <span className={`flex-1 text-sm truncate ${isDir ? 'text-text-primary font-medium cursor-pointer' : 'text-text-secondary'}`}>{entry.name}</span>
                    {!isDir && entry.size != null && (
                      <span className="hidden md:inline text-text-muted text-xs shrink-0 w-14 text-right">{(entry.size / 1_048_576).toFixed(1)} MB</span>
                    )}
                    {!isDir && <span className="hidden md:inline text-[10px] uppercase tracking-wide text-text-muted bg-surface-overlay px-1.5 py-0.5 rounded shrink-0">{ext}</span>}
                    {mt === 'audio' && (
                      <button
                        className="opacity-100 md:opacity-0 md:group-hover:opacity-100 w-7 h-7 rounded-full bg-accent flex items-center justify-center transition-opacity shrink-0"
                        onClick={(e) => { e.stopPropagation(); handlePlay(entry) }}
                        title="Play"
                      >
                        {playing === entry.path ? <Loader2 size={13} className="text-black animate-spin" /> : <Play size={13} fill="black" className="text-black ml-0.5" />}
                      </button>
                    )}
                    {!isDir && (
                      <button
                        className="opacity-100 md:opacity-0 md:group-hover:opacity-100 w-7 h-7 rounded-full bg-surface-raised hover:bg-surface-overlay flex items-center justify-center transition-opacity shrink-0 border border-[var(--border)]"
                        onClick={(e) => { e.stopPropagation(); handleDownload(entry) }}
                        title="Download"
                      >
                        {downloading === entry.path ? <Loader2 size={12} className="text-text-muted animate-spin" /> : <Download size={12} className="text-text-muted" />}
                      </button>
                    )}
                    <button
                      className="opacity-100 md:opacity-0 md:group-hover:opacity-100 w-7 h-7 rounded-full bg-surface-raised hover:bg-surface-overlay flex items-center justify-center transition-opacity shrink-0 border border-[var(--border)]"
                      onClick={(e) => { e.stopPropagation(); copyLink(entry) }}
                      title={isDir ? 'Copy folder link' : 'Copy file link'}
                    >
                      {copiedPath === entry.path ? <Check size={12} className="text-accent" /> : <Link size={12} className="text-text-muted" />}
                    </button>
                  </div>
                )
              })}
            </div>
          ) : (
            /* ── Grid view ─────────────────────────────────────────────────── */
            <div className="grid gap-3 pt-1" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
              {currentPath && (
                <button onClick={goBack} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-surface-overlay hover:bg-surface-raised transition-colors">
                  <div className="w-full aspect-square flex items-center justify-center"><FolderOpen size={40} className="text-text-muted" /></div>
                  <span className="text-text-muted text-xs">..</span>
                </button>
              )}
              {sortedEntries.map((entry) => {
                const isDir = entry.type === 'directory'
                const mt = isDir ? 'folder' : getMediaType(entry.name)
                const ext = getFileExt(entry.name).slice(1).toUpperCase()
                const isMedia = mt === 'image' || mt === 'video'
                return (
                  <div key={entry.path}
                    className="group flex flex-col rounded-xl overflow-hidden bg-surface-overlay hover:bg-surface-raised transition-colors cursor-default"
                    onClick={() => { if (isDir) navigate(entry.path); else if (isMedia) openLightbox(entry) }}
                  >
                    {/* Thumb */}
                    <div className="relative w-full aspect-square bg-surface-raised flex items-center justify-center overflow-hidden">
                      {isDir ? (
                        <Folder size={40} className="text-text-secondary group-hover:text-accent transition-colors" />
                      ) : mt === 'audio' ? (
                        <>
                          <img src={buildCoverArtUrl(entry.path)} alt="" className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                          <button
                            className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => { e.stopPropagation(); handlePlay(entry) }}
                          >
                            <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center shadow-lg">
                              {playing === entry.path ? <Loader2 size={18} className="text-black animate-spin" /> : <Play size={18} fill="black" className="text-black ml-0.5" />}
                            </div>
                          </button>
                        </>
                      ) : mt === 'image' ? (
                        <>
                          <img src={buildStreamUrl(entry.path)} alt={entry.name} className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                              <ImageIcon size={16} className="text-white" />
                            </div>
                          </div>
                        </>
                      ) : mt === 'video' ? (
                        <>
                          <Video size={36} className="text-text-muted" />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                              <Play size={16} fill="white" className="text-white ml-0.5" />
                            </div>
                          </div>
                        </>
                      ) : (
                        <span className="text-xs uppercase text-text-muted">{ext}</span>
                      )}
                      {/* Download + copy link overlay buttons (grid) */}
                      {!isDir && (
                        <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          <button
                            className="w-6 h-6 rounded-full bg-black/60 flex items-center justify-center"
                            onClick={(e) => { e.stopPropagation(); copyLink(entry) }}
                            title="Copy link"
                          >
                            {copiedPath === entry.path ? <Check size={11} className="text-accent" /> : <Link size={11} className="text-white" />}
                          </button>
                          <button
                            className="w-6 h-6 rounded-full bg-black/60 flex items-center justify-center"
                            onClick={(e) => { e.stopPropagation(); handleDownload(entry) }}
                            title="Download"
                          >
                            {downloading === entry.path ? <Loader2 size={11} className="text-white animate-spin" /> : <Download size={11} className="text-white" />}
                          </button>
                        </div>
                      )}
                    </div>
                    {/* Label */}
                    <div className="px-2 py-2">
                      <p className="text-text-primary text-xs font-medium truncate">{entry.name}</p>
                      {!isDir && <p className="text-text-muted text-[10px] uppercase tracking-wide mt-0.5">{ext}</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {lightboxIndex >= 0 && lightboxItems.length > 0 && (
        <MediaLightbox
          items={lightboxItems}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(-1)}
          onNav={setLightboxIndex}
        />
      )}
    </>
  )
}
