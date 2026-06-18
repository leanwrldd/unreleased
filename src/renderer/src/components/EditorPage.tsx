import { useState, useEffect, useCallback } from 'react'
import { Search, Loader2, Check, AlertCircle, LogIn, Clock, X, Send, History, Award } from 'lucide-react'
import { useStore } from '../store/useStore'
import { apiFetch, JWApiPaginatedResponse, JWApiSong, JWApiEra, buildImageUrl, CATEGORY_LABELS } from '../lib/juicewrldApi'
import * as userApi from '../lib/userApi'
import type { SongEditProposal, EditorApplication } from '../lib/userApi'

type SubmitState = 'idle' | 'submitting' | 'submitted' | 'error'

const CATEGORIES = [
  { value: 'released', label: 'Released' },
  { value: 'unreleased', label: 'Unreleased' },
  { value: 'unsurfaced', label: 'Unsurfaced' },
  { value: 'recording_session', label: 'Recording Session' },
]

function cleanDate(raw: string | null | undefined): string {
  if (!raw) return ''
  return raw
    .replace(/^[A-Za-z][a-z]+\s+(?=[A-Z]|\d)/g, '')
    .trim()
    .replace(/\.$/, '')
    .trim()
}

function diffFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {}
  for (const key of Object.keys(after)) {
    const a = after[key]
    const b = before[key]
    if (a === '' && (b === '' || b == null)) continue
    if (a == null && b == null) continue
    if (JSON.stringify(a) !== JSON.stringify(b)) patch[key] = a === '' ? null : a
  }
  return patch
}

function Field({
  label, value, onChange, placeholder, rows, hint,
}: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; rows?: number; hint?: string
}): JSX.Element {
  return (
    <div>
      <label className="block text-xs text-text-muted mb-1">
        {label}
        {hint && <span className="text-text-muted/50 ml-1.5 font-normal normal-case tracking-normal">{hint}</span>}
      </label>
      {(rows ?? 1) > 1 ? (
        <textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className="w-full bg-surface-overlay border border-[var(--border)] rounded-lg px-3 py-2 text-text-primary text-xs resize-none focus:outline-none focus:border-accent/50" />
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className="w-full bg-surface-overlay border border-[var(--border)] rounded-lg px-3 py-2 text-text-primary text-xs focus:outline-none focus:border-accent/50" />
      )}
    </div>
  )
}

function SelectField({
  label, value, onChange, options, hint, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void
  options: { value: string; label: string }[]; hint?: string; placeholder?: string
}): JSX.Element {
  return (
    <div>
      <label className="block text-xs text-text-muted mb-1">
        {label}
        {hint && <span className="text-text-muted/50 ml-1.5 font-normal normal-case tracking-normal">{hint}</span>}
      </label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-surface-overlay border border-[var(--border)] rounded-lg px-3 py-2 text-text-primary text-xs focus:outline-none focus:border-accent/50 appearance-none">
        <option value="">{placeholder ?? '— select —'}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
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
    populate(song)
    setSubmitState('idle')
    setSubmitError(null)
  }, [populate])

  const refreshProposals = useCallback(async (): Promise<void> => {
    if (!isEditor) return
    try {
      setProposals(await userApi.getMyProposals())
    } catch {}
  }, [isEditor])

  useEffect(() => {
    if (!isEditor) return
    apiFetch<JWApiEra[] | { results: JWApiEra[] }>('/eras/')
      .then((d) => setEras(Array.isArray(d) ? d : (d as { results: JWApiEra[] }).results ?? []))
      .catch(() => undefined)
    refreshProposals()
  }, [isEditor, refreshProposals])

  useEffect(() => {
    if (!account || isEditor) {
      setApplication(null)
      return
    }
    setAppLoading(true)
    userApi.getMyApplication()
      .then((r) => setApplication(r.application))
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
    try {
      const data = await apiFetch<JWApiPaginatedResponse>('/songs/', { search: query, limit: 20 })
      setSongs(data.results)
    } catch {} finally {
      setSearching(false)
    }
  }

  const submit = async (): Promise<void> => {
    if (!selected) return
    setSubmitState('submitting')
    setSubmitError(null)
    const before = baseline(selected)
    const after: Record<string, unknown> = {
      name,
      credited_artists: creditedArtists,
      category,
      era_id: eraId ? Number(eraId) : '',
      producers,
      engineers,
      recording_locations: recordingLocations,
      record_dates: recordDates,
      release_date: releaseDate,
      leak_type: leakType,
      lyrics,
      additional_information: additionalInfo,
      notes,
    }
    const patch = diffFields(before, after)
    if (Object.keys(patch).length === 0) {
      setSubmitState('error')
      setSubmitError('No changes to propose.')
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

  if (!account) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center">
          <LogIn size={22} className="text-accent" />
        </div>
        <div>
          <p className="text-text-primary font-semibold mb-1">Log in to contribute</p>
          <p className="text-text-muted text-sm">Editors propose corrections and additions to song entries. Admins review and apply them.</p>
        </div>
        <button onClick={() => setShowUserAuth(true)} className="px-4 py-2 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] text-white text-sm font-semibold transition-colors">
          Continue with Discord
        </button>
      </div>
    )
  }

  if (!isEditor) {
    return <ApplicationView application={application} loading={appLoading} onSubmitted={(a) => setApplication(a)} onSignOut={() => logoutAccount()} />
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="px-5 pt-5 pb-3 shrink-0 flex items-center gap-3 border-b border-[var(--border)]">
        <h1 className="text-text-primary text-xl font-bold">Contribute</h1>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-text-muted">{account.display_name || account.discord_username}</span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${
            isAdmin ? 'bg-accent/20 text-accent' : 'bg-emerald-500/20 text-emerald-400'
          }`}>{isAdmin ? 'admin' : 'editor'}</span>
          <button onClick={() => logoutAccount()} className="text-xs text-text-muted hover:text-text-primary transition-colors">Log out</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        <div>
          <label className="block text-xs text-text-muted mb-1">Song</label>
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); if (!e.target.value) setSelected(null) }}
              onKeyDown={(e) => e.key === 'Enter' && search()}
              placeholder="Search for a song…"
              className="w-full bg-surface-overlay border border-[var(--border)] rounded-lg pl-3 pr-10 py-2 text-text-primary text-sm focus:outline-none focus:border-accent/50"
            />
            <button onClick={search} disabled={searching} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors">
              {searching ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
            </button>
          </div>
          {results.length > 0 && (
            <div className="mt-1 bg-surface-overlay border border-[var(--border)] rounded-lg overflow-hidden shadow-lg">
              {results.map((song) => (
                <button key={song.id} onClick={() => selectSong(song)}
                  className="w-full text-left px-3 py-2 hover:bg-surface-raised text-sm text-text-primary transition-colors border-b border-[var(--border)] last:border-0">
                  <span className="font-medium">{song.track_titles?.[0] || song.name}</span>
                  {song.era?.name && <span className="text-text-muted text-xs ml-2">{song.era.name}</span>}
                  <span className="text-text-muted/50 text-xs ml-2">#{song.id}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {selected && (
          <>
            <div className="flex gap-3 items-start p-3 bg-surface-overlay rounded-xl border border-[var(--border)]">
              {selected.image_url && (
                <img src={buildImageUrl(selected.image_url)} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-text-primary font-semibold text-sm truncate">{selected.track_titles?.[0] || selected.name}</p>
                <p className="text-text-muted text-xs truncate">{selected.credited_artists}</p>
                <div className="flex gap-1.5 mt-1 flex-wrap">
                  {selected.era?.name && <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-raised text-text-muted">{selected.era.name}</span>}
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-raised text-text-muted capitalize">{CATEGORY_LABELS[selected.category] || selected.category}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-raised text-text-muted">#{selected.id}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Edits</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Title" value={name} onChange={setName} />
                <Field label="Credited artists" value={creditedArtists} onChange={setCreditedArtists} />
                <SelectField label="Category" value={category} onChange={setCategory} options={CATEGORIES} />
                <SelectField
                  label="Era"
                  value={eraId}
                  onChange={setEraId}
                  options={eras.map((e) => ({ value: String(e.id), label: e.name }))}
                  placeholder={selected.era?.name || '— select era —'}
                />
              </div>
              <Field label="Producers" value={producers} onChange={setProducers} />
              <Field label="Engineers" value={engineers} onChange={setEngineers} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Recording date" value={recordDates} onChange={setRecordDates} placeholder="YYYY-MM-DD" />
                <Field label="Release date" value={releaseDate} onChange={setReleaseDate} placeholder="YYYY-MM-DD" />
              </div>
              <Field label="Recording location" value={recordingLocations} onChange={setRecordingLocations} placeholder="Studio / city" />
              <Field label="Leak type" value={leakType} onChange={setLeakType} placeholder="HQ, LQ, snippet, stem…" />
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Lyrics & info</p>
              <Field label="Lyrics" value={lyrics} onChange={setLyrics} rows={8} />
              <Field label="Additional information" value={additionalInfo} onChange={setAdditionalInfo} rows={4} />
              <Field label="Notes" value={notes} onChange={setNotes} rows={3} />
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Submission</p>
              <Field label="Editor notes" value={editorNotes} onChange={setEditorNotes} rows={2}
                hint="visible to admins" placeholder="What did you change and why?" />
            </div>

            {submitError && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                <AlertCircle size={13} className="shrink-0 mt-0.5" />
                {submitError}
              </div>
            )}

            <button onClick={submit} disabled={submitState === 'submitting'}
              className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                submitState === 'submitted' ? 'bg-emerald-500/20 text-emerald-400' :
                submitState === 'error' ? 'bg-red-500/20 text-red-400' :
                'bg-accent/15 hover:bg-accent/25 text-accent'
              }`}>
              {submitState === 'submitting' && <Loader2 size={15} className="animate-spin" />}
              {submitState === 'submitted' && <Check size={15} />}
              {submitState === 'error' && <AlertCircle size={15} />}
              {submitState === 'idle' && <Send size={14} />}
              {submitState === 'idle' && 'Submit proposal'}
              {submitState === 'submitting' && 'Submitting…'}
              {submitState === 'submitted' && 'Submitted!'}
              {submitState === 'error' && 'Try again'}
            </button>
          </>
        )}

        {proposals.length > 0 && (
          <div className="space-y-2 pt-4 border-t border-[var(--border)]">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-text-muted">
              <History size={12} /> Your recent proposals
            </div>
            {proposals.slice(0, 10).map((p) => (
              <ProposalRow key={p.id} proposal={p} onWithdraw={async () => { await userApi.withdrawProposal(p.id).catch(() => undefined); refreshProposals() }} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ProposalRow({ proposal, onWithdraw }: { proposal: SongEditProposal; onWithdraw: () => Promise<void> }): JSX.Element {
  const statusColor = {
    pending: 'bg-yellow-500/15 text-yellow-400',
    approved: 'bg-emerald-500/15 text-emerald-400',
    rejected: 'bg-red-500/15 text-red-400',
    reversed: 'bg-text-muted/10 text-text-muted',
  }[proposal.status]
  return (
    <div className="bg-surface-overlay border border-[var(--border)] rounded-xl px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${statusColor}`}>{proposal.status}</span>
        <p className="text-text-primary text-sm font-medium truncate flex-1">{proposal.title || `Proposal #${proposal.id}`}</p>
        {proposal.status === 'pending' && (
          <button onClick={onWithdraw} className="p-1 text-text-muted hover:text-red-400 transition-colors" title="Withdraw">
            <X size={14} />
          </button>
        )}
      </div>
      {proposal.review_notes && (
        <p className="text-text-muted text-xs mt-1.5 italic">{proposal.review_notes}</p>
      )}
      <p className="text-text-muted/60 text-[10px] mt-1">
        {Object.keys(proposal.proposed_data || {}).length} field{Object.keys(proposal.proposed_data || {}).length === 1 ? '' : 's'} · {new Date(proposal.created_at).toLocaleDateString()}
      </p>
    </div>
  )
}

function ApplicationView({
  application, loading, onSubmitted, onSignOut,
}: {
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
    if (motivation.trim().length < 20) {
      setError('Please describe your motivation in at least 20 characters.')
      return
    }
    setSubmitting(true)
    try {
      const created = await userApi.submitApplication({
        display_name: displayName,
        contact,
        experience,
        motivation,
        areas,
      })
      onSubmitted(created)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-muted">
        <Loader2 size={18} className="animate-spin" />
      </div>
    )
  }

  if (application && application.status === 'pending') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center">
          <Clock size={22} className="text-yellow-400" />
        </div>
        <div>
          <p className="text-text-primary font-semibold mb-1">Application pending</p>
          <p className="text-text-muted text-sm max-w-md">Your editor application is under review. You'll be notified on Discord once an admin reviews it.</p>
        </div>
        <button onClick={onSignOut} className="text-xs text-text-muted hover:text-text-primary transition-colors">Log out</button>
      </div>
    )
  }

  if (application && application.status === 'rejected') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center">
          <X size={22} className="text-red-400" />
        </div>
        <div>
          <p className="text-text-primary font-semibold mb-1">Application not approved</p>
          {application.review_notes && <p className="text-text-muted text-sm mt-2 max-w-md italic">"{application.review_notes}"</p>}
        </div>
        <button onClick={onSignOut} className="text-xs text-text-muted hover:text-text-primary transition-colors">Log out</button>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="px-5 pt-5 pb-3 shrink-0 border-b border-[var(--border)]">
        <h1 className="text-text-primary text-xl font-bold flex items-center gap-2">
          <Award size={20} className="text-accent" /> Become an editor
        </h1>
        <p className="text-text-muted text-sm mt-1">Editors propose corrections and new song entries. Admins review and apply them.</p>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 max-w-2xl">
        <Field label="Display name" value={displayName} onChange={setDisplayName} placeholder="How you want to be credited" />
        <Field label="Contact" value={contact} onChange={setContact} placeholder="Discord, email, etc." />
        <Field label="Areas of focus" value={areas} onChange={setAreas} placeholder="Lyrics, sessions, recording dates…" />
        <Field label="Relevant experience" value={experience} onChange={setExperience} rows={4}
          placeholder="Other databases you've contributed to, sources you have access to, etc." />
        <Field label="Why do you want to be an editor?" value={motivation} onChange={setMotivation} rows={5}
          hint="at least 20 characters" placeholder="Tell us about your motivation…" />

        {error && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            <AlertCircle size={13} className="shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <button onClick={submit} disabled={submitting}
          className="w-full py-2.5 rounded-xl bg-accent/15 hover:bg-accent/25 text-accent text-sm font-semibold transition-colors flex items-center justify-center gap-2">
          {submitting && <Loader2 size={14} className="animate-spin" />}
          Submit application
        </button>
        <button onClick={onSignOut} className="w-full text-xs text-text-muted hover:text-text-primary transition-colors">Log out</button>
      </div>
    </div>
  )
}
