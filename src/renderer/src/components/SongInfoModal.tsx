import { useRef } from 'react'
import { X, Music2 } from 'lucide-react'
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

function Row({ label, value }: { label: string; value: string | null | undefined }): JSX.Element | null {
  if (!value) return null
  return (
    <div className="flex gap-3 py-2.5 border-b border-[var(--border)] last:border-0">
      <span className="text-text-muted text-xs shrink-0 w-28 pt-px">{label}</span>
      <span className="text-text-primary text-xs leading-relaxed whitespace-pre-wrap flex-1">{value}</span>
    </div>
  )
}

function GroupLabel({ children }: { children: string }): JSX.Element {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted pt-4 pb-1 first:pt-0">
      {children}
    </p>
  )
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

  const hasRecording = song.recording_locations || song.record_dates
  const hasImportantDates = song.preview_date || song.release_date || song.dates
  const hasInstrumentals = song.instrumentals || song.instrumental_names
  const hasSession = song.session_titles || song.session_tracking

  let notesDisplay: string | null = null
  if (song.notes) {
    try {
      const parsed = JSON.parse(song.notes)
      if (typeof parsed === 'object' && parsed !== null) {
        notesDisplay = Object.entries(parsed)
          .filter(([, v]) => v)
          .map(([k, v]) => `${k}: ${v}`)
          .join('\n')
      } else {
        notesDisplay = String(parsed)
      }
    } catch {
      notesDisplay = song.notes
    }
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm p-0 md:p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="bg-surface border border-[var(--border)] rounded-t-2xl md:rounded-2xl shadow-2xl w-full md:max-w-lg max-h-[92vh] md:max-h-[86vh] flex flex-col overflow-hidden">

        {/* ── Hero ── */}
        <div className="relative shrink-0 overflow-hidden">
          {/* Blurred backdrop */}
          {coverUrl && (
            <div
              className="absolute inset-0 bg-cover bg-center scale-110"
              style={{ backgroundImage: `url(${coverUrl})`, filter: 'blur(24px) brightness(0.35)' }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-surface" />

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-black/40 text-white/70 hover:text-white transition-colors"
          >
            <X size={15} />
          </button>

          {/* Cover + title */}
          <div className="relative flex items-end gap-4 px-5 pt-8 pb-5">
            <div className="shrink-0 w-24 h-24 rounded-xl overflow-hidden shadow-2xl bg-surface-overlay">
              {coverUrl ? (
                <img src={coverUrl} alt={primaryTitle} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Music2 size={32} className="text-text-muted opacity-30" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 pb-0.5">
              <h2 className="text-white font-bold text-xl leading-tight">{primaryTitle}</h2>
              {altTitles.length > 0 && (
                <p className="text-white/50 text-xs mt-0.5 truncate italic">
                  aka {altTitles.join(' · ')}
                </p>
              )}
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${catColor}`}>
                  {catLabel}
                </span>
                {song.era?.name && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/60 border border-white/15">
                    {song.era.name}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Scrollable info ── */}
        <div className="overflow-y-auto flex-1 px-5 py-4">

          {/* Core */}
          <div>
            <Row label="Artist" value={song.credited_artists || 'Juice WRLD'} />
            <Row label="Duration" value={parseDuration(song.length) ? duration : null} />
            <Row label="Leak type" value={song.leak_type} />
            <Row label="Date leaked" value={song.date_leaked} />
            <Row label="Bitrate" value={song.bitrate} />
          </div>

          {/* Credits */}
          {(song.producers || song.engineers) && (
            <>
              <GroupLabel>Credits</GroupLabel>
              <div>
                <Row label="Producers" value={song.producers} />
                <Row label="Engineers" value={song.engineers} />
              </div>
            </>
          )}

          {/* Recording */}
          {hasRecording && (
            <>
              <GroupLabel>Recording</GroupLabel>
              <div>
                <Row label="Location" value={song.recording_locations} />
                <Row label="Date" value={song.record_dates} />
              </div>
            </>
          )}

          {/* Release */}
          {hasImportantDates && (
            <>
              <GroupLabel>Dates</GroupLabel>
              <div>
                <Row label="Released" value={song.release_date} />
                <Row label="Preview" value={song.preview_date} />
                <Row label="Other" value={song.dates} />
              </div>
            </>
          )}

          {/* Instrumentals */}
          {hasInstrumentals && (
            <>
              <GroupLabel>Instrumentals</GroupLabel>
              <div>
                <Row label="Info" value={song.instrumentals} />
                {song.instrumental_names !== song.instrumentals && (
                  <Row label="Names" value={song.instrumental_names} />
                )}
              </div>
            </>
          )}

          {/* Session */}
          {hasSession && (
            <>
              <GroupLabel>Session</GroupLabel>
              <div>
                <Row label="Titles" value={song.session_titles} />
                <Row label="Tracking" value={song.session_tracking} />
              </div>
            </>
          )}

          {/* File names */}
          {song.file_names && (
            <>
              <GroupLabel>File Names</GroupLabel>
              <p className="text-text-primary text-[11px] font-mono leading-relaxed pb-2.5 border-b border-[var(--border)]">
                {song.file_names}
              </p>
            </>
          )}

          {/* Additional info */}
          {song.additional_information && (
            <>
              <GroupLabel>Additional Info</GroupLabel>
              <p className="text-text-primary text-xs leading-relaxed pb-2.5 border-b border-[var(--border)] whitespace-pre-wrap">
                {song.additional_information}
              </p>
            </>
          )}

          {/* Notes */}
          {notesDisplay && (
            <>
              <GroupLabel>Notes</GroupLabel>
              <p className="text-text-primary text-xs leading-relaxed pb-2.5 border-b border-[var(--border)] whitespace-pre-wrap">
                {notesDisplay}
              </p>
            </>
          )}

          {/* Lyrics */}
          {song.lyrics && (
            <>
              <GroupLabel>Lyrics</GroupLabel>
              <pre className="text-text-secondary text-xs leading-relaxed whitespace-pre-wrap font-sans pb-2">
                {song.lyrics}
              </pre>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
