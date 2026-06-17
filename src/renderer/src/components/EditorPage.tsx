import { useState, useEffect } from 'react'
import { Search, Loader2, Check, AlertCircle, LogIn, Clock } from 'lucide-react'
import { useStore } from '../store/useStore'
import { apiFetch, JWApiPaginatedResponse, JWApiSong, buildImageUrl, CATEGORY_LABELS } from '../lib/juicewrldApi'
import { getSupplement, upsertSupplement, supabaseReady, signOut, deleteAccount } from '../lib/supabase'
import AuthModal from './AuthModal'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

const CATEGORIES = [
  { value: 'released',          label: 'Released' },
  { value: 'unreleased',        label: 'Unreleased' },
  { value: 'unsurfaced',        label: 'Unsurfaced' },
  { value: 'recording_session', label: 'Recording Session' },
]

/** Strip leading word(s) like "Recorded" or "Released" that the API sometimes prepends */
function cleanDate(raw: string | null | undefined): string {
  if (!raw) return ''
  return raw
    .replace(/^[A-Za-z][a-z]+\s+(?=[A-Z]|\d)/g, '') // strip leading words before a capital/digit
    .trim()
    .replace(/\.$/, '')                                // strip trailing period
    .trim()
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
  label, value, onChange, options, hint,
}: {
  label: string; value: string; onChange: (v: string) => void
  options: { value: string; label: string }[]; hint?: string
}): JSX.Element {
  return (
    <div>
      <label className="block text-xs text-text-muted mb-1">
        {label}
        {hint && <span className="text-text-muted/50 ml-1.5 font-normal normal-case tracking-normal">{hint}</span>}
      </label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-surface-overlay border border-[var(--border)] rounded-lg px-3 py-2 text-text-primary text-xs focus:outline-none focus:border-accent/50 appearance-none">
        <option value="">— select —</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

export default function EditorPage(): JSX.Element {
  const { setActiveView, session, userProfile, pendingEditorSongId, setPendingEditorSongId } = useStore()

  const [query, setQuery] = useState('')
  const [results, setSongs] = useState<JWApiSong[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<JWApiSong | null>(null)
  const [loadingSupplement, setLoadingSupplement] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')

  // ── Correction fields ──────────────────────────────────────────────────────
  const [correctedTitle, setCorrectedTitle] = useState('')
  const [correctedArtist, setCorrectedArtist] = useState('')
  const [correctedAlbum, setCorrectedAlbum] = useState('')
  const [correctedEra, setCorrectedEra] = useState('')
  const [correctedCategory, setCorrectedCategory] = useState('')
  const [verifiedProducers, setVerifiedProducers] = useState('')
  const [verifiedEngineers, setVerifiedEngineers] = useState('')
  const [verifiedReleaseDate, setVerifiedReleaseDate] = useState('')
  const [verifiedRecordingDate, setVerifiedRecordingDate] = useState('')
  const [verifiedLocation, setVerifiedLocation] = useState('')
  const [verifiedLeakType, setVerifiedLeakType] = useState('')

  // ── Supplemental fields ────────────────────────────────────────────────────
  const [context, setContext] = useState('')
  const [sampleInfo, setSampleInfo] = useState('')
  const [trivia, setTrivia] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [soundcloudUrl, setSoundcloudUrl] = useState('')
  const [lyrics, setLyrics] = useState('')
  const [syncedLyrics, setSyncedLyrics] = useState('')
  const [qualityRating, setQualityRating] = useState('')
  const [editorNotes, setEditorNotes] = useState('')

  const canEdit = supabaseReady && (userProfile?.role === 'editor' || userProfile?.role === 'admin')

  const resetForm = (): void => {
    setCorrectedTitle(''); setCorrectedArtist(''); setCorrectedAlbum('')
    setCorrectedEra(''); setCorrectedCategory(''); setVerifiedProducers('')
    setVerifiedEngineers(''); setVerifiedReleaseDate(''); setVerifiedRecordingDate('')
    setVerifiedLocation(''); setVerifiedLeakType(''); setContext(''); setSampleInfo('')
    setTrivia(''); setYoutubeUrl(''); setSoundcloudUrl('')
    setLyrics(''); setSyncedLyrics(''); setQualityRating(''); setEditorNotes('')
  }

  const populateFromSong = (song: JWApiSong): void => {
    setCorrectedTitle(song.track_titles?.[0] || song.name)
    setCorrectedArtist(song.credited_artists || '')
    setCorrectedEra(song.era?.name || '')
    setCorrectedCategory(song.category || '')
    setVerifiedProducers(song.producers || '')
    setVerifiedEngineers(song.engineers || '')
    setVerifiedReleaseDate(cleanDate(song.release_date))
    setVerifiedRecordingDate(cleanDate(song.record_dates))
    setVerifiedLocation(song.recording_locations || '')
    setVerifiedLeakType(song.leak_type || '')
    // Pull additional_information into context if present
    if (song.additional_information) setContext(song.additional_information)
    // Pull lyrics from API if present
    if (song.lyrics) setLyrics(song.lyrics)
  }

  const selectSong = async (song: JWApiSong): Promise<void> => {
    setSelected(song)
    setSongs([])
    setQuery(song.track_titles?.[0] || song.name)
    resetForm()
    populateFromSong(song)

    setLoadingSupplement(true)
    try {
      const sup = await getSupplement(song.id)
      if (sup) {
        if (sup.corrected_title)             setCorrectedTitle(sup.corrected_title)
        if (sup.corrected_artist)            setCorrectedArtist(sup.corrected_artist)
        if (sup.corrected_album)             setCorrectedAlbum(sup.corrected_album)
        if (sup.corrected_era)               setCorrectedEra(sup.corrected_era)
        if (sup.corrected_category)          setCorrectedCategory(sup.corrected_category)
        if (sup.verified_producers)          setVerifiedProducers(sup.verified_producers)
        if (sup.verified_engineers)          setVerifiedEngineers(sup.verified_engineers)
        if (sup.verified_release_date)       setVerifiedReleaseDate(sup.verified_release_date)
        if (sup.verified_recording_date)     setVerifiedRecordingDate(sup.verified_recording_date)
        if (sup.verified_recording_location) setVerifiedLocation(sup.verified_recording_location)
        if (sup.verified_leak_type)          setVerifiedLeakType(sup.verified_leak_type)
        if (sup.context)                     setContext(sup.context)
        if (sup.sample_info)                 setSampleInfo(sup.sample_info)
        if (sup.trivia)                      setTrivia(sup.trivia.join('\n'))
        if (sup.youtube_url)                 setYoutubeUrl(sup.youtube_url)
        if (sup.soundcloud_url)              setSoundcloudUrl(sup.soundcloud_url)
        if (sup.lyrics)                      setLyrics(sup.lyrics)
        if (sup.synced_lyrics)               setSyncedLyrics(sup.synced_lyrics)
        if (sup.quality_rating)              setQualityRating(String(sup.quality_rating))
        if (sup.editor_notes)                setEditorNotes(sup.editor_notes)
      }
    } catch { /* silently fail */ }
    finally { setLoadingSupplement(false) }
  }

  useEffect(() => {
    if (!pendingEditorSongId) return
    const id = pendingEditorSongId
    setPendingEditorSongId(null)
    apiFetch<JWApiSong>(`/songs/${id}/`)
      .then((song) => selectSong(song))
      .catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const search = async (): Promise<void> => {
    if (!query.trim()) return
    setSearching(true)
    setSongs([])
    try {
      const data = await apiFetch<JWApiPaginatedResponse>('/songs/', { search: query, limit: 20 })
      setSongs(data.results)
    } catch { /* silently fail */ }
    finally { setSearching(false) }
  }

  const save = async (): Promise<void> => {
    if (!selected || !canEdit) return
    setSaveState('saving')
    const triviaArray = trivia.split('\n').map((s) => s.trim()).filter(Boolean)
    const result = await upsertSupplement(selected.id, {
      corrected_title: correctedTitle || null,
      corrected_artist: correctedArtist || null,
      corrected_album: correctedAlbum || null,
      corrected_era: correctedEra || null,
      corrected_category: correctedCategory || null,
      verified_producers: verifiedProducers || null,
      verified_engineers: verifiedEngineers || null,
      verified_release_date: verifiedReleaseDate || null,
      verified_recording_date: verifiedRecordingDate || null,
      verified_recording_location: verifiedLocation || null,
      verified_leak_type: verifiedLeakType || null,
      context: context || null,
      sample_info: sampleInfo || null,
      trivia: triviaArray.length ? triviaArray : null,
      youtube_url: youtubeUrl || null,
      soundcloud_url: soundcloudUrl || null,
      lyrics: lyrics || null,
      synced_lyrics: syncedLyrics || null,
      quality_rating: qualityRating ? parseInt(qualityRating) : null,
      editor_notes: editorNotes || null,
      updated_by: userProfile?.username || userProfile?.email || null,
    })
    setSaveState(result ? 'saved' : 'error')
    setTimeout(() => setSaveState('idle'), 3000)
  }

  const handleDeleteAccount = async (): Promise<void> => {
    if (!confirm('Delete your account? This cannot be undone.')) return
    setDeleting(true)
    await deleteAccount()
    setDeleting(false)
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 shrink-0 flex items-center gap-3 border-b border-[var(--border)]">
        <h1 className="text-text-primary text-xl font-bold">Contribute</h1>
        {session && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-text-muted">{userProfile?.username || userProfile?.email}</span>
            {userProfile?.role && (
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${
                userProfile.role === 'admin'  ? 'bg-accent/20 text-accent' :
                userProfile.role === 'editor' ? 'bg-emerald-500/20 text-emerald-400' :
                'bg-yellow-500/20 text-yellow-400'
              }`}>{userProfile.role}</span>
            )}
            <button onClick={() => signOut()} className="text-xs text-text-muted hover:text-text-primary transition-colors">Log out</button>
            <button onClick={handleDeleteAccount} disabled={deleting} className="text-xs text-red-400/60 hover:text-red-400 transition-colors">
              {deleting ? 'Deleting…' : 'Delete account'}
            </button>
          </div>
        )}
      </div>

      {/* Auth gate — not signed in */}
      {!session ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center">
            <LogIn size={22} className="text-accent" />
          </div>
          <div>
            <p className="text-text-primary font-semibold mb-1">Sign in to contribute</p>
            <p className="text-text-muted text-sm">Add context, trivia, lyrics sources and corrections to song entries.</p>
          </div>
          <button onClick={() => setShowAuth(true)} className="px-4 py-2 rounded-xl bg-accent/15 hover:bg-accent/25 text-accent text-sm font-semibold transition-colors">
            Sign in / Sign up
          </button>
        </div>

      /* Auth gate — pending */
      ) : userProfile?.role === 'pending' ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center">
            <Clock size={22} className="text-yellow-400" />
          </div>
          <div>
            <p className="text-text-primary font-semibold mb-1">Pending approval</p>
            <p className="text-text-muted text-sm">Your account is awaiting admin approval. You'll be able to edit once approved.</p>
          </div>
          <button onClick={() => signOut()} className="text-xs text-text-muted hover:text-text-primary transition-colors">Sign out</button>
        </div>

      /* Editor form */
      ) : (
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* Song search */}
          <div>
            <label className="block text-xs text-text-muted mb-1">Song</label>
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); if (!e.target.value) { setSelected(null); resetForm() } }}
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
              {/* Song preview card */}
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
                    {selected.leak_type && <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-raised text-text-muted">{selected.leak_type}</span>}
                  </div>
                </div>
                {loadingSupplement && <Loader2 size={14} className="animate-spin text-text-muted shrink-0 mt-1" />}
              </div>

              {/* ── Corrections ─────────────────────────────────────── */}
              <div className="space-y-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
                  Corrections <span className="font-normal normal-case tracking-normal text-text-muted/50">— pre-filled from API, edit to override</span>
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Title" value={correctedTitle} onChange={setCorrectedTitle} />
                  <Field label="Artist" value={correctedArtist} onChange={setCorrectedArtist} />
                  <Field label="Album" value={correctedAlbum} onChange={setCorrectedAlbum} hint="editor-only" placeholder="e.g. Goodbye & Good Riddance" />
                  <Field label="Era" value={correctedEra} onChange={setCorrectedEra} />
                </div>
                <SelectField label="Category" value={correctedCategory} onChange={setCorrectedCategory} options={CATEGORIES} />
                <Field label="Producers" value={verifiedProducers} onChange={setVerifiedProducers} />
                <Field label="Engineers" value={verifiedEngineers} onChange={setVerifiedEngineers} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Release date" value={verifiedReleaseDate} onChange={setVerifiedReleaseDate} placeholder="YYYY-MM-DD" />
                  <Field label="Recording date" value={verifiedRecordingDate} onChange={setVerifiedRecordingDate} placeholder="YYYY-MM-DD or approx." />
                </div>
                <Field label="Recording location" value={verifiedLocation} onChange={setVerifiedLocation} placeholder="Studio / city" />
                <Field label="Leak type" value={verifiedLeakType} onChange={setVerifiedLeakType} placeholder="e.g. HQ, LQ, snippet, stem…" />
              </div>

              {/* ── Supplemental ────────────────────────────────────── */}
              <div className="space-y-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Supplemental info</p>
                <Field label="Context / Story" value={context} onChange={setContext} rows={4}
                  hint="pre-filled from API additional info if available"
                  placeholder="Historical background, recording story, etc." />
                <Field label="Sample info" value={sampleInfo} onChange={setSampleInfo} rows={2} placeholder="What samples are used and where" />
                <Field label="Trivia" value={trivia} onChange={setTrivia} rows={3} hint="one fact per line"
                  placeholder={'The bridge was recorded in Atlanta\nOriginally titled "Test"'} />
              </div>

              {/* ── Lyrics ──────────────────────────────────────────── */}
              <div className="space-y-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Lyrics</p>
                <Field label="Lyrics" value={lyrics} onChange={setLyrics} rows={8}
                  hint="pre-filled from API if available"
                  placeholder="Plain text lyrics…" />
                <Field label="Synced lyrics" value={syncedLyrics} onChange={setSyncedLyrics} rows={8}
                  hint="LRC format"
                  placeholder={'[00:12.34] First line\n[00:15.00] Second line…'} />
              </div>

              {/* ── Links ───────────────────────────────────────────── */}
              <div className="space-y-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Links</p>
                <Field label="YouTube URL" value={youtubeUrl} onChange={setYoutubeUrl} placeholder="https://youtube.com/watch?v=…" />
                <Field label="SoundCloud URL" value={soundcloudUrl} onChange={setSoundcloudUrl} placeholder="https://soundcloud.com/…" />
              </div>

              {/* ── Editorial ───────────────────────────────────────── */}
              <div className="space-y-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Editorial</p>
                <div>
                  <label className="block text-xs text-text-muted mb-1">Quality rating <span className="text-text-muted/50">1–10</span></label>
                  <input type="number" min={1} max={10} value={qualityRating} onChange={(e) => setQualityRating(e.target.value)}
                    className="w-20 bg-surface-overlay border border-[var(--border)] rounded-lg px-3 py-2 text-text-primary text-xs focus:outline-none focus:border-accent/50" />
                </div>
                <Field label="Editor notes" value={editorNotes} onChange={setEditorNotes} rows={3} hint="internal only" placeholder="Internal editorial notes" />
              </div>

              {/* Save */}
              <button onClick={save} disabled={saveState === 'saving'}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                  saveState === 'saved'  ? 'bg-emerald-500/20 text-emerald-400' :
                  saveState === 'error'  ? 'bg-red-500/20 text-red-400' :
                  'bg-accent/15 hover:bg-accent/25 text-accent'
                }`}>
                {saveState === 'saving' && <Loader2 size={15} className="animate-spin" />}
                {saveState === 'saved'  && <Check size={15} />}
                {saveState === 'error'  && <AlertCircle size={15} />}
                {saveState === 'idle'   && 'Save to database'}
                {saveState === 'saving' && 'Saving…'}
                {saveState === 'saved'  && 'Saved!'}
                {saveState === 'error'  && 'Error saving'}
              </button>
            </>
          )}
        </div>
      )}

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  )
}
