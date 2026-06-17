import { useState, useEffect, useCallback } from 'react'
import {
  Folder, FolderOpen, Music2, ChevronRight, HardDrive, ArrowLeft, Home,
  Play, Loader2, LayoutList, LayoutGrid, ImageIcon, Video,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { getFileExt, getMediaType, toFileUrl } from '../lib/fileTypes'
import MediaLightbox, { LightboxItem } from './MediaLightbox'

interface Entry {
  name: string
  path: string
  isDir: boolean
}

type ViewMode = 'list' | 'grid'

function breadcrumbs(path: string): { label: string; path: string }[] {
  const sep = path.includes('\\') ? '\\' : '/'
  const parts = path.split(sep).filter(Boolean)
  const crumbs: { label: string; path: string }[] = []
  for (let i = 0; i < parts.length; i++) {
    const crumbPath = (sep === '\\' ? '' : '/') + parts.slice(0, i + 1).join(sep)
    crumbs.push({ label: parts[i], path: crumbPath || sep })
  }
  if (sep === '\\' && crumbs.length > 0) crumbs[0].path = parts[0] + '\\'
  return crumbs
}

function parentPath(path: string): string {
  const sep = path.includes('\\') ? '\\' : '/'
  const trimmed = path.endsWith(sep) ? path.slice(0, -1) : path
  const idx = trimmed.lastIndexOf(sep)
  if (idx <= 0) return sep
  const parent = trimmed.slice(0, idx)
  if (/^[A-Za-z]:$/.test(parent)) return parent + '\\'
  return parent || sep
}

function ImageThumb({ path, size = 32 }: { path: string; size?: number }): JSX.Element {
  const [errored, setErrored] = useState(false)
  if (errored) {
    return (
      <div className="flex items-center justify-center" style={{ width: size, height: size }}>
        <ImageIcon size={size * 0.55} className="text-text-muted opacity-40" />
      </div>
    )
  }
  return (
    <img
      src={toFileUrl(path)}
      alt=""
      className="rounded object-cover"
      style={{ width: size, height: size }}
      onError={() => setErrored(true)}
    />
  )
}

export default function FileBrowserView(): JSX.Element {
  const { playTrack, library } = useStore()

  const [currentPath, setCurrentPath] = useState<string | null>(null)
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<string[]>([])
  const [playing, setPlaying] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [lightboxItems, setLightboxItems] = useState<LightboxItem[]>([])
  const [lightboxIndex, setLightboxIndex] = useState(-1)

  const navigate = useCallback(async (path: string, pushHistory = true) => {
    setLoading(true)
    setError(null)
    const result = await window.api.readDir(path)
    setLoading(false)
    if (!result.ok) {
      setError(result.error ?? 'Cannot read folder')
      return
    }
    if (pushHistory && currentPath) setHistory((h) => [...h, currentPath])
    setCurrentPath(path)
    setEntries(result.entries)
  }, [currentPath])

  useEffect(() => {
    window.api.homeDir().then((home) => navigate(home, false))
  }, [])

  const goBack = (): void => {
    if (history.length > 0) {
      const prev = history[history.length - 1]
      setHistory((h) => h.slice(0, -1))
      navigate(prev, false)
    } else if (currentPath) {
      navigate(parentPath(currentPath), false)
    }
  }

  const goHome = (): void => {
    window.api.homeDir().then((home) => { setHistory([]); navigate(home, false) })
  }

  const handlePlayFile = async (entry: Entry): Promise<void> => {
    setPlaying(entry.path)
    try {
      const existing = library.find((t) => t.path === entry.path)
      if (existing) { playTrack(existing, [existing]); return }
      const tracks = await window.api.addFiles([entry.path])
      if (tracks.length > 0) playTrack(tracks[0], tracks)
    } finally {
      setPlaying(null) }
  }

  const openLightbox = (entry: Entry): void => {
    const mediaEntries = entries.filter((e) => {
      const mt = getMediaType(e.name)
      return !e.isDir && (mt === 'image' || mt === 'video')
    })
    const items: LightboxItem[] = mediaEntries.map((e) => ({
      url: toFileUrl(e.path),
      type: getMediaType(e.name) as 'image' | 'video',
      name: e.name,
    }))
    const idx = mediaEntries.findIndex((e) => e.path === entry.path)
    setLightboxItems(items)
    setLightboxIndex(idx >= 0 ? idx : 0)
  }

  const crumbs = currentPath ? breadcrumbs(currentPath) : []

  return (
    <>
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-5 pb-3 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <HardDrive size={18} className="text-text-muted" />
              <h1 className="text-text-primary text-xl font-bold">Files</h1>
            </div>
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

          {/* Nav bar */}
          <div className="flex items-center gap-1.5">
            <button onClick={goBack} disabled={history.length === 0 && !currentPath}
              className="p-1.5 rounded-lg hover:bg-surface-overlay disabled:opacity-30 disabled:pointer-events-none transition-colors" title="Back">
              <ArrowLeft size={15} className="text-text-muted" />
            </button>
            <button onClick={goHome} className="p-1.5 rounded-lg hover:bg-surface-overlay transition-colors" title="Home">
              <Home size={15} className="text-text-muted" />
            </button>
            <div className="flex items-center gap-0.5 overflow-hidden ml-1 flex-1 min-w-0">
              {crumbs.map((crumb, i) => (
                <div key={crumb.path} className="flex items-center gap-0.5 min-w-0 shrink-0">
                  {i > 0 && <ChevronRight size={12} className="text-text-muted shrink-0" />}
                  <button
                    onClick={() => navigate(crumb.path)}
                    className={`text-xs px-1.5 py-0.5 rounded transition-colors truncate max-w-[120px] ${
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
            <div className="flex flex-col items-center justify-center h-40"><p className="text-text-muted text-sm">{error}</p></div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <Music2 size={32} className="text-text-muted opacity-30" />
              <p className="text-text-muted text-sm">Nothing here</p>
            </div>
          ) : viewMode === 'list' ? (
            /* ── List view ─────────────────────────────────────────────────── */
            <div className="space-y-0.5">
              {currentPath && (
                <button onClick={goBack} className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-surface-overlay transition-colors text-left">
                  <div className="w-8 h-8 flex items-center justify-center shrink-0"><FolderOpen size={18} className="text-text-muted" /></div>
                  <span className="text-text-muted text-sm">..</span>
                </button>
              )}
              {entries.map((entry) => {
                const mt = entry.isDir ? 'folder' : getMediaType(entry.name)
                const ext = getFileExt(entry.name).slice(1).toUpperCase()
                return (
                  <div key={entry.path}
                    className="group flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-overlay transition-colors cursor-default"
                    onClick={() => { if (entry.isDir) navigate(entry.path); else if (mt === 'image' || mt === 'video') openLightbox(entry) }}
                  >
                    <div className="w-8 h-8 flex items-center justify-center shrink-0">
                      {entry.isDir ? <Folder size={18} className="text-text-secondary group-hover:text-accent transition-colors" />
                        : mt === 'image' ? <ImageThumb path={entry.path} size={32} />
                        : mt === 'video' ? <Video size={18} className="text-text-muted" />
                        : <Music2 size={18} className="text-text-muted" />}
                    </div>
                    <span className={`flex-1 text-sm truncate ${entry.isDir ? 'text-text-primary font-medium cursor-pointer' : 'text-text-secondary'}`}>{entry.name}</span>
                    {!entry.isDir && <span className="text-[10px] uppercase tracking-wide text-text-muted bg-surface-overlay px-1.5 py-0.5 rounded shrink-0">{ext}</span>}
                    {mt === 'audio' && (
                      <button
                        className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-full bg-accent flex items-center justify-center transition-opacity shrink-0"
                        onClick={(e) => { e.stopPropagation(); handlePlayFile(entry) }}
                        title="Play"
                      >
                        {playing === entry.path ? <Loader2 size={13} className="text-black animate-spin" /> : <Play size={13} fill="black" className="text-black ml-0.5" />}
                      </button>
                    )}
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
              {entries.map((entry) => {
                const mt = entry.isDir ? 'folder' : getMediaType(entry.name)
                const ext = getFileExt(entry.name).slice(1).toUpperCase()
                const isMedia = mt === 'image' || mt === 'video'
                return (
                  <div key={entry.path}
                    className="group flex flex-col rounded-xl overflow-hidden bg-surface-overlay hover:bg-surface-raised transition-colors cursor-default"
                    onClick={() => { if (entry.isDir) navigate(entry.path); else if (isMedia) openLightbox(entry) }}
                  >
                    {/* Thumb */}
                    <div className="relative w-full aspect-square bg-surface-raised flex items-center justify-center overflow-hidden">
                      {entry.isDir ? (
                        <Folder size={40} className="text-text-secondary group-hover:text-accent transition-colors" />
                      ) : mt === 'image' ? (
                        <img src={toFileUrl(entry.path)} alt={entry.name} className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      ) : mt === 'video' ? (
                        <Video size={36} className="text-text-muted" />
                      ) : mt === 'audio' ? (
                        <Music2 size={36} className="text-text-muted" />
                      ) : (
                        <span className="text-xs uppercase text-text-muted">{ext}</span>
                      )}
                      {/* Play overlay (audio) */}
                      {mt === 'audio' && (
                        <button
                          className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => { e.stopPropagation(); handlePlayFile(entry) }}
                        >
                          <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center shadow-lg">
                            {playing === entry.path ? <Loader2 size={18} className="text-black animate-spin" /> : <Play size={18} fill="black" className="text-black ml-0.5" />}
                          </div>
                        </button>
                      )}
                      {/* View overlay (image/video) */}
                      {isMedia && (
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            {mt === 'image' ? <ImageIcon size={16} className="text-white" /> : <Play size={16} fill="white" className="text-white ml-0.5" />}
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Label */}
                    <div className="px-2 py-2">
                      <p className="text-text-primary text-xs font-medium truncate">{entry.name}</p>
                      {!entry.isDir && <p className="text-text-muted text-[10px] uppercase tracking-wide mt-0.5">{ext}</p>}
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
