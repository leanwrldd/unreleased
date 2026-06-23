import { create } from 'zustand'
import { ViewType, SortField, SortDir, Cols, FullTrack } from '../types'
import * as userApi from '../lib/userApi'
import type { AccountUser, PlaylistSummary } from '../lib/userApi'
import { createQueueSlice, QueueSlice } from './queueSlice'

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

// ─── Download item (in-session, Electron only) ────────────────────────────────

export interface DownloadItem {
  id: string
  filename: string
  type: 'file' | 'zip' | 'update'
  state: 'downloading' | 'done' | 'error' | 'cancelled'
  percent: number
  received?: number
  total?: number
  savePath?: string
  error?: string
}

// ─── Non-queue state ──────────────────────────────────────────────────────────

interface AppState {
  // Playback extras (not queue-managed)
  currentTrackFull: FullTrack | null
  volume: number
  playbackSpeed: number

  // UI
  activeView: ViewType
  showNowPlaying: boolean
  showSettings: boolean
  showQueue: boolean
  radioFmActive: boolean
  radioFmIsLive: boolean | null  // null = unknown (not yet checked)
  radioFmNowPlaying: import('../lib/radioLive').RadioTrack | null
  radioFmVote: import('../lib/radioLive').RadioVote | null
  radioFmUpNext: import('../lib/radioLive').RadioTrack | null
  radioFmQueuePreview: string[]
  radioFmMatchedSong: { imageUrl: string | null; lyrics: string | null; syncedLyrics: string | null } | null
  viewMode: 'list' | 'grid'
  theme: 'dark' | 'light'
  searchQuery: string

  // Sort & columns
  sortField: SortField
  sortDir: SortDir
  columns: ColumnConfig

  // Settings
  crossfadeEnabled: boolean
  crossfadeDuration: number
  sleepTimerEnd: number | null
  audioOutput: string
  accentColor: string

  // Liked songs
  likedTrackIds: string[]

  // API tracker extras
  apiTrackerCategory: string
  apiTrackerEra: string
  apiFilesPath: string

  // Account
  account: AccountUser | null
  playlists: PlaylistSummary[]
  showUserAuth: boolean

  // Editor
  pendingEditorSongId: number | null
  pendingEditProposal: { id: number; songId: number; proposedData: Record<string, unknown>; editorNotes: string } | null

  // Downloads (Electron only)
  downloads: DownloadItem[]
  showDownloadManager: boolean
  updateStatus: { type: string; version?: string; percent?: number; bytesPerSecond?: number; message?: string } | null
}

interface AppActions {
  setCurrentTrackFull: (full: FullTrack | null) => void
  setVolume: (vol: number) => void
  setPlaybackSpeed: (speed: number) => void

  setActiveView: (view: ViewType) => void
  setShowNowPlaying: (show: boolean) => void
  setRadioFmActive: (active: boolean) => void
  setRadioFmIsLive: (live: boolean | null) => void
  setRadioFmNowPlaying: (track: import('../lib/radioLive').RadioTrack | null) => void
  setRadioFmVote: (vote: import('../lib/radioLive').RadioVote | null) => void
  setRadioFmUpNext: (track: import('../lib/radioLive').RadioTrack | null) => void
  setRadioFmQueuePreview: (preview: string[]) => void
  setRadioFmMatchedSong: (song: { imageUrl: string | null; lyrics: string | null; syncedLyrics: string | null } | null) => void
  setShowSettings: (show: boolean) => void
  setShowQueue: (show: boolean) => void
  setViewMode: (mode: 'list' | 'grid') => void
  setTheme: (theme: 'dark' | 'light') => void
  setSearchQuery: (q: string) => void

  setSort: (field: SortField, dir: SortDir) => void
  toggleColumn: (col: keyof ColumnConfig) => void
  setColumns: (columns: ColumnConfig) => void

  setCrossfade: (enabled: boolean, duration: number) => void
  setSleepTimer: (endTimestamp: number | null) => void
  setAudioOutput: (deviceId: string) => void
  setAccentColor: (color: string) => void

  setLikedTrackIds: (ids: string[]) => void
  toggleLike: (trackId: string) => void

  setApiTrackerCategory: (cat: string) => void
  setApiTrackerEra: (era: string) => void
  setApiFilesPath: (path: string) => void

  setShowUserAuth: (show: boolean) => void
  loadAccount: () => Promise<void>
  loginWithDiscord: () => Promise<void>
  completeDiscordLogin: (code: string, state: string) => Promise<void>
  logoutAccount: () => Promise<void>
  refreshPlaylists: () => Promise<void>

  setPendingEditorSongId: (id: number | null) => void
  setPendingEditProposal: (p: { id: number; songId: number; proposedData: Record<string, unknown>; editorNotes: string } | null) => void

  addDownload: (item: DownloadItem) => void
  updateDownload: (id: string, updates: Partial<DownloadItem>) => void
  removeDownload: (id: string) => void
  clearCompletedDownloads: () => void
  setShowDownloadManager: (show: boolean) => void
  setUpdateStatus: (status: { type: string; version?: string; percent?: number; bytesPerSecond?: number; message?: string } | null) => void
}

export type AppStore = QueueSlice & AppState & AppActions

// ─── Store ────────────────────────────────────────────────────────────────────

// Dedup flag: prevents concurrent /playlists/ fetches
let _playlistsInFlight = false

export const useStore = create<AppStore>((set, get, store) => ({
  // ── Queue slice (all queue + playback logic) ───────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...createQueueSlice(set, get, store as any),

  // ── Playback extras ───────────────────────────────────────────────────────
  currentTrackFull: null,
  volume: ls.get<number>('volume') ?? 0.8,
  playbackSpeed: ls.get<number>('playbackSpeed') ?? 1,

  setCurrentTrackFull: (currentTrackFull) => set({ currentTrackFull }),
  setVolume: (volume) => { set({ volume }); ls.set('volume', volume) },
  setPlaybackSpeed: (speed) => { set({ playbackSpeed: speed }); ls.set('playbackSpeed', speed) },

  // ── UI ────────────────────────────────────────────────────────────────────
  activeView: 'api-tracker',
  showNowPlaying: false,
  showSettings: false,
  showQueue: false,
  radioFmActive: false,
  radioFmIsLive: null,
  radioFmNowPlaying: null,
  radioFmVote: null,
  radioFmUpNext: null,
  radioFmQueuePreview: [],
  radioFmMatchedSong: null,
  viewMode: ls.get<'list' | 'grid'>('viewMode') ?? 'list',
  theme: ls.get<'dark' | 'light'>('theme') ?? 'dark',
  searchQuery: '',

  setActiveView: (view) => {
    const paths: Partial<Record<ViewType, string>> = {
      'api-categories': '/categories',
      'api-tracker': '/tracker',
      'api-files': '/files',
      'editor': '/editor',
      'admin': '/admin',
      'liked': '/liked',
      'playlists': '/playlists',
      'wrld': '/wrld',
    }
    window.history.pushState({ view }, '', paths[view] ?? '/tracker')
    set({ activeView: view })
  },
  setShowNowPlaying: (showNowPlaying) => set({ showNowPlaying }),
  setRadioFmActive: (radioFmActive) => set({ radioFmActive }),
  setRadioFmIsLive: (radioFmIsLive) => set({ radioFmIsLive }),
  setRadioFmNowPlaying: (radioFmNowPlaying) => set({ radioFmNowPlaying }),
  setRadioFmVote: (radioFmVote) => set({ radioFmVote }),
  setRadioFmUpNext: (radioFmUpNext) => set({ radioFmUpNext }),
  setRadioFmQueuePreview: (radioFmQueuePreview) => set({ radioFmQueuePreview }),
  setRadioFmMatchedSong: (radioFmMatchedSong) => set({ radioFmMatchedSong }),
  setShowSettings: (showSettings) => set({ showSettings }),
  setShowQueue: (showQueue) => set({ showQueue }),
  setViewMode: (viewMode) => { set({ viewMode }); ls.set('viewMode', viewMode) },
  setTheme: (theme) => { set({ theme }); ls.set('theme', theme) },
  setSearchQuery: (searchQuery) => set({ searchQuery }),

  // ── Sort & columns ────────────────────────────────────────────────────────
  sortField: ls.get<SortField>('sortField') ?? 'default',
  sortDir: ls.get<SortDir>('sortDir') ?? 'asc',
  columns: ls.get<ColumnConfig>('columns') ?? {
    art: true, artist: true, album: true, year: false, genre: false, duration: true,
  },

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

  // ── Settings ──────────────────────────────────────────────────────────────
  crossfadeEnabled: ls.get<boolean>('crossfadeEnabled') ?? false,
  crossfadeDuration: ls.get<number>('crossfadeDuration') ?? 5,
  sleepTimerEnd: null,
  audioOutput: ls.get<string>('audioOutput') ?? '',
  accentColor: ls.get<string>('accentColor') ?? '#1db954',

  setCrossfade: (enabled, duration) => {
    set({ crossfadeEnabled: enabled, crossfadeDuration: duration })
    ls.set('crossfadeEnabled', enabled)
    ls.set('crossfadeDuration', duration)
  },
  setSleepTimer: (sleepTimerEnd) => set({ sleepTimerEnd }),
  setAudioOutput: (deviceId) => { set({ audioOutput: deviceId }); ls.set('audioOutput', deviceId) },
  setAccentColor: (color) => { set({ accentColor: color }); ls.set('accentColor', color) },

  // ── Liked songs ───────────────────────────────────────────────────────────
  likedTrackIds: ls.get<string[]>('likedTrackIds') ?? [],

  setLikedTrackIds: (ids) => set({ likedTrackIds: ids }),

  toggleLike: (trackId) => {
    const { likedTrackIds, account } = get()
    const wasLiked = likedTrackIds.includes(trackId)
    const next = wasLiked
      ? likedTrackIds.filter((id) => id !== trackId)
      : [...likedTrackIds, trackId]
    set({ likedTrackIds: next })
    ls.set('likedTrackIds', next)

    if (account) {
      const songId = userApi.trackIdToSongId(trackId)
      if (songId != null) {
        const op = wasLiked ? userApi.removeFavorite(songId) : userApi.addFavorite(songId)
        op.catch(() => {
          const current = get().likedTrackIds
          const reverted = wasLiked
            ? [...current, trackId]
            : current.filter((id) => id !== trackId)
          set({ likedTrackIds: reverted })
          ls.set('likedTrackIds', reverted)
        })
      }
    }
  },

  // ── API tracker extras ────────────────────────────────────────────────────
  apiTrackerCategory: '',
  apiTrackerEra: '',
  apiFilesPath: '',

  setApiTrackerCategory: (cat) => set({ apiTrackerCategory: cat }),
  setApiTrackerEra: (era) => set({ apiTrackerEra: era }),
  setApiFilesPath: (path) => set({ apiFilesPath: path }),

  // ── Account ───────────────────────────────────────────────────────────────
  account: null,
  playlists: [],
  showUserAuth: false,

  setShowUserAuth: (showUserAuth) => set({ showUserAuth }),

  loadAccount: async () => {
    if (!userApi.getToken()) return
    try {
      const account = await userApi.getMe()
      set({ account })
    } catch {
      userApi.clearToken()
      set({ account: null, playlists: [] })
      return
    }
    try {
      const favorites = await userApi.getFavorites()
      const serverIds = favorites.map((f) => `jw-${f.song.id}`)
      const localOnly = get().likedTrackIds.filter((id) => !serverIds.includes(id))
      await Promise.all(
        localOnly
          .map((id) => userApi.trackIdToSongId(id))
          .filter((sid): sid is number => sid != null)
          .map((sid) => userApi.addFavorite(sid).catch(() => undefined)),
      )
      const merged = Array.from(new Set([...serverIds, ...localOnly]))
      set({ likedTrackIds: merged })
      ls.set('likedTrackIds', merged)
    } catch {}
    await get().refreshPlaylists()
  },

  loginWithDiscord: async () => {
    const redirectUri = userApi.discordRedirectUri()
    const { authorize_url } = await userApi.getDiscordAuthUrl(redirectUri)
    window.location.href = authorize_url
  },

  completeDiscordLogin: async (code, state) => {
    const redirectUri = userApi.discordRedirectUri()
    const { token, user } = await userApi.exchangeDiscord(code, state, redirectUri)
    userApi.setToken(token)
    set({ account: user })
    await get().loadAccount()
  },

  logoutAccount: async () => {
    await userApi.logout()
    const localLikes = ls.get<string[]>('likedTrackIds') ?? []
    set({ account: null, playlists: [], likedTrackIds: localLikes })
  },

  refreshPlaylists: async () => {
    if (!get().account) return
    if (_playlistsInFlight) return
    _playlistsInFlight = true
    try {
      const playlists = await userApi.getPlaylists()
      set({ playlists })
    } catch {}
    finally { _playlistsInFlight = false }
  },

  // ── Editor ────────────────────────────────────────────────────────────────
  pendingEditorSongId: null,
  pendingEditProposal: null,
  setPendingEditorSongId: (pendingEditorSongId) => set({ pendingEditorSongId }),
  setPendingEditProposal: (pendingEditProposal) => set({ pendingEditProposal }),

  // ── Downloads ─────────────────────────────────────────────────────────────
  downloads: [],
  showDownloadManager: false,
  updateStatus: null,

  addDownload: (item) => set((s) => ({ downloads: [item, ...s.downloads] })),
  updateDownload: (id, updates) => set((s) => ({
    downloads: s.downloads.map((d) => d.id === id ? { ...d, ...updates } : d),
  })),
  removeDownload: (id) => set((s) => ({ downloads: s.downloads.filter((d) => d.id !== id) })),
  clearCompletedDownloads: () => set((s) => ({
    downloads: s.downloads.filter((d) => d.state === 'downloading'),
  })),
  setShowDownloadManager: (show) => set({ showDownloadManager: show }),
  setUpdateStatus: (updateStatus) => set({ updateStatus }),
}))
