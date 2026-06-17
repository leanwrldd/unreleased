import { useState, useEffect, useRef } from 'react'
import { X, Save, AlertCircle, CheckCircle2, Camera, Download, Copy, ImagePlus, Music, RefreshCw } from 'lucide-react'
import { useStore } from '../store/useStore'
import { invalidateArtCache } from './AlbumArtThumbnail'

export default function MetadataEditor(): JSX.Element {
  const {
    metadataEditTrack: storeTrack,
    currentTrack,
    currentTrackFull,
    setShowMetadataEditor,
    setMetadataEditTrack,
    setCurrentTrackFull,
    updateTrackInLibrary
  } = useStore()

  const closeEditor = (): void => {
    setMetadataEditTrack(null)
    setShowMetadataEditor(false)
  }

  // Safety guard — should not be reachable for API tracks, but close if somehow triggered
  useEffect(() => {
    if (storeTrack?.streamUrl) closeEditor()
  }, [storeTrack])

  const [editTrack] = useState(() => storeTrack)
  const [editFull, setEditFull] = useState(() => currentTrackFull)

  const [form, setForm] = useState({
    title: '', artist: '', album: '', albumArtist: '',
    year: '', trackNumber: '', genre: '', producer: '', notes: '',
    lyrics: '', syncedLyrics: ''
  })

  const [newCoverArt, setNewCoverArt] = useState<string | null | undefined>(undefined)
  const [artMenuOpen, setArtMenuOpen] = useState(false)
  const artBtnRef = useRef<HTMLDivElement>(null)
  const [lyricsTab, setLyricsTab] = useState<'plain' | 'synced'>('plain')
  const [saving, setSaving] = useState(false)
  const [rescanning, setRescanning] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [statusMsg, setStatusMsg] = useState('')

  const ext = editFull?.ext || ''
  const canWriteTags = ext === '.mp3'
  const currentArt = newCoverArt !== undefined ? newCoverArt : editFull?.albumArt

  useEffect(() => {
    const full = editFull || currentTrackFull
    if (!editTrack) return
    setForm({
      title: full?.title || editTrack.title || '',
      artist: full?.artist || editTrack.artist || '',
      album: full?.album || editTrack.album || '',
      albumArtist: full?.albumArtist || editTrack.albumArtist || '',
      year: String(full?.year || editTrack.year || ''),
      trackNumber: String(full?.trackNumber || editTrack.trackNumber || ''),
      genre: full?.genre || editTrack.genre || '',
      producer: full?.producer || '',
      notes: full?.notes || '',
      lyrics: full?.lyrics || '',
      syncedLyrics: full?.syncedLyrics || ''
    })
    setNewCoverArt(undefined)
  }, [editFull])

  useEffect(() => {
    if (!editTrack) return
    const full = currentTrackFull?.path === editTrack.path ? currentTrackFull : null
    if (!full) {
      window.api.getMetadata(editTrack.path).then((meta) => {
        setEditFull(meta as any)
        // Only update currently playing track's full data if THIS is the playing track
        if (currentTrack?.id === editTrack.id) setCurrentTrackFull(meta)
      })
    } else {
      setEditFull(full)
    }
  }, [])

  useEffect(() => {
    if (!artMenuOpen) return
    const handler = (e: MouseEvent): void => {
      if (artBtnRef.current && !artBtnRef.current.contains(e.target as Node)) setArtMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [artMenuOpen])

  const handleRescan = async (): Promise<void> => {
    if (!editTrack) return
    setRescanning(true)
    try {
      const meta = await window.api.getMetadata(editTrack.path)
      setEditFull(meta as any)
      if (currentTrack?.id === editTrack.id) setCurrentTrackFull(meta)
      setNewCoverArt(undefined)
      setStatus('success'); setStatusMsg('Reloaded from file')
      setTimeout(() => setStatus('idle'), 2500)
    } catch (e) {
      setStatus('error'); setStatusMsg('Failed to read file')
    } finally {
      setRescanning(false)
    }
  }

  const handlePickImage = async (): Promise<void> => {
    if (!canWriteTags) return
    const dataUri = await window.api.openImage()
    if (dataUri) setNewCoverArt(dataUri)
    setArtMenuOpen(false)
  }

  const handleSaveCoverArt = async (): Promise<void> => {
    if (!currentArt || !editTrack) return
    setArtMenuOpen(false)
    try {
      const pngUri = await toPng(currentArt)
      await window.api.exportCoverArt(pngUri, editTrack.title)
    } catch (e) { console.error('Export failed', e) }
  }

  const handleCopyCoverArt = async (): Promise<void> => {
    if (!currentArt) return
    setArtMenuOpen(false)
    try {
      const pngUri = await toPng(currentArt)
      const blob = await (await fetch(pngUri)).blob()
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
    } catch (e) { console.error('Copy failed', e) }
  }

  const handleSave = async (): Promise<void> => {
    if (!editTrack) return
    setSaving(true); setStatus('idle')
    try {
      const tags: Record<string, unknown> = {
        title: form.title, artist: form.artist, album: form.album,
        albumArtist: form.albumArtist,
        year: form.year ? parseInt(form.year) : null,
        trackNumber: form.trackNumber ? parseInt(form.trackNumber) : null,
        genre: form.genre,
        producer: form.producer || null,
        notes: form.notes || null,
        lyrics: form.lyrics || null,
        syncedLyrics: form.syncedLyrics || null
      }
      if (newCoverArt !== undefined) tags.coverArt = newCoverArt

      const result = await window.api.writeMetadata(editTrack.path, tags)
      if (result.error) throw new Error(result.error)

      updateTrackInLibrary(editTrack.id, {
        title: form.title, artist: form.artist, album: form.album,
        albumArtist: form.albumArtist,
        year: form.year ? parseInt(form.year) : null,
        trackNumber: form.trackNumber ? parseInt(form.trackNumber) : null,
        genre: form.genre
      })

      const newArtValue = newCoverArt !== undefined ? (newCoverArt ?? null) : (editFull?.albumArt ?? null)
      const updatedFull = {
        ...(editFull || {}), ...form,
        id: editTrack.id, path: editTrack.path,
        duration: editTrack.duration, hasAlbumArt: editTrack.hasAlbumArt,
        year: form.year ? parseInt(form.year) : null,
        trackNumber: form.trackNumber ? parseInt(form.trackNumber) : null,
        producer: form.producer || null, notes: form.notes || null,
        lyrics: form.lyrics || null, syncedLyrics: form.syncedLyrics || null,
        albumArt: newArtValue, ext: editFull?.ext || ''
      }
      setEditFull(updatedFull as any)
      if (currentTrack?.id === editTrack.id) setCurrentTrackFull(updatedFull as any)
      if (newCoverArt !== undefined) invalidateArtCache(editTrack.path, newCoverArt ?? null)
      setNewCoverArt(undefined)
      setStatus('success'); setStatusMsg('Saved')
      setTimeout(() => setStatus('idle'), 3000)
    } catch (err) {
      setStatus('error'); setStatusMsg(String(err))
    } finally {
      setSaving(false)
    }
  }

  const setField = (key: string, val: string): void => setForm((f) => ({ ...f, [key]: val }))

  if (!editTrack) return <></>

  const filename = editTrack.path.split(/[\\/]/).pop() || ''

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={closeEditor}
    >
      <div
        className="relative bg-surface rounded-2xl shadow-2xl border border-[var(--border)] w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0">
          <div className="min-w-0">
            <h2 className="text-text-primary font-bold text-base">Edit Track Info</h2>
            <p className="text-text-muted text-xs mt-0.5 truncate max-w-sm" title={editTrack.path}>{filename}</p>
          </div>
          <div className="flex items-center gap-1 ml-4 shrink-0">
            <button
              onClick={handleRescan}
              disabled={rescanning}
              className="text-text-muted hover:text-text-primary transition-colors p-1.5 rounded-lg hover:bg-surface-overlay disabled:opacity-40"
              title="Re-read metadata from file"
            >
              <RefreshCw size={15} className={rescanning ? 'animate-spin' : ''} />
            </button>
            <button onClick={closeEditor} className="text-text-muted hover:text-text-primary transition-colors p-1.5 rounded-lg hover:bg-surface-overlay">
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Body: two-column layout */}
        <div className="flex flex-1 min-h-0 gap-0">

          {/* Left: art + meta info */}
          <div className="w-52 shrink-0 flex flex-col gap-4 px-6 pb-6">
            {/* Cover art */}
            <div className="relative group" ref={artBtnRef}>
              <div
                className={`w-full aspect-square rounded-xl overflow-hidden bg-surface-raised flex items-center justify-center ${canWriteTags ? 'cursor-pointer' : ''}`}
                onClick={canWriteTags ? handlePickImage : undefined}
                onContextMenu={(e) => { e.preventDefault(); setArtMenuOpen(true) }}
              >
                {currentArt ? (
                  <img src={currentArt} alt="Cover art" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-text-muted">
                    <Music size={36} strokeWidth={1} />
                    <span className="text-xs">No artwork</span>
                  </div>
                )}
              </div>

              {/* Hover overlay */}
              {canWriteTags && (
                <div className="absolute inset-0 rounded-xl bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="flex flex-col items-center gap-1 text-white">
                    <Camera size={22} />
                    <span className="text-xs font-medium">Change</span>
                  </div>
                </div>
              )}

              {/* Pending badge */}
              {newCoverArt !== undefined && newCoverArt !== null && (
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-accent text-black text-[9px] flex items-center justify-center font-bold shadow-lg">!</div>
              )}

              {/* Art context menu */}
              {artMenuOpen && (
                <>
                  <div className="fixed inset-0 z-[60]" onMouseDown={() => setArtMenuOpen(false)} />
                  <div className="absolute top-full mt-1 left-0 z-[61] bg-surface-highest border border-[var(--border)] rounded-xl shadow-2xl py-1 min-w-[160px] animate-scale-in">
                    {canWriteTags && (
                      <button onClick={handlePickImage}
                        className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-overlay transition-colors">
                        <ImagePlus size={13} /> Change cover…
                      </button>
                    )}
                    {currentArt && (
                      <>
                        <button onClick={handleSaveCoverArt}
                          className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-overlay transition-colors">
                          <Download size={13} /> Save as PNG…
                        </button>
                        <button onClick={handleCopyCoverArt}
                          className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-overlay transition-colors">
                          <Copy size={13} /> Copy image
                        </button>
                      </>
                    )}
                    {newCoverArt !== undefined && (
                      <>
                        <div className="border-t border-[var(--border)] my-1" />
                        <button onClick={() => { setNewCoverArt(undefined); setArtMenuOpen(false) }}
                          className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-red-400 hover:bg-surface-overlay transition-colors">
                          Reset artwork
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* File meta */}
            <div className="space-y-2">
              <MetaRow label="Format" value={ext.replace('.', '').toUpperCase() || '—'} />
              <MetaRow label="Duration" value={editTrack.duration ? formatDur(editTrack.duration) : '—'} />
              {editFull?.sampleRate && (
                <MetaRow label="Sample Rate" value={`${(editFull.sampleRate / 1000).toFixed(1)} kHz`} />
              )}
              {editFull?.bitrate && (
                <MetaRow label="Bitrate" value={`${Math.round(editFull.bitrate / 1000)} kbps`} />
              )}
              {editFull?.bitsPerSample && (
                <MetaRow label="Bit Depth" value={`${editFull.bitsPerSample}-bit`} />
              )}
              {editFull?.channels !== undefined && (
                <MetaRow label="Channels" value={editFull.channels === 1 ? 'Mono' : editFull.channels === 2 ? 'Stereo' : `${editFull.channels}ch`} />
              )}
              {editFull?.fileSize && (
                <MetaRow label="File Size" value={formatFileSize(editFull.fileSize)} />
              )}
              {!canWriteTags && (
                <div className="flex items-start gap-1.5 mt-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
                  <AlertCircle size={12} className="text-yellow-500 shrink-0 mt-0.5" />
                  <span className="text-[11px] text-yellow-600 dark:text-yellow-400 leading-relaxed">Tag writing only supported for MP3</span>
                </div>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="w-px bg-[var(--border)] shrink-0" />

          {/* Right: form fields */}
          <div className="flex-1 min-w-0 overflow-y-auto px-6 pb-6 space-y-4">

            {/* Title — large */}
            <div className="pt-1">
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-1.5">Title</label>
              <input
                value={form.title} onChange={(e) => setField('title', e.target.value)}
                className="w-full bg-surface-raised text-text-primary text-lg font-semibold rounded-xl px-4 py-3 outline-none focus:ring-2 ring-accent/40 placeholder:text-text-muted transition-shadow"
                placeholder="Track title"
              />
            </div>

            {/* Artist + Album */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Artist" value={form.artist} onChange={(v) => setField('artist', v)} />
              <Field label="Album" value={form.album} onChange={(v) => setField('album', v)} />
            </div>

            {/* Secondary grid */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Album Artist" value={form.albumArtist} onChange={(v) => setField('albumArtist', v)} />
              <Field label="Genre" value={form.genre} onChange={(v) => setField('genre', v)} />
              <Field label="Year" value={form.year} onChange={(v) => setField('year', v)} type="number" />
              <Field label="Track #" value={form.trackNumber} onChange={(v) => setField('trackNumber', v)} type="number" />
              <Field label="Producer" value={form.producer} onChange={(v) => setField('producer', v)} />
            </div>

            <Field label="Notes" value={form.notes} onChange={(v) => setField('notes', v)} multiline />

            {/* Lyrics */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[10px] font-semibold uppercase tracking-widest text-text-muted">Lyrics</label>
                <div className="flex bg-surface-raised rounded-lg p-0.5 gap-0.5">
                  {(['plain', 'synced'] as const).map((t) => (
                    <button key={t} onClick={() => setLyricsTab(t)}
                      className={`text-xs px-3 py-1 rounded-md transition-colors font-medium ${
                        lyricsTab === t ? 'bg-surface-highest text-text-primary' : 'text-text-muted hover:text-text-secondary'
                      }`}>
                      {t === 'plain' ? 'Plain' : 'Synced (LRC)'}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                className="w-full h-40 bg-surface-raised text-text-primary text-sm rounded-xl px-4 py-3 outline-none focus:ring-2 ring-accent/40 resize-none placeholder:text-text-muted font-mono leading-relaxed transition-shadow"
                placeholder={lyricsTab === 'plain' ? 'Paste plain lyrics here…' : '[00:12.00] First line\n[00:17.50] Second line'}
                value={lyricsTab === 'plain' ? form.lyrics : form.syncedLyrics}
                onChange={(e) => setField(lyricsTab === 'plain' ? 'lyrics' : 'syncedLyrics', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--border)] shrink-0">
          <div className="text-sm min-h-[20px]">
            {status === 'success' && (
              <span className="flex items-center gap-1.5 text-accent">
                <CheckCircle2 size={14} /> {statusMsg}
              </span>
            )}
            {status === 'error' && (
              <span className="flex items-center gap-1.5 text-red-400">
                <AlertCircle size={14} /> {statusMsg}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={closeEditor}
              className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors rounded-lg">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-accent hover:bg-accent-hover text-black text-sm font-semibold rounded-full transition-all disabled:opacity-50 active:scale-95">
              <Save size={14} />
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function formatDur(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function MetaRow({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-text-muted uppercase tracking-wider">{label}</span>
      <span className="text-xs text-text-secondary font-mono">{value}</span>
    </div>
  )
}

function toPng(dataUri: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = img.naturalWidth; c.height = img.naturalHeight
      c.getContext('2d')!.drawImage(img, 0, 0)
      resolve(c.toDataURL('image/png'))
    }
    img.onerror = reject
    img.src = dataUri
  })
}

function Field({ label, value, onChange, type = 'text', multiline = false }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; multiline?: boolean
}): JSX.Element {
  return (
    <div>
      <label className="block text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-1.5">{label}</label>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3}
          className="w-full bg-surface-raised text-text-primary text-sm rounded-xl px-4 py-2.5 outline-none focus:ring-2 ring-accent/40 placeholder:text-text-muted resize-none transition-shadow" />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
          className="w-full bg-surface-raised text-text-primary text-sm rounded-xl px-4 py-2.5 outline-none focus:ring-2 ring-accent/40 placeholder:text-text-muted transition-shadow" />
      )}
    </div>
  )
}
