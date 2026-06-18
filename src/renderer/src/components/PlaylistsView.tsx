import { useEffect, useState, useCallback } from 'react'
import { ListMusic, Play, Loader2, Plus, Trash2, Pencil, ArrowLeft, ArrowUp, ArrowDown, X, Check, Music2 } from 'lucide-react'
import { useStore } from '../store/useStore'
import * as userApi from '../lib/userApi'
import type { PlaylistDetail } from '../lib/userApi'
import { Track } from '../types'
import { AlbumArtThumbnail } from './AlbumArtThumbnail'
import { buildImageUrl } from '../lib/juicewrldApi'

export default function PlaylistsView(): JSX.Element {
  const { account, playlists, refreshPlaylists, playTrack, setShowUserAuth } = useStore()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<PlaylistDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')

  useEffect(() => { if (account) refreshPlaylists() }, [account, refreshPlaylists])

  const loadDetail = useCallback(async (id: number) => {
    setLoadingDetail(true)
    try {
      setDetail(await userApi.getPlaylist(id))
    } catch {
      setDetail(null)
    } finally {
      setLoadingDetail(false)
    }
  }, [])

  useEffect(() => {
    if (selectedId != null) loadDetail(selectedId)
    else setDetail(null)
  }, [selectedId, loadDetail])

  const createPlaylist = async (): Promise<void> => {
    const name = newName.trim()
    if (!name) return
    try {
      await userApi.createPlaylist(name)
      setNewName('')
      setCreating(false)
      await refreshPlaylists()
    } catch {}
  }

  const deleteSelected = async (): Promise<void> => {
    if (selectedId == null) return
    try {
      await userApi.deletePlaylist(selectedId)
      setSelectedId(null)
      await refreshPlaylists()
    } catch {}
  }

  const renameSelected = async (): Promise<void> => {
    if (selectedId == null) return
    const name = renameValue.trim()
    if (!name) return
    try {
      const updated = await userApi.renamePlaylist(selectedId, name)
      setDetail(updated)
      setRenaming(false)
      await refreshPlaylists()
    } catch {}
  }

  const removeTrack = async (songId: number): Promise<void> => {
    if (selectedId == null) return
    try {
      await userApi.removeFromPlaylist(selectedId, songId)
      await loadDetail(selectedId)
      await refreshPlaylists()
    } catch {}
  }

  const move = async (index: number, dir: -1 | 1): Promise<void> => {
    if (!detail || selectedId == null) return
    const ids = detail.items.map((it) => it.song.id)
    const target = index + dir
    if (target < 0 || target >= ids.length) return
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    try {
      const updated = await userApi.reorderPlaylist(selectedId, ids)
      setDetail(updated)
    } catch {}
  }

  if (!account) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
        <ListMusic size={40} className="text-text-muted mb-4" />
        <h2 className="text-text-primary text-lg font-semibold mb-1">Playlists</h2>
        <p className="text-text-muted text-sm mb-5 max-w-xs">Log in to create playlists that stay in sync wherever you listen.</p>
        <button
          onClick={() => setShowUserAuth(true)}
          className="px-5 py-2.5 rounded-xl bg-accent/15 hover:bg-accent/25 text-accent text-sm font-semibold transition-colors"
        >
          Log in
        </button>
      </div>
    )
  }

  if (selectedId != null) {
    const tracks: Track[] = detail ? detail.items.map((it) => userApi.liteSongToTrack(it.song)) : []
    return (
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        <div className="px-5 pt-5 pb-8">
          <button onClick={() => { setSelectedId(null); setRenaming(false) }} className="flex items-center gap-1.5 text-text-muted hover:text-text-primary text-sm mb-4 transition-colors">
            <ArrowLeft size={15} /> Playlists
          </button>

          {loadingDetail || !detail ? (
            <div className="flex items-center gap-2 text-text-muted h-40 justify-center">
              <Loader2 size={18} className="animate-spin" /><span className="text-sm">Loading…</span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4 mb-5">
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-surface-overlay flex items-center justify-center shrink-0">
                  {tracks[0]?.imageUrl ? (
                    <img src={tracks[0].imageUrl} alt={detail.name} className="w-full h-full object-cover" />
                  ) : (
                    <ListMusic size={28} className="text-text-muted" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  {renaming ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && renameSelected()}
                        autoFocus
                        className="bg-surface-overlay border border-[var(--border)] rounded-lg px-3 py-1.5 text-text-primary text-lg font-bold focus:outline-none focus:border-accent/50"
                      />
                      <button onClick={renameSelected} className="p-1.5 rounded-lg bg-accent/15 text-accent"><Check size={16} /></button>
                      <button onClick={() => setRenaming(false)} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary"><X size={16} /></button>
                    </div>
                  ) : (
                    <h1 className="text-text-primary text-2xl font-bold truncate">{detail.name}</h1>
                  )}
                  <p className="text-text-muted text-sm mt-1">{tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-5">
                {tracks.length > 0 && (
                  <button
                    onClick={() => playTrack(tracks[0], tracks)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent text-black text-sm font-semibold hover:scale-105 transition-transform"
                  >
                    <Play size={16} fill="currentColor" /> Play
                  </button>
                )}
                {!renaming && (
                  <button
                    onClick={() => { setRenameValue(detail.name); setRenaming(true) }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-full text-text-secondary hover:text-text-primary hover:bg-surface-raised text-sm transition-colors"
                  >
                    <Pencil size={14} /> Rename
                  </button>
                )}
                <button
                  onClick={deleteSelected}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full text-red-400 hover:bg-red-500/10 text-sm transition-colors"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>

              {tracks.length === 0 ? (
                <p className="text-text-muted text-sm">This playlist is empty. Add tracks from the Tracker or Liked Songs.</p>
              ) : (
                <div className="space-y-0.5">
                  {tracks.map((track, i) => (
                    <div key={track.id} className="group flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-surface-raised transition-colors">
                      <span className="w-6 text-center text-xs text-text-muted tabular-nums shrink-0">{i + 1}</span>
                      <button onClick={() => playTrack(track, tracks)} className="relative shrink-0">
                        <AlbumArtThumbnail track={track} size={40} className="rounded-md" />
                        <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 rounded-md transition-opacity">
                          <Play size={16} className="text-white" fill="currentColor" />
                        </span>
                      </button>
                      <div className="min-w-0 flex-1 cursor-pointer" onClick={() => playTrack(track, tracks)}>
                        <p className="text-text-primary text-sm font-medium truncate">{track.title}</p>
                        <p className="text-text-muted text-xs truncate">{track.artist}{track.album ? ` · ${track.album}` : ''}</p>
                      </div>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button onClick={() => move(i, -1)} disabled={i === 0} className="p-1.5 text-text-muted hover:text-text-primary disabled:opacity-30" title="Move up"><ArrowUp size={15} /></button>
                        <button onClick={() => move(i, 1)} disabled={i === tracks.length - 1} className="p-1.5 text-text-muted hover:text-text-primary disabled:opacity-30" title="Move down"><ArrowDown size={15} /></button>
                        <button onClick={() => removeTrack(track.id ? userApi.trackIdToSongId(track.id) ?? -1 : -1)} className="p-1.5 text-text-muted hover:text-red-400" title="Remove"><X size={15} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
      <div className="px-5 pt-5 pb-8">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-text-primary text-xl font-bold">Playlists</h1>
            <p className="text-text-muted text-sm mt-0.5">Your saved playlists, synced everywhere</p>
          </div>
          {!creating && (
            <button
              onClick={() => setCreating(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent/15 hover:bg-accent/25 text-accent text-sm font-semibold transition-colors"
            >
              <Plus size={16} /> New
            </button>
          )}
        </div>

        {creating && (
          <div className="flex items-center gap-2 mb-5">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createPlaylist()}
              placeholder="Playlist name"
              autoFocus
              className="flex-1 bg-surface-overlay border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent/50"
            />
            <button onClick={createPlaylist} className="px-4 py-2.5 rounded-xl bg-accent text-black text-sm font-semibold">Create</button>
            <button onClick={() => { setCreating(false); setNewName('') }} className="p-2.5 rounded-xl text-text-muted hover:text-text-primary"><X size={16} /></button>
          </div>
        )}

        {playlists.length === 0 ? (
          <p className="text-text-muted text-sm">No playlists yet. Create one to get started.</p>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
            {playlists.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className="group text-left"
              >
                <div className="aspect-square rounded-xl overflow-hidden bg-surface-overlay flex items-center justify-center mb-2 group-hover:scale-[1.02] transition-transform">
                  {p.cover_image_url ? (
                    <img src={buildImageUrl(p.cover_image_url)} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <Music2 size={36} className="text-text-muted" />
                  )}
                </div>
                <p className="text-text-primary text-sm font-medium truncate">{p.name}</p>
                <p className="text-text-muted text-xs">{p.track_count} {p.track_count === 1 ? 'track' : 'tracks'}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
