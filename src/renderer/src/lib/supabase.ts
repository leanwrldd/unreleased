import { createClient } from '@supabase/supabase-js'

// Set these in .env.local (never commit real values):
//   VITE_SUPABASE_URL=https://xxx.supabase.co
//   VITE_SUPABASE_ANON_KEY=eyJ...
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null

// ── Types ──────────────────────────────────────────────────────────────────────

export interface SongSupplement {
  id: string
  jw_song_id: number
  created_at: string
  updated_at: string

  // Extended metadata
  context: string | null          // Historical context / story
  trivia: string[] | null         // Fun facts / trivia bullets
  sample_info: string | null      // What samples are used
  youtube_url: string | null
  soundcloud_url: string | null
  external_links: Record<string, string> | null  // { label: url }

  // Editorial corrections / additions (overrides API data)
  verified_producers: string | null
  verified_engineers: string | null
  verified_release_date: string | null
  verified_recording_date: string | null
  verified_recording_location: string | null

  // Quality
  quality_rating: number | null  // 1–10
  editor_notes: string | null
  updated_by: string | null      // Editor display name (anon)
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Fetch supplement for a single song. Returns null if not found or no client. */
export async function getSupplement(jwSongId: number): Promise<SongSupplement | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('song_supplements')
    .select('*')
    .eq('jw_song_id', jwSongId)
    .maybeSingle()
  if (error) { console.error('[supabase] getSupplement:', error.message); return null }
  return data as SongSupplement | null
}

/** Upsert supplement data for a song. */
export async function upsertSupplement(
  jwSongId: number,
  patch: Partial<Omit<SongSupplement, 'id' | 'jw_song_id' | 'created_at' | 'updated_at'>>
): Promise<SongSupplement | null> {
  if (!supabase) { console.warn('[supabase] No client — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY'); return null }
  const { data, error } = await supabase
    .from('song_supplements')
    .upsert({ jw_song_id: jwSongId, ...patch, updated_at: new Date().toISOString() }, { onConflict: 'jw_song_id' })
    .select()
    .maybeSingle()
  if (error) { console.error('[supabase] upsertSupplement:', error.message); return null }
  return data as SongSupplement | null
}

/** Fetch supplements for a batch of song IDs (for list views). */
export async function getSupplements(jwSongIds: number[]): Promise<Record<number, SongSupplement>> {
  if (!supabase || !jwSongIds.length) return {}
  const { data, error } = await supabase
    .from('song_supplements')
    .select('*')
    .in('jw_song_id', jwSongIds)
  if (error) { console.error('[supabase] getSupplements:', error.message); return {} }
  return Object.fromEntries((data as SongSupplement[]).map(s => [s.jw_song_id, s]))
}

export const supabaseReady = !!supabase
