import { useEffect } from 'react'
import { useStore } from './store/useStore'
import Titlebar from './components/Titlebar'
import Sidebar from './components/Sidebar'
import TrackList from './components/TrackList'
import BrowserView from './components/BrowserView'
import LyricsView from './components/LyricsView'
import PlaylistsView from './components/PlaylistsView'
import ApiTrackerView from './components/ApiTrackerView'
import ApiRadioView from './components/ApiRadioView'
import ApiFilesView from './components/ApiFilesView'
import ApiCategoryView from './components/ApiCategoryView'
import FileBrowserView from './components/FileBrowserView'
import Player from './components/Player'
import NowPlaying from './components/NowPlaying'
import QueuePanel from './components/QueuePanel'
import MetadataEditor from './components/MetadataEditor'
import Settings from './components/Settings'
import ErrorBoundary from './components/ErrorBoundary'
import { Track, Playlist, PlaylistFolder, SortField, SortDir, Cols } from './types'

function hexToRgb(hex: string): [number, number, number] {
  const num = parseInt(hex.replace('#', ''), 16)
  return [(num >> 16) & 0xff, (num >> 8) & 0xff, num & 0xff]
}

function lightenHex(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex)
  const rr = Math.min(255, r + amount)
  const gg = Math.min(255, g + amount)
  const bb = Math.min(255, b + amount)
  return `#${rr.toString(16).padStart(2, '0')}${gg.toString(16).padStart(2, '0')}${bb.toString(16).padStart(2, '0')}`
}

export default function App(): JSX.Element {
  const {
    showNowPlaying,
    showQueue,
    showMetadataEditor,
    showSettings,
    activeView,
    theme,
    accentColor,
    setLibrary,
    setLibraryFolders,
    setPlaylists,
    setPlaylistFolders,
    setPlaylistSort,
    setTheme,
    setCrossfade,
    setAudioOutput,
    setAccentColor,
    setPlaybackSpeed,
    setLikedTrackIds,
    setProviders,
    setAppMode,
    setActiveView,
    setApiDownloadDir,
    setViewMode,
    setSort,
    setColumns,
    setScanFilters,
  } = useStore()

  const isBrowserView = activeView === 'albums' || activeView === 'artists' || activeView === 'genres'
  const isLyricsView = activeView === 'lyrics'
  const isPlaylistsView = activeView === 'playlists'
  const isFilesView = activeView === 'files'
  const isApiTrackerView = activeView === 'api-tracker'
  const isApiRadioView = activeView === 'api-radio'
  const isApiFilesView = activeView === 'api-files'
  const isApiCategoriesView = activeView === 'api-categories'

  // Apply/remove dark class on <html> whenever theme changes
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  // Apply accent color CSS variables
  useEffect(() => {
    const [r, g, b] = hexToRgb(accentColor)
    const hover = lightenHex(accentColor, 20)
    const [hr, hg, hb] = hexToRgb(hover)
    document.documentElement.style.setProperty('--accent', accentColor)
    document.documentElement.style.setProperty('--accent-rgb', `${r} ${g} ${b}`)
    document.documentElement.style.setProperty('--accent-hover', hover)
    document.documentElement.style.setProperty('--accent-hover-rgb', `${hr} ${hg} ${hb}`)
  }, [accentColor])

  // Restore persisted state on startup
  useEffect(() => {
    const init = async (): Promise<void> => {
      const [
        savedLibrary, savedFolders, savedPlaylists, savedPlaylistFolders, savedPlaylistSort,
        savedTheme, savedCrossfade, savedOutput, savedAccent, savedSpeed, savedLiked,
        savedProviders, savedAppMode, savedViewMode, savedSortField, savedSortDir,
        savedColumns, savedScanFilters, savedDownloadDir,
      ] = await Promise.all([
        window.api.storeGet<Track[]>('library'),
        window.api.storeGet<string[]>('libraryFolders'),
        window.api.storeGet<Playlist[]>('playlists'),
        window.api.storeGet<PlaylistFolder[]>('playlistFolders'),
        window.api.storeGet<'name' | 'date' | 'manual'>('playlistSort'),
        window.api.storeGet<'dark' | 'light'>('theme'),
        window.api.storeGet<{ enabled: boolean; duration: number }>('crossfade'),
        window.api.storeGet<string>('audioOutput'),
        window.api.storeGet<string>('accentColor'),
        window.api.storeGet<number>('playbackSpeed'),
        window.api.storeGet<string[]>('likedTrackIds'),
        window.api.storeGet<string[]>('providers'),
        window.api.storeGet<'local' | 'api'>('appMode'),
        window.api.storeGet<'list' | 'grid'>('viewMode'),
        window.api.storeGet<SortField>('sortField'),
        window.api.storeGet<SortDir>('sortDir'),
        window.api.storeGet<Cols>('columns'),
        window.api.storeGet<{ extensions: string[]; minDuration: number; excludeFolders: string[] }>('scanFilters'),
        window.api.storeGet<string>('apiDownloadDir'),
      ])
      if (savedLibrary) setLibrary(savedLibrary)
      if (savedFolders) setLibraryFolders(savedFolders)
      if (savedPlaylists) setPlaylists(savedPlaylists)
      if (savedPlaylistFolders) setPlaylistFolders(savedPlaylistFolders)
      if (savedPlaylistSort) setPlaylistSort(savedPlaylistSort)
      if (savedTheme) setTheme(savedTheme)
      if (savedCrossfade) setCrossfade(savedCrossfade.enabled, savedCrossfade.duration)
      if (savedOutput !== null) setAudioOutput(savedOutput)
      if (savedAccent) setAccentColor(savedAccent)
      if (savedSpeed) setPlaybackSpeed(savedSpeed)
      if (savedLiked) setLikedTrackIds(savedLiked)
      if (savedProviders) setProviders(savedProviders)
      if (savedAppMode) {
        setAppMode(savedAppMode)
        if (savedAppMode === 'api') setActiveView('api-tracker')
      }
      if (savedViewMode) setViewMode(savedViewMode)
      if (savedSortField && savedSortDir) setSort(savedSortField, savedSortDir)
      if (savedColumns) setColumns(savedColumns)
      if (savedScanFilters) setScanFilters(savedScanFilters)
      if (savedDownloadDir) setApiDownloadDir(savedDownloadDir)
    }
    init()
  }, [])

  return (
    <div className="flex flex-col h-screen bg-surface overflow-hidden">
      <Titlebar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-hidden flex">
          <ErrorBoundary>
            {isBrowserView ? <BrowserView />
              : isLyricsView ? <LyricsView />
              : isPlaylistsView ? <PlaylistsView />
              : isFilesView ? <FileBrowserView />
              : isApiTrackerView ? <ApiTrackerView />
              : isApiRadioView ? <ApiRadioView />
              : isApiFilesView ? <ApiFilesView />
              : isApiCategoriesView ? <ApiCategoryView />
              : <TrackList />}
          </ErrorBoundary>
          {showNowPlaying && <ErrorBoundary><NowPlaying /></ErrorBoundary>}
          {showQueue && <ErrorBoundary><QueuePanel /></ErrorBoundary>}
        </main>
      </div>

      <Player />

      {showMetadataEditor && <MetadataEditor />}
      {showSettings && <Settings />}
    </div>
  )
}
