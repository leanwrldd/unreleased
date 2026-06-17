import { useEffect, useRef, useState } from 'react'
import { Music } from 'lucide-react'
import { Track } from '../types'

// ─── Renderer-side art cache ─────────────────────────────────────────────────
const artCache = new Map<string, string | null>()

// Listeners: path → set of callbacks to call when art for that path changes
const artListeners = new Map<string, Set<() => void>>()

export function invalidateArtCache(path: string, newArt?: string | null): void {
  artCache.delete(path)
  if (newArt !== undefined) artCache.set(path, newArt)
  artListeners.get(path)?.forEach((fn) => fn())
}

// ─── Concurrency-limited queue ───────────────────────────────────────────────
const MAX_CONCURRENT = 6
let activeCount = 0
const pendingQueue: Array<() => void> = []

function drainQueue(): void {
  if (pendingQueue.length > 0 && activeCount < MAX_CONCURRENT) {
    pendingQueue.shift()!()
  }
}

function requestArt(path: string, onResult: (art: string | null) => void): () => void {
  let cancelled = false

  if (artCache.has(path)) {
    const cached = artCache.get(path) ?? null
    const t = setTimeout(() => { if (!cancelled) onResult(cached) }, 0)
    return () => { cancelled = true; clearTimeout(t) }
  }

  const run = (): void => {
    activeCount++
    if (cancelled) { activeCount--; drainQueue(); return }
    window.api.getAlbumArt(path)
      .then((art) => { artCache.set(path, art); if (!cancelled) onResult(art) })
      .catch(() => { artCache.set(path, null); if (!cancelled) onResult(null) })
      .finally(() => { activeCount--; drainQueue() })
  }

  if (activeCount < MAX_CONCURRENT) run()
  else pendingQueue.push(run)

  return () => { cancelled = true }
}

// ─── API image component (no hooks needed) ───────────────────────────────────

function ApiArtImage({ src, size, className }: { src: string; size: number; className: string }): JSX.Element {
  const sizeStyle = size > 0 ? { width: size, height: size } : {}
  return (
    <div
      className={`flex items-center justify-center shrink-0 overflow-hidden ${className}`}
      style={sizeStyle}
    >
      <img
        src={src}
        alt=""
        draggable={false}
        className="w-full h-full object-cover"
      />
    </div>
  )
}

// ─── Local art component (uses hooks) ────────────────────────────────────────

function LocalArtThumbnail({
  track,
  size,
  className,
  shimmer,
  rootMargin,
}: {
  track: Track
  size: number
  className: string
  shimmer: boolean
  rootMargin: string
}): JSX.Element {
  const [src, setSrc] = useState<string | null>(() => artCache.get(track.path) ?? null)
  const [visible, setVisible] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // Subscribe to invalidation for this path
  useEffect(() => {
    const refresh = (): void => setSrc(artCache.get(track.path) ?? null)
    let listeners = artListeners.get(track.path)
    if (!listeners) { listeners = new Set(); artListeners.set(track.path, listeners) }
    listeners.add(refresh)
    return () => { listeners!.delete(refresh) }
  }, [track.path])

  // Observe when element is near viewport
  useEffect(() => {
    if (artCache.has(track.path)) {
      setSrc(artCache.get(track.path) ?? null)
      return
    }
    const el = rootRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect() } },
      { rootMargin }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [track.path, rootMargin])

  // Load art — skip idle scheduling for small/non-shimmer items to load faster
  useEffect(() => {
    if (!visible || artCache.has(track.path)) return
    let cancel = (): void => {}
    const scheduleLoad = (): void => {
      cancel = requestArt(track.path, (art) => setSrc(art))
    }
    if (shimmer && 'requestIdleCallback' in window) {
      const id = requestIdleCallback(scheduleLoad, { timeout: 1500 })
      const prev = cancel
      cancel = () => { cancelIdleCallback(id); prev() }
    } else {
      const t = setTimeout(scheduleLoad, 16)
      cancel = () => clearTimeout(t)
    }
    return () => cancel()
  }, [visible, track.path, shimmer])

  // Sync when track.path changes and is already cached
  useEffect(() => {
    if (artCache.has(track.path)) setSrc(artCache.get(track.path) ?? null)
  }, [track.path])

  const sizeStyle = size > 0 ? { width: size, height: size } : {}
  const iconSize = size > 0 ? Math.max(Math.floor(size * 0.4), 12) : 24

  return (
    <div
      ref={rootRef}
      className={`flex items-center justify-center shrink-0 overflow-hidden ${src ? '' : shimmer ? 'art-shimmer' : ''} ${className}`}
      style={sizeStyle}
    >
      {src ? (
        <img
          src={src}
          alt=""
          draggable={false}
          className="w-full h-full object-cover animate-fade-in-fast"
          style={{ animationDuration: '300ms' }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-surface-overlay">
          <Music size={iconSize} className="text-text-muted opacity-40" />
        </div>
      )}
    </div>
  )
}

// ─── Public component ────────────────────────────────────────────────────────

export function AlbumArtThumbnail({
  track,
  size = 40,
  className = '',
  shimmer = true,
  rootMargin = '500px'
}: {
  track: Track
  size?: number
  className?: string
  shimmer?: boolean
  rootMargin?: string
}): JSX.Element {
  if (track.imageUrl) {
    return <ApiArtImage src={track.imageUrl} size={size} className={className} />
  }
  return <LocalArtThumbnail track={track} size={size} className={className} shimmer={shimmer} rootMargin={rootMargin} />
}

export default AlbumArtThumbnail
