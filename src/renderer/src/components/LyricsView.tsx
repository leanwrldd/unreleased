import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Mic2, X, Loader2, Music2 } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Track } from '../types'
import { AlbumArtThumbnail } from './AlbumArtThumbnail'

interface LyricsResult {
  track: Track
  lyrics: string
}

type LyricsTab = 'plain' | 'synced'

export default function LyricsView(): JSX.Element {
  const { library, playTrack, currentTrack } = useStore()
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<LyricsResult[] | null>(null)
  const [selected, setSelected] = useState<LyricsResult | null>(null)
  const [lyricsTab, setLyricsTab] = useState<LyricsTab>('plain')
  const searchRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<boolean>(false)

  // Auto-select currently playing track's lyrics on mount
  useEffect(() => {
    if (currentTrack) {
      window.api.getMetadata(currentTrack.path).then((meta) => {
        if (meta.lyrics) {
          setSelected({ track: currentTrack, lyrics: meta.lyrics! })
        }
      }).catch(() => {})
    }
  }, [])

  const handleSearch = useCallback(async (q: string) => {
    const trimmed = q.trim()
    if (!trimmed) {
      setResults(null)
      setSearching(false)
      return
    }

    setSearching(true)
    abortRef.current = false

    try {
      const paths = library.map((t) => t.path)
      const matchedPaths = await window.api.searchLyrics(trimmed, paths)

      if (abortRef.current) return

      const matchedTracks = matchedPaths
        .map((path) => library.find((t) => t.path === path))
        .filter(Boolean) as Track[]

      const batchSize = 10
      const lyricsResults: LyricsResult[] = []
      for (let i = 0; i < matchedTracks.length; i += batchSize) {
        if (abortRef.current) break
        const batch = matchedTracks.slice(i, i + batchSize)
        const metas = await Promise.all(batch.map((t) => window.api.getMetadata(t.path).catch(() => null)))
        for (let j = 0; j < batch.length; j++) {
          const meta = metas[j]
          if (meta?.lyrics) {
            lyricsResults.push({ track: batch[j], lyrics: meta.lyrics })
          }
        }
      }

      if (!abortRef.current) {
        setResults(lyricsResults)
        if (lyricsResults.length > 0 && !selected) {
          setSelected(lyricsResults[0])
        }
      }
    } catch (err) {
      console.error('Lyrics search error:', err)
    } finally {
      if (!abortRef.current) setSearching(false)
    }
  }, [library, selected])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => { handleSearch(query) }, 500)
    return () => { clearTimeout(timer); abortRef.current = true }
  }, [query])

  // Highlight query in lyrics text
  const highlightLyrics = (text: string, q: string): JSX.Element => {
    if (!q.trim()) return <>{text}</>
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'))
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === q.toLowerCase()
            ? <mark key={i} className="bg-accent/30 text-text-primary rounded-sm px-0.5">{part}</mark>
            : part
        )}
      </>
    )
  }

  // Select a track and load its full lyrics
  const selectTrack = async (track: Track): Promise<void> => {
    const meta = await window.api.getMetadata(track.path).catch(() => null)
    setSelected({ track, lyrics: meta?.lyrics ?? '' })
  }

  const displayList: Track[] = results !== null
    ? results.map((r) => r.track)
    : library

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden">
      {/* ── Left pane: search + song list ─────────────────────────── */}
      <div className="w-72 shrink-0 flex flex-col border-r border-[var(--border)] min-h-0">

        {/* Search bar */}
        <div className="px-3 pt-3 pb-2 shrink-0">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search lyrics…"
              className="w-full bg-surface-overlay text-text-primary text-sm rounded-lg pl-8 pr-7 py-2 outline-none focus:ring-1 ring-accent placeholder:text-text-muted"
            />
            {query && (
              <button
                onClick={() => { setQuery(''); setResults(null); searchRef.current?.focus() }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Status line */}
          <div className="h-5 flex items-center mt-1.5 px-0.5">
            {searching ? (
              <span className="flex items-center gap-1.5 text-text-muted text-xs">
                <Loader2 size={10} className="animate-spin" />
                Searching {library.length} songs…
              </span>
            ) : results !== null ? (
              <span className="text-text-muted text-xs">
                {results.length} result{results.length !== 1 ? 's' : ''}
              </span>
            ) : (
              <span className="text-text-muted text-xs">{library.length} songs</span>
            )}
          </div>
        </div>

        {/* Song list */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {results !== null && results.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 px-4 text-center">
              <Mic2 size={28} className="text-text-muted opacity-30" />
              <p className="text-text-muted text-sm">No songs match "{query}"</p>
            </div>
          ) : (
            displayList.map((track) => {
              const lyricsResult = results?.find((r) => r.track.id === track.id)
              return (
                <SongRow
                  key={track.id}
                  track={track}
                  active={selected?.track.id === track.id}
                  isPlaying={currentTrack?.id === track.id}
                  onClick={() => lyricsResult ? setSelected(lyricsResult) : selectTrack(track)}
                  onPlay={() => playTrack(track, library)}
                />
              )
            })
          )}
        </div>
      </div>

      {/* ── Right pane: lyrics display ─────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {selected ? (
          <>
            {/* Track header */}
            <div className="flex items-center gap-4 px-6 py-4 shrink-0 border-b border-[var(--border)]">
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface-overlay shrink-0">
                {selected.track.hasAlbumArt ? (
                  <AlbumArtThumbnail track={selected.track} size={48} className="w-full h-full" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music2 size={20} className="text-text-muted opacity-40" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-text-primary font-semibold text-base truncate">{selected.track.title}</p>
                <p className="text-text-muted text-sm truncate">
                  {selected.track.artist}{selected.track.album ? ` · ${selected.track.album}` : ''}
                </p>
              </div>
            </div>

            {/* Plain / Synced tabs */}
            <div className="flex border-b border-[var(--border)] shrink-0 px-6">
              <button
                onClick={() => setLyricsTab('plain')}
                className={`py-2.5 mr-6 text-sm font-medium border-b-2 transition-colors ${
                  lyricsTab === 'plain'
                    ? 'border-accent text-text-primary'
                    : 'border-transparent text-text-muted hover:text-text-primary'
                }`}
              >
                Plain lyrics
              </button>
              <button
                onClick={() => setLyricsTab('synced')}
                className={`py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  lyricsTab === 'synced'
                    ? 'border-accent text-text-primary'
                    : 'border-transparent text-text-muted hover:text-text-primary'
                }`}
              >
                Synced lyrics
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {lyricsTab === 'plain' ? (
                selected.lyrics ? (
                  <pre className="text-text-primary text-sm leading-relaxed whitespace-pre-wrap font-sans">
                    {query ? highlightLyrics(selected.lyrics, query.trim()) : selected.lyrics}
                  </pre>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                    <Mic2 size={36} className="text-text-muted opacity-25" />
                    <p className="text-text-muted text-sm">No lyrics for this song</p>
                    <p className="text-text-muted text-xs">Add them via the metadata editor (right-click a track)</p>
                  </div>
                )
              ) : (
                /* Synced lyrics placeholder */
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                  <Mic2 size={36} className="text-text-muted opacity-25" />
                  <p className="text-text-muted text-sm">Synced lyrics editor</p>
                  <p className="text-text-muted text-xs">Coming soon — create time-stamped lyrics here</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
            <div className="w-20 h-20 rounded-full bg-surface-overlay flex items-center justify-center">
              <Mic2 className="text-text-muted w-10 h-10 opacity-35" />
            </div>
            <p className="text-text-primary text-lg font-semibold">Lyrics Browser</p>
            <p className="text-text-muted text-sm max-w-xs">
              Select a song to view its lyrics, or search to find songs by lyrics content.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Song row ─────────────────────────────────────────────────────────────────

function SongRow({ track, active, isPlaying, onClick, onPlay }: {
  track: Track
  active: boolean
  isPlaying: boolean
  onClick: () => void
  onPlay: () => void
}): JSX.Element {
  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 cursor-pointer group transition-colors border-b border-[var(--border)] ${
        active ? 'bg-surface-overlay' : 'hover:bg-surface-raised'
      }`}
      onClick={onClick}
    >
      {/* Cover art thumbnail */}
      <div className="w-9 h-9 rounded shrink-0 overflow-hidden bg-surface-overlay flex items-center justify-center">
        {track.hasAlbumArt ? (
          <AlbumArtThumbnail track={track} size={36} className="w-full h-full" />
        ) : (
          <Music2 size={14} className="text-text-muted opacity-40" />
        )}
      </div>

      {/* Title / artist */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate leading-tight ${isPlaying ? 'text-accent' : 'text-text-primary'}`}>
          {track.title}
        </p>
        <p className="text-text-muted text-xs truncate leading-tight mt-0.5">{track.artist}</p>
      </div>

      {/* Play button on hover */}
      <button
        className="opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-accent shrink-0 p-1"
        onClick={(e) => { e.stopPropagation(); onPlay() }}
        title="Play"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
          <path d="M8 5v14l11-7z" />
        </svg>
      </button>
    </div>
  )
}
