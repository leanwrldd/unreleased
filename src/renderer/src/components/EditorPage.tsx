import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Search, Loader2, Check, AlertCircle, LogIn, Clock, X, Send,
  ChevronRight, Award, Pencil, History, FileText, Music2,
  User, MapPin, Calendar, Tag, Mic2, Info,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { apiFetch, JWApiPaginatedResponse, JWApiSong, JWApiEra, buildImageUrl, CATEGORY_LABELS } from '../lib/juicewrldApi'
import * as userApi from '../lib/userApi'
import type { SongEditProposal, EditorApplication } from '../lib/userApi'

type SubmitState = 'idle' | 'submitting' | 'submitted' | 'error'

const CATEGORIES = [
  { value: 'released',          label: 'Released' },
  { value: 'unreleased',        label: 'Unreleased' },
  { value: 'unsurfaced',        label: 'Unsurfaced' },
  { value: 'recording_session', label: 'Recording Session' },
]

const CATEGORY_COLORS: Record<string, string> = {
  released:          'bg-emerald-500/15 text-emerald-400',
  unreleased:        'bg-accent/15 text-accent',
  unsurfaced:        'bg-yellow-500/15 text-yellow-400',
  recording_session: 'bg-text-muted/15 text-text-muted',
}

function cleanDate(raw: string | null | undefined): string {
  if (!raw) return ''
  return raw.replace(/^[A-Za-z][a-z]+\s+(?=[A-Z]|\d)/g, '').trim().replace(/\.$/, '').trim()
}

function diffFields(before: Record<string, unknown>, after: Record<string, unknown>): Record<string, unknown> {
  const patch: Record<string, unknown> = {}
  for (const key of Object.keys(after)) {
    const a = after[key]; const b = before[key]
    if (a === '' && (b === '' || b == null)) continue
    if (a == null && b == null) continue
    if (JSON.stringify(a) !== JSON.stringify(b)) patch[key] = a === '' ? null : a
  }
  return patch
}

function Input({ label, value, onChange, placeholder, icon }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; icon?: React.ReactNode
}): JSX.Element {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">{label}</label>
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted/60 pointer-events-none">{icon}</span>}
        <input
          type="text" value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-surface-overlay border border-[var(--border)] rounded-xl py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent/50 transition-colors placeholder:text-text-muted/40 ${icon ? 'pl-9 pr-3' : 'px-3'}`}
        />
      </div>
    </div>
  )
}

function Textarea({ label, value, onChange, placeholder, rows = 4, hint }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; rows?: number; hint?: string
}): JSX.Element {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">{label}</label>
        {hint && <span className="text-[10px] text-text-muted/50">{hint}</span>}
      </div>
      <textarea
        rows={rows} value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-surface-overlay border border-[var(--border)] rounded-xl px-3 py-2.5 text-text-primary text-sm resize-none focus:outline-none focus:border-accent/50 transition-colors placeholder:text-text-muted/40"
      />
    </div>
  )
}

function Select({ label, value, onChange, options, placeholder, icon }: {
  label: string; value: string; onChange: (v: string) => void
  options: { value: string; label: string }[]; placeholder?: string; icon?: React.ReactNode
}): JSX.Element {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">{label}</label>
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted/60 pointer-events-none">{icon}</span>}
        <select
          value={value} onChange={e => onChange(e.target.value)}
          className={`w-full bg-surface-overlay border border-[var(--border)] rounded-xl py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent/50 transition-colors appearance-none ${icon ? 'pl-9 pr-3' : 'px-3'}`}
        >
          <option value="">{placeholder ?? '— select —'}</option>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronRight size={13} className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-text-muted/50 pointer-events-none" />
      </div>
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }): JSX.Element {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-text-muted/70">{icon}</span>
        <span className="text-[11px] font-bold uppercase tracking-widest text-text-muted">{title}</span>
        <div className="flex-1 h-px bg-[var(--border)]" />
      </div>
      {children}
    </div>
  )
}

export default function EditorPage(): JSX.Element {
  const { account, pendingEditorSongId, setPendingEditorSongId, setShowUserAuth, logoutAccount } = useStore()
  const isEditor = !!account?.is_editor
  const isAdmin = !!account?.is_administrator

  const [application, setApplication] = useState<EditorApplication | null>(null)
  const [appLoading, setAppLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setSongs] = useState<JWApiSong[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<JWApiSong | null>(null)
  const [eras, setEras] = useState<JWApiEra[]>([])
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const [name, setName] = useState('')
  const [creditedArtists, setCreditedArtists] = useState('')
  const [category, setCategory] = useState('')
  const [eraId, setEraId] = useState('')
  const [producers, setProducers] = useState('')
  const [engineers, setEngineers] = useState('')
  const [recordingLocations, setRecordingLocations] = useState('')
  const [recordDates, setRecordDates] = useState('')
  const [releaseDate, setReleaseDate] = useState('')
  const [leakType, setLeakType] = useState('')
  const [lyrics, setLyrics] = useState('')
  const [additionalInfo, setAdditionalInfo] = useState('')
  const [notes, setNotes] = useState('')
  const [editorNotes, setEditorNotes] = useState('')

  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [proposals, setProposals] = useState<SongEditProposal[]>([])

  // close results on outside click
  useEffect(() => {
    const fn = (e: MouseEvent) => { if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowResults(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const baseline = useCallback((song: JWApiSong | null): Record<string, unknown> => {
    if (!song) return {}
    return {
      name: song.track_titles?.[0] || song.name,
      credited_artists: song.credited_artists || '',
      category: song.category || '',
      era_id: song.era?.id ?? '',
      producers: song.producers || '',
      engineers: song.engineers || '',
      recording_locations: song.recording_locations || '',
      record_dates: song.record_dates || '',
      release_date: cleanDate(song.release_date),
      leak_type: song.leak_type || '',
      lyrics: song.lyrics || '',
      additional_information: song.additional_information || '',
      notes: song.notes || '',
    }
  }, [])

  const populate = useCallback((song: JWApiSong): void => {
    setName(song.track_titles?.[0] || song.name)
    setCreditedArtists(song.credited_artists || '')
    setCategory(song.category || '')
    setEraId(song.era?.id ? String(song.era.id) : '')
    setProducers(song.producers || '')
    setEngineers(song.engineers || '')
    setRecordingLocations(song.recording_locations || '')
    setRecordDates(song.record_dates || '')
    setReleaseDate(cleanDate(song.release_date))
    setLeakType(song.leak_type || '')
    setLyrics(song.lyrics || '')
    setAdditionalInfo(song.additional_information || '')
    setNotes(song.notes || '')
    setEditorNotes('')
  }, [])

  const selectSong = useCallback((song: JWApiSong): void => {
    setSelected(song)
    setSongs([])
    setQuery(song.track_titles?.[0] || song.name)
    setShowResults(false)
    populate(song)
    setSubmitState('idle')
    setSubmitError(null)
  }, [populate])

  const refreshProposals = useCallback(async (): Promise<void> => {
    if (!isEditor) return
    try { setProposals(await userApi.getMyProposals()) } catch {}
  }, [isEditor])

  useEffect(() => {
    if (!isEditor) return
    apiFetch<JWApiEra[] | { results: JWApiEra[] }>('/eras/')
      .then(d => setEras(Array.isArray(d) ? d : (d as { results: JWApiEra[] }).results ?? []))
      .catch(() => undefined)
    refreshProposals()
  }, [isEditor, refreshProposals])

  useEffect(() => {
    if (!account || isEditor) { setApplication(null); return }
    setAppLoading(true)
    userApi.getMyApplication()
      .then(r => setApplication(r.application))
      .catch(() => setApplication(null))
      .finally(() => setAppLoading(false))
  }, [account, isEditor])

  useEffect(() => {
    if (!pendingEditorSongId || !isEditor) return
    const id = pendingEditorSongId
    setPendingEditorSongId(null)
    apiFetch<JWApiSong>(`/songs/${id}/`).then(selectSong).catch(() => undefined)
  }, [pendingEditorSongId, isEditor, setPendingEditorSongId, selectSong])

  const search = async (): Promise<void> => {
    if (!query.trim()) return
    setSearching(true)
    setSongs([])
    setShowResults(true)
    try {
      const data = await apiFetch<JWApiPaginatedResponse>('/songs/', { search: query, limit: 20 })
      setSongs(data.results)
    } catch {} finally { setSearching(false) }
  }

  // changed fields count
  const changedCount = selected ? Object.keys(diffFields(baseline(selected), {
    name, credited_artists: creditedArtists, category, era_id: eraId ? Number(eraId) : '',
    producers, engineers, recording_locations: recordingLocations,
    record_dates: recordDates, release_date: releaseDate, leak_type: leakType,
    lyrics, additional_information: additionalInfo, notes,
  })).length : 0

  const submit = async (): Promise<void> => {
    if (!selected) return
    setSubmitState('submitting')
    setSubmitError(null)
    const patch = diffFields(baseline(selected), {
      name, credited_artists: creditedArtists, category,
      era_id: eraId ? Number(eraId) : '',
      producers, engineers, recording_locations: recordingLocations,
      record_dates: recordDates, release_date: releaseDate, leak_type: leakType,
      lyrics, additional_information: additionalInfo, notes,
    })
    if (Object.keys(patch).length === 0) {
      setSubmitState('error')
      setSubmitError('No changes detected.')
      setTimeout(() => setSubmitState('idle'), 3000)
      return
    }
    try {
      await userApi.createProposal({
        song: selected.id,
        change_type: 'update',
        title: name || selected.name,
        proposed_data: patch,
        editor_notes: editorNotes,
      })
      setSubmitState('submitted')
      await refreshProposals()
      setTimeout(() => setSubmitState('idle'), 3000)
    } catch (e) {
      setSubmitState('error')
      setSubmitError(e instanceof Error ? e.message : 'Submission failed')
      setTimeout(() => setSubmitState('idle'), 4000)
    }
  }

  // ── Not logged in ──────────────────────────────────────────────────────────
  if (!account) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
          <LogIn size={24} className="text-accent" />
        </div>
        <div className="space-y-1.5">
          <p className="text-text-primary font-bold text-lg">Log in to contribute</p>
          <p className="text-text-muted text-sm max-w-xs">Editors propose corrections to song entries. Admins review and apply them.</p>
        </div>
        <button onClick={() => setShowUserAuth(true)}
          className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] text-white text-sm font-semibold transition-colors shadow-lg shadow-[#5865F2]/20">
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.03.06a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 13.978 13.978 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
          Continue with Discord
        </button>
      </div>
    )
  }

  // ── Not an editor yet ──────────────────────────────────────────────────────
  if (!isEditor) {
    return <ApplicationView application={application} loading={appLoading} onSubmitted={a => setApplication(a)} onSignOut={() => logoutAccount()} />
  }

  // ── Editor view ────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

      {/* Header */}
      <div className="px-5 pt-5 pb-4 shrink-0 border-b border-[var(--border)] flex items-center gap-3">
        <div>
          <h1 className="text-text-primary text-lg font-bold leading-none">Contribute</h1>
          <p className="text-text-muted text-xs mt-0.5">Propose edits to song entries</p>
        </div>
        <div className="ml-auto flex items-center gap-2.5">
          <div className="text-right hidden sm:block">
            <p className="text-text-primary text-xs font-medium leading-none">{account.display_name || account.discord_username}</p>
            <p className="text-text-muted text-[10px] mt-0.5">{proposals.filter(p => p.status === 'approved').length} approved</p>
          </div>
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${isAdmin ? 'bg-accent/20 text-accent' : 'bg-emerald-500/20 text-emerald-400'}`}>
            {isAdmin ? 'admin' : 'editor'}
          </span>
          <button onClick={() => logoutAccount()} className="text-[11px] text-text-muted hover:text-text-primary transition-colors">Sign out</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-5 py-6 space-y-8">

          {/* Search */}
          <div ref={searchRef} className="relative">
            <div className={`flex items-center gap-2 bg-surface-overlay border rounded-2xl px-4 transition-colors ${showResults && results.length > 0 ? 'border-accent/40 rounded-b-none' : 'border-[var(--border)]'}`}>
              <Search size={16} className="text-text-muted shrink-0" />
              <input
                type="text" value={query}
                onChange={e => { setQuery(e.target.value); if (!e.target.value) { setSelected(null); setShowResults(false) } }}
                onKeyDown={e => e.key === 'Enter' && search()}
                onFocus={() => results.length > 0 && setShowResults(true)}
                placeholder="Search for a song to edit…"
                className="flex-1 bg-transparent py-3 text-text-primary text-sm placeholder:text-text-muted/40 focus:outline-none"
              />
              {searching
                ? <Loader2 size={15} className="text-text-muted animate-spin shrink-0" />
                : <button onClick={search} className="text-xs font-medium text-accent hover:text-accent/80 transition-colors shrink-0 py-1 px-2 rounded-lg hover:bg-accent/10">Search</button>
              }
            </div>
            {showResults && results.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-surface border border-accent/40 border-t-0 rounded-b-2xl overflow-hidden shadow-2xl z-20 max-h-64 overflow-y-auto">
                {results.map((song, i) => (
                  <button key={song.id} onClick={() => selectSong(song)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-overlay transition-colors ${i > 0 ? 'border-t border-[var(--border)]' : ''}`}>
                    {song.image_url
                      ? <img src={buildImageUrl(song.image_url)} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                      : <div className="w-8 h-8 rounded-lg bg-surface-overlay flex items-center justify-center shrink-0"><Music2 size={14} className="text-text-muted" /></div>
                    }
                    <div className="min-w-0 flex-1">
                      <p className="text-text-primary text-sm font-medium truncate">{song.track_titles?.[0] || song.name}</p>
                      <p className="text-text-muted text-xs truncate">{song.era?.name} · #{song.id}</p>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${CATEGORY_COLORS[song.category] || 'bg-surface-overlay text-text-muted'}`}>
                      {CATEGORY_LABELS[song.category] || song.category}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected song card */}
          {selected && (
            <div className="rounded-2xl border border-[var(--border)] overflow-hidden bg-surface-overlay">
              <div className="flex items-center gap-4 p-4">
                {selected.image_url
                  ? <img src={buildImageUrl(selected.image_url)} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0 shadow-lg" />
                  : <div className="w-16 h-16 rounded-xl bg-surface-raised flex items-center justify-center shrink-0"><Music2 size={24} className="text-text-muted" /></div>
                }
                <div className="min-w-0 flex-1">
                  <p className="text-text-primary font-bold text-base truncate">{selected.track_titles?.[0] || selected.name}</p>
                  <p className="text-text-muted text-sm truncate mt-0.5">{selected.credited_artists || 'Juice WRLD'}</p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${CATEGORY_COLORS[selected.category] || 'bg-surface-raised text-text-muted'}`}>
                      {CATEGORY_LABELS[selected.category] || selected.category}
                    </span>
                    {selected.era?.name && <span className="text-[10px] px-2 py-0.5 rounded-md bg-surface-raised text-text-muted font-medium">{selected.era.name}</span>}
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-surface-raised text-text-muted font-medium">#{selected.id}</span>
                  </div>
                </div>
                {changedCount > 0 && (
                  <div className="shrink-0 text-right">
                    <span className="text-[11px] font-bold text-accent bg-accent/10 px-2 py-1 rounded-lg">{changedCount} change{changedCount !== 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Edit form */}
          {selected && (
            <div className="space-y-8">

              <Section title="Identity" icon={<Tag size={13} />}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Title" value={name} onChange={setName} icon={<Pencil size={13} />} />
                  <Input label="Credited artists" value={creditedArtists} onChange={setCreditedArtists} icon={<User size={13} />} />
                  <Select label="Category" value={category} onChange={setCategory} options={CATEGORIES} icon={<Tag size={13} />} />
                  <Select label="Era" value={eraId} onChange={setEraId}
                    options={eras.map(e => ({ value: String(e.id), label: e.name }))}
                    placeholder={selected.era?.name || '— select era —'} icon={<Calendar size={13} />} />
                </div>
              </Section>

              <Section title="Recording" icon={<Mic2 size={13} />}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Recording date" value={recordDates} onChange={setRecordDates} placeholder="YYYY-MM-DD" icon={<Calendar size={13} />} />
                  <Input label="Release date" value={releaseDate} onChange={setReleaseDate} placeholder="YYYY-MM-DD" icon={<Calendar size={13} />} />
                  <Input label="Recording location" value={recordingLocations} onChange={setRecordingLocations} placeholder="Studio / city" icon={<MapPin size={13} />} />
                  <Input label="Leak type" value={leakType} onChange={setLeakType} placeholder="HQ, LQ, snippet, stem…" icon={<Info size={13} />} />
                </div>
                <Input label="Producers" value={producers} onChange={setProducers} icon={<User size={13} />} />
                <Input label="Engineers" value={engineers} onChange={setEngineers} icon={<User size={13} />} />
              </Section>

              <Section title="Content" icon={<FileText size={13} />}>
                <Textarea label="Lyrics" value={lyrics} onChange={setLyrics} rows={10} placeholder="Full lyrics…" />
                <Textarea label="Additional information" value={additionalInfo} onChange={setAdditionalInfo} rows={4} placeholder="Context, history, sources…" />
                <Textarea label="Notes" value={notes} onChange={setNotes} rows={3} placeholder="Internal notes…" />
              </Section>

              <Section title="Submit" icon={<Send size={13} />}>
                <Textarea label="Editor notes" value={editorNotes} onChange={setEditorNotes} rows={3}
                  hint="Visible to admins only"
                  placeholder="Briefly describe what you changed and why, and list your sources…" />

                {submitError && (
                  <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    <AlertCircle size={15} className="shrink-0" />
                    {submitError}
                  </div>
                )}

                <button onClick={submit} disabled={submitState === 'submitting' || submitState === 'submitted'}
                  className={`w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2.5 shadow-sm ${
                    submitState === 'submitted' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                    submitState === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                    changedCount === 0 ? 'bg-surface-overlay text-text-muted border border-[var(--border)] cursor-not-allowed' :
                    'bg-accent text-white hover:bg-accent/90 border border-accent/50'
                  }`}>
                  {submitState === 'submitting' && <Loader2 size={16} className="animate-spin" />}
                  {submitState === 'submitted' && <Check size={16} />}
                  {submitState === 'error' && <AlertCircle size={16} />}
                  {(submitState === 'idle') && <Send size={15} />}
                  {submitState === 'idle' && (changedCount > 0 ? `Submit ${changedCount} change${changedCount !== 1 ? 's' : ''}` : 'No changes yet')}
                  {submitState === 'submitting' && 'Submitting…'}
                  {submitState === 'submitted' && 'Proposal submitted!'}
                  {submitState === 'error' && 'Error — try again'}
                </button>
              </Section>
            </div>
          )}

          {/* Proposal history */}
          {proposals.length > 0 && (
            <div className="space-y-3 pb-6">
              <div className="flex items-center gap-2">
                <History size={13} className="text-text-muted/70" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-text-muted">Your proposals</span>
                <div className="flex-1 h-px bg-[var(--border)]" />
                <span className="text-[10px] text-text-muted">{proposals.length} total</span>
              </div>
              <div className="space-y-2">
                {proposals.slice(0, 12).map(p => (
                  <ProposalRow key={p.id} proposal={p}
                    onWithdraw={async () => { await userApi.withdrawProposal(p.id).catch(() => undefined); refreshProposals() }} />
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

function ProposalRow({ proposal, onWithdraw }: { proposal: SongEditProposal; onWithdraw: () => Promise<void> }): JSX.Element {
  const cfg = {
    pending:  { cls: 'bg-yellow-500/15 text-yellow-400',  label: 'Pending' },
    approved: { cls: 'bg-emerald-500/15 text-emerald-400', label: 'Approved' },
    rejected: { cls: 'bg-red-500/15 text-red-400',        label: 'Rejected' },
    reversed: { cls: 'bg-text-muted/10 text-text-muted',  label: 'Reversed' },
  }[proposal.status] ?? { cls: 'bg-surface-overlay text-text-muted', label: proposal.status }

  const fieldCount = Object.keys(proposal.proposed_data || {}).length

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-surface-overlay rounded-xl border border-[var(--border)] hover:border-[var(--border-hover,var(--border))] transition-colors">
      <span className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${cfg.cls}`}>{cfg.label}</span>
      <div className="min-w-0 flex-1">
        <p className="text-text-primary text-sm font-medium truncate">{proposal.title || `Proposal #${proposal.id}`}</p>
        {proposal.review_notes && <p className="text-text-muted text-xs truncate italic mt-0.5">"{proposal.review_notes}"</p>}
      </div>
      <div className="text-right shrink-0">
        <p className="text-text-muted text-[11px]">{fieldCount} field{fieldCount !== 1 ? 's' : ''}</p>
        <p className="text-text-muted/60 text-[10px]">{new Date(proposal.created_at).toLocaleDateString()}</p>
      </div>
      {proposal.status === 'pending' && (
        <button onClick={onWithdraw} title="Withdraw" className="p-1.5 text-text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
          <X size={13} />
        </button>
      )}
    </div>
  )
}

function ApplicationView({ application, loading, onSubmitted, onSignOut }: {
  application: EditorApplication | null
  loading: boolean
  onSubmitted: (a: EditorApplication) => void
  onSignOut: () => void
}): JSX.Element {
  const [displayName, setDisplayName] = useState('')
  const [contact, setContact] = useState('')
  const [experience, setExperience] = useState('')
  const [motivation, setMotivation] = useState('')
  const [areas, setAreas] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (): Promise<void> => {
    setError(null)
    if (motivation.trim().length < 20) { setError('Please describe your motivation in at least 20 characters.'); return }
    setSubmitting(true)
    try { onSubmitted(await userApi.submitApplication({ display_name: displayName, contact, experience, motivation, areas })) }
    catch (e) { setError(e instanceof Error ? e.message : 'Submission failed') }
    finally { setSubmitting(false) }
  }

  if (loading) return <div className="flex-1 flex items-center justify-center"><Loader2 size={18} className="animate-spin text-text-muted" /></div>

  if (application?.status === 'pending') return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
        <Clock size={24} className="text-yellow-400" />
      </div>
      <div>
        <p className="text-text-primary font-bold text-lg">Application pending</p>
        <p className="text-text-muted text-sm max-w-xs mt-1">Your editor application is under review. You'll be notified on Discord.</p>
      </div>
      <button onClick={onSignOut} className="text-xs text-text-muted hover:text-text-primary transition-colors">Sign out</button>
    </div>
  )

  if (application?.status === 'rejected') return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
        <X size={24} className="text-red-400" />
      </div>
      <div>
        <p className="text-text-primary font-bold text-lg">Not approved</p>
        {application.review_notes && <p className="text-text-muted text-sm mt-2 max-w-xs italic">"{application.review_notes}"</p>}
      </div>
      <button onClick={onSignOut} className="text-xs text-text-muted hover:text-text-primary transition-colors">Sign out</button>
    </div>
  )

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="px-5 pt-5 pb-4 shrink-0 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
            <Award size={18} className="text-accent" />
          </div>
          <div>
            <h1 className="text-text-primary font-bold text-base">Become an editor</h1>
            <p className="text-text-muted text-xs mt-0.5">Propose corrections. Admins review and apply them.</p>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-6 max-w-2xl mx-auto w-full space-y-5">
        <Input label="Display name" value={displayName} onChange={setDisplayName} placeholder="How you want to be credited" icon={<User size={13} />} />
        <Input label="Contact" value={contact} onChange={setContact} placeholder="Discord username, email, etc." icon={<User size={13} />} />
        <Input label="Areas of focus" value={areas} onChange={setAreas} placeholder="Lyrics, sessions, recording dates…" icon={<Tag size={13} />} />
        <Textarea label="Relevant experience" value={experience} onChange={setExperience} rows={3}
          placeholder="Other databases you've contributed to, sources you have access to…" />
        <Textarea label="Why do you want to be an editor?" value={motivation} onChange={setMotivation} rows={5}
          hint="min. 20 characters" placeholder="Tell us about your motivation and what you can contribute…" />
        {error && (
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle size={15} className="shrink-0" /> {error}
          </div>
        )}
        <button onClick={submit} disabled={submitting}
          className="w-full py-3 rounded-xl bg-accent text-white hover:bg-accent/90 text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-sm shadow-accent/20">
          {submitting && <Loader2 size={15} className="animate-spin" />}
          Submit application
        </button>
        <button onClick={onSignOut} className="w-full text-xs text-text-muted hover:text-text-primary transition-colors py-1">Sign out</button>
      </div>
    </div>
  )
}
