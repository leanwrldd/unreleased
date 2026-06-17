import { createClient, Session } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null

export const supabaseReady = !!supabase

// ── Types ──────────────────────────────────────────────────────────────────────

export interface Profile {
  id: string
  email: string
  username: string | null
  role: 'pending' | 'editor' | 'admin' | 'rejected'
  created_at: string
  approved_at: string | null
  approved_by: string | null
}

export interface SongSupplement {
  id: string
  jw_song_id: number
  created_at: string
  updated_at: string
  // Corrections (override API data)
  corrected_title: string | null
  corrected_artist: string | null
  corrected_album: string | null
  corrected_era: string | null
  corrected_category: string | null
  verified_leak_type: string | null
  // Supplemental info
  context: string | null
  trivia: string[] | null
  sample_info: string | null
  youtube_url: string | null
  soundcloud_url: string | null
  external_links: Record<string, string> | null
  verified_producers: string | null
  verified_engineers: string | null
  verified_release_date: string | null
  verified_recording_date: string | null
  verified_recording_location: string | null
  quality_rating: number | null
  editor_notes: string | null
  updated_by: string | null
}

// ── Auth ───────────────────────────────────────────────────────────────────────

export async function signUp(
  email: string,
  password: string
): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase not configured' }
  const { error } = await supabase.auth.signUp({ email, password })
  if (error) return { error: error.message }
  return { error: null }
}

export async function signIn(
  email: string,
  password: string
): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase not configured' }
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: error.message }
  return { error: null }
}

export async function signOut(): Promise<void> {
  if (!supabase) return
  await supabase.auth.signOut()
}

export function onAuthStateChange(callback: (session: Session | null) => void): () => void {
  if (!supabase) return () => {}
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session)
  })
  return () => subscription.unsubscribe()
}

export async function getSession(): Promise<Session | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session
}

// ── Profiles ───────────────────────────────────────────────────────────────────

export async function getProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) return null
  return data as Profile
}

export async function getProfiles(): Promise<Profile[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return []
  return (data ?? []) as Profile[]
}

export async function deleteAccount(): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase not configured' }
  const { error } = await supabase.rpc('delete_user')
  if (error) return { error: error.message }
  await supabase.auth.signOut()
  return { error: null }
}

export async function changePassword(newPassword: string): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase not configured' }
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return { error: error.message }
  return { error: null }
}

export async function updateProfileRole(
  userId: string,
  role: 'pending' | 'editor' | 'admin' | 'rejected',
  adminId?: string
): Promise<boolean> {
  if (!supabase) return false
  const patch: Record<string, unknown> = { role }
  if (role === 'editor' || role === 'admin') {
    patch.approved_at = new Date().toISOString()
    if (adminId) patch.approved_by = adminId
  } else if (role === 'pending' || role === 'rejected') {
    patch.approved_at = null
    patch.approved_by = null
  }
  const { error } = await supabase.from('profiles').update(patch).eq('id', userId)
  return !error
}

export async function updateUsername(userId: string, username: string): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase.from('profiles').update({ username }).eq('id', userId)
  return !error
}

// ── Song supplements ───────────────────────────────────────────────────────────

export async function getSupplement(jwSongId: number): Promise<SongSupplement | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('song_supplements')
    .select('*')
    .eq('jw_song_id', jwSongId)
    .maybeSingle()
  if (error) return null
  return data as SongSupplement | null
}

export async function upsertSupplement(
  jwSongId: number,
  patch: Partial<Omit<SongSupplement, 'id' | 'jw_song_id' | 'created_at' | 'updated_at'>>
): Promise<SongSupplement | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('song_supplements')
    .upsert({ jw_song_id: jwSongId, ...patch, updated_at: new Date().toISOString() }, { onConflict: 'jw_song_id' })
    .select()
    .maybeSingle()
  if (error) return null
  return data as SongSupplement | null
}

export async function getSupplements(jwSongIds: number[]): Promise<Record<number, SongSupplement>> {
  if (!supabase || !jwSongIds.length) return {}
  const { data, error } = await supabase
    .from('song_supplements')
    .select('*')
    .in('jw_song_id', jwSongIds)
  if (error) return {}
  return Object.fromEntries((data as SongSupplement[]).map((s) => [s.jw_song_id, s]))
}

export async function getRecentSupplements(limit = 20): Promise<SongSupplement[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('song_supplements')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(limit)
  if (error) return []
  return (data ?? []) as SongSupplement[]
}
