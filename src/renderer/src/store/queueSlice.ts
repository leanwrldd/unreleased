/**
 * queueSlice.ts — all queue and playback logic in one place.
 *
 * Responsibilities:
 *  - Queue state (tracks, index, shuffle, repeat)
 *  - Playback state (currentTrack, isPlaying, progress, currentTime)
 *  - Lazy loading (background page fetching, triggered by nextTrack)
 *  - Shuffle with random insertion so newly fetched tracks land at random
 *    positions in the upcoming list instead of piling up at the end
 *  - Radio mode: when shuffle is active from the Tracker, uses /radio/random/
 *    instead of a pre-built queue. Queue stays empty (only history is kept).
 */

import type { StateCreator } from 'zustand'
import type { Track } from '../types'
import { apiFetch, songToTrack } from '../lib/juicewrldApi'
import type { JWApiPaginatedResponse, JWApiSong } from '../lib/juicewrldApi'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QueueFilter {
  /** Empty string = no filter (full catalog). */
  category: string
  era: string
  search: string
  /** Next page number to fetch. */
  page: number
  hasMore: boolean
  total: number
}

interface RadioResponse {
  title: string
  path: string
  song: JWApiSong
  size: number
  hash: string
}

export interface QueueSlice {
  // Playback
  queue: Track[]
  queueIndex: number
  currentTrack: Track | null
  isPlaying: boolean
  progress: number
  currentTime: number
  shuffle: boolean
  repeat: 'none' | 'all' | 'one'

  // Lazy loading (non-radio mode)
  queueFilter: QueueFilter | null
  /** True while a background page fetch is in flight. */
  queueLoadingMore: boolean

  /**
   * Radio mode: enabled when the user clicks a track from the Tracker with
   * shuffle on. Uses /radio/random/ to fetch each next song — no pre-built
   * queue. History of played tracks is kept in `queue` (capped at 30).
   */
  radioMode: boolean
  /** Pre-fetched next radio track, null while the fetch is in flight. */
  radioNext: Track | null
  /** True when nextTrack() was called but radioNext wasn't ready yet. */
  _radioWaiting: boolean

  // ── Actions ──────────────────────────────────────────────────────────────

  /**
   * Start playing `track` with a known context list.
   * `filter` enables lazy loading beyond the initial context.
   * Does NOT activate radio mode — use `startRadio` for that.
   */
  playTrack: (track: Track, context?: Track[], filter?: QueueFilter | null) => void

  /**
   * Start radio mode. The queue is seeded with `track` only;
   * subsequent songs come from /radio/random/ one at a time.
   */
  startRadio: (track: Track) => void

  /** Advance to the next track. Returns the track, or null if playback stops. */
  nextTrack: () => Track | null

  /** Go back one track (or restart if >3 s in). */
  prevTrack: () => Track | null

  toggleShuffle: () => void
  toggleRepeat: () => void

  setIsPlaying: (playing: boolean) => void
  setProgress: (progress: number) => void
  setCurrentTime: (time: number) => void

  // Queue editing
  addToQueue: (track: Track) => void
  playNext: (track: Track) => void
  removeFromQueue: (absoluteIndex: number) => void
  clearQueue: () => void
  reorderQueue: (fromIdx: number, toIdx: number) => void

  // Internal
  _loadMore: () => void
  _prefetchRadioTrack: () => void
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Fisher-Yates shuffle — returns a new array, does not mutate. */
export function fisherYates<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Insert `items` at uniformly-random positions within `base`.
 * Returns a new array; does not mutate inputs.
 */
function insertRandom<T>(base: T[], items: T[]): T[] {
  const result = [...base]
  for (const item of items) {
    result.splice(Math.floor(Math.random() * (result.length + 1)), 0, item)
  }
  return result
}

const RADIO_HISTORY_LIMIT = 30

// ─── Slice factory ────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createQueueSlice: StateCreator<any, [], [], QueueSlice> = (set, get) => ({
  // ── Initial state ──────────────────────────────────────────────────────────
  queue: [],
  queueIndex: -1,
  currentTrack: null,
  isPlaying: false,
  progress: 0,
  currentTime: 0,
  shuffle: false,
  repeat: 'none',
  queueFilter: null,
  queueLoadingMore: false,
  radioMode: false,
  radioNext: null,
  _radioWaiting: false,

  // ── Simple setters ─────────────────────────────────────────────────────────
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setProgress: (progress) => set({ progress }),
  setCurrentTime: (currentTime) => set({ currentTime }),

  // ── playTrack ──────────────────────────────────────────────────────────────
  playTrack: (track, context?, filter = null) => {
    const tracks: Track[] = context ?? (get().queue as Track[])
    const idx = tracks.findIndex((t: Track) => t.id === track.id)
    set({
      queue: tracks,
      queueIndex: idx >= 0 ? idx : 0,
      currentTrack: track,
      currentTrackFull: null,
      isPlaying: true,
      queueFilter: filter,
      radioMode: false,
      radioNext: null,
      _radioWaiting: false,
      progress: 0,
      currentTime: 0,
    })
    if (filter?.hasMore) get()._loadMore()
  },

  // ── startRadio ─────────────────────────────────────────────────────────────
  startRadio: (track) => {
    set({
      queue: [track],
      queueIndex: 0,
      currentTrack: track,
      currentTrackFull: null,
      isPlaying: true,
      queueFilter: null,
      queueLoadingMore: false,
      radioMode: true,
      radioNext: null,
      _radioWaiting: false,
      progress: 0,
      currentTime: 0,
    })
    get()._prefetchRadioTrack()
  },

  // ── nextTrack ──────────────────────────────────────────────────────────────
  nextTrack: () => {
    const { queue, queueIndex, shuffle, repeat, radioMode, radioNext } = get()

    // ── Radio mode ──────────────────────────────────────────────────────────
    if (radioMode) {
      if (!radioNext) {
        // Pre-fetch not ready yet — mark as waiting; _prefetchRadioTrack will
        // auto-play when the fetch completes.
        set({ isPlaying: false, _radioWaiting: true })
        return null
      }
      // Advance to the pre-fetched track (roll history, cap at limit)
      const newQueue = [...queue.slice(-(RADIO_HISTORY_LIMIT - 1)), radioNext]
      set({
        queue: newQueue,
        queueIndex: newQueue.length - 1,
        currentTrack: radioNext,
        currentTrackFull: null,
        isPlaying: true,
        radioNext: null,
        _radioWaiting: false,
        progress: 0,
        currentTime: 0,
      })
      get()._prefetchRadioTrack()
      return radioNext
    }

    if (queue.length === 0) return null

    // ── Standard queue ──────────────────────────────────────────────────────
    let nextIdx: number

    if (repeat === 'one') {
      nextIdx = queueIndex
    } else if (shuffle) {
      const upcomingCount = queue.length - queueIndex - 1
      if (upcomingCount > 0) {
        nextIdx = queueIndex + 1 + Math.floor(Math.random() * upcomingCount)
      } else if (repeat === 'all') {
        const reshuffled = fisherYates(queue)
        const first = reshuffled[0]
        set({ queue: reshuffled, queueIndex: 0, currentTrack: first, currentTrackFull: null, isPlaying: true, progress: 0, currentTime: 0 })
        get()._loadMore()
        return first
      } else {
        set({ isPlaying: false })
        return null
      }
    } else {
      nextIdx = queueIndex + 1
      if (nextIdx >= queue.length) {
        if (repeat === 'all') nextIdx = 0
        else { set({ isPlaying: false }); return null }
      }
    }

    const track = queue[nextIdx]
    set({ queueIndex: nextIdx, currentTrack: track, currentTrackFull: null, isPlaying: true, progress: 0, currentTime: 0 })
    get()._loadMore()
    return track
  },

  // ── prevTrack ──────────────────────────────────────────────────────────────
  prevTrack: () => {
    const { queue, queueIndex, currentTime, radioMode } = get()
    if (queue.length === 0) return null

    // In radio mode, only allow restarting the current track
    if (radioMode) {
      set({ currentTime: 0, progress: 0 })
      return get().currentTrack
    }

    if (currentTime > 3) {
      set({ currentTime: 0, progress: 0 })
      return get().currentTrack
    }

    const prevIdx = Math.max(0, queueIndex - 1)
    const track = queue[prevIdx]
    set({ queueIndex: prevIdx, currentTrack: track, currentTrackFull: null, isPlaying: true, progress: 0, currentTime: 0 })
    return track
  },

  // ── toggleShuffle ──────────────────────────────────────────────────────────
  toggleShuffle: () => {
    const { shuffle, queue, queueIndex, queueFilter, radioMode, currentTrack } = get()
    const newShuffle = !shuffle

    if (!newShuffle) {
      // Turning OFF: exit radio mode if active, resume linear playback
      set({ shuffle: false, radioMode: false, radioNext: null, _radioWaiting: false })
      return
    }

    if (radioMode) {
      // Already in radio mode — no change needed for toggling ON again
      return
    }

    // Turning ON: if a tracker song is already playing, switch to radio mode
    const isTrackerSong = currentTrack?.id?.startsWith('jw-') ?? false
    if (isTrackerSong && currentTrack) {
      set({ shuffle: true })
      get().startRadio(currentTrack)
      return
    }

    // Turning ON (non-tracker): shuffle the upcoming portion
    const played = queue.slice(0, queueIndex + 1)
    const upcoming = fisherYates(queue.slice(queueIndex + 1))
    const newFilter: QueueFilter | null = queueFilter
      ? { category: '', era: '', search: '', page: Math.floor(Math.random() * 80) + 2, hasMore: true, total: 999999 }
      : null
    set({ shuffle: true, queue: [...played, ...upcoming], queueFilter: newFilter })
    if (newFilter) get()._loadMore()
  },

  // ── toggleRepeat ───────────────────────────────────────────────────────────
  toggleRepeat: () =>
    set((s: QueueSlice) => {
      const order: Array<'none' | 'all' | 'one'> = ['none', 'all', 'one']
      return { repeat: order[(order.indexOf(s.repeat) + 1) % 3] }
    }),

  // ── Queue editing ──────────────────────────────────────────────────────────
  addToQueue: (track) => set((s: QueueSlice) => ({ queue: [...s.queue, track] })),

  playNext: (track) =>
    set((s: QueueSlice) => {
      const after = s.queueIndex + 1
      return { queue: [...s.queue.slice(0, after), track, ...s.queue.slice(after)] }
    }),

  removeFromQueue: (index) =>
    set((s: QueueSlice) => {
      const next = s.queue.filter((_, i) => i !== index)
      const newIndex = index <= s.queueIndex ? Math.max(0, s.queueIndex - 1) : s.queueIndex
      return { queue: next, queueIndex: newIndex }
    }),

  clearQueue: () =>
    set((s: QueueSlice) => ({
      queue: s.currentTrack ? [s.currentTrack] : [],
      queueIndex: 0,
      radioMode: false,
      radioNext: null,
      _radioWaiting: false,
    })),

  reorderQueue: (fromIdx, toIdx) =>
    set((s: QueueSlice) => {
      const base = s.queueIndex + 1
      const upcoming = [...s.queue.slice(base)]
      const [moved] = upcoming.splice(fromIdx, 1)
      upcoming.splice(toIdx, 0, moved)
      return { queue: [...s.queue.slice(0, base), ...upcoming] }
    }),

  // ── Lazy loading (non-radio) ───────────────────────────────────────────────
  _loadMore: () => {
    const { queue, queueIndex, shuffle, queueFilter, queueLoadingMore, radioMode } = get()
    if (radioMode || !queueFilter?.hasMore || queueLoadingMore) return

    const upcomingCount = queue.length - queueIndex - 1
    const threshold = shuffle ? 40 : 15
    if (upcomingCount >= threshold) return

    set({ queueLoadingMore: true })
    apiFetch<JWApiPaginatedResponse>('/songs/', {
      searchall: queueFilter.search || undefined,
      category: queueFilter.category || undefined,
      era: queueFilter.era || undefined,
      page: queueFilter.page,
      page_size: 50,
    })
      .then((data) => {
        const newTracks = data.results.filter((s) => !!s.path).map(songToTrack)
        const { queue: q, queueIndex: qi, shuffle: isShuffle, queueFilter: qf } = get()
        if (!qf) return

        let nextQueue: Track[]
        if (isShuffle) {
          const played = q.slice(0, qi + 1)
          const upcoming = insertRandom(q.slice(qi + 1), newTracks)
          nextQueue = [...played, ...upcoming]
        } else {
          nextQueue = [...q, ...newTracks]
        }

        set({
          queue: nextQueue,
          queueLoadingMore: false,
          queueFilter: { ...qf, page: qf.page + 1, hasMore: data.next !== null },
        })
      })
      .catch(() => set({ queueLoadingMore: false }))
  },

  // ── Radio pre-fetch ────────────────────────────────────────────────────────
  _prefetchRadioTrack: () => {
    apiFetch<RadioResponse>('/radio/random/')
      .then((data) => {
        if (!get().radioMode) return  // radio was turned off while fetching
        const track = songToTrack(data.song)
        const wasWaiting = get()._radioWaiting

        set({ radioNext: track, _radioWaiting: false })

        if (wasWaiting) {
          // Player was waiting for this track — advance and play immediately
          const { queue } = get()
          const newQueue = [...queue.slice(-(RADIO_HISTORY_LIMIT - 1)), track]
          set({
            queue: newQueue,
            queueIndex: newQueue.length - 1,
            currentTrack: track,
            currentTrackFull: null,
            isPlaying: true,
            radioNext: null,
            progress: 0,
            currentTime: 0,
          })
          get()._prefetchRadioTrack()
        }
      })
      .catch(() => {
        // Retry once on failure
        if (get().radioMode) {
          setTimeout(() => get()._prefetchRadioTrack(), 3000)
        }
      })
  },
})
