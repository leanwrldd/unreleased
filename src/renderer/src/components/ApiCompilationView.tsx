import { useState, useEffect, useCallback } from 'react'
import { Play, Loader2, Music2, ArrowLeft, ChevronRight, Folder, Download, ListPlus, Info } from 'lucide-react'
import { useStore } from '../store/useStore'
import {
  apiFetch,
  buildStreamUrl,
  buildCoverArtUrl,
  buildImageUrl,
  JWApiFileEntry,
  JWApiBrowseResponse,
  JWApiPaginatedResponse,
  JWApiSong,
  songToTrack,
} from '../lib/juicewrldApi'
import { Track } from '../types'
import SongInfoModal from './SongInfoModal'

// ── Types ──────────────────────────────────────────────────────────────────────

type Tab = 'albums' | 'unreleased' | 'singles'

const TABS: { id: Tab; label: string }[] = [
  { id: 'albums',     label: 'Studio Albums & Mixtapes' },
  { id: 'unreleased', label: 'Unreleased' },
  { id: 'singles',    label: 'Singles' },
]

// ── Helpers ────────────────────────────────────────────────────────────────────

function classifyFolderTab(name: string): Tab {
  const l = name.toLowerCase()
  if (l.includes('unreleased') || l.includes('leak') || l.includes('vault')) return 'unreleased'
  // Explicitly keep SoundCloud and mixtape folders out of singles
  if (l.includes('soundcloud') || l.includes('mixtape')) return 'albums'
  if (l.includes('single') || l.includes(' ep') || l.includes('mainstream') || l.includes('feature') || l.includes('collab')) return 'singles'
  return 'albums'
}

function albumType(name: string): 'studio' | 'mixtape' {
  const l = name.toLowerCase()
  if (l.includes('mixtape') || l.includes('999') || l.includes('freeband') || l.includes('sick mode') || l.includes('wishing well')) return 'mixtape'
  return 'studio'
}

function parseEntries(data: JWApiBrowseResponse): JWApiFileEntry[] {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object' && 'items' in data) return (data as { items: JWApiFileEntry[] }).items ?? []
  return []
}

function isAudio(name: string): boolean {
  return /\.(mp3|flac|wav|m4a|ogg|aac)$/i.test(name)
}

// ── Cover art — lazy browse into folder to find first audio file ───────────────

const coverCache = new Map<string, string | null>()

function FolderCover({ path }: { path: string }): JSX.Element {
  const cached = coverCache.has(path) ? coverCache.get(path) : undefined
  const [src, setSrc] = useState<string | null>(cached ?? null)
  const [imgErr, setImgErr] = useState(false)

  useEffect(() => {
    if (coverCache.has(path)) return
    apiFetch<JWApiBrowseResponse>('/files/browse/', { path })
      .then(data => {
        const entries = parseEntries(data)
        const first = entries.find(e => e.type === 'file' && isAudio(e.name))
        const url = first ? buildCoverArtUrl(first.path) : null
        coverCache.set(path, url)
        setSrc(url)
      })
      .catch(() => { coverCache.set(path, null) })
  }, [path])

  if (src && !imgErr) {
    return (
      <img
        src={src}
        alt=""
        className="w-full h-full object-cover"
        onError={() => setImgErr(true)}
      />
    )
  }
  return <Music2 size={32} className="text-text-muted opacity-20" />
}

// ── Tracker fallback (when no folder found for a tab) ─────────────────────────

function TrackerList({
  category,
  onPlay,
  onQueue,
  onInfo,
}: {
  category: 'released' | 'unreleased'
  onPlay: (song: JWApiSong, all: JWApiSong[]) => void
  onQueue: (track: Track) => void
  onInfo: (song: JWApiSong) => void
}): JSX.Element {
  const [songs, setSongs] = useState<JWApiSong[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch<JWApiPaginatedResponse>('/songs/', { category, limit: 200 })
      .then(data => setSongs(data.results.filter(s => !!s.path)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [category])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 gap-2 text-text-muted">
        <Loader2 size={18} className="animate-spin" />
        <span className="text-sm">Loading…</span>
      </div>
    )
  }
  if (!songs.length) {
    return (
      <div className="flex flex-col items-center justify-center h-40 gap-2 text-text-muted">
        <Music2 size={32} className="opacity-20" />
        <p className="text-sm">Nothing here yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-0.5 pt-1">
      {songs.map((song) => {
        const title = song.track_titles?.[0] || song.name
        const cover = buildImageUrl(song.image_url)
        return (
          <div
            key={song.id}
            className="group flex items-center gap-3 px-3 py-2 hover:bg-surface-overlay rounded-lg transition-colors"
          >
            <div className="relative w-9 h-9 rounded-lg overflow-hidden bg-surface-overlay shrink-0 flex items-center justify-center">
              {cover
                ? <img src={cover} alt="" className="w-full h-full object-cover" />
                : <Music2 size={14} className="text-text-muted opacity-40" />}
              <button
                onClick={() => onPlay(song, songs)}
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 hidden md:flex items-center justify-center transition-opacity"
              >
                <Play size={12} fill="white" className="text-white ml-0.5" />
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-text-primary text-sm truncate">{title}</p>
              {song.era?.name && (
                <p className="text-text-muted text-[11px] truncate">{song.era.name}</p>
              )}
            </div>
            {/* Desktop action buttons */}
            <div className="hidden md:flex items-center gap-0.5">
              <button
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-surface-raised text-text-muted hover:text-text-primary transition-all"
                onClick={(e) => { e.stopPropagation(); onInfo(song) }}
                title="Song info"
              >
                <Info size={14} />
              </button>
              <button
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-surface-raised text-text-muted hover:text-text-primary transition-all"
                onClick={(e) => { e.stopPropagation(); onQueue(songToTrack(song)) }}
                title="Add to queue"
              >
                <ListPlus size={14} />
              </button>
              <button
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-surface-raised text-text-muted hover:text-text-primary transition-all"
                onClick={(e) => {
                  e.stopPropagation()
                  const url = buildStreamUrl(song.path!)
                  const a = document.createElement('a')
                  a.href = url; a.download = title + '.mp3'; a.target = '_blank'; a.rel = 'noopener noreferrer'
                  document.body.appendChild(a); a.click(); document.body.removeChild(a)
                }}
                title="Download"
              >
                <Download size={14} />
              </button>
            </div>
            {/* Mobile buttons */}
            <div className="md:hidden flex items-center">
              <button className="p-2 text-text-muted active:text-accent" onClick={() => onInfo(song)} title="Info"><Info size={15} /></button>
              <button className="p-2 text-text-muted active:text-accent" onClick={() => onPlay(song, songs)} title="Play"><Play size={15} /></button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Per-tab nav state ──────────────────────────────────────────────────────────

interface TabNav { path: string; nameStack: string[] }

function initNav(): Record<Tab, TabNav> {
  return {
    albums:     { path: '', nameStack: [] },
    unreleased: { path: '', nameStack: [] },
    singles:    { path: '', nameStack: [] },
  }
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ApiCompilationView(): JSX.Element {
  const { playTrack, addToQueue } = useStore()
  const [activeTab, setActiveTab] = useState<Tab>('albums')
  const [infoSong, setInfoSong] = useState<JWApiSong | null>(null)

  const [tabRoots, setTabRoots] = useState<Record<Tab, string>>({ albums: '', unreleased: '', singles: '' })
  const [discovering, setDiscovering] = useState(true)
  const [discoverError, setDiscoverError] = useState(false)

  const [nav, setNav] = useState<Record<Tab, TabNav>>(initNav)
  const [entries, setEntries] = useState<JWApiFileEntry[]>([])
  const [browsing, setBrowsing] = useState(false)

  // Discover root folders on mount
  useEffect(() => {
    ;(async () => {
      let items: JWApiFileEntry[] = []
      for (const path of ['Compilation', '']) {
        try {
          const data = await apiFetch<JWApiBrowseResponse>('/files/browse/', { path })
          const parsed = parseEntries(data)
          if (parsed.some(i => i.type === 'directory')) { items = parsed; break }
        } catch { /* try next path */ }
      }
      if (!items.length) { setDiscoverError(true); setDiscovering(false); return }

      const roots: Record<Tab, string> = { albums: '', unreleased: '', singles: '' }
      for (const item of items.filter(i => i.type === 'directory')) {
        const tab = classifyFolderTab(item.name)
        if (!roots[tab]) roots[tab] = item.path
      }

      setTabRoots(roots)
      setNav({
        albums:     { path: roots.albums,     nameStack: [] },
        unreleased: { path: roots.unreleased, nameStack: [] },
        singles:    { path: roots.singles,    nameStack: [] },
      })
      setDiscovering(false)
    })()
  }, [])

  // Browse the current tab's path
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
      [activeTab]: { path: entry.path, nameStack: [...prev[activeTab].nameStack, entry.name] },
    }))
  }, [activeTab])

  const goBack = useCallback(() => {
    setNav(prev => {
      const tab = prev[activeTab]
      const newStack = tab.nameStack.slice(0, -1)
      const parentPath = tab.path.includes('/')
        ? tab.path.slice(0, tab.path.lastIndexOf('/'))
        : tabRoots[activeTab]
      return { ...prev, [activeTab]: { path: parentPath, nameStack: newStack } }
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

  const playTrackerSong = useCallback((song: JWApiSong, all: JWApiSong[]) => {
    const tracks = all.map(s => songToTrack(s))
    const idx = all.findIndex(s => s.id === song.id)
    const track = tracks[Math.max(0, idx)]
    if (track) playTrack(track, tracks)
  }, [playTrack])

  // Derived state
  const isAtRoot = nav[activeTab].nameStack.length === 0
  const nameStack = nav[activeTab].nameStack
  const hasRoot = !!tabRoots[activeTab]
  const isLoading = discovering || browsing

  const allFolders = entries.filter(e => e.type === 'directory')
  // In the singles tab, strip out anything that looks like a SoundCloud/mixtape folder
  const folders = activeTab === 'singles'
    ? allFolders.filter(f => {
        const l = f.name.toLowerCase()
        return !l.includes('soundcloud') && !l.includes('mixtape')
      })
    : allFolders
  const audioFiles = entries.filter(e => e.type === 'file' && isAudio(e.name))
  const studioAlbums = folders.filter(f => albumType(f.name) === 'studio')
  const mixtapes = folders.filter(f => albumType(f.name) === 'mixtape')

  // ── Render helpers ──────────────────────────────────────────────────────────

  const renderAlbumCard = (folder: JWApiFileEntry) => (
    <button
      key={folder.path}
      onClick={() => navigateTo(folder)}
      className="group flex flex-col text-left bg-surface-overlay hover:bg-surface-raised rounded-xl overflow-hidden transition-colors"
    >
      <div className="w-full aspect-square bg-surface-raised flex items-center justify-center relative overflow-hidden">
        <FolderCover path={folder.path} />
        <div className="absolute inset-0 bg-accent/0 group-hover:bg-accent/5 transition-colors" />
      </div>
      <div className="px-3 py-2.5">
        <p className="text-text-primary text-xs font-semibold leading-tight truncate">{folder.name}</p>
      </div>
    </button>
  )

  const renderGrid = (items: JWApiFileEntry[], label?: string) => (
    <div className="mb-5">
      {label && (
        <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-2.5 px-0.5">
          {label}
        </p>
      )}
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(145px, 1fr))' }}>
        {items.map(renderAlbumCard)}
      </div>
    </div>
  )

  const renderAudioRow = (file: JWApiFileEntry) => {
    const title = file.name.replace(/\.[^.]+$/, '')
    const fileTrack: Track = {
      id: `jw-file-${file.path}`,
      path: file.path,
      streamUrl: buildStreamUrl(file.path),
      imageUrl: buildCoverArtUrl(file.path),
      title,
      artist: 'Juice WRLD',
      album: activePath.split('/').pop() ?? '',
      albumArtist: 'Juice WRLD',
      year: null, trackNumber: null, duration: 0, genre: '', hasAlbumArt: true,
    }
    return (
      <div
        key={file.path}
        className="group flex items-center gap-3 px-3 py-2.5 hover:bg-surface-overlay rounded-lg transition-colors"
      >
        <div className="relative w-9 h-9 rounded-lg overflow-hidden bg-surface-overlay shrink-0 flex items-center justify-center">
          <img
            src={buildCoverArtUrl(file.path)}
            alt=""
            className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
          <button
            onClick={() => playFile(file)}
            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 hidden md:flex items-center justify-center transition-opacity"
          >
            <Play size={12} fill="white" className="text-white ml-0.5" />
          </button>
        </div>
        <span className="text-text-primary text-sm flex-1 truncate">{title}</span>
        {/* Desktop action buttons */}
        <div className="hidden md:flex items-center gap-0.5">
          <button
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-surface-raised text-text-muted hover:text-text-primary transition-all"
            onClick={(e) => { e.stopPropagation(); addToQueue(fileTrack) }}
            title="Add to queue"
          >
            <ListPlus size={14} />
          </button>
          <button
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-surface-raised text-text-muted hover:text-text-primary transition-all"
            onClick={(e) => {
              e.stopPropagation()
              const a = document.createElement('a')
              a.href = buildStreamUrl(file.path); a.download = file.name; a.target = '_blank'; a.rel = 'noopener noreferrer'
              document.body.appendChild(a); a.click(); document.body.removeChild(a)
            }}
            title="Download"
          >
            <Download size={14} />
          </button>
        </div>
        {/* Mobile buttons */}
        <div className="md:hidden flex items-center">
          <button className="p-2 text-text-muted active:text-accent" onClick={() => addToQueue(fileTrack)} title="Queue"><ListPlus size={15} /></button>
          <button className="p-2 text-text-muted active:text-accent" onClick={() => playFile(file)} title="Play"><Play size={15} /></button>
        </div>
      </div>
    )
  }

  // ── Root album grid content ─────────────────────────────────────────────────

  const renderRootGrid = () => {
    const showSections = activeTab === 'albums' && studioAlbums.length > 0 && mixtapes.length > 0

    if (folders.length === 0 && audioFiles.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-40 gap-2 text-text-muted">
          <Music2 size={32} className="opacity-20" />
          <p className="text-sm">Nothing here</p>
        </div>
      )
    }

    return (
      <>
        {showSections ? (
          <>
            {studioAlbums.length > 0 && renderGrid(studioAlbums, 'Studio Albums')}
            {mixtapes.length > 0 && renderGrid(mixtapes, 'Mixtapes')}
          </>
        ) : (
          renderGrid(folders)
        )}
        {audioFiles.map(renderAudioRow)}
      </>
    )
  }

  // ── Main render ─────────────────────────────────────────────────────────────

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

        {/* Breadcrumb */}
        {!isAtRoot && (
          <div className="flex items-center gap-2 pb-3 min-w-0">
            <button
              onClick={goBack}
              className="text-text-muted hover:text-text-primary transition-colors shrink-0"
            >
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
          // No folder found for this tab → fall back to Tracker API
          activeTab === 'unreleased' ? (
            <TrackerList category="unreleased" onPlay={playTrackerSong} onQueue={addToQueue} onInfo={setInfoSong} />
          ) : activeTab === 'singles' ? (
            <TrackerList category="released" onPlay={playTrackerSong} onQueue={addToQueue} onInfo={setInfoSong} />
          ) : (
            <div className="flex flex-col items-center justify-center h-40 gap-2 text-text-muted">
              <Music2 size={32} className="opacity-20" />
              <p className="text-sm">No content found</p>
            </div>
          )
        ) : isAtRoot ? (
          <div className="pt-1">{renderRootGrid()}</div>
        ) : (
          // ── Inside a folder: file list ──
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
            {audioFiles.map(renderAudioRow)}
            {folders.length === 0 && audioFiles.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 gap-2 text-text-muted">
                <Music2 size={32} className="opacity-20" />
                <p className="text-sm">Empty folder</p>
              </div>
            )}
          </div>
        )}
      </div>

      <SongInfoModal song={infoSong} onClose={() => setInfoSong(null)} />
    </div>
  )
}
