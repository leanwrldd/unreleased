import { create } from 'zustand'
import { Track, FullTrack, ViewType, SortField, SortDir, Cols } from '../types'

type ColumnConfig = Cols

// Lightweight localStorage persistence helper
const ls = {
  get: <T>(key: string): T | null => {
    try {
      const v = localStorage.getItem(`unreleased:${key}`)
      return v ? (JSON.parse(v) as T) : null
    } catch {
      return null
    }
  },
  set: <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(`unreleased:${key}`, JSON.stringify(value))
    } catch {}
  },
}

interface StoreActions {
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
  setShowNowPlaying: (show: boolean) => void
  setShowSettings: (show: boolean) => void
  setViewMode: (mode: 'list' | 'grid') => void
  setTheme: (theme: 'dark' | 'light') => void
  setSearchQuery: (q: string) => void

  // Sort & columns
  setSort: (field: SortField, dir: SortDir) => void
  toggleColumn: (col: keyof ColumnConfig) => void
  setColumns: (columns: ColumnConfig) => void

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

  // Audio output
  setAudioOutput: (deviceId: string) => void

  // Accent color
  setAccentColor: (color: string) => void

  // Playback speed
  setPlaybackSpeed: (speed: number) => void

  // Liked songs
  setLikedTrackIds: (ids: string[]) => void
  toggleLike: (trackId: string) => void

  // API extras
  setApiTrackerCategory: (cat: string) => void
  setApiTrackerEra: (era: string) => void
}

interface AppStore {
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
  showNowPlaying: boolean
  showSettings: boolean
  viewMode: 'list' | 'grid'
  theme: 'dark' | 'light'
  searchQuery: string
  sortField: SortField
  sortDir: SortDir
  columns: ColumnConfig
  showQueue: boolean
  crossfadeEnabled: boolean
  crossfadeDuration: number
  sleepTimerEnd: number | null
  audioOutput: string
  accentColor: string
  playbackSpeed: number
  likedTrackIds: string[]
  apiTrackerCategory: string
  apiTrackerEra: string
}

export const useStore = create<AppStore & StoreActions>((set, get) => ({
  // ─── Initial state ───────────────────────────────────────────────────────────
  queue: [],
  queueIndex: -1,
  currentTrack: null,
  currentTrackFull: null,
  isPlaying: false,
  volume: ls.get<number>('volume') ?? 0.8,
  progress: 0,
  currentTime: 0,
  shuffle: false,
  repeat: 'none',
  activeView: 'api-tracker',
  showNowPlaying: false,
  showSettings: false,
  viewMode: ls.get<'list' | 'grid'>('viewMode') ?? 'list',
  theme: ls.get<'dark' | 'light'>('theme') ?? 'dark',
  searchQuery: '',
  sortField: ls.get<SortField>('sortField') ?? 'default',
  sortDir: ls.get<SortDir>('sortDir') ?? 'asc',
  columns: ls.get<ColumnConfig>('columns') ?? {
    art: true,
    artist: true,
    album: true,
    year: false,
    genre: false,
    duration: true,
  },
  showQueue: false,
  crossfadeEnabled: ls.get<boolean>('crossfadeEnabled') ?? false,
  crossfadeDuration: ls.get<number>('crossfadeDuration') ?? 5,
  sleepTimerEnd: null,
  audioOutput: ls.get<string>('audioOutput') ?? '',
  accentColor: ls.get<string>('accentColor') ?? '#1db954',
  playbackSpeed: ls.get<number>('playbackSpeed') ?? 1,
  likedTrackIds: ls.get<string[]>('likedTrackIds') ?? [],
  apiTrackerCategory: '',
  apiTrackerEra: '',

  // ─── Playback ────────────────────────────────────────────────────────────────
  setQueue: (tracks, startIndex = 0) =>
    set({ queue: tracks, queueIndex: startIndex, currentTrack: tracks[startIndex] || null }),

  playTrack: (track, context) => {
    const s = get()
    const tracks = context || s.queue
    const idx = tracks.findIndex((t) => t.id === track.id)
    set({
      queue: tracks,
      queueIndex: idx >= 0 ? idx : 0,
      currentTrack: track,
      isPlaying: true,
      currentTrackFull: null,
    })
  },

  setCurrentTrackFull: (full) => set({ currentTrackFull: full }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setVolume: (volume) => { set({ volume }); ls.set('volume', volume) },
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
  setShowNowPlaying: (showNowPlaying) => set({ showNowPlaying }),
  setShowSettings: (showSettings) => set({ showSettings }),
  setViewMode: (viewMode) => { set({ viewMode }); ls.set('viewMode', viewMode) },
  setTheme: (theme) => {
    set({ theme })
    ls.set('theme', theme)
    try { localStorage.setItem('wavelength-theme', theme) } catch (_) {}
  },
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setShowQueue: (showQueue) => set({ showQueue }),

  // ─── Sort & columns ───────────────────────────────────────────────────────────
  setSort: (sortField, sortDir) => {
    set({ sortField, sortDir })
    ls.set('sortField', sortField)
    ls.set('sortDir', sortDir)
  },
  toggleColumn: (col) => {
    set((s) => ({ columns: { ...s.columns, [col]: !s.columns[col] } }))
    ls.set('columns', get().columns)
  },
  setColumns: (columns) => set({ columns }),

  // ─── Queue management ─────────────────────────────────────────────────────────
  addToQueue: (track) => set((s) => ({ queue: [...s.queue, track] })),
  playNext: (track) =>
    set((s) => {
      const after = s.queueIndex + 1
      const next = [...s.queue.slice(0, after), track, ...s.queue.slice(after)]
      return { queue: next }
    }),
  removeFromQueue: (index) =>
    set((s) => {
      const next = s.queue.filter((_, i) => i !== index)
      const newIndex = index <= s.queueIndex ? Math.max(0, s.queueIndex - 1) : s.queueIndex
      return { queue: next, queueIndex: newIndex }
    }),
  clearQueue: () =>
    set((s) => {
      const current = s.currentTrack ? [s.currentTrack] : []
      return { queue: current, queueIndex: 0 }
    }),
  reorderQueue: (fromIdx, toIdx) =>
    set((s) => {
      const base = s.queueIndex + 1
      const upcoming = [...s.queue.slice(base)]
      const [moved] = upcoming.splice(fromIdx, 1)
      upcoming.splice(toIdx, 0, moved)
      return { queue: [...s.queue.slice(0, base), ...upcoming] }
    }),

  // ─── Settings ────────────────────────────────────────────────────────────────
  setCrossfade: (enabled, duration) => {
    set({ crossfadeEnabled: enabled, crossfadeDuration: duration })
    ls.set('crossfadeEnabled', enabled)
    ls.set('crossfadeDuration', duration)
  },
  setSleepTimer: (endTimestamp) => set({ sleepTimerEnd: endTimestamp }),
  setAudioOutput: (deviceId) => { set({ audioOutput: deviceId }); ls.set('audioOutput', deviceId) },
  setAccentColor: (color) => { set({ accentColor: color }); ls.set('accentColor', color) },
  setPlaybackSpeed: (speed) => { set({ playbackSpeed: speed }); ls.set('playbackSpeed', speed) },

  setLikedTrackIds: (ids) => set({ likedTrackIds: ids }),
  toggleLike: (trackId) => {
    const { likedTrackIds } = get()
    const next = likedTrackIds.includes(trackId)
      ? likedTrackIds.filter((id) => id !== trackId)
      : [...likedTrackIds, trackId]
    set({ likedTrackIds: next })
    ls.set('likedTrackIds', next)
  },

  // ─── API extras ──────────────────────────────────────────────────────────────
  setApiTrackerCategory: (cat) => set({ apiTrackerCategory: cat }),
  setApiTrackerEra: (era) => set({ apiTrackerEra: era }),
}))
