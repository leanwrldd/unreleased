// Shared "compact view" grouping logic — collapses items that share a
// version_title into one group. Used by both the Tracker (ApiTrackerView)
// and Playlists (PlaylistsView) so the grouping math only lives once.
//
// There are two different fetch strategies because the two callers start
// from different places:
//   - The Tracker doesn't reliably have every song loaded (paginated,
//     filtered by category/search), so it has to ask Supabase for every
//     titled group app-wide and then fetch the actual song objects.
//   - Playlists already has its full, unpaginated track list in hand, so it
//     only needs version metadata for those specific songs — no need to
//     fetch anything about the songs themselves.
import { apiFetch, JWApiSong } from './juicewrldApi'
import { SongVersionMeta, getAllVersionGroups, getVersionMetaForSongs, versionsEnabled } from './versionsApi'

export interface CompactGroup<T> {
  groupId: number
  title: string
  members: { item: T; meta: SongVersionMeta }[]
}

function buildGroups<T>(metas: SongVersionMeta[], getItem: (songId: number) => T | undefined): CompactGroup<T>[] {
  const byGroup = new Map<number, SongVersionMeta[]>()
  for (const meta of metas) {
    if (!meta.versionTitle) continue
    if (!byGroup.has(meta.groupId)) byGroup.set(meta.groupId, [])
    byGroup.get(meta.groupId)!.push(meta)
  }
  return [...byGroup.entries()]
    .map(([groupId, groupMetas]) => ({
      groupId,
      title: groupMetas.find(m => m.versionTitle)?.versionTitle ?? '',
      members: groupMetas
        .map(m => ({ item: getItem(m.songId), meta: m }))
        .filter((x): x is { item: T; meta: SongVersionMeta } => !!x.item),
    }))
    .filter(g => g.members.length > 0)
}

/** Every titled version group app-wide, with full song objects fetched for
 *  each member — for callers (the Tracker) that can't rely on their own
 *  song list to contain every group's members. */
export async function fetchAllCompactGroups(): Promise<CompactGroup<JWApiSong>[]> {
  if (!versionsEnabled) return []
  const metas = await getAllVersionGroups()
  const uniqueIds = [...new Set(metas.map(m => m.songId))]
  const songMap = new Map<number, JWApiSong>()
  await Promise.all(uniqueIds.map(id =>
    apiFetch<JWApiSong>(`/songs/${id}/`).then(s => { songMap.set(id, s) }).catch(() => {})
  ))
  return buildGroups(metas, id => songMap.get(id))
}

/** Titled version groups among a known, already-loaded list of items (e.g. a
 *  playlist's tracks) — `getSongId` extracts each item's song id. */
export async function groupItemsByVersion<T>(items: T[], getSongId: (item: T) => number): Promise<CompactGroup<T>[]> {
  if (!versionsEnabled || items.length === 0) return []
  const metaMap = await getVersionMetaForSongs(items.map(getSongId))
  const itemMap = new Map(items.map(item => [getSongId(item), item]))
  return buildGroups([...metaMap.values()], id => itemMap.get(id))
}

/** Client-side search filter for compact groups — both fetch strategies
 *  above are independent of whatever's in each view's search box, so
 *  without this, typing a search query while compact view is active would
 *  silently do nothing. If the query matches the group's title, the whole
 *  group is kept (searching "TV Mix" should show that entire group);
 *  otherwise members are filtered individually via `getSearchText`. */
export function filterCompactGroups<T>(
  groups: CompactGroup<T>[],
  query: string,
  getSearchText: (item: T) => string
): CompactGroup<T>[] {
  const q = query.trim().toLowerCase()
  if (!q) return groups
  return groups
    .map(g => {
      const groupMatches = g.title.toLowerCase().includes(q)
      const members = groupMatches ? g.members : g.members.filter(m => getSearchText(m.item).toLowerCase().includes(q))
      return { ...g, members }
    })
    .filter(g => g.members.length > 0)
}
