import { useState, useEffect, useCallback } from 'react'
import {
  Loader2, Check, AlertCircle, LogIn, Clock, X, ChevronUp,
  ChevronDown, Award, Music2,
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
  { value: 'recording_session', label: 'Recording Session' },
]

const CAT_DOT: Record<string, string> = {
  released:          'bg-emerald-400',
  unreleased:        'bg-accent',
  unsurfaced:        'bg-yellow-400',
  recording_session: 'bg-text-muted',
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

/* ── Inline editable row ──────────────────────────────────────────────────── */
function Row({ label, value, original, onChange, placeholder }: {
  label: string; value: string; original: string
  onChange: (v: string) => void; placeholder?: string
}): JSX.Element {
  const changed = value !== original && !(value === '' && original === '')
  return (
    <div className={`flex items-start gap-3 px-4 py-2.5 transition-colors ${changed ? 'bg-accent/5' : 'hover:bg-surface-overlay/50'}`}>
      <span className="w-28 shrink-0 text-[11px] font-semibold text-text-muted/60 uppercase tracking-wider pt-[7px] select-none">{label}</span>
      <div className="flex-1 relative">
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder || original || '—'}
          className={`w-full bg-transparent text-sm focus:outline-none py-1 placeholder:text-text-muted/30 border-b transition-colors ${changed ? 'text-text-primary border-accent/50' : 'text-text-primary border-transparent focus:border-[var(--border)]'}`}
        />
        {changed && <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-accent" />}
      </div>
    </div>
  )
}

function SelectRow({ label, value, original, onChange, options, placeholder }: {
  label: string; value: string; original: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]; placeholder?: string
}): JSX.Element {
  const changed = value !== original
  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${changed ? 'bg-accent/5' : 'hover:bg-surface-overlay/50'}`}>
      <span className="w-28 shrink-0 text-[11px] font-semibold text-text-muted/60 uppercase tracking-wider select-none">{label}</span>
      <div className="flex-1 relative">
        <select
          value={value} onChange={e => onChange(e.target.value)}
          className={`w-full bg-transparent text-sm focus:outline-none py-1 border-b transition-colors appearance-none cursor-pointer ${changed ? 'text-text-primary border-accent/50' : 'text-text-muted border-transparent focus:border-[var(--border)]'}`}
        >
          <option value="">{placeholder || '—'}</option>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {changed && <span className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-accent pointer-events-none" />}
      </div>
    </div>
  )
}

/* ── Main export ──────────────────────────────────────────────────────────── */
export default function EditorPage(): JSX.Element {
  const {
    account, currentTrack,
    pendingEditorSongId, setPendingEditorSongId,
    setShowUserAuth, logoutAccount,
  } = useStore()
  const isEditor = !!account?.is_editor
  const isAdmin  = !!account?.is_administrator

  const [application, setApplication] = useState<EditorApplication | null>(null)
  const [appLoading, setAppLoading]   = useState(false)

  const [song,    setSong]    = useState<JWApiSong | null>(null)
  const [loading, setLoading] = useState(false)
  const [eras,    setEras]    = useState<JWApiEra[]>([])

  // form fields
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
  const [submitState,  setSubmitState]  = useState<SubmitState>('idle')
  const [submitError,  setSubmitError]  = useState<string | null>(null)
  const [showMore,     setShowMore]     = useState(false)

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
      synced_lyrics:          '',
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
    setSynced('')
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

  // load eras
  useEffect(() => {
    if (!isEditor) return
    apiFetch<JWApiEra[] | { results: JWApiEra[] }>('/eras/')
      .then(d => setEras(Array.isArray(d) ? d : (d as { results: JWApiEra[] }).results ?? []))
      .catch(() => undefined)
  }, [isEditor])

  // pending song from context menu → load it
  useEffect(() => {
    if (!pendingEditorSongId || !isEditor) return
    const id = pendingEditorSongId
    setPendingEditorSongId(null)
    loadSong(id)
  }, [pendingEditorSongId, isEditor, setPendingEditorSongId, loadSong])

  // auto-load from now playing if nothing loaded yet
  useEffect(() => {
    if (!isEditor || song || pendingEditorSongId) return
    if (!currentTrack) return
    const id = userApi.trackIdToSongId(currentTrack.id)
    if (id) loadSong(id)
  }, [isEditor, song, currentTrack, pendingEditorSongId, loadSong])

  // application status for non-editors
  useEffect(() => {
    if (!account || isEditor) { setApplication(null); return }
    setAppLoading(true)
    userApi.getMyApplication()
      .then(r => setApplication(r.application))
      .catch(() => setApplication(null))
      .finally(() => setAppLoading(false))
  }, [account, isEditor])

  // build current form state
  const current: Record<string, unknown> = {
    name, credited_artists: artists, album, category: cat,
    era_id: eraId ? Number(eraId) : '',
    producers: prod, engineers: eng,
    recording_locations: loc, record_dates: recDate,
    release_date: relDate, leak_type: leak,
    lyrics, synced_lyrics: synced,
    additional_information: addInfo, notes,
  }
  const patch         = diff(baseline(song), current)
  const changedCount  = Object.keys(patch).length
  const base          = baseline(song)

  const submit = async (): Promise<void> => {
    if (!song || changedCount === 0) return
    setSubmitState('submitting')
    setSubmitError(null)
    try {
      await userApi.createProposal({
        song: song.id,
        change_type: 'update',
        title: name || song.name,
        proposed_data: patch,
        editor_notes: edNotes,
      })
      setSubmitState('submitted')
      setTimeout(() => setSubmitState('idle'), 3000)
    } catch (e) {
      setSubmitState('error')
      setSubmitError(e instanceof Error ? e.message : 'Submission failed')
      setTimeout(() => setSubmitState('idle'), 4000)
    }
  }

  /* ── Guards ─────────────────────────────────────────────────────────────── */
  if (!account) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
        <LogIn size={24} className="text-accent" />
      </div>
      <div>
        <p className="text-text-primary font-bold text-lg">Log in to contribute</p>
        <p className="text-text-muted text-sm max-w-xs mt-1.5">Editors propose corrections to song entries.</p>
      </div>
      <button onClick={() => setShowUserAuth(true)}
        className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] text-white text-sm font-semibold transition-colors">
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
      <div className="px-4 py-3 shrink-0 flex items-center gap-2 border-b border-[var(--border)]">
        <span className="text-text-primary font-bold text-sm flex-1">Edit song</span>
        <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${isAdmin ? 'bg-accent/20 text-accent' : 'bg-emerald-500/20 text-emerald-400'}`}>
          {isAdmin ? 'admin' : 'editor'}
        </span>
        <span className="text-text-muted text-xs">{account.display_name || account.discord_username}</span>
        <button onClick={() => logoutAccount()} className="text-text-muted/60 hover:text-text-muted text-xs transition-colors">·&nbsp;out</button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto flex flex-col pb-36">

        {/* Song card / empty state */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="animate-spin text-text-muted" />
          </div>
        ) : !song ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-surface-overlay flex items-center justify-center">
              <Music2 size={20} className="text-text-muted" />
            </div>
            <p className="text-text-muted text-sm">Play a song to start editing</p>
            <p className="text-text-muted/50 text-xs">Or open the edit option from a song's context menu</p>
          </div>
        ) : (
          <>
            {/* Song header */}
            <div className="flex items-center gap-3 px-4 py-4 border-b border-[var(--border)]">
              {song.image_url
                ? <img src={buildImageUrl(song.image_url)} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0" />
                : <div className="w-11 h-11 rounded-lg bg-surface-overlay flex items-center justify-center shrink-0"><Music2 size={16} className="text-text-muted" /></div>
              }
              <div className="min-w-0 flex-1">
                <p className="text-text-primary font-semibold text-sm truncate">{song.track_titles?.[0] || song.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${CAT_DOT[song.category] || 'bg-text-muted'}`} />
                  <span className="text-text-muted text-xs">{CATEGORY_LABELS[song.category] || song.category}</span>
                  {song.era?.name && <><span className="text-text-muted/30">·</span><span className="text-text-muted text-xs">{song.era.name}</span></>}
                  <span className="text-text-muted/30">·</span>
                  <span className="text-text-muted/50 text-xs">#{song.id}</span>
                </div>
              </div>
              <button onClick={() => { setSong(null) }}
                className="p-1.5 rounded-lg text-text-muted/40 hover:text-text-muted hover:bg-surface-overlay transition-colors shrink-0">
                <X size={14} />
              </button>
            </div>

            {/* Fields */}
            <div className="divide-y divide-[var(--border)]/40">
              <Row label="Title"    value={name}    original={String(base.name || '')}    onChange={setName} />
              <Row label="Artists"  value={artists} original={String(base.credited_artists || '')} onChange={setArtists} />
              <Row label="Album"    value={album}   original={String(base.album || '')}   onChange={setAlbum} />
              <SelectRow label="Category" value={cat} original={String(base.category || '')} onChange={setCat} options={CATEGORIES} />
              <SelectRow label="Era" value={eraId} original={song.era?.id ? String(song.era.id) : ''} onChange={setEraId}
                options={eras.map(e => ({ value: String(e.id), label: e.name }))}
                placeholder={song.era?.name || '—'} />
              <Row label="Producers"  value={prod}    original={String(base.producers || '')}            onChange={setProd} />
              <Row label="Rec. date"  value={recDate} original={String(base.record_dates || '')}         onChange={setRecDate} placeholder="YYYY-MM-DD" />
              <Row label="Rel. date"  value={relDate} original={String(base.release_date || '')}         onChange={setRelDate} placeholder="YYYY-MM-DD" />

              {/* More fields toggle */}
              <button onClick={() => setShowMore(v => !v)}
                className="w-full flex items-center gap-2 px-4 py-2 text-[11px] text-text-muted/50 hover:text-text-muted transition-colors">
                {showMore ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {showMore ? 'Fewer fields' : 'More fields'}
              </button>

              {showMore && (
                <>
                  <Row label="Engineers" value={eng}  original={String(base.engineers || '')}             onChange={setEng} />
                  <Row label="Location"  value={loc}   original={String(base.recording_locations || '')}  onChange={setLoc} placeholder="Studio / city" />
                  <Row label="Leak type" value={leak}  original={String(base.leak_type || '')}             onChange={setLeak} placeholder="HQ, LQ, snippet…" />
                  <div className={`px-4 py-2.5 transition-colors ${addInfo !== String(base.additional_information || '') ? 'bg-accent/5' : ''}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-semibold text-text-muted/60 uppercase tracking-wider">Add. info</span>
                      {addInfo !== String(base.additional_information || '') && <span className="w-1.5 h-1.5 rounded-full bg-accent" />}
                    </div>
                    <textarea rows={3} value={addInfo} onChange={e => setAddInfo(e.target.value)}
                      placeholder="—"
                      className="w-full bg-transparent text-sm text-text-primary focus:outline-none resize-none placeholder:text-text-muted/30" />
                  </div>
                  <div className={`px-4 py-2.5 transition-colors ${notes !== String(base.notes || '') ? 'bg-accent/5' : ''}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-semibold text-text-muted/60 uppercase tracking-wider">Notes</span>
                      {notes !== String(base.notes || '') && <span className="w-1.5 h-1.5 rounded-full bg-accent" />}
                    </div>
                    <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
                      placeholder="—"
                      className="w-full bg-transparent text-sm text-text-primary focus:outline-none resize-none placeholder:text-text-muted/30" />
                  </div>
                </>
              )}
            </div>

            {/* Lyrics section */}
            <div className="mt-2 border-t border-[var(--border)]">
              {/* Tab toggle */}
              <div className="flex items-center gap-1 px-4 pt-3 pb-2">
                {(['lyrics', 'synced'] as LyricsTab[]).map(tab => (
                  <button key={tab} onClick={() => setLyricsTab(tab)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${lyricsTab === tab ? 'bg-surface-overlay text-text-primary' : 'text-text-muted hover:text-text-primary'}`}>
                    {tab === 'lyrics' ? 'Lyrics' : 'Synced lyrics'}
                    {tab === 'lyrics' && lyrics !== String(base.lyrics || '') && <span className="ml-1.5 w-1 h-1 rounded-full bg-accent inline-block" />}
                    {tab === 'synced' && synced && <span className="ml-1.5 w-1 h-1 rounded-full bg-accent inline-block" />}
                  </button>
                ))}
              </div>
              <div className="px-4 pb-4">
                {lyricsTab === 'lyrics' ? (
                  <textarea
                    rows={14} value={lyrics} onChange={e => setLyrics(e.target.value)}
                    placeholder="Full lyrics…"
                    className={`w-full bg-surface-overlay/50 rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none resize-none placeholder:text-text-muted/30 border transition-colors ${lyrics !== String(base.lyrics || '') ? 'border-accent/30' : 'border-[var(--border)]'}`}
                  />
                ) : (
                  <textarea
                    rows={14} value={synced} onChange={e => setSynced(e.target.value)}
                    placeholder={"[00:00.00] Line one\n[00:05.20] Line two\n…"}
                    className={`w-full bg-surface-overlay/50 rounded-xl px-3 py-2.5 text-sm font-mono text-text-primary focus:outline-none resize-none placeholder:text-text-muted/30 border transition-colors ${synced ? 'border-accent/30' : 'border-[var(--border)]'}`}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Sticky submit footer */}
      {song && (
        <div className="absolute bottom-0 left-0 right-0 border-t border-[var(--border)] bg-surface/95 backdrop-blur px-4 py-3 space-y-2.5">
          <input
            value={edNotes} onChange={e => setEdNotes(e.target.value)}
            placeholder="Editor notes for the reviewer…"
            className="w-full bg-surface-overlay border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-text-primary placeholder:text-text-muted/40 focus:outline-none focus:border-accent/40 transition-colors"
          />
          {submitError && (
            <div className="flex items-center gap-2 text-red-400 text-xs">
              <AlertCircle size={12} /> {submitError}
            </div>
          )}
          <div className="flex items-center gap-2.5">
            <span className={`text-xs font-semibold tabular-nums ${changedCount > 0 ? 'text-accent' : 'text-text-muted/40'}`}>
              {changedCount} change{changedCount !== 1 ? 's' : ''}
            </span>
            <button onClick={submit}
              disabled={submitState === 'submitting' || submitState === 'submitted' || changedCount === 0}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                submitState === 'submitted' ? 'bg-emerald-500/20 text-emerald-400' :
                submitState === 'error'     ? 'bg-red-500/20 text-red-400' :
                changedCount === 0          ? 'bg-surface-overlay text-text-muted cursor-not-allowed' :
                'bg-accent text-white hover:bg-accent/90'
              }`}>
              {submitState === 'submitting' && <Loader2 size={13} className="animate-spin" />}
              {submitState === 'submitted'  && <Check size={13} />}
              {submitState === 'error'      && <AlertCircle size={13} />}
              {submitState === 'idle' && 'Submit proposal'}
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
      <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
        <Clock size={20} className="text-yellow-400" />
      </div>
      <div>
        <p className="text-text-primary font-bold">Application pending</p>
        <p className="text-text-muted text-sm mt-1 max-w-xs">Your application is under review. You'll be notified on Discord.</p>
      </div>
      <button onClick={onSignOut} className="text-xs text-text-muted hover:text-text-primary transition-colors">Sign out</button>
    </div>
  )

  if (application?.status === 'rejected') return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
        <X size={20} className="text-red-400" />
      </div>
      <div>
        <p className="text-text-primary font-bold">Not approved</p>
        {application.review_notes && <p className="text-text-muted text-sm mt-1.5 max-w-xs italic">"{application.review_notes}"</p>}
      </div>
      <button onClick={onSignOut} className="text-xs text-text-muted hover:text-text-primary transition-colors">Sign out</button>
    </div>
  )

  // Application form
  const Field = ({ label, value, onChange, rows, placeholder, hint }: {
    label: string; value: string; onChange: (v: string) => void
    rows?: number; placeholder?: string; hint?: string
  }): JSX.Element => (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">{label}</label>
        {hint && <span className="text-[10px] text-text-muted/50">{hint}</span>}
      </div>
      {(rows ?? 1) > 1
        ? <textarea rows={rows} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            className="w-full bg-surface-overlay border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent/50 resize-none placeholder:text-text-muted/40 transition-colors" />
        : <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            className="w-full bg-surface-overlay border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent/50 placeholder:text-text-muted/40 transition-colors" />
      }
    </div>
  )

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="px-4 pt-5 pb-4 shrink-0 border-b border-[var(--border)] flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
          <Award size={16} className="text-accent" />
        </div>
        <div>
          <p className="text-text-primary font-bold text-sm">Become an editor</p>
          <p className="text-text-muted text-xs mt-0.5">Propose corrections. Admins review and apply them.</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        <Field label="Display name" value={displayName} onChange={setDisplayName} placeholder="How you want to be credited" />
        <Field label="Contact" value={contact} onChange={setContact} placeholder="Discord, email…" />
        <Field label="Areas of focus" value={areas} onChange={setAreas} placeholder="Lyrics, sessions, recording dates…" />
        <Field label="Relevant experience" value={experience} onChange={setExperience} rows={3}
          placeholder="Other databases you've contributed to, sources you have access to…" />
        <Field label="Motivation" value={motivation} onChange={setMotivation} rows={4}
          hint="min. 20 chars"
          placeholder="Why do you want to be an editor and what can you contribute?" />
        {error && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            <AlertCircle size={13} className="shrink-0" /> {error}
          </div>
        )}
        <button onClick={submit} disabled={submitting}
          className="w-full py-2.5 rounded-xl bg-accent text-white hover:bg-accent/90 text-sm font-bold transition-colors flex items-center justify-center gap-2">
          {submitting && <Loader2 size={14} className="animate-spin" />}
          Submit application
        </button>
        <button onClick={onSignOut} className="w-full text-xs text-text-muted hover:text-text-primary transition-colors py-1">Sign out</button>
      </div>
    </div>
  )
}
