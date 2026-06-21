import { useEffect, useRef } from 'react'
import { useStore } from '../store/useStore'
import { RadioStreamClient } from '../lib/radioSocketService'
import { fetchRadioLive } from '../lib/radioLive'

/**
 * Invisible component always mounted in App.tsx.
 * Manages the 999 FM WebSocket stream lifecycle.
 * When radioFmActive turns ON → connect + start listening (+ pause main player).
 * When radioFmActive turns OFF → stop listening + disconnect.
 */
export default function RadioFmPlayer(): JSX.Element {
  const { radioFmActive, setRadioFmActive, setRadioFmIsLive, setIsPlaying } = useStore()
  const audioRef  = useRef<HTMLAudioElement>(null)
  const clientRef = useRef<RadioStreamClient | null>(null)

  // One-time: create client, attach audio, connect WebSocket for metadata
  useEffect(() => {
    const client = new RadioStreamClient({
      onMeta: (data) => {
        setRadioFmIsLive(data.is_live)
        // If the stream went offline while we were listening, reflect that
        if (!data.is_live && useStore.getState().radioFmActive) {
          // keep radioFmActive true so user can see offline badge; stream stops naturally
        }
      },
      onClose: () => { /* reconnect handled internally */ },
    })
    if (audioRef.current) client.attach(audioRef.current)
    client.connect()
    clientRef.current = client

    // Initial live check
    fetchRadioLive()
      .then((data) => setRadioFmIsLive(data.is_live))
      .catch(() => setRadioFmIsLive(false))

    return () => {
      client.disconnect()
      clientRef.current = null
    }
  }, [])

  // React to radioFmActive toggle
  useEffect(() => {
    const client = clientRef.current
    if (!client) return

    if (radioFmActive) {
      // Pause main player so both don't play at once
      setIsPlaying(false)
      client.startListening().catch(() => {
        // Stream failed — turn off FM mode
        setRadioFmActive(false)
      })
    } else {
      client.stopListening()
    }
  }, [radioFmActive])

  return (
    <audio
      ref={audioRef}
      preload="none"
      style={{ display: 'none' }}
      onError={() => {
        if (useStore.getState().radioFmActive) setRadioFmActive(false)
      }}
    />
  )
}
