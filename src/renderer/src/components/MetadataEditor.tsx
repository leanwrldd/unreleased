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

function Field({ label, value, onChange, multiline = false, hint }: {
  label: string; value: string; onChange: (v: string) => void; multiline?: boolean; hint?: string
}): JSX.Element {
  const base = "w-full bg-[var(--surface-overlay)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm px-3 py-2 focus:outline-none focus:border-[var(--accent)] transition-colors placeholder:text-[var(--text-muted)]"
  return (
    <div>
      <label className="block text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">{label}</label>
      {multiline
        ? <textarea className={`${base} resize-none`} rows={4} value={value} onChange={e => onChange(e.target.value)} placeholder={hint} />
        : <input className={base} value={value} onChange={e => onChange(e.target.value)} placeholder={hint} />
      }
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
  const [fields, setFields] = useState<MetaFields>({
    title: track.title, artist: track.artist, album: track.album,
    albumArtist: track.albumArtist, year: track.year ? String(track.year) : '',
    trackNumber: track.trackNumber ? String(track.trackNumber) : '',
    discNumber: track.discNumber ? String(track.discNumber) : '',
    composer: track.composer, genre: track.genre,
    lyrics: '', syncedLyrics: '', albumArt: track.albumArt ?? null,
  })

  useEffect(() => {
    if (!el) { setLoading(false); return }
    el.readTrackMetadata(track.filePath).then((meta: Record<string, any> | null) => {
      if (meta && !meta.error) {
        setFields(f => ({
          ...f,
          title: meta.title || f.title,
          artist: meta.artist || f.artist,
          album: meta.album || f.album,
          albumArtist: meta.albumArtist || f.albumArtist,
          year: meta.year ? String(meta.year) : f.year,
          trackNumber: meta.trackNumber ? String(meta.trackNumber) : f.trackNumber,
          discNumber: meta.discNumber ? String(meta.discNumber) : '',
          composer: meta.composer || f.composer,
          genre: meta.genre || f.genre,
          lyrics: meta.lyrics || '',
          syncedLyrics: meta.syncedLyrics || '',
          albumArt: meta.albumArt || f.albumArt,
        }))
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

  const handleSave = async () => {
    if (!el) return
    if (track.ext !== 'mp3') {
      setError('Metadata writing is only supported for MP3 files. Tags were not saved to disk, but the display will update.')
      // Update in-memory only
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
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] shrink-0">
          <div className="min-w-0">
            <h2 className="text-[var(--text-primary)] font-semibold text-base truncate">Edit Info</h2>
            <p className="text-[var(--text-muted)] text-xs truncate mt-0.5">{track.filePath.split(/[/\\]/).pop()}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-overlay)] transition-colors ml-3 shrink-0">
            <X size={16} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 size={24} className="animate-spin text-[var(--accent)]" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="p-5 flex gap-5">
              {/* Album Art */}
              <div className="shrink-0 flex flex-col items-center gap-2">
                <div
                  className="w-36 h-36 rounded-xl bg-[var(--surface-overlay)] border border-[var(--border)] overflow-hidden cursor-pointer group relative"
                  onClick={handlePickArt}
                  title="Click to change album art"
                >
                  {fields.albumArt
                    ? <img src={fields.albumArt} alt="Album art" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]"><Music size={32} /></div>
                  }
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Upload size={20} className="text-white" />
                  </div>
                </div>
                <button onClick={handlePickArt} className="text-[11px] text-[var(--accent)] hover:underline">
                  Change art
                </button>
                {fields.albumArt && (
                  <button onClick={() => set('albumArt', null)} className="text-[11px] text-[var(--text-muted)] hover:text-red-400">
                    Remove
                  </button>
                )}
                <div className="text-center mt-1">
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{track.ext.toUpperCase()}</p>
                  {track.bitrate && <p className="text-[10px] text-[var(--text-muted)]">{track.bitrate} kbps</p>}
                  {track.sampleRate && <p className="text-[10px] text-[var(--text-muted)]">{(track.sampleRate / 1000).toFixed(1)} kHz</p>}
                </div>
              </div>

              {/* Fields */}
              <div className="flex-1 min-w-0 space-y-3">
                <Field label="Title" value={fields.title} onChange={v => set('title', v)} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Artist" value={fields.artist} onChange={v => set('artist', v)} />
                  <Field label="Album Artist" value={fields.albumArtist} onChange={v => set('albumArtist', v)} />
                </div>
                <Field label="Album" value={fields.album} onChange={v => set('album', v)} />
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Year" value={fields.year} onChange={v => set('year', v)} hint="2019" />
                  <Field label="Track #" value={fields.trackNumber} onChange={v => set('trackNumber', v)} hint="1" />
                  <Field label="Disc #" value={fields.discNumber} onChange={v => set('discNumber', v)} hint="1" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Genre" value={fields.genre} onChange={v => set('genre', v)} />
                  <Field label="Composer" value={fields.composer} onChange={v => set('composer', v)} />
                </div>
              </div>
            </div>

            {/* Lyrics */}
            <div className="px-5 pb-5 space-y-3">
              <Field label="Lyrics" value={fields.lyrics} onChange={v => set('lyrics', v)} multiline />
              <div>
                <button
                  className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1 hover:text-[var(--text-primary)] transition-colors"
                  onClick={() => setShowSynced(v => !v)}
                >
                  Synced Lyrics (LRC)
                  {showSynced ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
                {showSynced && (
                  <textarea
                    className="w-full bg-[var(--surface-overlay)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-xs font-mono px-3 py-2 focus:outline-none focus:border-[var(--accent)] transition-colors resize-none"
                    rows={6}
                    value={fields.syncedLyrics}
                    onChange={e => set('syncedLyrics', e.target.value)}
                    placeholder="[00:12.00]Line one&#10;[00:17.20]Line two"
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[var(--border)] shrink-0 flex items-center gap-3">
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
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
