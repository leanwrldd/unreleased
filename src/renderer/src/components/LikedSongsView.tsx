import { useEffect, useState, useCallback } from 'react'
import { Heart, Play, Loader2, ListMusic, MoreHorizontal, PlayCircle, ListPlus } from 'lucide-react'
import { useStore } from '../store/useStore'
import * as userApi from '../lib/userApi'
import { Track } from '../types'
import { AlbumArtThumbnail } from './AlbumArtThumbnail'

function formatDuration(seconds: number): string {
  if (!seconds) return ''
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function LikedSongsView(): JSX.Element {
  const { account, playTrack, addToQueue, likedTrackIds, toggleLike, setShowUserAuth, playlists, refreshPlaylists } = useStore()
  const [tracks, setTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)
  type CtxMenu = { track: Track; songId: number; x: number; y: number; showPlaylists: boolean }
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null)

  const load = useCallback(async () => {
    if (!account) { setLoading(false); return }
    setLoading(true)
    try {
      const favorites = await userApi.getFavorites()
      setTracks(favorites.map((f) => userApi.liteSongToTrack(f.song)))
    } catch {
      setTracks([])
    } finally {
      setLoading(false)
    }
  }, [account])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!ctxMenu) return
    const close = () => setCtxMenu(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [ctxMenu])

  const visible = tracks.filter((t) => likedTrackIds.includes(t.id))

  if (!account) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
        <Heart size={40} className="text-text-muted mb-4" />
        <h2 className="text-text-primary text-lg font-semibold mb-1">Liked Songs</h2>
        <p className="text-text-muted text-sm mb-5 max-w-xs">Log in to save your favorite tracks and access them on any device.</p>
        <button
          onClick={() => setShowUserAuth(true)}
          className="px-5 py-2.5 rounded-xl bg-accent/15 hover:bg-accent/25 text-accent text-sm font-semibold transition-colors"
        >
          Log in
        </button>
      </div>
    )
  }

  return (
    <>
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
      <div className="px-5 pt-5 pb-8">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent/40 to-accent/10 flex items-center justify-center shrink-0">
            <Heart size={32} className="text-accent" fill="currentColor" />
          </div>
          <div className="min-w-0">
            <h1 className="text-text-primary text-2xl font-bold">Liked Songs</h1>
            <p className="text-text-muted text-sm mt-1">{visible.length} {visible.length === 1 ? 'track' : 'tracks'}</p>
          </div>
          {visible.length > 0 && (
            <button
              onClick={() => playTrack(visible[0], visible)}
              className="ml-auto flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent text-black text-sm font-semibold hover:scale-105 transition-transform"
            >
              <Play size={16} fill="currentColor" /> Play
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-text-muted h-40 justify-center">
            <Loader2 size={18} className="animate-spin" /><span className="text-sm">Loading…</span>
          </div>
        ) : visible.length === 0 ? (
          <p className="text-text-muted text-sm">No liked songs yet. Tap the heart on any track to save it here.</p>
        ) : (
          <div className="space-y-0.5">
            {visible.map((track, i) => {
              const songId = userApi.trackIdToSongId(track.id)
              return (
                <div
                  key={track.id}
                  className="group flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-surface-raised transition-colors"
                  onContextMenu={e => { e.preventDefault(); if (songId != null) setCtxMenu({ track, songId, x: e.clientX, y: e.clientY, showPlaylists: false }) }}
                >
                  <span className="w-6 text-center text-xs text-text-muted tabular-nums shrink-0">{i + 1}</span>
                  <button onClick={() => playTrack(track, visible)} className="relative shrink-0">
                    <AlbumArtThumbnail track={track} size={40} className="rounded-md" />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 rounded-md transition-opacity">
                      <Play size={16} className="text-white" fill="currentColor" />
                    </span>
                  </button>
                  <div className="min-w-0 flex-1 cursor-pointer" onClick={() => playTrack(track, visible)}>
                    <p className="text-text-primary text-sm font-medium truncate">{track.title}</p>
                    <p className="text-text-muted text-xs truncate">{track.artist}{track.album ? ` · ${track.album}` : ''}</p>
                  </div>
                  <span className="text-text-muted text-xs tabular-nums shrink-0 hidden sm:block">{formatDuration(track.duration)}</span>
                  <button
                    onClick={e => { e.stopPropagation(); if (songId != null) setCtxMenu(prev => prev?.songId === songId ? null : { track, songId, x: e.clientX, y: e.clientY, showPlaylists: false }) }}
                    className="p-1.5 text-text-muted hover:text-text-primary opacity-0 group-hover:opacity-100 transition-all shrink-0"
                    title="More options"
                  >
                    <MoreHorizontal size={16} />
                  </button>
                  <button
                    onClick={() => toggleLike(track.id)}
                    className="p-1.5 text-accent shrink-0"
                    title="Remove from Liked Songs"
                  >
                    <Heart size={16} fill="currentColor" />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {visible.length > 0 && (
          <div className="mt-6 flex items-center gap-2 text-text-muted text-xs">
            <ListMusic size={12} /> Synced to your account
          </div>
        )}
      </div>
    </div>

    {ctxMenu && (
      <div
        className="fixed z-50 min-w-[180px] rounded-xl border border-[var(--border)] bg-surface-raised shadow-xl py-1 overflow-hidden"
        style={{ left: Math.min(ctxMenu.x, window.innerWidth - 200), top: Math.min(ctxMenu.y, window.innerHeight - 240) }}
        onClick={e => e.stopPropagation()}
      >
        <button onClick={() => { playTrack(ctxMenu.track, visible); setCtxMenu(null) }}
          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-text-primary hover:bg-surface-overlay transition-colors">
          <Play size={14} className="text-text-muted" /> Play
        </button>
        <button onClick={() => { addToQueue(ctxMenu.track); setCtxMenu(null) }}
          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-text-primary hover:bg-surface-overlay transition-colors">
          <PlayCircle size={14} className="text-text-muted" /> Play next
        </button>
        <div className="border-t border-[var(--border)] my-1" />
        <button
          onClick={e => { e.stopPropagation(); setCtxMenu(prev => prev ? { ...prev, showPlaylists: !prev.showPlaylists } : null) }}
          className="w-full flex items-center justify-between gap-2.5 px-3.5 py-2 text-sm text-text-primary hover:bg-surface-overlay transition-colors"
        >
          <span className="flex items-center gap-2.5"><ListPlus size={14} className="text-text-muted" /> Add to playlist</span>
          <span className="text-text-muted text-xs">›</span>
        </button>
        {ctxMenu.showPlaylists && (
          <div className="border-t border-[var(--border)] max-h-40 overflow-y-auto">
            {playlists.length === 0 ? (
              <p className="px-3.5 py-2 text-xs text-text-muted">No playlists</p>
            ) : playlists.map(p => (
              <button key={p.id} onClick={async () => { setCtxMenu(null); await userApi.addToPlaylist(p.id, ctxMenu.songId); await refreshPlaylists() }}
                className="w-full text-left px-3.5 py-2 text-sm text-text-primary hover:bg-surface-overlay truncate block">
                {p.name}
              </button>
            ))}
          </div>
        )}
        <div className="border-t border-[var(--border)] my-1" />
        <button onClick={() => { toggleLike(ctxMenu.track.id); setCtxMenu(null) }}
          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-red-400 hover:bg-surface-overlay transition-colors">
          <Heart size={14} /> Unlike
        </button>
      </div>
    )}
    </>
  )
}
