/**
 * queueSlice.ts — all queue and playback logic in one place.
 *
 * Responsibilities:
 *  - Queue state (tracks, index, shuffle, repeat)
 *  - Playback state (currentTrack, isPlaying, progress, currentTime)
 *  - Lazy loading (background page fetching, triggered by nextTrack)
 *  - Shuffle with random insertion so newly fetched tracks land at random
 *    positions in the upcoming list instead of piling up at the end
 */

import type { StateCreator } from 'zustand'
import type { Track } from '../types'
import { apiFetch, songToTrack } from '../lib/juicewrldApi'
import type { JWApiPaginatedResponse } from '../lib/juicewrldApi'

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

  // Lazy loading
  queueFilter: QueueFilter | null
  /** True while a background page fetch is in flight. */
  queueLoadingMore: boolean

  // ── Actions ──────────────────────────────────────────────────────────────
  /**
   * Start playing `track`.
   * `context` is the ordered list the track came from (defaults to current queue).
   * `filter` enables lazy loading beyond the initial context.
   */
  playTrack: (track: Track, context?: Track[], filter?: QueueFilter | null) => void

  /** Advance to the next track. Returns the track, or null if playback stops. */
  nextTrack: () => Track | null

  /** Go back one track (or restart if >3 s in). */
  prevTrack: () => Track | null

  /**
   * Toggle shuffle.
   * Turning ON: immediately re-orders upcoming tracks with Fisher-Yates and,
   * if a queueFilter is active, upgrades it to full-catalog so newly fetched
   * tracks aren't stuck in the same era/category.
   */
  toggleShuffle: () => void

  /** Cycle repeat: none → all → one. */
  toggleRepeat: () => void

  setIsPlaying: (playing: boolean) => void
  setProgress: (progress: number) => void
  setCurrentTime: (time: number) => void

  // Queue editing
  addToQueue: (track: Track) => void
  playNext: (track: Track) => void
  removeFromQueue: (absoluteIndex: number) => void
  clearQueue: () => void
  /**
   * Reorder within the upcoming section only.
   * `fromIdx` / `toIdx` are relative to `queue[queueIndex + 1]`.
   */
  reorderQueue: (fromIdx: number, toIdx: number) => void

  // Internal (prefixed _ — not for external use)
  _loadMore: () => void
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
      progress: 0,
      currentTime: 0,
    })
    if (filter?.hasMore) get()._loadMore()
  },

  // ── nextTrack ──────────────────────────────────────────────────────────────
  nextTrack: () => {
    const { queue, queueIndex, shuffle, repeat } = get()
    if (queue.length === 0) return null

    let nextIdx: number

    if (repeat === 'one') {
      nextIdx = queueIndex
    } else if (shuffle) {
      const upcomingCount = queue.length - queueIndex - 1
      if (upcomingCount > 0) {
        // Random pick from the not-yet-played upcoming section
        nextIdx = queueIndex + 1 + Math.floor(Math.random() * upcomingCount)
      } else if (repeat === 'all') {
        // All tracks played — reshuffle everything and start over
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
        if (repeat === 'all') {
          nextIdx = 0
        } else {
          set({ isPlaying: false })
          return null
        }
      }
    }

    const track = queue[nextIdx]
    set({ queueIndex: nextIdx, currentTrack: track, currentTrackFull: null, isPlaying: true, progress: 0, currentTime: 0 })
    get()._loadMore()
    return track
  },

  // ── prevTrack ──────────────────────────────────────────────────────────────
  prevTrack: () => {
    const { queue, queueIndex, currentTime } = get()
    if (queue.length === 0) return null

    // If more than 3 s in — restart current track
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
    const { shuffle, queue, queueIndex, queueFilter } = get()
    const newShuffle = !shuffle

    if (newShuffle) {
      // Re-order upcoming tracks immediately (played tracks stay put)
      const played = queue.slice(0, queueIndex + 1)
      const upcoming = fisherYates(queue.slice(queueIndex + 1))

      // Upgrade an active filter to full catalog at a random page so the
      // lazy loader fills the pool with songs from all eras/categories
      const newFilter: QueueFilter | null = queueFilter
        ? {
            category: '',
            era: '',
            search: '',
            page: Math.floor(Math.random() * 80) + 2,
            hasMore: true,
            total: 999999,
          }
        : null

      set({ shuffle: true, queue: [...played, ...upcoming], queueFilter: newFilter })
      if (newFilter) get()._loadMore()
    } else {
      set({ shuffle: false })
    }
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
    })),

  reorderQueue: (fromIdx, toIdx) =>
    set((s: QueueSlice) => {
      const base = s.queueIndex + 1
      const upcoming = [...s.queue.slice(base)]
      const [moved] = upcoming.splice(fromIdx, 1)
      upcoming.splice(toIdx, 0, moved)
      return { queue: [...s.queue.slice(0, base), ...upcoming] }
    }),

  // ── Lazy loading ───────────────────────────────────────────────────────────
  _loadMore: () => {
    const { queue, queueIndex, shuffle, queueFilter, queueLoadingMore } = get()
    if (!queueFilter?.hasMore || queueLoadingMore) return

    // How many unplayed tracks remain?
    const upcomingCount = queue.length - queueIndex - 1
    // Load when running low — lower threshold in linear mode (predictable),
    // higher in shuffle (we want a large random pool)
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
          // Scatter new tracks throughout the upcoming section randomly
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
})
