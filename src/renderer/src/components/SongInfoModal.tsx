import { useRef } from 'react'
import { X, Music2, Mic2, Disc3, Clock, Flame, Calendar } from 'lucide-react'
import { JWApiSong, CATEGORY_LABELS, buildImageUrl, parseDuration } from '../lib/juicewrldApi'

function formatDur(secs: number): string {
  if (!secs) return '—'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

const CATEGORY_COLORS: Record<string, string> = {
  released:          'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  unreleased:        'bg-blue-500/15 text-blue-400 border-blue-500/25',
  unsurfaced:        'bg-orange-500/15 text-orange-400 border-orange-500/25',
  recording_session: 'bg-purple-500/15 text-purple-400 border-purple-500/25',
}

interface Props {
  song: JWApiSong | null
  onClose: () => void
}

export default function SongInfoModal({ song, onClose }: Props): JSX.Element | null {
  const overlayRef = useRef<HTMLDivElement>(null)

  if (!song) return null

  const coverUrl = buildImageUrl(song.image_url)
  const primaryTitle = song.track_titles?.[0] || song.name
  const altTitles = song.track_titles?.slice(1).filter(Boolean) ?? []
  const duration = formatDur(parseDuration(song.length))
  const catColor = CATEGORY_COLORS[song.category] ?? 'bg-surface-overlay text-text-muted border-[var(--border)]'
  const catLabel = CATEGORY_LABELS[song.category] ?? song.category

  const fields: { icon: JSX.Element; label: string; value: string | null }[] = [
    { icon: <Mic2 size={13} />, label: 'Artist', value: song.credited_artists || 'Juice WRLD' },
    { icon: <Disc3 size={13} />, label: 'Producers', value: song.producers || null },
    { icon: <Clock size={13} />, label: 'Duration', value: song.length ? `${song.length} (${duration})` : null },
    { icon: <Flame size={13} />, label: 'Leak type', value: song.leak_type || null },
    { icon: <Calendar size={13} />, label: 'Date leaked', value: song.date_leaked || null },
  ]

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm p-0 md:p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="bg-surface border border-[var(--border)] rounded-t-2xl md:rounded-2xl shadow-2xl w-full md:max-w-lg max-h-[90vh] md:max-h-[82vh] flex flex-col overflow-hidden">

        {/* Cover + title header */}
        <div className="relative flex items-start gap-4 p-5 pb-4 shrink-0">
          {/* Cover art */}
          <div className="shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden bg-surface-overlay shadow-lg">
            {coverUrl ? (
              <img src={coverUrl} alt={primaryTitle} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music2 size={32} className="text-text-muted opacity-30" />
              </div>
            )}
          </div>

          {/* Title block */}
          <div className="flex-1 min-w-0 pt-0.5">
            <h2 className="text-text-primary font-bold text-lg leading-tight truncate pr-8">{primaryTitle}</h2>
            {altTitles.length > 0 && (
              <div className="mt-1 space-y-0.5">
                {altTitles.map((t, i) => (
                  <p key={i} className="text-text-muted text-xs italic truncate">also known as "{t}"</p>
                ))}
              </div>
            )}

            {/* Pills */}
            <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${catColor}`}>
                {catLabel}
              </span>
              {song.era?.name && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-overlay text-text-muted border border-[var(--border)]">
                  {song.era.name}
                </span>
              )}
            </div>
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full hover:bg-surface-overlay text-text-muted hover:text-text-primary transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Divider */}
        <div className="h-px bg-[var(--border)] mx-5 shrink-0" />

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">

          {/* Metadata fields */}
          <div className="space-y-2.5">
            {fields.filter(f => f.value).map(({ icon, label, value }) => (
              <div key={label} className="flex items-start gap-3">
                <div className="flex items-center gap-1.5 text-text-muted shrink-0 w-28 pt-0.5">
                  {icon}
                  <span className="text-xs">{label}</span>
                </div>
                <span className="text-text-primary text-xs leading-relaxed">{value}</span>
              </div>
            ))}
          </div>

          {/* Lyrics */}
          {song.lyrics && (
            <>
              <div className="h-px bg-[var(--border)] my-3" />
              <div>
                <p className="text-text-muted text-[10px] uppercase tracking-widest font-semibold mb-2">Lyrics</p>
                <div className="bg-surface-raised rounded-xl p-3 max-h-48 overflow-y-auto no-scrollbar">
                  <pre className="text-text-secondary text-xs leading-relaxed whitespace-pre-wrap font-sans">{song.lyrics}</pre>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
