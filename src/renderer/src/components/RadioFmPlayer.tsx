import { useEffect, useRef } from 'react'
import { useStore } from '../store/useStore'
import { RadioStreamClient } from '../lib/radioSocketService'
import { fetchRadioLive } from '../lib/radioLive'

export default function RadioFmPlayer(): JSX.Element {
  const {
    radioFmActive, setRadioFmActive,
    setRadioFmIsLive, setRadioFmNowPlaying,
    setIsPlaying,
    volume,
  } = useStore()

  const audioRef  = useRef<HTMLAudioElement>(null)
  const clientRef = useRef<RadioStreamClient | null>(null)

  useEffect(() => {
    const client = new RadioStreamClient({
      onMeta: (data) => {
        setRadioFmIsLive(data.is_live)
        setRadioFmNowPlaying(data.now_playing)
      },
    })
    if (audioRef.current) client.attach(audioRef.current)
    client.connect()
    clientRef.current = client

    fetchRadioLive()
      .then((data) => {
        setRadioFmIsLive(data.is_live)
        setRadioFmNowPlaying(data.now_playing)
      })
      .catch(() => setRadioFmIsLive(false))

    return () => {
      client.disconnect()
      clientRef.current = null
    }
  }, [])

  // Sync store volume → FM audio element
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  useEffect(() => {
    const client = clientRef.current
    if (!client) return
    if (radioFmActive) {
      setIsPlaying(false)
      client.startListening().catch(() => setRadioFmActive(false))
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
