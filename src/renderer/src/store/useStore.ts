import { create } from 'zustand'
import { Track, FullTrack, Playlist, PlaylistFolder, ViewType, SortField, SortDir, Cols } from '../types'

type ColumnConfig = Cols

interface BrowseFilter {
  type: 'artist' | 'album' | 'genre'
  name: string
}

export interface ScanFilters {
  extensions: string[]
  minDuration: number
  excludeFolders: string[]
}

interface StoreActions {
  // Library
  setLibrary: (tracks: Track[]) => void
  setLibraryFolders: (folders: string[]) => void
  addLibraryFolder: (folder: string) => void
  removeLibraryFolder: (folder: string) => void
  addTracks: (tracks: Track[]) => void

  // Playback
  setQueue: (tracks: Track[], startIndex?: number) => void
  playTrack: (track: Track, context?: Track[]) => void
  setCurrentTrackFull: (full: FullTrack | null) => void
  setIsPlaying: (playing: boolean) => void
  setVolume: (vol: number) => void
  setProgress: (progress: number) => void
  setCurrentTime: (time: number) => void
  toggleShuffle: () => void
  toggleRepeat: () => void
  nextTrack: () => Track | null
  prevTrack: () => Track | null

  // UI
  setActiveView: (view: ViewType) => void
  setActivePlaylistId: (id: string | null) => void
  setShowNowPlaying: (show: boolean) => void
  setShowMetadataEditor: (show: boolean) => void
  setShowSettings: (show: boolean) => void
  setViewMode: (mode: 'list' | 'grid') => void
  setTheme: (theme: 'dark' | 'light') => void
  setSearchQuery: (q: string) => void

  // Sort & columns
  setSort: (field: SortField, dir: SortDir) => void
  toggleColumn: (col: keyof ColumnConfig) => void
  setColumns: (columns: ColumnConfig) => void

  // Browse navigation
  setBrowseFilter: (f: BrowseFilter | null) => void

  // Playlists
  setPlaylists: (playlists: Playlist[]) => void
  createPlaylist: (name: string, folderId?: string) => void
  deletePlaylist: (id: string) => void
  renamePlaylist: (id: string, name: string) => void
  addToPlaylist: (playlistId: string, trackId: string) => void
  addTracksToPlaylist: (playlistId: string, trackIds: string[]) => void
  removeFromPlaylist: (playlistId: string, trackId: string) => void
  resetPlaylists: () => void
  togglePlaylistPin: (id: string) => void
  movePlaylistToFolder: (playlistId: string, folderId: string | null) => void
  setPlaylistSort: (sort: 'name' | 'date' | 'manual') => void
  addPlaylistToQueue: (playlistId: string) => void

  // Playlist folders
  setPlaylistFolders: (folders: PlaylistFolder[]) => void
  createPlaylistFolder: (name: string, parentId?: string) => void
  deletePlaylistFolder: (id: string) => void
  renamePlaylistFolder: (id: string, name: string) => void
  movePlaylistFolder: (folderId: string, newParentId: string | null) => void

  // Playback speed
  setPlaybackSpeed: (speed: number) => void

  // Liked songs
  setLikedTrackIds: (ids: string[]) => void
  toggleLike: (trackId: string) => void

  // Providers
  setProviders: (providers: string[]) => void
  addProvider: (url: string) => void
  removeProvider: (url: string) => void

  // App mode
  setAppMode: (mode: 'local' | 'api') => void

  // API extras
  setApiTrackerCategory: (cat: string) => void
  setApiTrackerEra: (era: string) => void
  setApiDownloadDir: (dir: string) => void

  // Metadata editor
  setMetadataEditTrack: (track: Track | null) => void

  // Metadata update
  updateTrackInLibrary: (trackId: string, updates: Partial<Track>) => void

  // Queue management
  setShowQueue: (show: boolean) => void
  addToQueue: (track: Track) => void
  playNext: (track: Track) => void
  removeFromQueue: (index: number) => void
  clearQueue: () => void
  reorderQueue: (fromIdx: number, toIdx: number) => void

  // Crossfade
  setCrossfade: (enabled: boolean, duration: number) => void

  // Sleep timer
  setSleepTimer: (endTimestamp: number | null) => void

  // Scan filters
  setScanFilters: (filters: ScanFilters) => void

  // Audio output
  setAudioOutput: (deviceId: string) => void

  // Accent color
  setAccentColor: (color: string) => void
}


interface AppStore {
  library: Track[]
  libraryFolders: string[]
  queue: Track[]
  queueIndex: number
  currentTrack: Track | null
  currentTrackFull: FullTrack | null
  isPlaying: boolean
  volume: number
  progress: number
  currentTime: number
  shuffle: boolean
  repeat: 'none' | 'all' | 'one'
  activeView: ViewType
  activePlaylistId: string | null
  showNowPlaying: boolean
  showMetadataEditor: boolean
  metadataEditTrack: Track | null
  showSettings: boolean
  viewMode: 'list' | 'grid'
  theme: 'dark' | 'light'
  playlists: Playlist[]
  searchQuery: string
  sortField: SortField
  sortDir: SortDir
  columns: ColumnConfig
  browseFilter: BrowseFilter | null
  showQueue: boolean
  crossfadeEnabled: boolean
  crossfadeDuration: number
  sleepTimerEnd: number | null
  scanFilters: ScanFilters
  audioOutput: string
  accentColor: string
  playlistFolders: PlaylistFolder[]
  playlistSort: 'name' | 'date' | 'manual'
  playbackSpeed: number
  likedTrackIds: string[]
  providers: string[]
  appMode: 'local' | 'api'
  apiTrackerCategory: string
  apiTrackerEra: string
  apiDownloadDir: string
}

export const useStore = create<AppStore & StoreActions>((set, get) => ({
  // ─── Initial state ───────────────────────────────────────────────────────────
  library: [],
  libraryFolders: [],
  queue: [],
  queueIndex: -1,
  currentTrack: null,
  currentTrackFull: null,
  isPlaying: false,
  volume: 0.8,
  progress: 0,
  currentTime: 0,
  shuffle: false,
  repeat: 'none',
  activeView: 'library',
  activePlaylistId: null,
  showNowPlaying: false,
  showMetadataEditor: false,
  metadataEditTrack: null,
  showSettings: false,
  viewMode: 'list',
  theme: 'dark',
  playlists: [],
  searchQuery: '',
  sortField: 'default',
  sortDir: 'asc',
  columns: {
    art: true,
    artist: true,
    album: true,
    year: false,
    genre: false,
    duration: true
  },
  browseFilter: null,
  showQueue: false,
  crossfadeEnabled: false,
  crossfadeDuration: 5,
  sleepTimerEnd: null,
  scanFilters: {
    extensions: ['.mp3', '.flac', '.wav', '.m4a', '.ogg', '.aac', '.opus'],
    minDuration: 0,
    excludeFolders: []
  },
  audioOutput: '',
  accentColor: '#1db954',
  playlistFolders: [],
  playlistSort: 'manual',
  playbackSpeed: 1,
  likedTrackIds: [],
  providers: [],
  appMode: 'local',
  apiTrackerCategory: '',
  apiTrackerEra: '',
  apiDownloadDir: '',

  // ─── Library ─────────────────────────────────────────────────────────────────
  setLibrary: (tracks) => set({ library: tracks }),
  setLibraryFolders: (folders) => set({ libraryFolders: folders }),
  addLibraryFolder: (folder) =>
    set((s) => ({
      libraryFolders: s.libraryFolders.includes(folder)
        ? s.libraryFolders
        : [...s.libraryFolders, folder]
    })),
  removeLibraryFolder: (folder) =>
    set((s) => ({ libraryFolders: s.libraryFolders.filter((f) => f !== folder) })),
  addTracks: (tracks) =>
    set((s) => {
      const existingIds = new Set(s.library.map((t) => t.id))
      const newTracks = tracks.filter((t) => !existingIds.has(t.id))
      return { library: [...s.library, ...newTracks] }
    }),

  // ─── Playback ────────────────────────────────────────────────────────────────
  setQueue: (tracks, startIndex = 0) =>
    set({ queue: tracks, queueIndex: startIndex, currentTrack: tracks[startIndex] || null }),

  playTrack: (track, context) => {
    const s = get()
    const tracks = context || s.library
    const idx = tracks.findIndex((t) => t.id === track.id)
    set({
      queue: tracks,
      queueIndex: idx >= 0 ? idx : 0,
      currentTrack: track,
      isPlaying: true,
      currentTrackFull: null
    })
  },

  setCurrentTrackFull: (full) => set({ currentTrackFull: full }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setVolume: (volume) => set({ volume }),
  setProgress: (progress) => set({ progress }),
  setCurrentTime: (currentTime) => set({ currentTime }),

  toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),
  toggleRepeat: () =>
    set((s) => {
      const order: Array<'none' | 'all' | 'one'> = ['none', 'all', 'one']
      return { repeat: order[(order.indexOf(s.repeat) + 1) % 3] }
    }),

  nextTrack: () => {
    const { queue, queueIndex, shuffle, repeat } = get()
    if (queue.length === 0) return null

    let nextIdx: number
    if (shuffle) {
      // Never pick the same song when there are alternatives
      if (queue.length > 1) {
        let r: number
        do { r = Math.floor(Math.random() * queue.length) } while (r === queueIndex)
        nextIdx = r
      } else {
        nextIdx = 0
      }
    } else if (repeat === 'one') {
      nextIdx = queueIndex
    } else {
      nextIdx = (queueIndex + 1) % queue.length
      if (nextIdx === 0 && repeat === 'none') {
        set({ isPlaying: false })
        return null
      }
    }

    const track = queue[nextIdx]
    set({ queueIndex: nextIdx, currentTrack: track, currentTrackFull: null, isPlaying: true })
    return track
  },

  prevTrack: () => {
    const { queue, queueIndex, currentTime } = get()
    if (queue.length === 0) return null

    if (currentTime > 3) {
      set({ currentTime: 0, progress: 0 })
      return get().currentTrack
    }

    const prevIdx = (queueIndex - 1 + queue.length) % queue.length
    const track = queue[prevIdx]
    set({ queueIndex: prevIdx, currentTrack: track, currentTrackFull: null, isPlaying: true })
    return track
  },

  // ─── UI ──────────────────────────────────────────────────────────────────────
  setActiveView: (activeView) => set({ activeView }),
  setActivePlaylistId: (activePlaylistId) => set({ activePlaylistId }),
  setShowNowPlaying: (showNowPlaying) => set({ showNowPlaying }),
  setShowMetadataEditor: (showMetadataEditor) => set({ showMetadataEditor }),
  setMetadataEditTrack: (track) => set({ metadataEditTrack: track }),
  setShowSettings: (showSettings) => set({ showSettings }),
  setViewMode: (viewMode) => {
    set({ viewMode })
    window.api.storeSet('viewMode', viewMode)
  },
  setTheme: (theme) => {
    set({ theme })
    window.api.storeSet('theme', theme)
    try { localStorage.setItem('wavelength-theme', theme) } catch (_) {}
  },
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setShowQueue: (showQueue) => set({ showQueue }),

  // ─── Sort & columns ───────────────────────────────────────────────────────────
  setSort: (sortField, sortDir) => {
    set({ sortField, sortDir })
    window.api.storeSet('sortField', sortField)
    window.api.storeSet('sortDir', sortDir)
  },
  toggleColumn: (col) => {
    set((s) => ({ columns: { ...s.columns, [col]: !s.columns[col] } }))
    window.api.storeSet('columns', get().columns)
  },
  setColumns: (columns) => {
    set({ columns })
  },

  // ─── Browse navigation ────────────────────────────────────────────────────────
  setBrowseFilter: (browseFilter) => set({ browseFilter }),

  // ─── Playlists ───────────────────────────────────────────────────────────────
  setPlaylists: (playlists) => set({ playlists }),

  createPlaylist: (name, folderId?) => {
    const playlist: Playlist = {
      id: `pl_${Date.now()}`,
      name,
      trackIds: [],
      createdAt: Date.now(),
      ...(folderId ? { folderId } : {})
    }
    set((s) => ({ playlists: [...s.playlists, playlist] }))
    window.api.storeSet('playlists', [...get().playlists])
  },

  deletePlaylist: (id) => {
    set((s) => ({ playlists: s.playlists.filter((p) => p.id !== id) }))
    window.api.storeSet('playlists', get().playlists)
  },

  renamePlaylist: (id, name) => {
    set((s) => ({
      playlists: s.playlists.map((p) => (p.id === id ? { ...p, name } : p))
    }))
    window.api.storeSet('playlists', get().playlists)
  },

  addToPlaylist: (playlistId, trackId) => {
    set((s) => ({
      playlists: s.playlists.map((p) =>
        p.id === playlistId && !p.trackIds.includes(trackId)
          ? { ...p, trackIds: [...p.trackIds, trackId] }
          : p
      )
    }))
    window.api.storeSet('playlists', get().playlists)
  },

  addTracksToPlaylist: (playlistId, trackIds) => {
    set((s) => ({
      playlists: s.playlists.map((p) =>
        p.id === playlistId
          ? { ...p, trackIds: [...new Set([...p.trackIds, ...trackIds])] }
          : p
      )
    }))
    window.api.storeSet('playlists', get().playlists)
  },

  removeFromPlaylist: (playlistId, trackId) => {
    set((s) => ({
      playlists: s.playlists.map((p) =>
        p.id === playlistId
          ? { ...p, trackIds: p.trackIds.filter((id) => id !== trackId) }
          : p
      )
    }))
    window.api.storeSet('playlists', get().playlists)
  },

  resetPlaylists: () => {
    set({ playlists: [], activePlaylistId: null, activeView: 'library' })
    window.api.storeSet('playlists', [])
  },

  togglePlaylistPin: (id) => {
    set((s) => ({
      playlists: s.playlists.map((p) => p.id === id ? { ...p, pinned: !p.pinned } : p)
    }))
    window.api.storeSet('playlists', get().playlists)
  },

  movePlaylistToFolder: (playlistId, folderId) => {
    set((s) => ({
      playlists: s.playlists.map((p) =>
        p.id === playlistId
          ? { ...p, folderId: folderId ?? undefined }
          : p
      )
    }))
    window.api.storeSet('playlists', get().playlists)
  },

  setPlaylistSort: (sort) => {
    set({ playlistSort: sort })
    window.api.storeSet('playlistSort', sort)
  },

  addPlaylistToQueue: (playlistId) => {
    const { playlists, library } = get()
    const pl = playlists.find((p) => p.id === playlistId)
    if (!pl) return
    const tracks = pl.trackIds.map((id) => library.find((t) => t.id === id)).filter(Boolean) as Track[]
    set((s) => ({ queue: [...s.queue, ...tracks] }))
  },

  // ─── Playlist folders ─────────────────────────────────────────────────────────
  setPlaylistFolders: (folders) => set({ playlistFolders: folders }),

  createPlaylistFolder: (name, parentId?) => {
    const folder: PlaylistFolder = { id: `pf_${Date.now()}`, name, createdAt: Date.now(), ...(parentId ? { parentId } : {}) }
    set((s) => ({ playlistFolders: [...s.playlistFolders, folder] }))
    window.api.storeSet('playlistFolders', get().playlistFolders)
  },

  deletePlaylistFolder: (id) => {
    // Move playlists in this folder to ungrouped; orphan child folders to root
    set((s) => ({
      playlistFolders: s.playlistFolders
        .filter((f) => f.id !== id)
        .map((f) => f.parentId === id ? { ...f, parentId: undefined } : f),
      playlists: s.playlists.map((p) => p.folderId === id ? { ...p, folderId: undefined } : p)
    }))
    window.api.storeSet('playlistFolders', get().playlistFolders)
    window.api.storeSet('playlists', get().playlists)
  },

  movePlaylistFolder: (folderId, newParentId) => {
    set((s) => ({
      playlistFolders: s.playlistFolders.map((f) =>
        f.id === folderId ? { ...f, parentId: newParentId ?? undefined } : f
      )
    }))
    window.api.storeSet('playlistFolders', get().playlistFolders)
  },

  renamePlaylistFolder: (id, name) => {
    set((s) => ({
      playlistFolders: s.playlistFolders.map((f) => f.id === id ? { ...f, name } : f)
    }))
    window.api.storeSet('playlistFolders', get().playlistFolders)
  },

  // ─── Queue management ─────────────────────────────────────────────────────────
  addToQueue: (track) => {
    set((s) => ({ queue: [...s.queue, track] }))
  },

  playNext: (track) => {
    set((s) => {
      const after = s.queueIndex + 1
      const next = [...s.queue.slice(0, after), track, ...s.queue.slice(after)]
      return { queue: next }
    })
  },

  removeFromQueue: (index) => {
    set((s) => {
      const next = s.queue.filter((_, i) => i !== index)
      const newIndex = index <= s.queueIndex ? Math.max(0, s.queueIndex - 1) : s.queueIndex
      return { queue: next, queueIndex: newIndex }
    })
  },

  clearQueue: () => {
    set((s) => {
      const current = s.currentTrack ? [s.currentTrack] : []
      return { queue: current, queueIndex: 0 }
    })
  },

  reorderQueue: (fromIdx, toIdx) => {
    set((s) => {
      // fromIdx/toIdx are relative to the upcoming slice (after queueIndex)
      const base = s.queueIndex + 1
      const upcoming = [...s.queue.slice(base)]
      const [moved] = upcoming.splice(fromIdx, 1)
      upcoming.splice(toIdx, 0, moved)
      return { queue: [...s.queue.slice(0, base), ...upcoming] }
    })
  },

  updateTrackInLibrary: (trackId, updates) => {
    set((s) => ({
      library: s.library.map((t) => (t.id === trackId ? { ...t, ...updates } : t)),
      currentTrack:
        s.currentTrack?.id === trackId ? { ...s.currentTrack, ...updates } : s.currentTrack
    }))
  },

  setCrossfade: (enabled, duration) => {
    set({ crossfadeEnabled: enabled, crossfadeDuration: duration })
    window.api.storeSet('crossfade', { enabled, duration })
  },
  setSleepTimer: (endTimestamp) => set({ sleepTimerEnd: endTimestamp }),
  setScanFilters: (filters) => {
    set({ scanFilters: filters })
    window.api.storeSet('scanFilters', filters)
  },
  setAudioOutput: (deviceId) => {
    set({ audioOutput: deviceId })
    window.api.storeSet('audioOutput', deviceId)
  },
  setAccentColor: (color) => {
    set({ accentColor: color })
    window.api.storeSet('accentColor', color)
  },

  setPlaybackSpeed: (speed) => {
    set({ playbackSpeed: speed })
    window.api.storeSet('playbackSpeed', speed)
  },

  setLikedTrackIds: (ids) => set({ likedTrackIds: ids }),

  toggleLike: (trackId) => {
    const { likedTrackIds } = get()
    const next = likedTrackIds.includes(trackId)
      ? likedTrackIds.filter((id) => id !== trackId)
      : [...likedTrackIds, trackId]
    set({ likedTrackIds: next })
    window.api.storeSet('likedTrackIds', next)
  },

  // ─── Providers ───────────────────────────────────────────────────────────────
  setProviders: (providers) => set({ providers }),
  addProvider: (url) => {
    const { providers } = get()
    if (!url.trim() || providers.includes(url.trim())) return
    const next = [...providers, url.trim()]
    set({ providers: next })
    window.api.storeSet('providers', next)
  },
  removeProvider: (url) => {
    const { providers } = get()
    const next = providers.filter((p) => p !== url)
    set({ providers: next })
    window.api.storeSet('providers', next)
  },

  // ─── App mode ────────────────────────────────────────────────────────────────
  setAppMode: (mode) => {
    set({ appMode: mode })
    window.api.storeSet('appMode', mode)
  },

  // ─── API extras ──────────────────────────────────────────────────────────────
  setApiTrackerCategory: (cat) => set({ apiTrackerCategory: cat }),
  setApiTrackerEra: (era) => set({ apiTrackerEra: era }),
  setApiDownloadDir: (dir) => {
    set({ apiDownloadDir: dir })
    window.api.storeSet('apiDownloadDir', dir)
  },
}))
