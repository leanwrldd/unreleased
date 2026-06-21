import { pipeline, env } from '@xenova/transformers'

// Allow loading models from HuggingFace CDN, cache in browser
env.allowLocalModels = false
env.useBrowserCache = true

type WhisperPipeline = Awaited<ReturnType<typeof pipeline>>
let transcriber: WhisperPipeline | null = null

interface WordChunk {
  text: string
  timestamp: [number, number | null]
}

self.onmessage = async (e: MessageEvent) => {
  const { type, audio, language } = e.data

  if (type === 'load') {
    try {
      self.postMessage({ type: 'status', message: 'Downloading model (first run only)…' })
      transcriber = await pipeline(
        'automatic-speech-recognition',
        'Xenova/whisper-base',
        {
          progress_callback: (p: { status: string; progress?: number; file?: string }) => {
            if (p.status === 'downloading' && p.progress != null) {
              self.postMessage({ type: 'progress', value: Math.round(p.progress), file: p.file })
            }
          },
        }
      )
      self.postMessage({ type: 'ready' })
    } catch (err) {
      self.postMessage({ type: 'error', message: String(err) })
    }
  }

  if (type === 'transcribe') {
    if (!transcriber) {
      self.postMessage({ type: 'error', message: 'Model not loaded' })
      return
    }
    try {
      self.postMessage({ type: 'status', message: 'Transcribing audio…' })
      const result = await (transcriber as (audio: Float32Array, opts: object) => Promise<{ chunks?: WordChunk[] }>)(
        audio as Float32Array,
        {
          return_timestamps: 'word',
          chunk_length_s: 30,
          stride_length_s: 5,
          language: language ?? 'english',
          task: 'transcribe',
        }
      )
      self.postMessage({ type: 'result', chunks: result.chunks ?? [] })
    } catch (err) {
      self.postMessage({ type: 'error', message: String(err) })
    }
  }
}
