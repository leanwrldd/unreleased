import { useEffect, useRef } from 'react'
import { useStore } from '../store/useStore'
import { useShallow } from 'zustand/react/shallow'

// Headless — pushes "now playing" facts to the main process whenever they
// change, which builds and applies the actual Discord Rich Presence activity.
// Deliberately does NOT subscribe to `currentTime`/`progress`: Discord renders
// its own live countdown from the start/end timestamps we send once, so
// re-sending on every playback tick would just spam (and exceed) the RPC
// rate limit for no visual benefit.
export default function DiscordRpcSync(): JSX.Element | null {
  const {
    currentTrack, isPlaying,
    radioFmActive, radioFmNowPlaying,
  } = useStore(useShallow(s => ({
    currentTrack: s.currentTrack,
    isPlaying: s.isPlaying,
    radioFmActive: s.radioFmActive,
    radioFmNowPlaying: s.radioFmNowPlaying,
  })))

  // currentTime is read fresh (not subscribed) only at the moment we send an
  // update, so it doesn't trigger re-renders/re-sends on its own.
  const getCurrentTime = (): number => useStore.getState().currentTime

  const el = (window as any).electron
  const lastSentKeyRef = useRef<string | null>(null)

  useEffect(() => {
    if (!el?.discordRpcSetActivity) return

    if (radioFmActive) {
      if (!radioFmNowPlaying) {
        if (lastSentKeyRef.current !== null) {
          el.discordRpcClearActivity?.()
          lastSentKeyRef.current = null
        }
        return
      }
      const key = `radio:${radioFmNowPlaying.title}:${radioFmNowPlaying.artist}`
      if (key === lastSentKeyRef.current) return
      lastSentKeyRef.current = key
      el.discordRpcSetActivity({
        title: radioFmNowPlaying.title,
        artist: radioFmNowPlaying.artist,
        isPlaying: true,
        currentTime: (radioFmNowPlaying.elapsed_ms ?? 0) / 1000,
        duration: (radioFmNowPlaying.duration_ms ?? 0) / 1000,
        isRadio: true,
      })
      return
    }

    if (!currentTrack) {
      if (lastSentKeyRef.current !== null) {
        el.discordRpcClearActivity?.()
        lastSentKeyRef.current = null
      }
      return
    }

    const key = `track:${currentTrack.id}:${isPlaying}`
    if (key === lastSentKeyRef.current) return
    lastSentKeyRef.current = key
    el.discordRpcSetActivity({
      title: currentTrack.title,
      artist: currentTrack.artist,
      isPlaying,
      currentTime: getCurrentTime(),
      duration: currentTrack.duration,
      isRadio: false,
    })
  }, [el, currentTrack?.id, isPlaying, radioFmActive, radioFmNowPlaying?.title, radioFmNowPlaying?.artist])

  return null
}
