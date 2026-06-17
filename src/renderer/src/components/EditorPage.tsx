import { useState } from 'react'
import { ChevronLeft, Search, Loader2, Check, AlertCircle } from 'lucide-react'
import { useStore } from '../store/useStore'
import { apiFetch, JWApiPaginatedResponse, JWApiSong } from '../lib/juicewrldApi'
import { upsertSupplement, supabaseReady } from '../lib/supabase'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export default function EditorPage(): JSX.Element {
  const { setActiveView } = useStore()

  const [query, setQuery] = useState('')
  const [results, setSongs] = useState<JWApiSong[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<JWApiSong | null>(null)

  // Form state
  const [editorName, setEditorName] = useState('')
  const [context, setContext] = useState('')
  const [sampleInfo, setSampleInfo] = useState('')
  const [trivia, setTrivia] = useState('')        // newline-separated
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

  const search = async () => {
    if (!query.trim()) return
    setSearching(true)
    setSongs([])
    try {
      const data = await apiFetch<JWApiPaginatedResponse>('/songs/', { search: query, limit: 20 })
      setSongs(data.results)
    } catch { /* silently fail */ }
    finally { setSearching(false) }
  }

  const selectSong = (song: JWApiSong) => {
    setSelected(song)
    setSongs([])
    setQuery(song.track_titles?.[0] || song.name)
  }

  const save = async () => {
    if (!selected || !supabaseReady) return
    setSaveState('saving')
    const triviaArray = trivia.split('\n').map(s => s.trim()).filter(Boolean)
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
      updated_by: editorName || null,
    })
    setSaveState(result ? 'saved' : 'error')
    setTimeout(() => setSaveState('idle'), 3000)
  }

  const field = (label: string, value: string, set: (v: string) => void, opts?: { placeholder?: string; mono?: boolean; rows?: number }) => (
    <div>
      <label className="block text-xs text-text-muted mb-1">{label}</label>
      {(opts?.rows ?? 1) > 1 ? (
        <textarea
          rows={opts!.rows}
          value={value}
          onChange={e => set(e.target.value)}
          placeholder={opts?.placeholder}
          className={`w-full bg-surface-overlay border border-[var(--border)] rounded-lg px-3 py-2 text-text-primary text-xs resize-none focus:outline-none focus:border-accent/50 ${opts?.mono ? 'font-mono' : ''}`}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={e => set(e.target.value)}
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
        <button
          onClick={() => setActiveView('api-tracker')}
          className="p-1.5 rounded-lg hover:bg-surface-overlay transition-colors text-text-muted hover:text-text-primary"
        >
          <ChevronLeft size={18} />
        </button>
        <h1 className="text-text-primary text-xl font-bold">Editor</h1>
        {!supabaseReady && (
          <span className="ml-auto text-xs text-orange-400 flex items-center gap-1">
            <AlertCircle size={12} /> Supabase not connected
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Song search */}
        <div>
          <label className="block text-xs text-text-muted mb-1">Song</label>
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()}
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

          {/* Results dropdown */}
          {results.length > 0 && (
            <div className="mt-1 bg-surface-overlay border border-[var(--border)] rounded-lg overflow-hidden shadow-lg">
              {results.map(song => (
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
            <p className="text-xs text-accent mt-1.5">Editing: <span className="font-medium">{selected.track_titles?.[0] || selected.name}</span> (ID {selected.id})</p>
          )}
        </div>

        {selected && (
          <>
            {/* Context */}
            <div className="space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Narrative</p>
              {field('Context / Story', context, setContext, { rows: 4, placeholder: 'Historical background, recording story, etc.' })}
              {field('Sample Info', sampleInfo, setSampleInfo, { rows: 2, placeholder: 'What samples are used and where' })}
              {field('Trivia', trivia, setTrivia, { rows: 3, placeholder: 'One fact per line' })}
            </div>

            {/* Links */}
            <div className="space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Links</p>
              {field('YouTube URL', youtubeUrl, setYoutubeUrl, { placeholder: 'https://youtube.com/watch?v=…' })}
              {field('SoundCloud URL', soundcloudUrl, setSoundcloudUrl, { placeholder: 'https://soundcloud.com/…' })}
            </div>

            {/* Corrections */}
            <div className="space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Verified Corrections</p>
              {field('Producers', verifiedProducers, setVerifiedProducers, { placeholder: 'Corrected producers (overrides API)' })}
              {field('Engineers', verifiedEngineers, setVerifiedEngineers, { placeholder: 'Corrected engineers (overrides API)' })}
              {field('Release date', verifiedReleaseDate, setVerifiedReleaseDate, { placeholder: 'YYYY-MM-DD' })}
              {field('Recording date', verifiedRecordingDate, setVerifiedRecordingDate, { placeholder: 'YYYY-MM-DD or approximate' })}
              {field('Recording location', verifiedLocation, setVerifiedLocation, { placeholder: 'Studio name / city' })}
            </div>

            {/* Meta */}
            <div className="space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Editorial</p>
              <div>
                <label className="block text-xs text-text-muted mb-1">Quality rating (1–10)</label>
                <input
                  type="number" min={1} max={10} value={qualityRating}
                  onChange={e => setQualityRating(e.target.value)}
                  className="w-24 bg-surface-overlay border border-[var(--border)] rounded-lg px-3 py-2 text-text-primary text-xs focus:outline-none focus:border-accent/50"
                />
              </div>
              {field('Editor notes', editorNotes, setEditorNotes, { rows: 3, placeholder: 'Internal editorial notes' })}
              {field('Your name / handle', editorName, setEditorName, { placeholder: 'e.g. freakylatif (shown publicly)' })}
            </div>

            {/* Save */}
            <button
              onClick={save}
              disabled={saveState === 'saving' || !supabaseReady}
              className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                saveState === 'saved'  ? 'bg-emerald-500/20 text-emerald-400' :
                saveState === 'error' ? 'bg-red-500/20 text-red-400' :
                !supabaseReady        ? 'bg-surface-overlay text-text-muted cursor-not-allowed' :
                'bg-accent/15 hover:bg-accent/25 text-accent'
              }`}
            >
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
    </div>
  )
}
