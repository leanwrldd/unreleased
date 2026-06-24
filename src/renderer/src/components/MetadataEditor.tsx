import { useState, useEffect, useRef } from 'react'
import { X, Save, Upload, Music, Loader2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { LibraryTrack } from '../types'
import { useStore } from '../store/useStore'

interface MetadataEditorProps {
  track: LibraryTrack
  onClose: () => void
  onSaved?: (track: LibraryTrack) => void
}

interface MetaFields {
  title: string
  artist: string
  album: string
  albumArtist: string
  year: string
  trackNumber: string
  discNumber: string
  composer: string
  genre: string
  lyrics: string
  syncedLyrics: string
  albumArt: string | null
}

// ── Section label (matches EditorPage style) ──────────────────────────────────

function SectionLabel({ label }: { label: string }): JSX.Element {
  return (
    <div className="flex items-center gap-2.5 px-4 pt-5 pb-1.5">
      <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] opacity-55 shrink-0 select-none">{label}</span>
      <div className="flex-1 h-px bg-[var(--border)]" style={{ opacity: 0.5 }} />
    </div>
  )
}

// ── Field row (matches EditorPage FieldRow style) ─────────────────────────────

function FieldRow({ label, value, original, onChange, placeholder, multiline = false, mono = false }: {
  label: string; value: string; original: string
  onChange: (v: string) => void; placeholder?: string; multiline?: boolean; mono?: boolean
}): JSX.Element {
  const changed = value !== original && !(value === '' && original === '')
  const base = `flex-1 bg-transparent text-sm text-[var(--text-primary)] focus:outline-none placeholder:text-[var(--text-muted)] placeholder:opacity-25 min-w-0 border-b border-[var(--border)] pb-px focus:border-[var(--accent)] transition-colors \${mono ? 'font-mono text-xs' : ''}`
  return (
    <div className={`group grid items-baseline px-4 py-[7px] border-l-2 transition-all \${changed ? 'border-[var(--accent)]/70 bg-[var(--accent)]/[0.025]' : 'border-transparent hover:bg-white/[0.05]'}`} style={{ gridTemplateColumns: '84px 1fr' }}>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] opacity-65 select-none truncate pt-px">{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        {multiline
          ? <textarea className={`\${base} resize-none leading-relaxed`} rows={5} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
          : <input className={base} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
        }
        {changed && <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--accent)]/80" />}
      </div>
    </div>
  )
}

export default function MetadataEditor({ track, onClose, onSaved }: MetadataEditorProps): JSX.Element {
  const el = (window as any).electron
  const { updateLibraryTrack } = useStore()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSynced, setShowSynced] = useState(false)
  const [original, setOriginal] = useState<MetaFields>({
    title: track.title, artist: track.artist, album: track.album,
    albumArtist: track.albumArtist, year: track.year ? String(track.year) : '',
    trackNumber: track.trackNumber ? String(track.trackNumber) : '',
    discNumber: track.discNumber ? String(track.discNumber) : '',
    composer: track.composer, genre: track.genre,
    lyrics: '', syncedLyrics: '', albumArt: track.albumArt ?? null,
  })
  const [fields, setFields] = useState<MetaFields>({ ...original })

  useEffect(() => {
    if (!el) { setLoading(false); return }
    el.readTrackMetadata(track.filePath).then((meta: Record<string, any> | null) => {
      if (meta && !meta.error) {
        const loaded: MetaFields = {
          title: meta.title || track.title,
          artist: meta.artist || track.artist,
          album: meta.album || track.album,
          albumArtist: meta.albumArtist || track.albumArtist,
          year: meta.year ? String(meta.year) : (track.year ? String(track.year) : ''),
          trackNumber: meta.trackNumber ? String(meta.trackNumber) : (track.trackNumber ? String(track.trackNumber) : ''),
          discNumber: meta.discNumber ? String(meta.discNumber) : (track.discNumber ? String(track.discNumber) : ''),
          composer: meta.composer || track.composer,
          genre: meta.genre || track.genre,
          lyrics: meta.lyrics || '',
          syncedLyrics: meta.syncedLyrics || '',
          albumArt: meta.albumArt || track.albumArt || null,
        }
        setOriginal(loaded)
        setFields(loaded)
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [track.filePath])

  const set = (key: keyof MetaFields, val: string | null) =>
    setFields(f => ({ ...f, [key]: val as any }))

  const handlePickArt = async () => {
    if (!el) return
    const dataUrl = await el.selectImageFile()
    if (dataUrl) set('albumArt', dataUrl)
  }

  const changedCount = Object.keys(fields).filter(k => {
    const key = k as keyof MetaFields
    return fields[key] !== original[key] && !(fields[key] === '' && original[key] === '')
  }).length

  const handleSave = async () => {
    if (!el) return
    if (track.ext !== 'mp3') {
      setError('Metadata writing is only supported for MP3 files. Tags were not saved to disk, but the display will update.')
      updateLibraryTrack(track.id, {
        title: fields.title, artist: fields.artist, album: fields.album,
        albumArtist: fields.albumArtist,
        year: fields.year ? parseInt(fields.year) : null,
        trackNumber: fields.trackNumber ? parseInt(fields.trackNumber) : null,
        discNumber: fields.discNumber ? parseInt(fields.discNumber) : null,
        composer: fields.composer, genre: fields.genre,
        albumArt: fields.albumArt,
      })
      onSaved?.({ ...track, title: fields.title, artist: fields.artist, album: fields.album, albumArt: fields.albumArt ?? null })
      return
    }
    setSaving(true)
    setError(null)
    try {
      const result = await el.writeTrackMetadata(track.filePath, {
        title: fields.title, artist: fields.artist, album: fields.album,
        albumArtist: fields.albumArtist,
        year: fields.year ? parseInt(fields.year) : null,
        trackNumber: fields.trackNumber ? parseInt(fields.trackNumber) : null,
        composer: fields.composer, genre: fields.genre,
        lyrics: fields.lyrics,
        albumArtBase64: fields.albumArt,
      })
      if (result.error) { setError(result.error); return }
      updateLibraryTrack(track.id, {
        title: fields.title, artist: fields.artist, album: fields.album,
        albumArtist: fields.albumArtist,
        year: fields.year ? parseInt(fields.year) : null,
        trackNumber: fields.trackNumber ? parseInt(fields.trackNumber) : null,
        discNumber: fields.discNumber ? parseInt(fields.discNumber) : null,
        composer: fields.composer, genre: fields.genre,
        albumArt: fields.albumArt,
        hasAlbumArt: !!fields.albumArt,
      })
      onSaved?.({ ...track, title: fields.title, artist: fields.artist, album: fields.album, albumArt: fields.albumArt })
      onClose()
    } catch(e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl flex flex-col overflow-hidden">

        {/* Header — matches EditorPage top bar style */}
        <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
          {/* Album art thumbnail */}
          <div
            className="w-9 h-9 rounded-lg overflow-hidden shrink-0 cursor-pointer group relative bg-[var(--surface-overlay)]"
            onClick={handlePickArt}
            title="Click to change album art"
          >
            {fields.albumArt
              ? <img src={fields.albumArt} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]"><Music size={16} /></div>
            }
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Upload size={12} className="text-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[var(--text-primary)] text-sm font-semibold truncate">{fields.title || track.title}</p>
            <p className="text-[var(--text-muted)] text-xs truncate">{track.filePath.split(/[/\\]/).pop()}</p>
          </div>
          {changedCount > 0 && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] shrink-0">
              {changedCount} change{changedCount !== 1 ? 's' : ''}
            </span>
          )}
          <span className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider shrink-0">{track.ext.toUpperCase()}{track.bitrate ? ` · ${track.bitrate}k` : ''}</span>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-overlay)] transition-colors shrink-0">
            <X size={15} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 size={24} className="animate-spin text-[var(--accent)]" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto min-h-0">

            {/* Large album art + basic fields in two-column hero */}
            <div className="flex gap-4 px-4 pt-4 pb-2">
              {/* Album art */}
              <div className="shrink-0 flex flex-col items-center gap-1.5">
                <div
                  className="w-32 h-32 rounded-xl bg-[var(--surface-overlay)] border border-[var(--border)] overflow-hidden cursor-pointer group relative"
                  onClick={handlePickArt}
                  title="Click to change album art"
                >
                  {fields.albumArt
                    ? <img src={fields.albumArt} alt="Album art" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]"><Music size={28} /></div>
                  }
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Upload size={18} className="text-white" />
                  </div>
                </div>
                <button onClick={handlePickArt} className="text-[10px] text-[var(--accent)] hover:underline">Change art</button>
                {fields.albumArt && (
                  <button onClick={() => set('albumArt', null)} className="text-[10px] text-[var(--text-muted)] hover:text-red-400">Remove</button>
                )}
              </div>
              {/* Right side: title + artist stacked as FieldRows but without section padding */}
              <div className="flex-1 min-w-0 pt-1 space-y-0.5">
                <FieldRow label="Title"  value={fields.title}  original={original.title}  onChange={v => set('title', v)} />
                <FieldRow label="Artist" value={fields.artist} original={original.artist} onChange={v => set('artist', v)} />
                <FieldRow label="Album"  value={fields.album}  original={original.album}  onChange={v => set('album', v)} />
              </div>
            </div>

            <SectionLabel label="Credits" />
            <FieldRow label="Alb. Artist" value={fields.albumArtist} original={original.albumArtist} onChange={v => set('albumArtist', v)} />
            <FieldRow label="Composer"   value={fields.composer}    original={original.composer}    onChange={v => set('composer', v)} />
            <FieldRow label="Genre"      value={fields.genre}       original={original.genre}       onChange={v => set('genre', v)} />

            <SectionLabel label="Numbers" />
            <FieldRow label="Year"    value={fields.year}        original={original.year}        onChange={v => set('year', v)}        placeholder="2019" />
            <FieldRow label="Track #" value={fields.trackNumber} original={original.trackNumber} onChange={v => set('trackNumber', v)} placeholder="1" />
            <FieldRow label="Disc #"  value={fields.discNumber}  original={original.discNumber}  onChange={v => set('discNumber', v)}  placeholder="1" />

            <SectionLabel label="Lyrics" />
            <div className="px-4 pb-2">
              {/* Plain lyrics — full-width tall editor */}
              <div className={`rounded-lg border transition-colors ${fields.lyrics !== original.lyrics && !(fields.lyrics === '' && original.lyrics === '') ? 'border-[var(--accent)]/50 bg-[var(--accent)]/[0.02]' : 'border-[var(--border)]'}`}>
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--border)]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] opacity-60">Plain</span>
                  <span className="text-[10px] text-[var(--text-muted)] opacity-40">{fields.lyrics ? fields.lyrics.split('\n').length + ' lines' : 'empty'}</span>
                </div>
                <textarea
                  className="w-full bg-transparent text-sm text-[var(--text-primary)] px-3 py-2.5 focus:outline-none placeholder:text-[var(--text-muted)] placeholder:opacity-25 resize-none font-sans leading-relaxed"
                  rows={8}
                  value={fields.lyrics}
                  onChange={e => set('lyrics', e.target.value)}
                  placeholder="Paste lyrics here…"
                  spellCheck={false}
                />
              </div>

              {/* Synced lyrics (LRC) */}
              <button
                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] opacity-55 hover:opacity-100 transition-opacity mt-4 mb-1.5"
                onClick={() => setShowSynced(v => !v)}
              >
                Synced Lyrics (LRC)
                {showSynced ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              </button>
              {showSynced && (
                <div className={`rounded-lg border transition-colors ${fields.syncedLyrics !== original.syncedLyrics && !(fields.syncedLyrics === '' && original.syncedLyrics === '') ? 'border-[var(--accent)]/50 bg-[var(--accent)]/[0.02]' : 'border-[var(--border)]'}`}>
                  <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--border)]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] opacity-60">LRC</span>
                    <span className="text-[10px] text-[var(--text-muted)] opacity-40">{fields.syncedLyrics ? fields.syncedLyrics.split('\n').length + ' lines' : 'empty'}</span>
                  </div>
                  <textarea
                    className="w-full bg-transparent text-xs text-[var(--text-primary)] font-mono px-3 py-2.5 focus:outline-none placeholder:text-[var(--text-muted)] placeholder:opacity-25 resize-none leading-relaxed"
                    rows={6}
                    value={fields.syncedLyrics}
                    onChange={e => set('syncedLyrics', e.target.value)}
                    placeholder={"[00:12.00]Line one\n[00:17.20]Line two"}
                    spellCheck={false}
                  />
                </div>
              )}
            </div>

            <div className="h-4" />
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[var(--border)] shrink-0 flex items-center gap-3">
          {error && (
            <div className="flex items-center gap-2 text-amber-400 text-xs flex-1 min-w-0">
              <AlertCircle size={13} className="shrink-0" />
              <span className="truncate">{error}</span>
            </div>
          )}
          {!error && track.ext !== 'mp3' && (
            <p className="text-[var(--text-muted)] text-xs flex-1">Note: tag writing only supported for MP3</p>
          )}
          <div className="flex gap-2 ml-auto shrink-0">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-overlay)] transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              Save{changedCount > 0 ? ` (\${changedCount})` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
