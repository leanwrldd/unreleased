// Song "version" grouping — a separate, independent database from
// juicewrldapi.com, since that API has no concept of linking e.g. "She's The
// One (v1)" / "(v2)" / "(TV Mix)" together as the same underlying song.
// Backed by a free Supabase project (Postgres + auto-generated REST API).
//
// Run this once in the Supabase SQL editor to create the table this file
// talks to:
//
//   create table if not exists song_versions (
//     song_id       bigint primary key,
//     group_id      bigint not null,
//     version       text,
//     version_title text,
//     added_by      text,
//     created_at    timestamptz not null default now()
//   );
//
//   -- version_title is written to every row in a group together (see
//   -- setGroupVersionTitle below), so all linked songs always show the same
//   -- title — it's stored per-row rather than in a separate groups table
//   -- purely to avoid an extra migration, not because it's meant to vary.
//   create index if not exists song_versions_group_id_idx on song_versions (group_id);
//
//   alter table song_versions enable row level security;
//
//   create policy "Anyone can read song versions"
//     on song_versions for select
//     using (true);
//
//   -- Writes are gated client-side (editor/admin accounts only, same as the
//   -- rest of this app's edit-only actions) rather than through Supabase
//   -- auth, so this policy is intentionally wide open. Fine for a low-stakes
//   -- fan-curated dataset; tighten this if that trust model ever changes.
//   create policy "Anyone can write song versions"
//     on song_versions for all
//     using (true)
//     with check (true);

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** True once VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are configured — lets
 *  callers hide version-grouping UI entirely when it's not set up. */
export const versionsEnabled = !!(SUPABASE_URL && SUPABASE_ANON_KEY)

interface SongVersionRow {
  song_id: number
  group_id: number
  version: string | null
  version_title: string | null
  added_by: string | null
}

/** Version metadata for one song within a linked group. */
export interface SongVersionMeta {
  songId: number
  groupId: number
  version: string | null
  versionTitle: string | null
  addedBy: string | null
}

async function supaFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error('Supabase not configured')
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })
  if (!res.ok) throw new Error(`Supabase error ${res.status}`)
  const text = await res.text()
  return (text ? JSON.parse(text) : null) as T
}

const ROW_FIELDS = 'song_id,group_id,version,version_title,added_by'

function toMeta(row: SongVersionRow): SongVersionMeta {
  return { songId: row.song_id, groupId: row.group_id, version: row.version, versionTitle: row.version_title, addedBy: row.added_by }
}

async function getRow(songId: number): Promise<SongVersionRow | null> {
  const rows = await supaFetch<SongVersionRow[]>(`/song_versions?song_id=eq.${songId}&select=${ROW_FIELDS}`)
  return rows[0] ?? null
}

async function upsertRow(songId: number, groupId: number, addedBy?: string | null): Promise<void> {
  await supaFetch('/song_versions', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ song_id: songId, group_id: groupId, added_by: addedBy ?? null }),
  })
}

/** All other songs grouped with this one (excluding itself), with their
 *  version metadata. Empty if ungrouped or Supabase isn't configured. */
export async function getVersionGroup(songId: number): Promise<SongVersionMeta[]> {
  if (!versionsEnabled) return []
  try {
    const row = await getRow(songId)
    if (!row) return []
    const rows = await supaFetch<SongVersionRow[]>(
      `/song_versions?group_id=eq.${row.group_id}&song_id=neq.${songId}&select=${ROW_FIELDS}`
    )
    return rows.map(toMeta)
  } catch {
    return []
  }
}

/** Groups two songs as versions of each other. If one is already in a group,
 *  the other joins it; if both are in different groups already, the groups
 *  merge (all members repointed to the lower group id). `addedBy` is stamped
 *  on any row newly created by this call (existing rows are left as-is). */
export async function linkSongVersion(songId: number, otherSongId: number, addedBy?: string | null): Promise<void> {
  if (songId === otherSongId) return
  const [a, b] = await Promise.all([getRow(songId), getRow(otherSongId)])
  if (a && b) {
    if (a.group_id === b.group_id) return
    const keep = Math.min(a.group_id, b.group_id)
    const drop = Math.max(a.group_id, b.group_id)
    await supaFetch(`/song_versions?group_id=eq.${drop}`, {
      method: 'PATCH',
      body: JSON.stringify({ group_id: keep }),
    })
  } else if (a) {
    await upsertRow(otherSongId, a.group_id, addedBy)
  } else if (b) {
    await upsertRow(songId, b.group_id, addedBy)
  } else {
    const groupId = Math.min(songId, otherSongId)
    await Promise.all([upsertRow(songId, groupId, addedBy), upsertRow(otherSongId, groupId, addedBy)])
  }
}

/** This song's own version number/title/author, if it's linked into a group.
 *  Null if ungrouped or Supabase isn't configured. */
export async function getOwnVersionMeta(songId: number): Promise<SongVersionMeta | null> {
  if (!versionsEnabled) return null
  try {
    const row = await getRow(songId)
    return row ? toMeta(row) : null
  } catch {
    return null
  }
}

/** Removes a song from its version group (leaves siblings grouped together). */
export async function unlinkSongVersion(songId: number): Promise<void> {
  await supaFetch(`/song_versions?song_id=eq.${songId}`, { method: 'DELETE' })
}

/** Updates this song's own version label (e.g. "v1", "TV Mix") — distinct
 *  per song within a group, unlike the shared version title below. */
export async function setSongVersion(songId: number, version: string | null): Promise<void> {
  await supaFetch(`/song_versions?song_id=eq.${songId}`, {
    method: 'PATCH',
    body: JSON.stringify({ version }),
  })
}

/** Sets the version title for every song in a group at once, so linked
 *  songs always agree on the title (e.g. "She's The One"). */
export async function setGroupVersionTitle(groupId: number, versionTitle: string | null): Promise<void> {
  await supaFetch(`/song_versions?group_id=eq.${groupId}`, {
    method: 'PATCH',
    body: JSON.stringify({ version_title: versionTitle }),
  })
}
