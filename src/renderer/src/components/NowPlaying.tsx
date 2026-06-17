import { useState } from 'react'
import { useResizablePanel } from '../hooks/useResizablePanel'
import { X, Music, ChevronUp, ChevronDown, FileAudio } from 'lucide-react'
import { useStore } from '../store/useStore'
import LyricsDisplay from './LyricsDisplay'
import { formatDuration } from '../lib/lyrics'

type Tab = 'lyrics' | 'info'

export default function NowPlaying(): JSX.Element {
  const {
    currentTrack,
    currentTrackFull,
    setShowNowPlaying,
  } = useStore()
  const [tab, setTab] = useState<Tab>('lyrics')
  const [artCollapsed, setArtCollapsed] = useState(false)
  const [panelWidth, dragHandle] = useResizablePanel(360, 280, 520)

  return (
    <div className="bg-surface-raised border-l border-[var(--border)] flex shrink-0 overflow-hidden animate-slide-in-right" style={{ width: panelWidth }}>
      {/* Resize handle — 4px wide, invisible until hover */}
      <div className="w-1 shrink-0 relative group/handle" {...dragHandle}>
        <div className="absolute inset-y-0 -left-1 -right-1 group-hover/handle:bg-accent/30 transition-colors rounded-full" />
      </div>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
        <h2 className="text-text-primary font-semibold text-sm uppercase tracking-widest">Now Playing</h2>
        <div className="flex items-center gap-2">
          {currentTrack && (
            <button
              onClick={() => setArtCollapsed(!artCollapsed)}
              className="text-text-muted hover:text-text-primary transition-colors"
              title={artCollapsed ? 'Show artwork' : 'Hide artwork'}
            >
              {artCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </button>
          )}
          <button
            onClick={() => setShowNowPlaying(false)}
            className="text-text-muted hover:text-text-primary transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {!currentTrack ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-8">
          <div className="w-24 h-24 rounded-full bg-surface-overlay flex items-center justify-center">
            <Music className="text-text-muted w-10 h-10" />
          </div>
          <p className="text-text-muted text-sm text-center">Play a track to see it here</p>
        </div>
      ) : (
        <>
          {/* Album art collapsible */}
          {!artCollapsed && (
            <div className="px-6 shrink-0">
              <div className="aspect-square w-full rounded-xl overflow-hidden bg-surface-overlay shadow-2xl">
                {currentTrackFull?.albumArt ? (
                  <img
                    src={currentTrackFull.albumArt}
                    alt="Album Art"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music className="text-text-muted w-16 h-16" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Track info */}
          <div className={`px-6 shrink-0 ${artCollapsed ? 'pt-2 pb-3' : 'py-3'}`}>
            {artCollapsed && currentTrackFull?.albumArt && (
              <div className="flex gap-3 items-center mb-3">
                <img
                  src={currentTrackFull.albumArt}
                  alt=""
                  className="w-12 h-12 rounded-lg object-cover shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-text-primary font-bold text-base truncate">{currentTrack.title}</p>
                  <p className="text-text-muted text-xs truncate">{currentTrack.artist}</p>
                </div>
              </div>
            )}
            {!artCollapsed && (
              <>
                <p className="text-text-primary font-bold text-lg truncate">{currentTrack.title}</p>
                <p className="text-text-muted text-sm truncate mt-0.5">{currentTrack.artist}</p>
                <p className="text-text-muted text-xs truncate mt-0.5">{currentTrack.album}</p>
              </>
            )}
          </div>

          {/* Tabs */}
          <div className="px-6 flex gap-4 border-b border-[var(--border)] shrink-0">
            {(['lyrics', 'info'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`pb-2 text-sm font-medium border-b-2 transition-colors capitalize ${
                  tab === t
                    ? 'border-accent text-text-primary'
                    : 'border-transparent text-text-muted hover:text-text-primary'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-hidden">
            {tab === 'lyrics' ? <LyricsDisplay /> : <InfoTab />}
          </div>
        </>
      )}
      </div>
    </div>
  )
}

function InfoTab(): JSX.Element {
  const { currentTrack, currentTrackFull } = useStore()
  if (!currentTrack) return <div />

  const rows: Array<[string, string | number | null | undefined]> = [
    ['Title', currentTrack.title],
    ['Artist', currentTrack.artist],
    ['Album', currentTrack.album],
    ['Album Artist', currentTrack.albumArtist],
    ['Year', currentTrack.year],
    ['Track #', currentTrack.trackNumber],
    ['Genre', currentTrack.genre || null],
    ['Duration', formatDuration(currentTrack.duration)],
    ['Producer', currentTrackFull?.producer || null],
    ['Format', currentTrackFull?.ext?.replace('.', '').toUpperCase() || null],
    ['Notes', currentTrackFull?.notes || null],
    ['File', currentTrack.path],
  ]

  return (
    <div className="h-full overflow-y-auto py-4 px-6 space-y-1">
      {rows.map(([label, value]) =>
        value != null && value !== '' ? (
          <div key={label} className="py-2 border-b border-[var(--border)] last:border-0">
            <p className="text-text-muted text-[10px] font-semibold uppercase tracking-wider mb-0.5">{label}</p>
            <p className={`text-text-primary text-sm ${label === 'File' ? 'break-all text-xs text-text-secondary' : 'truncate'}`}>
              {String(value)}
            </p>
          </div>
        ) : null
      )}
      <div className="pt-4 flex items-center gap-2 text-text-muted">
        <FileAudio size={14} />
        <span className="text-xs">{currentTrack.path.split(/[\\/]/).pop()}</span>
      </div>
    </div>
  )
}