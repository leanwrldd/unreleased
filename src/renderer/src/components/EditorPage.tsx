import { useState, useEffect } from 'react'
import { Search, Loader2, Check, AlertCircle, LogIn, Clock } from 'lucide-react'
import { useStore } from '../store/useStore'
import { apiFetch, JWApiPaginatedResponse, JWApiSong } from '../lib/juicewrldApi'
import { upsertSupplement, supabaseReady, signOut, deleteAccount } from '../lib/supabase'
import AuthModal from './AuthModal'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export default function EditorPage(): JSX.Element {
  const { setActiveView, session, userProfile, pendingEditorSongId, setPendingEditorSongId } = useStore()

  const [query, setQuery] = useState('')
  const [results, setSongs] = useState<JWApiSong[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<JWApiSong | null>(null)
  const [showAuth, setShowAuth] = useState(false)

  // Form state
  const [editorName, setEditorName] = useState(userProfile?.username ?? '')
  const [context, setContext] = useState('')
  const [sampleInfo, setSampleInfo] = useState('')
  const [trivia, setTrivia] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [soundcloudUrl, setSoundcloudUrl] = useState('')
  const [verifiedProducers, setVerifiedProducers] = useState('')
  const [verifiedEngineers, setVerifiedEngineers] = useState('')
  const [verifiedReleaseDate, setVerifiedReleaseDate] = useState('')
  const [verifiedRecordingDate, setVerifiedRecordingDate] = useState('')
  const [verifiedLocation, setVerifiedLocation] = useState('')
  const [qualityRating, setQualityRating] = useState<string>('')
  const [editorNotes, setEditorNotes] = useState('')
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [deleting, setDeleting] = useState(false)

  const canEdit = supabaseReady && (userProfile?.role === 'editor' || userProfile?.role === 'admin')

  const handleDeleteAccount = async (): Promise<void> => {
    if (!confirm('Delete your account? This cannot be undone.')) return
    setDeleting(true)
    await deleteAccount()
    setDeleting(false)
  }

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

  const selectSong = (song: JWApiSong): void => {
    setSelected(song)
    setSongs([])
    setQuery(song.track_titles?.[0] || song.name)
  }

  // Pre-select song navigated from NowPlaying edit button
  useEffect(() => {
    if (!pendingEditorSongId) return
    const id = pendingEditorSongId
    setPendingEditorSongId(null)
    apiFetch<JWApiSong>(`/songs/${id}/`)
      .then((song) => selectSong(song))
      .catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (): Promise<void> => {
    if (!selected || !canEdit) return
    setSaveState('saving')
    const triviaArray = trivia.split('\n').map((s) => s.trim()).filter(Boolean)
    const result = await upsertSupplement(selected.id, {
      context: context || null,
      sample_info: sampleInfo || null,
      trivia: triviaArray.length ? triviaArray : null,
      youtube_url: youtubeUrl || null,
      soundcloud_url: soundcloudUrl || null,
      verified_producers: verifiedProducers || null,
      verified_engineers: verifiedEngineers || null,
      verified_release_date: verifiedReleaseDate || null,
      verified_recording_date: verifiedRecordingDate || null,
      verified_recording_location: verifiedLocation || null,
      quality_rating: qualityRating ? parseInt(qualityRating) : null,
      editor_notes: editorNotes || null,
      updated_by: editorName || userProfile?.email || null,
    })
    setSaveState(result ? 'saved' : 'error')
    setTimeout(() => setSaveState('idle'), 3000)
  }

  const field = (
    label: string,
    value: string,
    set: (v: string) => void,
    opts?: { placeholder?: string; rows?: number }
  ) => (
    <div>
      <label className="block text-xs text-text-muted mb-1">{label}</label>
      {(opts?.rows ?? 1) > 1 ? (
        <textarea
          rows={opts!.rows}
          value={value}
          onChange={(e) => set(e.target.value)}
          placeholder={opts?.placeholder}
          className="w-full bg-surface-overlay border border-[var(--border)] rounded-lg px-3 py-2 text-text-primary text-xs resize-none focus:outline-none focus:border-accent/50"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => set(e.target.value)}
          placeholder={opts?.placeholder}
          className="w-full bg-surface-overlay border border-[var(--border)] rounded-lg px-3 py-2 text-text-primary text-xs focus:outline-none focus:border-accent/50"
        />
      )}
    </div>
  )

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 shrink-0 flex items-center gap-3 border-b border-[var(--border)]">
        <h1 className="text-text-primary text-xl font-bold">Contribute</h1>

        {session && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-text-muted">{userProfile?.email}</span>
            {userProfile?.role && (
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${
                userProfile.role === 'admin'  ? 'bg-accent/20 text-accent' :
                userProfile.role === 'editor' ? 'bg-emerald-500/20 text-emerald-400' :
                'bg-yellow-500/20 text-yellow-400'
              }`}>{userProfile.role}</span>
            )}
            <button
              onClick={() => signOut()}
              className="text-xs text-text-muted hover:text-text-primary transition-colors"
            >
              Log out
            </button>
            <button
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="text-xs text-red-400/60 hover:text-red-400 transition-colors"
            >
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
          <button
            onClick={() => setShowAuth(true)}
            className="px-4 py-2 rounded-xl bg-accent/15 hover:bg-accent/25 text-accent text-sm font-semibold transition-colors"
          >
            Sign in / Sign up
          </button>
        </div>

      /* Auth gate — pending approval */
      ) : userProfile?.role === 'pending' ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center">
            <Clock size={22} className="text-yellow-400" />
          </div>
          <div>
            <p className="text-text-primary font-semibold mb-1">Pending approval</p>
            <p className="text-text-muted text-sm">
              Your account is awaiting admin approval. You'll be able to edit once approved.
            </p>
          </div>
          <button
            onClick={() => signOut()}
            className="text-xs text-text-muted hover:text-text-primary transition-colors"
          >
            Sign out
          </button>
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
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && search()}
                placeholder="Search for a song…"
                className="w-full bg-surface-overlay border border-[var(--border)] rounded-lg pl-3 pr-10 py-2 text-text-primary text-sm focus:outline-none focus:border-accent/50"
              />
              <button
                onClick={search}
                disabled={searching}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
              >
                {searching ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
              </button>
            </div>

            {results.length > 0 && (
              <div className="mt-1 bg-surface-overlay border border-[var(--border)] rounded-lg overflow-hidden shadow-lg">
                {results.map((song) => (
                  <button
                    key={song.id}
                    onClick={() => selectSong(song)}
                    className="w-full text-left px-3 py-2 hover:bg-surface-raised text-sm text-text-primary transition-colors border-b border-[var(--border)] last:border-0"
                  >
                    <span className="font-medium">{song.track_titles?.[0] || song.name}</span>
                    {song.era?.name && <span className="text-text-muted text-xs ml-2">{song.era.name}</span>}
                  </button>
                ))}
              </div>
            )}

            {selected && (
              <p className="text-xs text-accent mt-1.5">
                Editing: <span className="font-medium">{selected.track_titles?.[0] || selected.name}</span> (ID {selected.id})
              </p>
            )}
          </div>

          {selected && (
            <>
              <div className="space-y-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Narrative</p>
                {field('Context / Story', context, setContext, { rows: 4, placeholder: 'Historical background, recording story, etc.' })}
                {field('Sample Info', sampleInfo, setSampleInfo, { rows: 2, placeholder: 'What samples are used and where' })}
                {field('Trivia', trivia, setTrivia, { rows: 3, placeholder: 'One fact per line' })}
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Links</p>
                {field('YouTube URL', youtubeUrl, setYoutubeUrl, { placeholder: 'https://youtube.com/watch?v=…' })}
                {field('SoundCloud URL', soundcloudUrl, setSoundcloudUrl, { placeholder: 'https://soundcloud.com/…' })}
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Verified Corrections</p>
                {field('Producers', verifiedProducers, setVerifiedProducers, { placeholder: 'Corrected producers (overrides API)' })}
                {field('Engineers', verifiedEngineers, setVerifiedEngineers, { placeholder: 'Corrected engineers (overrides API)' })}
                {field('Release date', verifiedReleaseDate, setVerifiedReleaseDate, { placeholder: 'YYYY-MM-DD' })}
                {field('Recording date', verifiedRecordingDate, setVerifiedRecordingDate, { placeholder: 'YYYY-MM-DD or approximate' })}
                {field('Recording location', verifiedLocation, setVerifiedLocation, { placeholder: 'Studio name / city' })}
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Editorial</p>
                <div>
                  <label className="block text-xs text-text-muted mb-1">Quality rating (1–10)</label>
                  <input
                    type="number" min={1} max={10} value={qualityRating}
                    onChange={(e) => setQualityRating(e.target.value)}
                    className="w-24 bg-surface-overlay border border-[var(--border)] rounded-lg px-3 py-2 text-text-primary text-xs focus:outline-none focus:border-accent/50"
                  />
                </div>
                {field('Editor notes', editorNotes, setEditorNotes, { rows: 3, placeholder: 'Internal editorial notes' })}
                {field('Your name / handle', editorName, setEditorName, { placeholder: 'Shown publicly with your edits' })}
              </div>

              <button
                onClick={save}
                disabled={saveState === 'saving'}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                  saveState === 'saved'  ? 'bg-emerald-500/20 text-emerald-400' :
                  saveState === 'error'  ? 'bg-red-500/20 text-red-400' :
                  'bg-accent/15 hover:bg-accent/25 text-accent'
                }`}
              >
                {saveState === 'saving' && <Loader2 size={15} className="animate-spin" />}
                {saveState === 'saved'  && <Check size={15} />}
                {saveState === 'error'  && <AlertCircle size={15} />}
                {saveState === 'idle'    && 'Save to database'}
                {saveState === 'saving'  && 'Saving…'}
                {saveState === 'saved'   && 'Saved!'}
                {saveState === 'error'   && 'Error saving'}
              </button>
            </>
          )}
        </div>
      )}

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  )
}
