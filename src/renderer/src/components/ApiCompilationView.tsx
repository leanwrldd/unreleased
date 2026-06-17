import { useState, useEffect, useCallback } from 'react'
import { Play, Loader2, Music2, ArrowLeft, ChevronRight, Folder } from 'lucide-react'
import { useStore } from '../store/useStore'
import {
  apiFetch,
  buildStreamUrl,
  buildCoverArtUrl,
  JWApiFileEntry,
  JWApiBrowseResponse,
} from '../lib/juicewrldApi'
import { Track } from '../types'

type Tab = 'albums' | 'unreleased' | 'singles'

const TABS: { id: Tab; label: string }[] = [
  { id: 'albums',    label: 'Studio Albums & Mixtapes' },
  { id: 'unreleased',label: 'Unreleased' },
  { id: 'singles',   label: 'Singles' },
]

function classifyFolder(name: string): Tab {
  const lower = name.toLowerCase()
  if (lower.includes('unreleased') || lower.includes('leak') || lower.includes('vault')) return 'unreleased'
  if (lower.includes('single') || lower.includes(' ep')) return 'singles'
  return 'albums'
}

function parseEntries(data: JWApiBrowseResponse): JWApiFileEntry[] {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object' && 'items' in data) return (data as { items: JWApiFileEntry[] }).items ?? []
  return []
}

function isAudio(name: string): boolean {
  return /\.(mp3|flac|wav|m4a|ogg|aac)$/i.test(name)
}

// Per-tab navigation: each tab has its own path + name stacks
interface TabNav { path: string; nameStack: string[] }

function initTabNav(): Record<Tab, TabNav> {
  return { albums: { path: '', nameStack: [] }, unreleased: { path: '', nameStack: [] }, singles: { path: '', nameStack: [] } }
}

function AlbumCover({ path }: { path: string }): JSX.Element {
  const [ok, setOk] = useState(true)
  return ok ? (
    <img
      src={buildCoverArtUrl(path)}
      alt=""
      className="w-full h-full object-cover"
      onError={() => setOk(false)}
    />
  ) : (
    <Music2 size={36} className="text-text-muted opacity-20" />
  )
}

export default function ApiCompilationView(): JSX.Element {
  const { playTrack } = useStore()
  const [activeTab, setActiveTab] = useState<Tab>('albums')

  // Root paths discovered on mount (section folder per tab)
  const [tabRoots, setTabRoots] = useState<Record<Tab, string>>({ albums: '', unreleased: '', singles: '' })
  const [discovering, setDiscovering] = useState(true)
  const [discoverError, setDiscoverError] = useState(false)

  // Per-tab navigation state
  const [nav, setNav] = useState<Record<Tab, TabNav>>(initTabNav)

  // Browsed entries + loading for current tab
  const [entries, setEntries] = useState<JWApiFileEntry[]>([])
  const [browsing, setBrowsing] = useState(false)

  // Discover section folder roots on mount
  useEffect(() => {
    ;(async () => {
      let items: JWApiFileEntry[] = []
      for (const path of ['Compilation', '']) {
        try {
          const data = await apiFetch<JWApiBrowseResponse>('/files/browse/', { path })
          const parsed = parseEntries(data)
          if (parsed.some(i => i.type === 'directory')) { items = parsed; break }
        } catch { /* try next */ }
      }

      if (!items.length) { setDiscoverError(true); setDiscovering(false); return }

      const roots: Record<Tab, string> = { albums: '', unreleased: '', singles: '' }
      for (const item of items.filter(i => i.type === 'directory')) {
        const tab = classifyFolder(item.name)
        if (!roots[tab]) roots[tab] = item.path
      }

      // Seed each tab's path with its root
      setTabRoots(roots)
      setNav({
        albums:    { path: roots.albums,    nameStack: [] },
        unreleased:{ path: roots.unreleased,nameStack: [] },
        singles:   { path: roots.singles,   nameStack: [] },
      })
      setDiscovering(false)
    })()
  }, [])

  // Browse the active tab's current path whenever it changes
  const activePath = nav[activeTab].path
  useEffect(() => {
    if (discovering) return
    if (!activePath) { setEntries([]); return }
    setBrowsing(true)
    setEntries([])
    apiFetch<JWApiBrowseResponse>('/files/browse/', { path: activePath })
      .then(d => setEntries(parseEntries(d)))
      .catch(() => setEntries([]))
      .finally(() => setBrowsing(false))
  }, [activePath, discovering])

  const navigateTo = useCallback((entry: JWApiFileEntry) => {
    setNav(prev => ({
      ...prev,
      [activeTab]: {
        path: entry.path,
        nameStack: [...prev[activeTab].nameStack, entry.name],
      },
    }))
  }, [activeTab])

  const goBack = useCallback(() => {
    setNav(prev => {
      const tab = prev[activeTab]
      const newStack = tab.nameStack.slice(0, -1)
      // Walk back: each step strips the last path segment
      const parentPath = tab.path.includes('/')
        ? tab.path.slice(0, tab.path.lastIndexOf('/'))
        : tabRoots[activeTab]
      return {
        ...prev,
        [activeTab]: { path: parentPath, nameStack: newStack },
      }
    })
  }, [activeTab, tabRoots])

  const playFile = useCallback((file: JWApiFileEntry) => {
    const audioFiles = entries.filter(e => e.type === 'file' && isAudio(e.name))
    const tracks: Track[] = audioFiles.map(f => ({
      id: `jw-file-${f.path}`,
      path: f.path,
      streamUrl: buildStreamUrl(f.path),
      imageUrl: buildCoverArtUrl(f.path),
      title: f.name.replace(/\.[^.]+$/, ''),
      artist: 'Juice WRLD',
      album: activePath.split('/').pop() ?? '',
      albumArtist: 'Juice WRLD',
      year: null, trackNumber: null, duration: 0, genre: '', hasAlbumArt: true,
    }))
    const idx = Math.max(0, tracks.findIndex(t => t.path === file.path))
    if (tracks[idx]) playTrack(tracks[idx], tracks)
  }, [entries, activePath, playTrack])

  const isAtRoot = nav[activeTab].nameStack.length === 0
  const nameStack = nav[activeTab].nameStack
  const hasRoot = !!tabRoots[activeTab]
  const isLoading = discovering || browsing

  const folders = entries.filter(e => e.type === 'directory')
  const audioFiles = entries.filter(e => e.type === 'file' && isAudio(e.name))

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <div className="px-4 md:px-5 pt-4 md:pt-5 pb-0 shrink-0">
        <h1 className="text-text-primary text-xl font-bold mb-3">Compilation</h1>

        {/* Tab pills */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-3">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors ${
                activeTab === tab.id
                  ? 'bg-accent text-white'
                  : 'bg-surface-overlay text-text-muted hover:text-text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Back + breadcrumb */}
        {!isAtRoot && (
          <div className="flex items-center gap-2 pb-3 min-w-0">
            <button onClick={goBack} className="text-text-muted hover:text-text-primary transition-colors shrink-0">
              <ArrowLeft size={16} />
            </button>
            <div className="flex items-center gap-0.5 text-xs text-text-muted min-w-0 overflow-hidden">
              {nameStack.map((name, i) => (
                <span key={i} className="flex items-center gap-0.5 min-w-0">
                  {i > 0 && <ChevronRight size={11} className="shrink-0 opacity-50" />}
                  <span className={`truncate ${i === nameStack.length - 1 ? 'text-text-primary font-medium' : ''}`}>
                    {name}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 md:px-5 pb-4">
        {discoverError ? (
          <div className="flex items-center justify-center h-40 text-text-muted text-sm">
            Failed to load compilation
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-40 gap-2 text-text-muted">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Loading…</span>
          </div>
        ) : !hasRoot ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-text-muted">
            <Music2 size={32} className="opacity-20" />
            <p className="text-sm">No content for this section</p>
          </div>
        ) : isAtRoot ? (
          /* ── Album grid ── */
          <div className="grid gap-3 pt-1" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(145px, 1fr))' }}>
            {folders.map(folder => (
              <button
                key={folder.path}
                onClick={() => navigateTo(folder)}
                className="group flex flex-col text-left bg-surface-overlay hover:bg-surface-raised rounded-xl overflow-hidden transition-colors"
              >
                <div className="w-full aspect-square bg-surface-raised flex items-center justify-center relative overflow-hidden">
                  <Music2 size={36} className="text-text-muted opacity-20" />
                  <div className="absolute inset-0 bg-accent/0 group-hover:bg-accent/5 transition-colors" />
                </div>
                <div className="px-3 py-2.5">
                  <p className="text-text-primary text-xs font-semibold leading-tight truncate">{folder.name}</p>
                </div>
              </button>
            ))}
            {audioFiles.map(file => (
              <div
                key={file.path}
                className="group flex flex-col bg-surface-overlay hover:bg-surface-raised rounded-xl overflow-hidden transition-colors"
              >
                <div className="w-full aspect-square bg-surface-raised flex items-center justify-center relative overflow-hidden">
                  <AlbumCover path={file.path} />
                  <button
                    onClick={() => playFile(file)}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                  >
                    <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center shadow-lg">
                      <Play size={18} fill="black" className="text-black ml-0.5" />
                    </div>
                  </button>
                </div>
                <div className="px-3 py-2.5">
                  <p className="text-text-primary text-xs font-semibold leading-tight truncate">
                    {file.name.replace(/\.[^.]+$/, '')}
                  </p>
                </div>
              </div>
            ))}
            {folders.length === 0 && audioFiles.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center h-40 gap-2 text-text-muted">
                <Music2 size={32} className="opacity-20" />
                <p className="text-sm">No albums found</p>
              </div>
            )}
          </div>
        ) : (
          /* ── File list inside a folder ── */
          <div className="space-y-0.5 pt-1">
            {folders.map(folder => (
              <button
                key={folder.path}
                onClick={() => navigateTo(folder)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-surface-overlay rounded-lg transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-surface-overlay flex items-center justify-center shrink-0">
                  <Folder size={16} className="text-text-muted" />
                </div>
                <span className="text-text-primary text-sm flex-1 text-left truncate">{folder.name}</span>
                <ChevronRight size={16} className="text-text-muted shrink-0" />
              </button>
            ))}
            {audioFiles.map(file => (
              <div
                key={file.path}
                className="group flex items-center gap-3 px-3 py-2.5 hover:bg-surface-overlay rounded-lg transition-colors"
              >
                <div className="relative w-9 h-9 rounded-lg overflow-hidden bg-surface-overlay shrink-0">
                  <AlbumCover path={file.path} />
                  <button
                    onClick={() => playFile(file)}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 hidden md:flex items-center justify-center transition-opacity"
                  >
                    <Play size={12} fill="white" className="text-white ml-0.5" />
                  </button>
                </div>
                <span className="text-text-primary text-sm flex-1 truncate">
                  {file.name.replace(/\.[^.]+$/, '')}
                </span>
                <button
                  onClick={() => playFile(file)}
                  className="md:hidden p-2 text-text-muted active:text-accent transition-colors shrink-0"
                >
                  <Play size={16} />
                </button>
              </div>
            ))}
            {folders.length === 0 && audioFiles.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 gap-2 text-text-muted">
                <Music2 size={32} className="opacity-20" />
                <p className="text-sm">Empty folder</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
