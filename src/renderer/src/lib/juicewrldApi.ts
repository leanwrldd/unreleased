import { Track } from '../types'

export const JWAPI_BASE = 'https://juicewrldapi.com/juicewrld'

// ─── API Types ────────────────────────────────────────────────────────────────

export interface JWApiEra {
  id: number
  name: string
  description?: string
  time_frame?: string
}

export interface JWApiSong {
  id: number
  public_id?: number | null
  name: string
  original_key?: string | null
  track_titles: string[]
  path: string
  length: string                     // "3:59"
  credited_artists: string
  producers: string
  engineers?: string | null
  recording_locations?: string | null
  record_dates?: string | null
  bitrate?: string | null
  additional_information?: string | null
  file_names?: string | null
  instrumentals?: string | null
  instrumental_names?: string | null
  preview_date?: string | null
  release_date?: string | null
  dates?: string | null
  session_titles?: string | null
  session_tracking?: string | null
  notes?: string | null
  snippets?: unknown[]
  era: JWApiEra | null
  image_url: string | null           // relative, e.g. "/assets/youtube.webp"
  category: 'released' | 'unreleased' | 'unsurfaced' | 'recording_session'
  lyrics: string | null
  leak_type: string | null
  date_leaked: string | null
}

export interface JWApiPaginatedResponse {
  count: number
  next: string | null
  previous: string | null
  results: JWApiSong[]
}

export interface JWApiStats {
  total_songs: number
  category_stats: {
    released: number
    unreleased: number
    unsurfaced: number
    recording_session: number
  }
  era_stats: Record<string, number>
}

export interface JWApiRadioResponse {
  title: string
  path: string
  song: JWApiSong
  size: number
  hash: string
}

export interface JWApiFileEntry {
  name: string
  path: string
  type: 'file' | 'directory'
  size?: number | null
  modified?: string | null
}

// /files/browse/ may return { items: [...] } or a flat array
export type JWApiBrowseResponse = JWApiFileEntry[] | { items: JWApiFileEntry[]; current_path?: string }

// ─── Fetch util ───────────────────────────────────────────────────────────────

export async function apiFetch<T>(
  path: string,
  params: Record<string, string | number | null | undefined> = {}
): Promise<T> {
  const url = new URL(JWAPI_BASE + path)
  for (const [k, v] of Object.entries(params)) {
    if (v != null) url.searchParams.set(k, String(v))
  }
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`JW API error ${res.status}`)
  return res.json() as Promise<T>
}

// ─── URL helpers ──────────────────────────────────────────────────────────────

export function buildStreamUrl(path: string): string {
  return `${JWAPI_BASE}/files/download/?path=${encodeURIComponent(path)}`
}

export function buildCoverArtUrl(path: string): string {
  return `${JWAPI_BASE}/files/cover-art/?path=${encodeURIComponent(path)}`
}

export function buildImageUrl(imageUrl: string | null | undefined): string | undefined {
  if (!imageUrl) return undefined
  if (imageUrl.startsWith('http')) return imageUrl
  return `https://juicewrldapi.com${imageUrl}`
}

// ─── Duration parse ───────────────────────────────────────────────────────────

/** "3:59" → 239 seconds. Returns 0 on invalid input. */
export function parseDuration(length: string | null | undefined): number {
  if (!length) return 0
  const parts = length.split(':').map(Number)
  if (parts.length === 2) {
    const [m, s] = parts
    if (!isNaN(m) && !isNaN(s)) return m * 60 + s
  }
  if (parts.length === 3) {
    const [h, m, s] = parts
    if (!isNaN(h) && !isNaN(m) && !isNaN(s)) return h * 3600 + m * 60 + s
  }
  return 0
}

// ─── Convert API song to Track ────────────────────────────────────────────────

export function songToTrack(song: JWApiSong): Track {
  const title = song.track_titles?.[0] || song.name
  const imageUrl = buildImageUrl(song.image_url)
  return {
    id: `jw-${song.id}`,
    path: song.path,
    streamUrl: buildStreamUrl(song.path),
    imageUrl,
    title,
    artist: song.credited_artists || 'Juice WRLD',
    album: song.era?.name || '',
    albumArtist: 'Juice WRLD',
    year: null,
    trackNumber: null,
    duration: parseDuration(song.length),
    genre: song.category,
    hasAlbumArt: !!song.image_url,
  }
}

// ─── Category display ─────────────────────────────────────────────────────────

export const CATEGORY_LABELS: Record<string, string> = {
  released: 'Released',
  unreleased: 'Unreleased',
  unsurfaced: 'Unsurfaced',
  recording_session: 'Session',
}
