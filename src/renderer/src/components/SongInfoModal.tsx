import { useState, useRef } from 'react'
import {
  X, Music2, Mic2, Disc3, Clock, Flame, Calendar,
  ChevronDown, Users, MapPin, FileText, Guitar,
  Info, Hash, Layers, Zap
} from 'lucide-react'
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

interface SectionProps {
  title: string
  icon: JSX.Element
  children: React.ReactNode
  defaultOpen?: boolean
}

function Section({ title, icon, children, defaultOpen = true }: SectionProps): JSX.Element {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-[var(--border)] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-surface-overlay hover:bg-surface-raised transition-colors"
      >
        <div className="flex items-center gap-2 text-text-secondary text-xs font-semibold uppercase tracking-wide">
          <span className="text-text-muted">{icon}</span>
          {title}
        </div>
        <ChevronDown
          size={14}
          className={`text-text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="px-3 pb-3 pt-2 text-text-primary text-xs leading-relaxed space-y-1.5">
          {children}
        </div>
      )}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div>
      <span className="text-text-muted font-medium">{label}: </span>
      <span className="text-text-primary whitespace-pre-wrap">{value}</span>
    </div>
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

  // Try to parse notes JSON — fall back to raw string
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
      <div className="bg-surface border border-[var(--border)] rounded-t-2xl md:rounded-2xl shadow-2xl w-full md:max-w-lg max-h-[92vh] md:max-h-[84vh] flex flex-col overflow-hidden">

        {/* Cover + title header */}
        <div className="relative flex items-start gap-4 p-5 pb-4 shrink-0">
          <div className="shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden bg-surface-overlay shadow-lg">
            {coverUrl ? (
              <img src={coverUrl} alt={primaryTitle} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music2 size={32} className="text-text-muted opacity-30" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 pt-0.5">
            <h2 className="text-text-primary font-bold text-lg leading-tight pr-8">{primaryTitle}</h2>
            {altTitles.length > 0 && (
              <div className="mt-1 space-y-0.5">
                {altTitles.map((t, i) => (
                  <p key={i} className="text-text-muted text-xs italic truncate">also known as "{t}"</p>
                ))}
              </div>
            )}
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

          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full hover:bg-surface-overlay text-text-muted hover:text-text-primary transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Quick stats row */}
        <div className="flex items-center gap-4 px-5 pb-3 shrink-0 flex-wrap">
          {(song.credited_artists) && (
            <div className="flex items-center gap-1.5 text-text-muted">
              <Mic2 size={12} />
              <span className="text-xs">{song.credited_artists || 'Juice WRLD'}</span>
            </div>
          )}
          {song.length && (
            <div className="flex items-center gap-1.5 text-text-muted">
              <Clock size={12} />
              <span className="text-xs">{duration}</span>
            </div>
          )}
          {song.leak_type && (
            <div className="flex items-center gap-1.5 text-text-muted">
              <Flame size={12} />
              <span className="text-xs">{song.leak_type}</span>
            </div>
          )}
          {song.date_leaked && (
            <div className="flex items-center gap-1.5 text-text-muted">
              <Calendar size={12} />
              <span className="text-xs">{song.date_leaked}</span>
            </div>
          )}
        </div>

        <div className="h-px bg-[var(--border)] mx-5 shrink-0" />

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-2.5">

          {/* Producers */}
          {song.producers && (
            <Section title="Produced by" icon={<Disc3 size={13} />}>
              <p className="text-text-primary">{song.producers}</p>
            </Section>
          )}

          {/* Engineers */}
          {song.engineers && (
            <Section title="Engineers" icon={<Users size={13} />}>
              <p className="text-text-primary">{song.engineers}</p>
            </Section>
          )}

          {/* Recording Details */}
          {hasRecording && (
            <Section title="Recording Details" icon={<MapPin size={13} />}>
              {song.recording_locations && <Field label="Location" value={song.recording_locations} />}
              {song.record_dates && <Field label="Date" value={song.record_dates} />}
            </Section>
          )}

          {/* File Names */}
          {song.file_names && (
            <Section title="File Names" icon={<FileText size={13} />}>
              <p className="text-text-primary font-mono text-[11px] leading-relaxed">{song.file_names}</p>
            </Section>
          )}

          {/* Instrumentals */}
          {hasInstrumentals && (
            <Section title="Instrumentals" icon={<Guitar size={13} />}>
              {song.instrumentals && <Field label="Info" value={song.instrumentals} />}
              {song.instrumental_names && song.instrumental_names !== song.instrumentals && (
                <Field label="Names" value={song.instrumental_names} />
              )}
            </Section>
          )}

          {/* Bitrate */}
          {song.bitrate && (
            <Section title="Quality" icon={<Zap size={13} />} defaultOpen={false}>
              <Field label="Bitrate" value={song.bitrate} />
            </Section>
          )}

          {/* Additional Info */}
          {song.additional_information && (
            <Section title="Additional Info" icon={<Info size={13} />}>
              <p className="text-text-primary whitespace-pre-wrap">{song.additional_information}</p>
            </Section>
          )}

          {/* Important Dates */}
          {hasImportantDates && (
            <Section title="Important Dates" icon={<Calendar size={13} />}>
              {song.preview_date && <Field label="Preview Date" value={song.preview_date} />}
              {song.release_date && <Field label="Release Date" value={song.release_date} />}
              {song.dates && <Field label="Other Dates" value={song.dates} />}
            </Section>
          )}

          {/* Session Info */}
          {hasSession && (
            <Section title="Session Info" icon={<Layers size={13} />} defaultOpen={false}>
              {song.session_titles && <Field label="Titles" value={song.session_titles} />}
              {song.session_tracking && <Field label="Tracking" value={song.session_tracking} />}
            </Section>
          )}

          {/* Notes */}
          {notesDisplay && (
            <Section title="Notes" icon={<Hash size={13} />} defaultOpen={false}>
              <p className="text-text-primary whitespace-pre-wrap">{notesDisplay}</p>
            </Section>
          )}

          {/* Lyrics */}
          {song.lyrics && (
            <Section title="Lyrics" icon={<Music2 size={13} />}>
              <div className="bg-surface-raised rounded-xl p-3 max-h-48 overflow-y-auto no-scrollbar mt-0.5">
                <pre className="text-text-secondary text-xs leading-relaxed whitespace-pre-wrap font-sans">{song.lyrics}</pre>
              </div>
            </Section>
          )}

          {/* Empty state */}
          {!song.producers && !song.engineers && !hasRecording && !song.file_names &&
           !hasInstrumentals && !song.additional_information && !hasImportantDates &&
           !hasSession && !notesDisplay && !song.lyrics && (
            <p className="text-text-muted text-xs text-center py-4">No additional information available.</p>
          )}

        </div>
      </div>
    </div>
  )
}
