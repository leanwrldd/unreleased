import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Maximize2,
  ListOrdered,
  Heart,
  ChevronUp,
  Check,
  MoreHorizontal,
  ListPlus,
  Radio,
  ListEnd,
  Info,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { formatDuration } from '../lib/lyrics'
import { apiFetch, JWApiSong } from '../lib/juicewrldApi'
import { trackIdToSongId } from '../lib/userApi'
import { FullTrack } from '../types'
import AddToPlaylistMenu from './AddToPlaylistMenu'
import SongInfoModal from './SongInfoModal'

let _seek: ((t: number) => void) | null = null
export function seekAudio(t: number): void { _seek?.(t) }

export default function Player(): JSX.Element {
  const {
    currentTrack,
    currentTrackFull,
    isPlaying,
    volume,
    progress,
    currentTime,
    shuffle,
    repeat,
    setIsPlaying,
    setVolume,
    setProgress,
    setCurrentTime,
    setCurrentTrackFull,
    toggleShuffle,
    toggleRepeat,
    nextTrack,
    prevTrack,
    setShowNowPlaying,
    showNowPlaying,
    showQueue,
    setShowQueue,
    queue,
    queueIndex,
    crossfadeEnabled,
    crossfadeDuration,
    sleepTimerEnd,
    setSleepTimer,
    audioOutput,
    setAudioOutput,
    playbackSpeed,
    setPlaybackSpeed,
    likedTrackIds,
    toggleLike,
    setActiveView,
    playNext,
  } = useStore()

  const [showContextMenu, setShowContextMenu] = useState(false)
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false)
  const [showSongInfo, setShowSongInfo] = useState(false)
  const [songInfoData, setSongInfoData] = useState<JWApiSong | null>(null)
  const contextMenuBtnRef = useRef<HTMLButtonElement>(null)
  const currentSongId = currentTrack ? trackIdToSongId(currentTrack.id) : null
  const { radioMode, radioNext } = useStore()

  const openSongInfo = (): void => {
    setShowContextMenu(false)
    if (!currentTrack) return
    const match = currentTrack.id.match(/^jw-(\d+)$/)
    if (!match) return
    setSongInfoData(null)
    setShowSongInfo(true)
    apiFetch<JWApiSong>(`/songs/${match[1]}/`)
      .then((song) => setSongInfoData(song))
      .catch(() => setShowSongInfo(false))
  }

  // Two audio slots — ping-pong between them for crossfade
  const slotA = useRef<HTMLAudioElement>(null)
  const slotB = useRef<HTMLAudioElement>(null)
  const activeSlot = useRef<'A' | 'B'>('A')

  const [prevMute, setPrevMute] = useState(0.8)

  // Seek drag buffering — only commit audio.currentTime on mouse release
  const [seekDrag, setSeekDrag] = useState<number | null>(null)

  // Crossfade state (all refs — no re-renders needed)
  const cfActive     = useRef(false)
  const cfTargetIdx  = useRef(-1)
  const cfIsRadio    = useRef(false)
  const cfOutRaf     = useRef<number | null>(null)
  const cfInRaf      = useRef<number | null>(null)
  const skipNextLoad = useRef(false)

  // Keep a ref of volume so RAF callbacks (created once) always see the latest value
  const volumeRef = useRef(volume)
  useEffect(() => { volumeRef.current = volume }, [volume])

  const getActive = (): HTMLAudioElement | null =>
    activeSlot.current === 'A' ? slotA.current : slotB.current
  const getNext = (): HTMLAudioElement | null =>
    activeSlot.current === 'A' ? slotB.current : slotA.current

  const cancelCF = (): void => {
    if (cfOutRaf.current != null) { cancelAnimationFrame(cfOutRaf.current); cfOutRaf.current = null }
    if (cfInRaf.current  != null) { cancelAnimationFrame(cfInRaf.current);  cfInRaf.current  = null }
    if (cfActive.current) {
      const na = getNext()
      if (na) { na.pause(); na.src = ''; na.volume = 0 }
      cfActive.current = false
      cfTargetIdx.current = -1
      cfIsRadio.current = false
    }
    // Restore current audio to proper volume
    const a = getActive()
    if (a) a.volume = volumeRef.current
  }

  // Compute what the next queue index would be (mirrors store's nextTrack logic, without advancing)
  const computeNextIdx = (): number => {
    if (queue.length === 0) return -1
    if (repeat === 'one') return queueIndex
    if (shuffle && queue.length > 1) {
      let r: number
      do { r = Math.floor(Math.random() * queue.length) } while (r === queueIndex)
      return r
    }
    const next = queueIndex + 1
    if (next >= queue.length) return repeat === 'all' ? 0 : -1
    return next
  }

  // Preload next track into inactive slot (skip shuffle mode — can't predict next)
  useEffect(() => {
    if (!isPlaying || queue.length === 0 || cfActive.current) return
    let nextIdx: number
    if (repeat === 'one') nextIdx = queueIndex
    else if (shuffle) return // random — can't preload
    else {
      nextIdx = queueIndex + 1
      if (nextIdx >= queue.length) {
        if (repeat === 'all') nextIdx = 0
        else return
      }
    }
    const nextTrackData = queue[nextIdx]
    if (!nextTrackData) return
    const url = nextTrackData.streamUrl ?? `file:///${nextTrackData.path.replace(/\\/g, '/')}`
    const na = getNext()
    if (!na || na.src === url) return
    na.src = url
    na.load()
  }, [queueIndex, queue.length, isPlaying, repeat, shuffle])

  // Expose seek to LyricsDisplay
  useEffect(() => {
    _seek = (t) => {
      const audio = getActive()
      if (!audio) return
      cancelCF()
      audio.volume = volumeRef.current
      audio.currentTime = t
      setCurrentTime(t)
      if (audio.duration) setProgress(t / audio.duration)
    }
    return () => { _seek = null }
  }, []) // stable — only depends on refs

  // Load full metadata when track changes or currentTrackFull is cleared
  useEffect(() => {
    if (!currentTrack) return
    if (currentTrackFull) return  // already populated — skip
    // Build synthetic FullTrack immediately so cover art + artist show
    const synthetic: FullTrack = {
      ...currentTrack,
      albumArt: currentTrack.imageUrl ?? null,
      lyrics: null,
      syncedLyrics: null,
      producer: null,
      notes: null,
      ext: '',
    }
    setCurrentTrackFull(synthetic)
    // Fetch lyrics from API if this is a tracker song (id = "jw-{n}")
    const match = currentTrack.id.match(/^jw-(\d+)$/)
    if (match) {
      apiFetch<JWApiSong>(`/songs/${match[1]}/`)
        .then((song) => {
          if (song.lyrics) setCurrentTrackFull({ ...synthetic, lyrics: song.lyrics })
        })
        .catch(() => {/* no lyrics — that's fine */})
    }
  }, [currentTrack?.id, currentTrackFull])

  // Load audio into active slot when track changes
  useEffect(() => {
    const audio = getActive()
    if (!audio || !currentTrack) return

    if (skipNextLoad.current) {
      // Crossfade just swapped — audio already playing on active slot
      skipNextLoad.current = false
      audio.volume = volumeRef.current
      return
    }

    cancelCF()
    const fileUrl = currentTrack.streamUrl ?? `file:///${currentTrack.path.replace(/\\/g, '/')}`
    audio.src = fileUrl
    audio.volume = volumeRef.current
    audio.playbackRate = playbackSpeed
    if (isPlaying) audio.play().catch(console.error)
  }, [currentTrack?.id])

  // Play / pause
  useEffect(() => {
    const audio = getActive()
    if (!audio) return
    if (isPlaying) audio.play().catch(console.error)
    else audio.pause()
  }, [isPlaying])

  // Volume — only change if not mid-crossfade
  useEffect(() => {
    const audio = getActive()
    if (!audio) return
    if (!cfActive.current) audio.volume = volume
  }, [volume])

  // Playback speed — apply to both audio slots
  useEffect(() => {
    for (const ref of [slotA, slotB]) {
      if (ref.current) ref.current.playbackRate = playbackSpeed
    }
  }, [playbackSpeed])

  // Audio output device
  useEffect(() => {
    const apply = async (): Promise<void> => {
      for (const audio of [slotA.current, slotB.current]) {
        if (!audio) continue
        try {
          // setSinkId is a Web Audio API — available in Electron's Chromium
          await (audio as HTMLAudioElement & { setSinkId(id: string): Promise<void> }).setSinkId(audioOutput || '')
        } catch (e) {
          console.warn('setSinkId failed:', e)
        }
      }
    }
    apply()
  }, [audioOutput])

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLAudioElement>): void => {
    const audio = e.currentTarget
    if (audio !== getActive()) return  // ignore pre-loading slot's events

    if (!audio.duration) return
    setCurrentTime(audio.currentTime)
    setProgress(audio.currentTime / audio.duration)

    // Sleep timer
    if (sleepTimerEnd && Date.now() >= sleepTimerEnd) {
      audio.pause()
      setIsPlaying(false)
      setSleepTimer(null)
      return
    }

    // Start crossfade when approaching end
    if (crossfadeEnabled && crossfadeDuration > 0 && !cfActive.current) {
      const remaining = audio.duration - audio.currentTime

      if (remaining > 0 && remaining <= crossfadeDuration) {
        // In radio mode use radioNext; otherwise compute from queue
        const isRadio = useStore.getState().radioMode
        const nextTrackData = isRadio
          ? useStore.getState().radioNext
          : (() => { const i = computeNextIdx(); return (i >= 0 && i < queue.length) ? queue[i] : null })()
        const nextIdx = isRadio ? -1 : computeNextIdx()
        const na = getNext()

        if (na && nextTrackData) {
          cfActive.current = true
          cfIsRadio.current = isRadio
          cfTargetIdx.current = nextIdx

          const url = nextTrackData.streamUrl ?? `file:///${nextTrackData.path.replace(/\\/g, '/')}`
          // Only reassign src if not already preloaded
          if (na.src !== url) na.src = url
          na.volume = 0
          na.play().catch(console.error)

          // Fade OUT active audio
          const startVol  = audio.volume
          const startTime = performance.now()
          const fadeDur   = remaining * 1000

          const tickOut = (): void => {
            const a = getActive()
            if (!a) return
            const t = Math.min((performance.now() - startTime) / fadeDur, 1)
            a.volume = startVol * (1 - t)
            if (t < 1) cfOutRaf.current = requestAnimationFrame(tickOut)
            else { a.volume = 0; cfOutRaf.current = null }
          }
          cfOutRaf.current = requestAnimationFrame(tickOut)

          // Fade IN next audio
          const targetVol = volumeRef.current
          const tickIn = (): void => {
            const n = getNext()
            if (!n) return
            const t = Math.min((performance.now() - startTime) / fadeDur, 1)
            n.volume = targetVol * t
            if (t < 1) cfInRaf.current = requestAnimationFrame(tickIn)
            else { n.volume = targetVol; cfInRaf.current = null }
          }
          cfInRaf.current = requestAnimationFrame(tickIn)
        }
      }
    }
  }

  const handleEnded = (e: React.SyntheticEvent<HTMLAudioElement>): void => {
    const audio = e.currentTarget

    if (audio !== getActive()) {
      // Pre-loading slot ended (very short next track, or error)
      if (cfActive.current) cancelCF()
      return
    }

    if (cfActive.current) {
      // Crossfade complete — next audio is already playing at full volume
      if (cfOutRaf.current != null) { cancelAnimationFrame(cfOutRaf.current); cfOutRaf.current = null }
      if (cfInRaf.current  != null) { cancelAnimationFrame(cfInRaf.current);  cfInRaf.current  = null }
      cfActive.current = false

      const targetIdx = cfTargetIdx.current
      const wasRadio  = cfIsRadio.current
      cfTargetIdx.current = -1
      cfIsRadio.current   = false

      // Ensure incoming track is at full volume
      const na = getNext()
      if (na) na.volume = volumeRef.current

      // Swap which slot is "active"
      activeSlot.current = activeSlot.current === 'A' ? 'B' : 'A'

      // Tell the load useEffect to skip (audio already playing)
      skipNextLoad.current = true

      if (wasRadio) {
        // Radio: delegate to nextTrack() which handles queue history + prefetch
        nextTrack()
      } else if (targetIdx >= 0 && targetIdx < queue.length) {
        // Normal queue: advance store to the crossfaded-into track
        const track = queue[targetIdx]
        const isSameTrack = targetIdx === queueIndex
        useStore.setState({
          queueIndex: targetIdx,
          currentTrack: track,
          currentTrackFull: isSameTrack ? useStore.getState().currentTrackFull : null,
          isPlaying: true,
        })
      }
      return
    }

    // Normal (no crossfade) track end
    if (repeat === 'one') {
      const a = getActive()
      if (a) { a.currentTime = 0; a.volume = volumeRef.current; a.play().catch(console.error) }
      return
    }
    const prevId = currentTrack?.id
    const next = nextTrack()
    if (!next) {
      setIsPlaying(false)
      return
    }
    if (next.id === prevId) {
      // Same track (single song in queue with repeat-all, or only one option)
      const a = getActive()
      if (a) { a.currentTime = 0; a.volume = volumeRef.current; a.play().catch(console.error) }
    }
  }

  const handlePrev = (): void => {
    const audio = getActive()
    if (audio && audio.currentTime > 3) {
      cancelCF()
      audio.currentTime = 0
      audio.volume = volumeRef.current
      setCurrentTime(0)
      setProgress(0)
      return
    }
    cancelCF()
    prevTrack()
  }

  const handleNext = (): void => {
    cancelCF()
    // When on repeat-one, skip = restart the same song
    if (repeat === 'one') {
      const audio = getActive()
      if (audio) {
        audio.currentTime = 0
        audio.volume = volumeRef.current
        if (isPlaying) audio.play().catch(console.error)
      }
      setCurrentTime(0)
      setProgress(0)
      return
    }
    nextTrack()
  }

  // Seek: buffer visually while dragging, only commit on mouse release
  const handleSeekMouseDown = (): void => {
    setSeekDrag(progress)
  }

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const val = parseFloat(e.target.value)
    setSeekDrag(val)
    // Update display time without touching audio
    const audio = getActive()
    if (audio?.duration) setCurrentTime(val * audio.duration)
  }

  const handleSeekCommit = (e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>): void => {
    if (seekDrag === null) return
    const audio = getActive()
    if (audio?.duration) {
      cancelCF()
      const time = seekDrag * audio.duration
      audio.currentTime = time
      audio.volume = volumeRef.current
      audio.playbackRate = playbackSpeed
      setCurrentTime(time)
      setProgress(seekDrag)
    }
    setSeekDrag(null)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const val = parseFloat(e.target.value)
    setVolume(val)
    if (val > 0) setPrevMute(val)
  }

  const toggleMute = (): void => {
    if (isMuted) setVolume(prevMute || 0.8)
    else { setPrevMute(volume); setVolume(0) }
  }

  const isMuted = volume === 0
  const duration = getActive()?.duration || currentTrack?.duration || 0

  const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2]
  const cycleSpeed = (): void => {
    const idx = SPEEDS.indexOf(playbackSpeed)
    setPlaybackSpeed(SPEEDS[(idx + 1) % SPEEDS.length])
  }
  const speedLabel = playbackSpeed === 1 ? '1x' : `${playbackSpeed}x`

  // Cover art error state — reset when track changes
  const [coverArtError, setCoverArtError] = useState(false)
  useEffect(() => { setCoverArtError(false) }, [currentTrack?.id])

  // Output device picker
  const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([])
  const [showOutputPicker, setShowOutputPicker] = useState(false)
  const outputBtnRef = useRef<HTMLButtonElement>(null)
  const [pickerPos, setPickerPos] = useState({ bottom: 0, right: 0 })

  useEffect(() => {
    const enumerate = async (): Promise<void> => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        setOutputDevices(devices.filter((d) => d.kind === 'audiooutput'))
      } catch { /* ignore */ }
    }
    enumerate()
    navigator.mediaDevices.addEventListener('devicechange', enumerate)
    return () => navigator.mediaDevices.removeEventListener('devicechange', enumerate)
  }, [isPlaying])

  const openOutputPicker = (): void => {
    if (!outputBtnRef.current) return
    const r = outputBtnRef.current.getBoundingClientRect()
    setPickerPos({ bottom: window.innerHeight - r.top + 8, right: window.innerWidth - r.right })
    setShowOutputPicker((v) => !v)
  }

  return (
    <>
      <audio
        ref={slotA}
        preload="none"
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onError={(e) => console.error('Audio error (slotA):', e)}
      />
      <audio
        ref={slotB}
        preload="none"
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onError={(e) => console.error('Audio error (slotB):', e)}
      />

      {/* ── Mobile player ── */}
      <div className="md:hidden bg-surface border-t border-[var(--border)] shrink-0">
        {/* Thin progress bar */}
        <div className="h-[2px] bg-surface-overlay relative">
          <div
            className="h-full bg-accent absolute left-0 top-0 transition-none"
            style={{ width: `${(seekDrag !== null ? seekDrag : progress) * 100}%` }}
          />
        </div>
        {/* Track row */}
        <div className="flex items-center px-3 py-2 gap-3 h-14">
          <button
            className="w-10 h-10 rounded bg-surface-overlay shrink-0 overflow-hidden"
            onClick={() => setShowNowPlaying(!showNowPlaying)}
          >
            {(!coverArtError && (currentTrackFull?.albumArt ?? currentTrack?.imageUrl)) ? (
              <img src={currentTrackFull?.albumArt ?? currentTrack?.imageUrl} alt="" className="w-full h-full object-cover" onError={() => setCoverArtError(true)} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-text-muted">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                </svg>
              </div>
            )}
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">
              {currentTrack?.title || 'Not playing'}
            </p>
            <p className="text-xs text-text-muted truncate">{currentTrack?.artist || ''}</p>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <button onClick={handlePrev} className="p-2 text-text-secondary hover:text-text-primary transition-colors">
              <SkipBack size={18} fill="currentColor" />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              disabled={!currentTrack}
              className="w-9 h-9 rounded-full bg-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform disabled:opacity-30"
            >
              {isPlaying
                ? <Pause size={16} fill="#000" className="text-black" />
                : <Play  size={16} fill="#000" className="text-black ml-0.5" />}
            </button>
            <button onClick={handleNext} className="p-2 text-text-secondary hover:text-text-primary transition-colors">
              <SkipForward size={18} fill="currentColor" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Desktop player ── */}
      <div className="hidden md:flex h-[90px] bg-surface border-t border-[var(--border)] items-center px-4 gap-4 shrink-0">
        {/* Track info */}
        <div className="flex items-center gap-3 w-72 min-w-0 shrink-0">
          <button
            className="w-14 h-14 rounded-md bg-surface-overlay shrink-0 overflow-hidden hover:ring-2 ring-accent transition-all"
            onClick={() => setShowNowPlaying(!showNowPlaying)}
            title="Now Playing"
          >
            {(!coverArtError && (currentTrackFull?.albumArt ?? currentTrack?.imageUrl)) ? (
              <img src={currentTrackFull?.albumArt ?? currentTrack?.imageUrl} alt="Album art" className="w-full h-full object-cover" onError={() => setCoverArtError(true)} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-text-muted">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                </svg>
              </div>
            )}
          </button>

          <div className="min-w-0 flex-1">
            {/* Title + heart + 3-dot inline */}
            <div className="flex items-center gap-1 min-w-0">
              <p className="text-text-primary text-sm font-medium truncate min-w-0">
                {currentTrack?.title || 'Not playing'}
              </p>
              <div className="flex items-center gap-0 shrink-0">
                {currentSongId != null && (
                  <button
                    className={`p-1 rounded transition-colors ${currentTrack && likedTrackIds.includes(currentTrack.id) ? 'text-accent' : 'text-text-muted hover:text-accent'}`}
                    onClick={() => currentTrack && toggleLike(currentTrack.id)}
                    title="Like"
                  >
                    <Heart size={13} fill={currentTrack && likedTrackIds.includes(currentTrack.id) ? 'currentColor' : 'none'} />
                  </button>
                )}

                <div className="relative">
                  <button
                    ref={contextMenuBtnRef}
                    className="p-1 rounded text-text-muted hover:text-text-primary transition-colors"
                    onClick={() => setShowContextMenu((v) => !v)}
                    title="More options"
                    disabled={!currentTrack}
                  >
                    <MoreHorizontal size={13} />
                  </button>

                  {showContextMenu && currentTrack && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowContextMenu(false)} />
                      <div className="absolute bottom-7 left-0 z-50 w-48 bg-surface border border-[var(--border)] rounded-xl shadow-2xl py-1 overflow-hidden">
                        <div className="px-3 py-2 border-b border-[var(--border)] mb-1">
                          <p className="text-text-primary text-xs font-semibold truncate">{currentTrack.title}</p>
                          <p className="text-text-muted text-[10px] truncate">{currentTrack.artist}</p>
                        </div>
                        <button
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors"
                          onClick={() => { playNext(currentTrack); setShowContextMenu(false) }}
                        >
                          <ListEnd size={14} /> Play Next
                        </button>
                        {currentSongId != null && !['recording_session', 'unsurfaced'].includes(currentTrack?.genre ?? '') && (
                          <button
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors"
                            onClick={() => { setShowAddToPlaylist(true); setShowContextMenu(false) }}
                          >
                            <ListPlus size={14} /> Add to playlist
                          </button>
                        )}
                        {currentSongId != null && (
                          <button
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors"
                            onClick={openSongInfo}
                          >
                            <Info size={14} /> Song info
                          </button>
                        )}
                      </div>
                    </>
                  )}

                  {showAddToPlaylist && currentSongId != null && (
                    <div className="absolute bottom-7 left-0 z-50">
                      <AddToPlaylistMenu songId={currentSongId} placement="top" onClose={() => setShowAddToPlaylist(false)} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Artist + radio badge */}
            <div className="flex items-center gap-1.5">
              <p className="text-text-muted text-xs truncate">{currentTrack?.artist || ''}</p>
              {radioMode && (
                <span className="flex items-center gap-0.5 text-accent text-[9px] font-semibold uppercase tracking-widest shrink-0">
                  <Radio size={9} /> Radio
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center: controls + progress */}
        <div className="flex-1 flex flex-col items-center gap-2">
          <div className="flex items-center gap-5">
            <button onClick={toggleShuffle}
              className={`transition-colors ${shuffle ? 'text-accent' : 'text-text-secondary hover:text-text-primary'}`}>
              <Shuffle size={18} />
            </button>

            <button onClick={handlePrev} className="text-text-secondary hover:text-text-primary transition-colors">
              <SkipBack size={20} fill="currentColor" />
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              disabled={!currentTrack}
              className="w-9 h-9 rounded-full bg-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform disabled:opacity-30"
            >
              {isPlaying
                ? <Pause size={18} fill="#000" className="text-black" />
                : <Play  size={18} fill="#000" className="text-black ml-0.5" />}
            </button>

            <button onClick={handleNext} className="text-text-secondary hover:text-text-primary transition-colors">
              <SkipForward size={20} fill="currentColor" />
            </button>

            <button onClick={toggleRepeat}
              className={`transition-colors ${repeat !== 'none' ? 'text-accent' : 'text-text-secondary hover:text-text-primary'}`}>
              {repeat === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
            </button>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-2 w-full max-w-xl">
            <span className="text-text-muted text-xs w-10 text-right tabular-nums">
              {formatDuration(currentTime)}
            </span>
            <div className="flex-1 progress-track">
              <input
                type="range" min={0} max={1} step={0.001}
                value={seekDrag !== null ? seekDrag : progress}
                onMouseDown={handleSeekMouseDown}
                onChange={handleSeekChange}
                onMouseUp={handleSeekCommit}
                onTouchEnd={handleSeekCommit}
                disabled={!currentTrack} className="w-full"
                style={{ '--val': `${(seekDrag !== null ? seekDrag : progress) * 100}%` } as React.CSSProperties}
              />
            </div>
            <span className="text-text-muted text-xs w-10 tabular-nums">
              {formatDuration(duration)}
            </span>
          </div>
        </div>

        {/* Right: speed + queue + NP + volume */}
        <div className="flex items-center gap-3 w-56 justify-end">
          {/* Playback speed */}
          <button
            onClick={cycleSpeed}
            title={`Playback speed: ${speedLabel}`}
            className={`text-xs font-semibold tabular-nums min-w-[26px] transition-colors ${
              playbackSpeed !== 1 ? 'text-accent' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            {speedLabel}
          </button>

          <button onClick={() => setShowQueue(!showQueue)}
            className={`relative transition-colors ${showQueue ? 'text-accent' : 'text-text-secondary hover:text-text-primary'}`}
            title="Queue">
            <ListOrdered size={16} />
            {queue.length > queueIndex + 1 && (
              <span className="absolute -top-1.5 -right-1.5 text-[9px] font-bold bg-accent text-black rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none">
                {Math.min(queue.length - queueIndex - 1, 99)}
              </span>
            )}
          </button>

          <button onClick={() => setShowNowPlaying(!showNowPlaying)}
            className={`transition-colors ${showNowPlaying ? 'text-accent' : 'text-text-secondary hover:text-text-primary'}`}
            title="Now Playing">
            <Maximize2 size={16} />
          </button>

          {/* Volume: mute + slider + output picker */}
          <div className="flex items-center gap-1.5">
            <button onClick={toggleMute} className="text-text-secondary hover:text-text-primary transition-colors" title="Mute">
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>

            <div className="w-20 progress-track flex items-center">
              <input type="range" min={0} max={1} step={0.01} value={volume}
                onChange={handleVolumeChange} className="w-full block"
                style={{ '--val': `${volume * 100}%` } as React.CSSProperties} />
            </div>

            <button
              ref={outputBtnRef}
              onClick={openOutputPicker}
              className={`transition-colors ${showOutputPicker ? 'text-accent' : 'text-text-secondary hover:text-text-primary'}`}
              title="Audio output"
            >
              <ChevronUp size={13} />
            </button>
          </div>
        </div>

        {/* Song info modal */}
        {showSongInfo && (
          <SongInfoModal song={songInfoData} onClose={() => { setShowSongInfo(false); setSongInfoData(null) }} />
        )}

        {/* Output device popover */}
        {showOutputPicker && createPortal(
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowOutputPicker(false)} />
            <div
              onMouseDown={(e) => e.stopPropagation()}
              className="fixed z-50 bg-surface-highest border border-[var(--border)] rounded-xl shadow-2xl py-1.5 min-w-[220px]"
              style={{ bottom: pickerPos.bottom, right: pickerPos.right }}
            >
              <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-text-muted">Audio Output</p>
              <button
                onClick={() => { setAudioOutput(''); setShowOutputPicker(false) }}
                className="flex items-center gap-3 w-full px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-overlay transition-colors"
              >
                <span className="w-4 h-4 flex items-center justify-center shrink-0">
                  {audioOutput === '' && <Check size={12} className="text-accent" />}
                </span>
                System default
              </button>
              {outputDevices.map((d) => (
                <button
                  key={d.deviceId}
                  onClick={() => { setAudioOutput(d.deviceId); setShowOutputPicker(false) }}
                  className="flex items-center gap-3 w-full px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-overlay transition-colors"
                >
                  <span className="w-4 h-4 flex items-center justify-center shrink-0">
                    {audioOutput === d.deviceId && <Check size={12} className="text-accent" />}
                  </span>
                  <span className="truncate">{d.label || `Output ${d.deviceId.slice(0, 8)}`}</span>
                </button>
              ))}
            </div>
          </>,
          document.body
        )}
      </div>
    </>
  )
}
