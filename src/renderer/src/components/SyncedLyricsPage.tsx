import { useState, useEffect, useRef, useCallback } from 'react'
import { ArrowLeft, Wand2, Copy, Check, Save, Loader2, Music2, AlertCircle } from 'lucide-react'
import { useStore } from '../store/useStore'
import { apiFetch, buildStreamUrl, JWApiSong } from '../lib/juicewrldApi'
import * as userApi from '../lib/userApi'

// ── LRC helpers ────────────────────────────────────────────────────────────────

interface WordChunk {
  text: string
  timestamp: [number, number | null]
}

function toMMSScc(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = (secs % 60).toFixed(2).padStart(5, '0')
  return `${m}:${s}`
}

/** Normalise text for fuzzy matching — lowercase, strip punctuation */
function norm(s: string): string {
  return s.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim()
}

/**
 * Align word-level Whisper chunks to lyric lines.
 * Strategy: walk the word list, greedily match the first word of each line,
 * use that timestamp as the line timestamp.
 */
function alignToLRC(lyrics: string, chunks: WordChunk[]): string {
  const lines = lyrics.split('\n')
  const words = chunks.map(c => ({ text: norm(c.text), start: c.timestamp[0] }))

  let wi = 0
  const out: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) { out.push(''); continue }

    const lineWords = norm(trimmed).split(' ').filter(Boolean)
    if (!lineWords.length) { out.push(''); continue }

    // Search for the first word of this line in the remaining word stream
    const firstWord = lineWords[0]
    let matchIdx = -1
    for (let i = wi; i < Math.min(wi + 40, words.length); i++) {
      if (words[i].text.includes(firstWord) || firstWord.includes(words[i].text)) {
        matchIdx = i
        break
      }
    }

    if (matchIdx >= 0) {
      wi = matchIdx + lineWords.length
      const t = words[matchIdx].start ?? 0
      out.push(`[${toMMSScc(t)}] ${trimmed}`)
    } else {
      // Fallback: use current position's timestamp if available
      const t = words[wi]?.start ?? 0
      out.push(`[${toMMSScc(t)}] ${trimmed}`)
      wi = Math.min(wi + lineWords.length, words.length)
    }
  }

  return out.join('\n')
}

// ── Decode audio to 16kHz mono Float32Array ───────────────────────────────────

async function fetchAndDecodeAudio(url: string): Promise<Float32Array> {
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`Audio fetch failed: ${resp.status}`)
  const buf = await resp.arrayBuffer()
  const ctx = new AudioContext({ sampleRate: 16000 })
  const decoded = await ctx.decodeAudioData(buf)
  await ctx.close()
  return decoded.getChannelData(0)
}

// ── Component ──────────────────────────────────────────────────────────────────

type Stage = 'idle' | 'loading-model' | 'fetching-audio' | 'transcribing' | 'done' | 'error'

export default function SyncedLyricsPage(): JSX.Element {
  const { setActiveView, syncedLyricsSongId } = useStore()

  const [song, setSong] = useState<JWApiSong | null>(null)
  const [lyrics, setLyrics] = useState('')
  const [lrc, setLrc] = useState('')
  const [stage, setStage] = useState<Stage>('idle')
  const [statusMsg, setStatusMsg] = useState('')
  const [modelProgress, setModelProgress] = useState(0)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)

  const workerRef = useRef<Worker | null>(null)
  const workerReadyRef = useRef(false)
  const lyricsRef = useRef(lyrics)
  useEffect(() => { lyricsRef.current = lyrics }, [lyrics])

  // Load song details
  useEffect(() => {
    if (!syncedLyricsSongId) return
    apiFetch<JWApiSong>(`/songs/${syncedLyricsSongId}/`)
      .then(s => {
        setSong(s)
        setLyrics(s.lyrics ?? '')
      })
      .catch(() => {})
  }, [syncedLyricsSongId])

  // Spin up worker on mount
  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/whisperWorker.ts', import.meta.url),
      { type: 'module' }
    )
    workerRef.current = worker

    worker.onmessage = (e: MessageEvent) => {
      const { type, message, value, chunks } = e.data
      if (type === 'status') setStatusMsg(message)
      if (type === 'progress') { setModelProgress(value); setStatusMsg(`Downloading model… ${value}%`) }
      if (type === 'ready') { workerReadyRef.current = true; setStage('idle'); setStatusMsg('') }
      if (type === 'result') {
        const generated = alignToLRC(lyricsRef.current, chunks as WordChunk[])
        setLrc(generated)
        setStage('done')
        setStatusMsg('')
      }
      if (type === 'error') {
        setError(message)
        setStage('error')
      }
    }

    return () => { worker.terminate(); workerRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleGenerate = useCallback(async () => {
    if (!song?.path || !lyrics.trim()) return
    setError('')
    setLrc('')

    const worker = workerRef.current!

    // Load model if not ready
    if (!workerReadyRef.current) {
      setStage('loading-model')
      setStatusMsg('Downloading model (first run only)…')
      setModelProgress(0)
      worker.postMessage({ type: 'load' })
      // Wait for ready signal (handled via onmessage above, then user clicks again)
      return
    }

    try {
      setStage('fetching-audio')
      setStatusMsg('Fetching audio…')
      const audio = await fetchAndDecodeAudio(buildStreamUrl(song.path))
      setStage('transcribing')
      worker.postMessage({ type: 'transcribe', audio }, [audio.buffer])
    } catch (err) {
      setError(String(err))
      setStage('error')
    }
  }, [song, lyrics])

  const handleCopy = () => {
    navigator.clipboard.writeText(lrc).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  const handleSave = async () => {
    if (!syncedLyricsSongId || !lrc) return
    try {
      await userApi.createProposal({
        song: syncedLyricsSongId,
        change_type: 'update',
        title: `Synced lyrics — ${song?.name ?? 'song'}`,
        proposed_data: { synced_lyrics: lrc },
        editor_notes: 'Generated with in-browser Whisper (whisper-base)',
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {}
  }

  const busy = stage === 'loading-model' || stage === 'fetching-audio' || stage === 'transcribing'

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border)] shrink-0">
        <button onClick={() => setActiveView('editor')} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-overlay transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-text-primary text-sm font-semibold truncate">Synced Lyrics</p>
          {song && <p className="text-text-muted text-xs truncate">{song.name}</p>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

        {/* No song warning */}
        {!syncedLyricsSongId && (
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-surface-overlay border border-[var(--border)] text-text-muted text-sm">
            <Music2 size={15} className="shrink-0 opacity-60" />
            Open a song in the Editor first, then click <strong className="text-text-primary">＋ New</strong> in the Synced tab.
          </div>
        )}

        {/* Lyrics input */}
        <div className="space-y-1.5">
          <label className="text-text-muted text-xs font-semibold uppercase tracking-wide px-0.5">Lyrics</label>
          <textarea
            value={lyrics}
            onChange={e => setLyrics(e.target.value)}
            rows={10}
            placeholder={"Paste lyrics here…\n\nWhisper will align them to the audio."}
            disabled={busy}
            className="w-full bg-surface-overlay border border-[var(--border)] rounded-xl px-3.5 py-3 text-sm text-text-primary focus:outline-none resize-none placeholder:text-text-muted placeholder:opacity-30 disabled:opacity-50"
          />
        </div>

        {/* Generate */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerate}
            disabled={busy || !lyrics.trim() || !song?.path}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-accent text-black text-sm font-semibold hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
            {stage === 'loading-model' ? 'Loading model…'
              : stage === 'fetching-audio' ? 'Fetching audio…'
              : stage === 'transcribing' ? 'Transcribing…'
              : workerReadyRef.current ? 'Generate' : 'Load model & generate'}
          </button>
        </div>

        {/* Progress / status */}
        {(busy || statusMsg) && (
          <div className="space-y-2">
            <p className="text-text-muted text-xs">{statusMsg}</p>
            {stage === 'loading-model' && modelProgress > 0 && (
              <div className="h-1 bg-surface-overlay rounded-full overflow-hidden">
                <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${modelProgress}%` }} />
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {stage === 'error' && (
          <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <span>{error || 'Something went wrong. Try again.'}</span>
          </div>
        )}

        {/* LRC output */}
        {(stage === 'done' || lrc) && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-text-muted text-xs font-semibold uppercase tracking-wide px-0.5">LRC Output</label>
              <div className="flex items-center gap-1.5">
                <button onClick={handleCopy} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${copied ? 'text-accent bg-accent/10' : 'text-text-muted hover:text-text-primary hover:bg-surface-overlay'}`}>
                  {copied ? <Check size={12} /> : <Copy size={12} />} Copy
                </button>
                <button onClick={handleSave} disabled={!lrc || saved} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40 ${saved ? 'text-accent bg-accent/10' : 'text-text-muted hover:text-text-primary hover:bg-surface-overlay'}`}>
                  {saved ? <Check size={12} /> : <Save size={12} />} {saved ? 'Saved!' : 'Save to song'}
                </button>
              </div>
            </div>
            <textarea
              value={lrc}
              onChange={e => setLrc(e.target.value)}
              rows={14}
              spellCheck={false}
              className="w-full bg-surface-overlay border border-accent/30 rounded-xl px-3.5 py-3 text-sm font-mono text-text-primary focus:outline-none resize-none"
            />
            <p className="text-text-muted text-xs opacity-50">You can edit the output before saving.</p>
          </div>
        )}
      </div>
    </div>
  )
}
