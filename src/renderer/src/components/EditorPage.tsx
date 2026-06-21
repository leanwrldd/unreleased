import { useState, useEffect, useCallback } from 'react'
import {
  Loader2, Check, AlertCircle, LogIn, Clock, X, ChevronDown,
  ChevronUp, Award, Music2, FileText, Pencil, Plus,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { apiFetch, JWApiSong, JWApiEra, buildImageUrl, CATEGORY_LABELS } from '../lib/juicewrldApi'
import * as userApi from '../lib/userApi'
import type { EditorApplication } from '../lib/userApi'

type SubmitState = 'idle' | 'submitting' | 'submitted' | 'error'
type LyricsTab = 'lyrics' | 'synced'

const CATEGORIES = [
  { value: 'released',          label: 'Released' },
  { value: 'unreleased',        label: 'Unreleased' },
  { value: 'unsurfaced',        label: 'Unsurfaced' },
  { value: 'recording_session', label: 'Session' },
]

const CAT_PILL: Record<string, string> = {
  released:          'bg-emerald-500 text-white',
  unreleased:        'bg-accent text-white',
  unsurfaced:        'bg-yellow-500 text-black',
  recording_session: 'bg-zinc-500 text-white',
}

const CAT_BADGE: Record<string, string> = {
  released:          'bg-emerald-500/20 text-emerald-400',
  unreleased:        'bg-accent/20 text-accent',
  unsurfaced:        'bg-yellow-500/20 text-yellow-400',
  recording_session: 'bg-zinc-500/20 text-zinc-400',
}

function cleanDate(raw: string | null | undefined): string {
  if (!raw) return ''
  return raw.replace(/^[A-Za-z][a-z]+\s+(?=[A-Z]|\d)/g, '').trim().replace(/\.$/, '').trim()
}

function diff(before: Record<string, unknown>, after: Record<string, unknown>): Record<string, unknown> {
  const patch: Record<string, unknown> = {}
  for (const k of Object.keys(after)) {
    const a = after[k], b = before[k]
    if (a === '' && (b === '' || b == null)) continue
    if (a == null && b == null) continue
    if (JSON.stringify(a) !== JSON.stringify(b)) patch[k] = a === '' ? null : a
  }
  return patch
}

/* ── Section header ─────────────────────────────────────────────────────────── */
function SectionLabel({ label }: { label: string }): JSX.Element {
  return (
    <div className="flex items-center gap-2.5 px-4 pt-5 pb-1.5">
      <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted opacity-55 shrink-0 select-none">{label}</span>
      <div className="flex-1 h-px bg-[var(--border)]/50" />
    </div>
  )
}

/* ── Two-column field row ───────────────────────────────────────────────────── */
function FieldRow({ label, value, original, onChange, placeholder, mono = false }: {
  label: string; value: string; original: string
  onChange: (v: string) => void; placeholder?: string; mono?: boolean
}): JSX.Element {
  const changed = value !== original && !(value === '' && original === '')
  return (
    <div className={`group grid grid-cols-[84px_1fr] gap-x-3 items-baseline px-4 py-[7px] border-l-2 transition-all
      ${changed ? 'border-accent/70 bg-accent/[0.025]' : 'border-transparent hover:bg-white/[0.05]'}`}>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted opacity-65 select-none truncate pt-px">
        {label}
      </span>
      <div className="flex items-center gap-2 min-w-0">
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder ?? (original || '—')}
          className={`flex-1 bg-transparent text-sm text-text-primary focus:outline-none placeholder:text-text-muted placeholder:opacity-25 min-w-0 border-b border-[var(--border)] pb-px focus:border-accent transition-colors ${mono ? 'font-mono' : ''}`}
        />
        {changed && <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-accent/80" />}
      </div>
    </div>
  )
}

/* ── Select row ─────────────────────────────────────────────────────────────── */
function SelectRow({ label, value, original, onChange, options, placeholder }: {
  label: string; value: string; original: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]; placeholder?: string
}): JSX.Element {
  const changed = value !== original
  return (
    <div className={`group grid grid-cols-[84px_1fr] gap-x-3 items-baseline px-4 py-[7px] border-l-2 transition-all
      ${changed ? 'border-accent/70 bg-accent/[0.025]' : 'border-transparent hover:bg-white/[0.05]'}`}>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted opacity-65 select-none truncate pt-px">
        {label}
      </span>
      <div className="flex items-center gap-2 min-w-0">
        <select
          value={value} onChange={e => onChange(e.target.value)}
          className="flex-1 bg-transparent text-sm text-text-primary focus:outline-none appearance-none cursor-pointer min-w-0 border-b border-[var(--border)] pb-px"
        >
          <option value="">{placeholder || '—'}</option>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {changed && <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-accent/80" />}
      </div>
    </div>
  )
}

/* ── Textarea row ───────────────────────────────────────────────────────────── */
function TextareaRow({ label, value, original, onChange, rows = 3, placeholder, mono = false }: {
  label: string; value: string; original: string
  onChange: (v: string) => void; rows?: number; placeholder?: string; mono?: boolean
}): JSX.Element {
  const changed = value !== original && !(value === '' && original === '')
  return (
    <div className={`group border-l-2 transition-all px-4 py-2 ${changed ? 'border-accent/70 bg-accent/[0.025]' : 'border-transparent'}`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted opacity-65 select-none">{label}</span>
        {changed && <span className="w-1.5 h-1.5 rounded-full bg-accent/80" />}
      </div>
      <textarea
        rows={rows} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder || '—'}
        className={`w-full bg-surface-overlay rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none resize-none placeholder:text-text-muted placeholder:opacity-25 border transition-colors ${changed ? 'border-accent/20' : 'border-[var(--border)]'} ${mono ? 'font-mono' : ''}`}
      />
    </div>
  )
}

/* ── Genius lyrics helpers ─────────────────────────────────────────────────── */
const isGeniusUrl = (s: string): boolean =>
  /^https?:\/\/(www\.)?genius\.com\/.+/i.test(s.trim())

function extractGeniusLyrics(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const containers = Array.from(doc.querySelectorAll('[data-lyrics-container="true"]'))
  if (!containers.length) throw new Error('No lyrics containers found')

  const raw = containers
    .map(c => {
      const clone = c.cloneNode(true) as Element
      clone.querySelectorAll('br').forEach(br => br.replaceWith('\n'))
      return clone.textContent ?? ''
    })
    .join('\n\n')

  // The page injects contributor counts, translations, and a song description
  // before the actual lyrics. Trim everything up to the first [Section] tag.
  // Fall back to trimming after "Read More" (end of song description) if no tags.
  let start = raw.indexOf('[')
  if (start < 0) {
    const rm = raw.lastIndexOf('Read More')
    start = rm >= 0 ? rm + 9 : 0
  }

  return raw
    .slice(start)
    .replace(/^\[.*?\]\n?/gm, '')   // strip section tags
    .replace(/\n{2,}/g, '\n\n')
    .trim()
}

/* ── Main export ──────────────────────────────────────────────────────────── */
export default function EditorPage(): JSX.Element {
  const {
    account, currentTrack,
    pendingEditorSongId, setPendingEditorSongId, setActiveView,
    pendingEditProposal, setPendingEditProposal,
    setShowUserAuth, logoutAccount,
  } = useStore()
  const isEditor = !!account?.is_editor
  const isAdmin  = !!account?.is_administrator

  const [application, setApplication] = useState<EditorApplication | null>(null)
  const [appLoading, setAppLoading]   = useState(false)

  const [song,    setSong]    = useState<JWApiSong | null>(null)
  const [loading, setLoading] = useState(false)
  const [eras,    setEras]    = useState<JWApiEra[]>([])

  const [name,     setName]     = useState('')
  const [artists,  setArtists]  = useState('')
  const [album,    setAlbum]    = useState('')
  const [cat,      setCat]      = useState('')
  const [eraId,    setEraId]    = useState('')
  const [prod,     setProd]     = useState('')
  const [eng,      setEng]      = useState('')
  const [loc,      setLoc]      = useState('')
  const [recDate,  setRecDate]  = useState('')
  const [relDate,  setRelDate]  = useState('')
  const [leak,     setLeak]     = useState('')
  const [lyrics,   setLyrics]   = useState('')
  const [synced,   setSynced]   = useState('')
  const [addInfo,  setAddInfo]  = useState('')
  const [notes,    setNotes]    = useState('')
  const [edNotes,  setEdNotes]  = useState('')

  const [lyricsTab,    setLyricsTab]    = useState<LyricsTab>('lyrics')
  const [lyricsLoading, setLyricsLoading] = useState(false)
  const [lyricsError,   setLyricsError]   = useState<string | null>(null)
  const [submitState,  setSubmitState]  = useState<SubmitState>('idle')
  const [submitError,  setSubmitError]  = useState<string | null>(null)
  const [showMore,     setShowMore]     = useState(false)
  const [editingPropId, setEditingPropId] = useState<number | null>(null)


  const baseline = (s: JWApiSong | null): Record<string, unknown> => {
    if (!s) return {}
    return {
      name:                   s.track_titles?.[0] || s.name,
      credited_artists:       s.credited_artists || '',
      album:                  s.era?.name || '',
      category:               s.category || '',
      era_id:                 s.era?.id ?? '',
      producers:              s.producers || '',
      engineers:              s.engineers || '',
      recording_locations:    s.recording_locations || '',
      record_dates:           s.record_dates || '',
      release_date:           cleanDate(s.release_date),
      leak_type:              s.leak_type || '',
      lyrics:                 s.lyrics || '',
      synced_lyrics:          s.synced_lyrics || '',
      additional_information: s.additional_information || '',
      notes:                  s.notes || '',
    }
  }

  const populate = useCallback((s: JWApiSong): void => {
    setName(s.track_titles?.[0] || s.name)
    setArtists(s.credited_artists || '')
    setAlbum(s.era?.name || '')
    setCat(s.category || '')
    setEraId(s.era?.id ? String(s.era.id) : '')
    setProd(s.producers || '')
    setEng(s.engineers || '')
    setLoc(s.recording_locations || '')
    setRecDate(s.record_dates || '')
    setRelDate(cleanDate(s.release_date))
    setLeak(s.leak_type || '')
    setLyrics(s.lyrics || '')
    setSynced(s.synced_lyrics || '')
    setAddInfo(s.additional_information || '')
    setNotes(s.notes || '')
    setEdNotes('')
    setSubmitState('idle')
    setSubmitError(null)
  }, [])

  const loadSong = useCallback(async (id: number): Promise<void> => {
    setLoading(true)
    try {
      const s = await apiFetch<JWApiSong>(`/songs/${id}/`)
      setSong(s)
      populate(s)
    } catch {} finally { setLoading(false) }
  }, [populate])

  useEffect(() => {
    if (!isEditor) return
    apiFetch<JWApiEra[] | { results: JWApiEra[] }>('/eras/')
      .then(d => setEras(Array.isArray(d) ? d : (d as { results: JWApiEra[] }).results ?? []))
      .catch(() => undefined)
  }, [isEditor])

  useEffect(() => {
    if (!pendingEditorSongId || !isEditor) return
    const id = pendingEditorSongId
    setPendingEditorSongId(null)
    loadSong(id)
  }, [pendingEditorSongId, isEditor, setPendingEditorSongId, loadSong])

  useEffect(() => {
    if (!isEditor || song || pendingEditorSongId) return
    if (!currentTrack) return
    const id = userApi.trackIdToSongId(currentTrack.id)
    if (id) loadSong(id)
  }, [isEditor, song, currentTrack, pendingEditorSongId, loadSong])

  useEffect(() => {
    if (!pendingEditProposal || !isEditor) return
    const { id, songId, proposedData: d, editorNotes } = pendingEditProposal
    setPendingEditProposal(null)
    setEditingPropId(id)
    loadSong(songId).then(() => {
      if ('name' in d)                   setName(String(d.name ?? ''))
      if ('credited_artists' in d)        setArtists(String(d.credited_artists ?? ''))
      if ('album' in d)                   setAlbum(String(d.album ?? ''))
      if ('category' in d)               setCat(String(d.category ?? ''))
      if ('era_id' in d)                 setEraId(d.era_id != null ? String(d.era_id) : '')
      if ('producers' in d)              setProd(String(d.producers ?? ''))
      if ('engineers' in d)              setEng(String(d.engineers ?? ''))
      if ('recording_locations' in d)    setLoc(String(d.recording_locations ?? ''))
      if ('record_dates' in d)           setRecDate(String(d.record_dates ?? ''))
      if ('release_date' in d)           setRelDate(String(d.release_date ?? ''))
      if ('leak_type' in d)              setLeak(String(d.leak_type ?? ''))
      if ('lyrics' in d)                 setLyrics(String(d.lyrics ?? ''))
      if ('additional_information' in d) setAddInfo(String(d.additional_information ?? ''))
      if ('notes' in d)                  setNotes(String(d.notes ?? ''))
      setEdNotes(editorNotes)
    })
  }, [pendingEditProposal, isEditor, setPendingEditProposal, loadSong])

  useEffect(() => {
    if (!account || isEditor) { setApplication(null); return }
    setAppLoading(true)
    userApi.getMyApplication()
      .then(r => setApplication(r.application))
      .catch(() => setApplication(null))
      .finally(() => setAppLoading(false))
  }, [account, isEditor])

  const current: Record<string, unknown> = {
    name, credited_artists: artists, album, category: cat,
    era_id: eraId ? Number(eraId) : '',
    producers: prod, engineers: eng,
    recording_locations: loc, record_dates: recDate,
    release_date: relDate, leak_type: leak,
    lyrics, synced_lyrics: synced,
    additional_information: addInfo, notes,
  }
  const patch        = diff(baseline(song), current)
  const changedCount = Object.keys(patch).length
  const base         = baseline(song)

  const cancelEditProposal = (): void => {
    setEditingPropId(null)
    if (song) populate(song)
  }

  const submit = async (): Promise<void> => {
    if (!song || changedCount === 0) return
    setSubmitState('submitting')
    setSubmitError(null)
    try {
      if (editingPropId != null) {
        await userApi.updateProposal(editingPropId, { proposed_data: patch, editor_notes: edNotes })
        setEditingPropId(null)
      } else {
        await userApi.createProposal({
          song: song.id, change_type: 'update',
          title: name || song.name, proposed_data: patch, editor_notes: edNotes,
        })
      }
      setSubmitState('submitted')
      setTimeout(() => setSubmitState('idle'), 3000)
    } catch (e) {
      setSubmitState('error')
      setSubmitError(e instanceof Error ? e.message : 'Submission failed')
      setTimeout(() => setSubmitState('idle'), 4000)
    }
  }


  const handleLyricsPaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>): Promise<void> => {
    const pasted = e.clipboardData.getData('text')
    if (!pasted) return

    // ── Genius URL → fetch lyrics ──────────────────────────────────────────
    if (isGeniusUrl(pasted)) {
      e.preventDefault()
      setLyricsLoading(true)
      setLyricsError(null)
      try {
        const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(pasted.trim())}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        setLyrics(extractGeniusLyrics(await res.text()))
      } catch {
        setLyricsError('Could not fetch lyrics — check the URL or try again')
        setTimeout(() => setLyricsError(null), 4000)
      } finally {
        setLyricsLoading(false)
      }
      return
    }

    // ── Genius-style [tags] → strip ────────────────────────────────────────
    if (!/\[.*?\]/.test(pasted)) return
    e.preventDefault()
    const cleaned = pasted
      .replace(/\r\n/g, '\n')
      .replace(/^\[.*?\]\n?/gm, '')
      .replace(/\n{2,}/g, '\n\n')
      .trim()
    const el = e.currentTarget
    const start = el.selectionStart ?? lyrics.length
    const end   = el.selectionEnd   ?? lyrics.length
    setLyrics(lyrics.substring(0, start) + cleaned + lyrics.substring(end))
    requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = start + cleaned.length })
  }

  /* ── Guards ──────────────────────────────────────────────────────────────── */
  if (!account) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-surface-overlay border border-[var(--border)] flex items-center justify-center">
        <LogIn size={24} className="text-text-muted" />
      </div>
      <div className="space-y-1.5">
        <p className="text-text-primary font-bold text-base">Log in to contribute</p>
        <p className="text-text-muted text-sm max-w-[220px]">Editors propose corrections to song entries.</p>
      </div>
      <button onClick={() => setShowUserAuth(true)}
        className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] text-white text-sm font-semibold transition-colors shadow-lg">
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.03.06a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 13.978 13.978 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
        Continue with Discord
      </button>
    </div>
  )

  if (!isEditor) return (
    <ApplicationView
      application={application} loading={appLoading}
      onSubmitted={a => setApplication(a)} onSignOut={() => logoutAccount()}
    />
  )

  /* ── Editor UI ───────────────────────────────────────────────────────────── */
  return (
    <div className="flex-1 flex flex-col min-h-0">

      {/* Top bar */}
      <div className="shrink-0 flex items-center gap-2 px-4 py-2.5 border-b border-[var(--border)]">
        <span className="flex-1 font-bold text-sm text-text-primary">Edit song</span>
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${isAdmin ? 'bg-accent/20 text-accent' : 'bg-emerald-500/20 text-emerald-400'}`}>
          {isAdmin ? 'admin' : 'editor'}
        </span>
        <span className="text-text-muted opacity-75 text-xs truncate max-w-[90px]">{account.display_name || account.discord_username}</span>
        <button onClick={() => logoutAccount()} className="text-text-muted opacity-65 hover:opacity-100 text-xs transition-colors">out</button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto min-h-0">

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 size={18} className="animate-spin text-text-muted" />
          </div>
        ) : !song ? (
          <div className="flex flex-col items-center justify-center gap-3 h-64 px-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-surface-overlay border border-[var(--border)] flex items-center justify-center">
              <FileText size={18} className="text-text-muted opacity-65" />
            </div>
            <div className="space-y-1">
              <p className="text-text-primary text-sm font-medium">No song selected</p>
              <p className="text-text-muted opacity-65 text-xs leading-relaxed">Play a song to start editing,<br/>or use the context menu.</p>
            </div>
          </div>
        ) : (
          <>
            {/* ── Editing proposal banner ── */}
            {editingPropId != null && (
              <div className="flex items-center gap-2 px-4 py-2 bg-accent/10 border-b border-accent/20 shrink-0">
                <Pencil size={11} className="text-accent shrink-0" />
                <span className="text-xs text-accent font-medium flex-1">Editing proposal #{editingPropId}</span>
                <button onClick={cancelEditProposal}
                  className="text-accent opacity-60 hover:opacity-100 text-xs transition-colors">
                  Cancel
                </button>
              </div>
            )}

            {/* ── Song header with blurred art ── */}
            <div className="relative overflow-hidden shrink-0">
              {song.image_url && (
                <img
                  src={buildImageUrl(song.image_url)} alt=""
                  className="absolute inset-0 w-full h-full object-cover scale-150 blur-3xl opacity-[0.18] pointer-events-none select-none"
                />
              )}
              <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to bottom, transparent 0%, var(--surface) 100%)" }} />
              <div className="relative flex items-end gap-3.5 px-4 pt-7 pb-4">
                {song.image_url
                  ? <img src={buildImageUrl(song.image_url)} alt=""
                      className="w-[60px] h-[60px] rounded-xl object-cover shadow-xl shrink-0 ring-1 ring-white/10" />
                  : <div className="w-[60px] h-[60px] rounded-xl bg-surface-overlay border border-[var(--border)] flex items-center justify-center shrink-0">
                      <Music2 size={22} className="text-text-muted" />
                    </div>
                }
                <div className="min-w-0 flex-1 pb-0.5">
                  <p className="text-text-primary font-bold text-[15px] leading-snug truncate">
                    {song.track_titles?.[0] || song.name}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${CAT_BADGE[song.category] || 'bg-surface-overlay text-text-muted'}`}>
                      {CATEGORY_LABELS[song.category] || song.category}
                    </span>
                    {song.era?.name && (
                      <span className="text-text-muted opacity-75 text-[11px] truncate">{song.era.name}</span>
                    )}
                    <span className="text-text-muted opacity-25 text-[11px]">#{song.id}</span>
                  </div>
                </div>
                <button
                  onClick={() => { setSong(null); setEditingPropId(null) }}
                  className="p-1.5 rounded-lg text-text-muted opacity-30 hover:opacity-100 hover:bg-white/10 transition-colors shrink-0 mb-0.5">
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* ── Field sections ── */}
            <div className="pb-4">

              {/* IDENTITY */}
              <SectionLabel label="Identity" />
              <FieldRow label="Title"   value={name}    original={String(base.name || '')}    onChange={setName} />
              <FieldRow label="Artists" value={artists} original={String(base.credited_artists || '')} onChange={setArtists} />
              <FieldRow label="Album"   value={album}   original={String(base.album || '')}   onChange={setAlbum} />

              {/* CLASSIFICATION */}
              <SectionLabel label="Classification" />

              {/* Category pills */}
              <div className={`border-l-2 transition-all px-4 py-2 ${cat !== String(base.category || '') ? 'border-accent/70 bg-accent/[0.025]' : 'border-transparent'}`}>
                <div className="grid grid-cols-[84px_1fr] gap-x-3 items-start">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted opacity-65 select-none pt-1">Category</span>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORIES.map(c => (
                      <button key={c.value} onClick={() => setCat(c.value)}
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-all ${
                          cat === c.value
                            ? CAT_PILL[c.value] || 'bg-accent text-white'
                            : 'bg-surface-overlay text-text-muted hover:text-text-primary border border-[var(--border)]'
                        }`}>
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <SelectRow
                label="Era" value={eraId} original={song.era?.id ? String(song.era.id) : ''}
                onChange={setEraId}
                options={eras.map(e => ({ value: String(e.id), label: e.name }))}
                placeholder={song.era?.name || '—'}
              />

              {/* CREDITS */}
              <SectionLabel label="Credits" />
              <FieldRow label="Producers" value={prod}    original={String(base.producers || '')} onChange={setProd} />

              {/* DATES */}
              <SectionLabel label="Dates" />
              <FieldRow label="Recorded"  value={recDate} original={String(base.record_dates || '')}  onChange={setRecDate} placeholder="YYYY-MM-DD" />
              <FieldRow label="Released"  value={relDate} original={String(base.release_date || '')}  onChange={setRelDate} placeholder="YYYY-MM-DD" />

              {/* More fields */}
              <button
                onClick={() => setShowMore(v => !v)}
                className="flex items-center gap-1.5 w-full px-4 pt-4 pb-1 text-[11px] text-text-muted opacity-65 hover:opacity-70 transition-colors select-none">
                {showMore ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                {showMore ? 'Fewer fields' : 'More fields'}
              </button>

              {showMore && (
                <>
                  <FieldRow label="Engineers" value={eng}    original={String(base.engineers || '')}             onChange={setEng} />
                  <FieldRow label="Location"  value={loc}    original={String(base.recording_locations || '')}   onChange={setLoc} placeholder="Studio / city" />
                  <FieldRow label="Leak type" value={leak}   original={String(base.leak_type || '')}             onChange={setLeak} placeholder="HQ, LQ, snippet…" />
                  <div className="pt-2 space-y-2">
                    <TextareaRow label="Add. info" value={addInfo} original={String(base.additional_information || '')} onChange={setAddInfo} rows={3} />
                    <TextareaRow label="Notes"     value={notes}   original={String(base.notes || '')}                  onChange={setNotes}   rows={2} />
                  </div>
                </>
              )}

              {/* LYRICS */}
              <SectionLabel label="Lyrics" />

              {/* Tab pills */}
              <div className="flex items-center gap-1 px-4 pb-2">
                {(['lyrics', 'synced'] as LyricsTab[]).map(tab => {
                  const active = lyricsTab === tab
                  const dirty = tab === 'lyrics'
                    ? lyrics !== String(base.lyrics || '')
                    : !!synced
                  return (
                    <button key={tab} onClick={() => setLyricsTab(tab)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                        active ? 'bg-surface-overlay text-text-primary' : 'text-text-muted opacity-75 hover:text-text-muted'
                      }`}>
                      {tab === 'lyrics' ? 'Lyrics' : 'Synced'}
                      {dirty && <span className="w-1 h-1 rounded-full bg-accent inline-block" />}
                    </button>
                  )
                })}

              </div>

              <div className="px-4">
                {lyricsTab === 'lyrics' ? (
                  <div className="relative">
                    <textarea
                      rows={15} value={lyrics} onChange={e => setLyrics(e.target.value)}
                      onPaste={handleLyricsPaste}
                      disabled={lyricsLoading}
                      placeholder="Full lyrics… or paste a Genius URL"
                      className={`w-full bg-surface-overlay rounded-xl px-3.5 py-3 text-sm text-text-primary focus:outline-none resize-none placeholder:text-text-muted placeholder:opacity-25 border transition-colors leading-relaxed ${
                        lyrics !== String(base.lyrics || '') ? 'border-accent/30' : 'border-[var(--border)]'
                      } ${lyricsLoading ? 'opacity-40' : ''}`}
                    />
                    {lyricsLoading && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-xl pointer-events-none">
                        <div className="flex items-center gap-2 text-text-muted text-xs bg-surface-overlay/80 px-3 py-1.5 rounded-lg">
                          <Loader2 size={13} className="animate-spin" /> Fetching from Genius…
                        </div>
                      </div>
                    )}
                    {lyricsError && (
                      <div className="absolute bottom-2 inset-x-2 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/15 border border-red-500/20 text-red-400 text-xs pointer-events-none">
                        <AlertCircle size={12} className="shrink-0" /> {lyricsError}
                      </div>
                    )}
                  </div>
                ) : (
                  <textarea
                    rows={15} value={synced} onChange={e => setSynced(e.target.value)}
                    placeholder={"[00:00.00] Line one\n[00:05.20] Line two\n…"}
                    className={`w-full bg-surface-overlay rounded-xl px-3.5 py-3 text-sm font-mono text-text-primary focus:outline-none resize-none placeholder:text-text-muted placeholder:opacity-25 border transition-colors ${
                      synced ? 'border-accent/30' : 'border-[var(--border)]'
                    }`}
                  />
                )}
              </div>
            </div>
          </>
        )}

      </div>

      {/* ── Sticky footer ── */}
      {song && (
        <div className="shrink-0 border-t border-[var(--border)] bg-surface backdrop-blur-sm px-4 py-3 space-y-2.5">
          <input
            value={edNotes} onChange={e => setEdNotes(e.target.value)}
            placeholder="Editor notes…"
            className="w-full bg-surface-overlay border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-text-primary placeholder:text-text-muted placeholder:opacity-30 focus:outline-none focus:border-accent/40 transition-colors"
          />
          {submitError && (
            <div className="flex items-center gap-2 text-red-400 text-xs">
              <AlertCircle size={12} className="shrink-0" /> {submitError}
            </div>
          )}
          <div className="flex items-center gap-2.5">
            <span className={`text-xs font-bold tabular-nums min-w-[60px] ${changedCount > 0 ? 'text-accent' : 'text-text-muted opacity-30'}`}>
              {changedCount} field{changedCount !== 1 ? 's' : ''}
            </span>
            <button
              onClick={submit}
              disabled={submitState === 'submitting' || submitState === 'submitted' || changedCount === 0}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                submitState === 'submitted' ? 'bg-emerald-500/20 text-emerald-400' :
                submitState === 'error'     ? 'bg-red-500/20 text-red-400' :
                changedCount === 0          ? 'bg-surface-overlay text-text-muted opacity-30 cursor-not-allowed' :
                'bg-accent text-white hover:bg-accent/90 shadow-lg shadow-accent/20'
              }`}>
              {submitState === 'submitting' && <Loader2 size={12} className="animate-spin" />}
              {submitState === 'submitted'  && <Check size={12} />}
              {submitState === 'error'      && <AlertCircle size={12} />}
              {submitState === 'idle'       && (editingPropId != null ? 'Update proposal' : 'Submit proposal')}
              {submitState === 'submitting' && 'Submitting…'}
              {submitState === 'submitted'  && 'Submitted!'}
              {submitState === 'error'      && 'Try again'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Application view ─────────────────────────────────────────────────────── */
function ApplicationView({ application, loading, onSubmitted, onSignOut }: {
  application: EditorApplication | null
  loading: boolean
  onSubmitted: (a: EditorApplication) => void
  onSignOut: () => void
}): JSX.Element {
  const [displayName, setDisplayName] = useState('')
  const [contact,     setContact]     = useState('')
  const [experience,  setExperience]  = useState('')
  const [motivation,  setMotivation]  = useState('')
  const [areas,       setAreas]       = useState('')
  const [submitting,  setSubmitting]  = useState(false)
  const [error,       setError]       = useState<string | null>(null)

    const submit = async (): Promise<void> => {
    setError(null)
    if (motivation.trim().length < 20) { setError('Motivation must be at least 20 characters.'); return }
    setSubmitting(true)
    try { onSubmitted(await userApi.submitApplication({ display_name: displayName, contact, experience, motivation, areas })) }
    catch (e) { setError(e instanceof Error ? e.message : 'Submission failed') }
    finally { setSubmitting(false) }
  }

  if (loading) return <div className="flex-1 flex items-center justify-center"><Loader2 size={18} className="animate-spin text-text-muted" /></div>

  if (application?.status === 'pending') return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
        <Clock size={22} className="text-yellow-400" />
      </div>
      <div className="space-y-1.5">
        <p className="text-text-primary font-bold">Application pending</p>
        <p className="text-text-muted text-sm max-w-[220px] leading-relaxed">Your application is under review. You'll be notified on Discord.</p>
      </div>
      <button onClick={onSignOut} className="text-xs text-text-muted opacity-65 hover:text-text-muted transition-colors mt-1">Sign out</button>
    </div>
  )

  if (application?.status === 'rejected') return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
        <X size={22} className="text-red-400" />
      </div>
      <div className="space-y-1.5">
        <p className="text-text-primary font-bold">Not approved</p>
        {application.review_notes && <p className="text-text-muted text-sm max-w-[220px] italic leading-relaxed">"{application.review_notes}"</p>}
      </div>
      <button onClick={onSignOut} className="text-xs text-text-muted opacity-65 hover:text-text-muted transition-colors mt-1">Sign out</button>
    </div>
  )

  const AppField = ({ label, value, onChange, rows, placeholder, hint }: {
    label: string; value: string; onChange: (v: string) => void
    rows?: number; placeholder?: string; hint?: string
  }): JSX.Element => (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted opacity-65">{label}</label>
        {hint && <span className="text-[10px] text-text-muted opacity-55">{hint}</span>}
      </div>
      {(rows ?? 1) > 1
        ? <textarea rows={rows} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            className="w-full bg-surface-overlay border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent/40 resize-none placeholder:text-text-muted placeholder:opacity-30 transition-colors" />
        : <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            className="w-full bg-surface-overlay border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent/40 placeholder:text-text-muted placeholder:opacity-30 transition-colors" />
      }
    </div>
  )

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="px-4 pt-5 pb-4 shrink-0 border-b border-[var(--border)] flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
          <Award size={18} className="text-accent" />
        </div>
        <div>
          <p className="text-text-primary font-bold text-sm">Become an editor</p>
          <p className="text-text-muted opacity-75 text-xs mt-0.5">Propose corrections. Admins review and apply them.</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        <AppField label="Display name"      value={displayName} onChange={setDisplayName} placeholder="How you want to be credited" />
        <AppField label="Contact"           value={contact}     onChange={setContact}     placeholder="Discord, email…" />
        <AppField label="Areas of focus"    value={areas}       onChange={setAreas}       placeholder="Lyrics, sessions, recording dates…" />
        <AppField label="Experience"        value={experience}  onChange={setExperience}  rows={3}
          placeholder="Other databases you've contributed to, sources you have access to…" />
        <AppField label="Motivation"        value={motivation}  onChange={setMotivation}  rows={4} hint="min. 20 chars"
          placeholder="Why do you want to be an editor and what can you contribute?" />
        {error && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            <AlertCircle size={13} className="shrink-0" /> {error}
          </div>
        )}
        <button onClick={submit} disabled={submitting}
          className="w-full py-2.5 rounded-xl bg-accent text-white hover:bg-accent/90 text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-accent/20">
          {submitting && <Loader2 size={14} className="animate-spin" />}
          Submit application
        </button>
        <button onClick={onSignOut} className="w-full text-xs text-text-muted opacity-65 hover:opacity-100 transition-colors py-1">Sign out</button>
      </div>
    </div>
  )
}
