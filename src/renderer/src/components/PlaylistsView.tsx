import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  ListMusic, Play, Loader2, Plus, Trash2, Pencil, ArrowLeft,
  ArrowUp, ArrowDown, X, Check, Heart, Shuffle, Music2, Clock
} from 'lucide-react'
import { useStore } from '../store/useStore'
import * as userApi from '../lib/userApi'
import type { PlaylistDetail } from '../lib/userApi'
import { Track } from '../types'
import { AlbumArtThumbnail } from './AlbumArtThumbnail'
import { buildImageUrl } from '../lib/juicewrldApi'
import { formatDuration } from '../lib/lyrics'
import LikedSongsView from './LikedSongsView'

// 2×2 mosaic for playlist cover
function PlaylistMosaic({
  tracks,
  className = '',
}: {
  tracks: Track[]
  className?: string
}): JSX.Element {
  const artUrls = tracks
    .slice(0, 4)
    .map((t) => t.imageUrl)
    .filter(Boolean) as string[]

  if (artUrls.length === 0) {
    return (
      <div className={`bg-gradient-to-br from-accent/40 to-accent/10 flex items-center justify-center ${className}`}>
        <Music2 size={48} className="text-accent/50" />
      </div>
    )
  }
  if (artUrls.length < 4) {
    return <img src={artUrls[0]} alt="" className={`object-cover ${className}`} />
  }
  return (
    <div className={`grid grid-cols-2 ${className}`} style={{ overflow: 'hidden' }}>
      {artUrls.map((url, i) => (
        <img key={i} src={url} alt="" className="w-full h-full object-cover" style={{ aspectRatio: '1' }} />
      ))}
    </div>
  )
}

function totalDurationLabel(tracks: Track[]): string {
  const secs = tracks.reduce((acc, t) => acc + (t.duration ?? 0), 0)
  if (secs === 0) return ''
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (h > 0) return `${h} hr ${m} min`
  return `${m} min`
}

export default function PlaylistsView(): JSX.Element {
  const { account, playlists, refreshPlaylists, playTrack, setShowUserAuth, likedTrackIds } = useStore()
  const [showLiked, setShowLiked] = useState(false)
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

  // ── Liked Songs view ─────────────────────────────────────────────────────
  if (showLiked) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-5 pt-4 shrink-0">
          <button
            onClick={() => setShowLiked(false)}
            className="flex items-center gap-1.5 text-text-muted hover:text-text-primary text-sm transition-colors"
          >
            <ArrowLeft size={15} /> Playlists
          </button>
        </div>
        <LikedSongsView />
      </div>
    )
  }

  // ── Not logged in ─────────────────────────────────────────────────────────
  if (!account) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
        <ListMusic size={40} className="text-text-muted mb-4" />
        <h2 className="text-text-primary text-lg font-semibold mb-1">Playlists</h2>
        <p className="text-text-muted text-sm mb-5 max-w-xs">
          Log in to create playlists that stay in sync wherever you listen.
        </p>
        <button
          onClick={() => setShowUserAuth(true)}
          className="px-5 py-2.5 rounded-xl bg-accent/15 hover:bg-accent/25 text-accent text-sm font-semibold transition-colors"
        >
          Log in
        </button>
      </div>
    )
  }

  // ── Playlist detail ───────────────────────────────────────────────────────
  if (selectedId != null) {
    const tracks: Track[] = detail
      ? detail.items.map((it) => userApi.liteSongToTrack(it.song))
      : []

    const durLabel = totalDurationLabel(tracks)

    const playShuffle = (): void => {
      if (tracks.length === 0) return
      const shuffled = [...tracks].sort(() => Math.random() - 0.5)
      playTrack(shuffled[0], shuffled)
    }

    return (
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        {/* Back nav */}
        <div className="px-6 pt-5 shrink-0">
          <button
            onClick={() => { setSelectedId(null); setRenaming(false) }}
            className="flex items-center gap-1.5 text-text-muted hover:text-text-primary text-sm transition-colors mb-4"
          >
            <ArrowLeft size={15} /> Playlists
          </button>
        </div>

        {loadingDetail || !detail ? (
          <div className="flex items-center gap-2 text-text-muted h-48 justify-center">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Loading…</span>
          </div>
        ) : (
          <>
            {/* ── Hero ── */}
            <div className="relative px-6 pb-6 shrink-0">
              {/* Blurred bg from first track's art */}
              {tracks[0]?.imageUrl && (
                <div
                  className="absolute inset-0 opacity-20 blur-3xl scale-110 pointer-events-none"
                  style={{
                    background: `url(${tracks[0].imageUrl}) center/cover`,
                    zIndex: 0,
                  }}
                />
              )}

              <div className="relative z-10 flex gap-6 items-end">
                {/* Cover mosaic */}
                <div className="shrink-0 rounded-xl shadow-2xl overflow-hidden" style={{ width: 180, height: 180 }}>
                  <PlaylistMosaic tracks={tracks} className="w-full h-full" />
                </div>

                {/* Meta */}
                <div className="min-w-0 flex-1 pb-1">
                  <p className="text-text-muted text-xs uppercase tracking-widest font-semibold mb-2">Playlist</p>

                  {renaming ? (
                    <div className="flex items-center gap-2 mb-3">
                      <input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && renameSelected()}
                        autoFocus
                        className="bg-surface-overlay border border-[var(--border)] rounded-lg px-3 py-2 text-text-primary text-2xl font-black focus:outline-none focus:border-accent/50 w-full"
                      />
                      <button onClick={renameSelected} className="p-2 rounded-lg bg-accent/15 text-accent shrink-0"><Check size={16} /></button>
                      <button onClick={() => setRenaming(false)} className="p-2 rounded-lg text-text-muted hover:text-text-primary shrink-0"><X size={16} /></button>
                    </div>
                  ) : (
                    <h1 className="text-text-primary text-3xl md:text-4xl font-black truncate mb-2">{detail.name}</h1>
                  )}

                  <div className="flex items-center gap-1.5 text-text-muted text-sm mb-4">
                    <span className="font-medium text-text-secondary">{account.discord_username}</span>
                    <span>·</span>
                    <span>{tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}</span>
                    {durLabel && (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-1"><Clock size={12} />{durLabel}</span>
                      </>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {tracks.length > 0 && (
                      <button
                        onClick={() => playTrack(tracks[0], tracks)}
                        className="flex items-center gap-2 px-6 py-3 rounded-full bg-accent text-black text-sm font-bold hover:scale-105 active:scale-95 transition-transform shadow-lg"
                      >
                        <Play size={17} fill="currentColor" /> Play
                      </button>
                    )}
                    {tracks.length > 1 && (
                      <button
                        onClick={playShuffle}
                        className="flex items-center gap-2 px-4 py-3 rounded-full bg-surface-overlay hover:bg-surface-raised text-text-primary text-sm font-semibold transition-colors border border-[var(--border)]"
                      >
                        <Shuffle size={15} /> Shuffle
                      </button>
                    )}
                    {!renaming && (
                      <button
                        onClick={() => { setRenameValue(detail.name); setRenaming(true) }}
                        className="flex items-center gap-1.5 px-3 py-2.5 rounded-full text-text-muted hover:text-text-primary hover:bg-surface-overlay text-sm transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                    )}
                    <button
                      onClick={deleteSelected}
                      className="flex items-center gap-1.5 px-3 py-2.5 rounded-full text-text-muted hover:text-red-400 hover:bg-red-500/10 text-sm transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-[var(--border)] mx-6 mb-2 shrink-0" />

            {/* ── Tracklist ── */}
            {tracks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2 text-center px-8">
                <Music2 className="text-text-muted opacity-20" size={40} />
                <p className="text-text-muted text-sm">This playlist is empty.</p>
                <p className="text-text-muted text-xs">Add tracks from the Tracker or Liked Songs.</p>
              </div>
            ) : (
              <div className="px-2 pb-8">
                {/* Column headers */}
                <div className="grid items-center gap-3 px-4 pb-2 text-text-muted text-xs uppercase tracking-widest"
                  style={{ gridTemplateColumns: '28px 40px 1fr 56px 80px' }}>
                  <span>#</span>
                  <span />
                  <span>Title</span>
                  <span className="text-center"><Clock size={12} className="inline" /></span>
                  <span />
                </div>

                {tracks.map((track, i) => {
                  const songId = track.id ? userApi.trackIdToSongId(track.id) ?? -1 : -1
                  return (
                    <div
                      key={track.id}
                      className="group grid items-center gap-3 px-4 py-2 rounded-lg hover:bg-surface-raised transition-colors cursor-pointer"
                      style={{ gridTemplateColumns: '28px 40px 1fr 56px 80px' }}
                      onDoubleClick={() => playTrack(track, tracks)}
                    >
                      {/* # / play icon */}
                      <span className="text-center text-xs text-text-muted tabular-nums group-hover:hidden">{i + 1}</span>
                      <button
                        className="hidden group-hover:flex items-center justify-center text-text-primary"
                        onClick={() => playTrack(track, tracks)}
                      >
                        <Play size={14} fill="currentColor" />
                      </button>

                      {/* Art */}
                      <div className="relative">
                        <AlbumArtThumbnail track={track} size={40} className="rounded-md" shimmer={false} />
                      </div>

                      {/* Title + artist */}
                      <div className="min-w-0">
                        <p className="text-text-primary text-sm font-medium truncate">{track.title}</p>
                        <p className="text-text-muted text-xs truncate">{track.artist}{track.album ? ` · ${track.album}` : ''}</p>
                      </div>

                      {/* Duration */}
                      <span className="text-text-muted text-xs tabular-nums text-center">
                        {track.duration ? formatDuration(track.duration) : '--:--'}
                      </span>

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => move(i, -1)}
                          disabled={i === 0}
                          className="p-1.5 text-text-muted hover:text-text-primary disabled:opacity-20"
                          title="Move up"
                        >
                          <ArrowUp size={13} />
                        </button>
                        <button
                          onClick={() => move(i, 1)}
                          disabled={i === tracks.length - 1}
                          className="p-1.5 text-text-muted hover:text-text-primary disabled:opacity-20"
                          title="Move down"
                        >
                          <ArrowDown size={13} />
                        </button>
                        <button
                          onClick={() => removeTrack(songId)}
                          className="p-1.5 text-text-muted hover:text-red-400"
                          title="Remove"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  // ── Playlist library ──────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
      <div className="px-5 pt-5 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-text-primary text-xl font-bold">Your Library</h1>
            <p className="text-text-muted text-sm mt-0.5">Playlists and saved songs</p>
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

        {/* Create input */}
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

        {/* Grid */}
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
          {/* Liked Songs */}
          <button onClick={() => setShowLiked(true)} className="group text-left">
            <div className="aspect-square rounded-xl bg-gradient-to-br from-accent/50 to-accent/10 flex items-center justify-center mb-2.5 group-hover:scale-[1.03] transition-transform shadow-md">
              <Heart size={48} className="text-accent" fill="currentColor" />
            </div>
            <p className="text-text-primary text-sm font-semibold truncate">Liked Songs</p>
            <p className="text-text-muted text-xs mt-0.5">{likedTrackIds.length} {likedTrackIds.length === 1 ? 'track' : 'tracks'}</p>
          </button>

          {/* User playlists */}
          {playlists.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedId(p.id)}
              className="group text-left"
            >
              <div className="aspect-square rounded-xl overflow-hidden bg-surface-overlay flex items-center justify-center mb-2.5 group-hover:scale-[1.03] transition-transform shadow-md">
                {p.cover_image_url ? (
                  <img src={buildImageUrl(p.cover_image_url)} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-surface-raised to-surface-overlay flex items-center justify-center">
                    <Music2 size={40} className="text-text-muted opacity-40" />
                  </div>
                )}
              </div>
              <p className="text-text-primary text-sm font-semibold truncate">{p.name}</p>
              <p className="text-text-muted text-xs mt-0.5">{p.track_count} {p.track_count === 1 ? 'track' : 'tracks'}</p>
            </button>
          ))}
        </div>

        {playlists.length === 0 && (
          <p className="text-text-muted text-sm mt-4">No playlists yet — create one to get started.</p>
        )}
      </div>
    </div>
  )
}
