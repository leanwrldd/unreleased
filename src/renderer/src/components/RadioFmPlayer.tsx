import { useEffect, useRef } from 'react'
import { useStore } from '../store/useStore'
import { RadioStreamClient, setActiveRadioClient } from '../lib/radioSocketService'
import { fetchRadioLive } from '../lib/radioLive'
import { apiFetch, buildImageUrl } from '../lib/juicewrldApi'
import type { JWApiSong } from '../lib/juicewrldApi'

export default function RadioFmPlayer(): JSX.Element {
  const {
    radioFmActive, setRadioFmActive,
    setRadioFmIsLive, setRadioFmNowPlaying,
    setRadioFmVote, setRadioFmUpNext, setRadioFmQueuePreview,
    setRadioFmMatchedSong,
    radioFmNowPlaying,
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
        setRadioFmVote(data.vote ?? null)
        setRadioFmUpNext(data.up_next)
        setRadioFmQueuePreview(data.queue_preview ?? [])
      },
    })
    if (audioRef.current) client.attach(audioRef.current)
    client.connect()
    clientRef.current = client
    setActiveRadioClient(client)

    fetchRadioLive()
      .then((data) => {
        setRadioFmIsLive(data.is_live)
        setRadioFmNowPlaying(data.now_playing)
        setRadioFmVote(data.vote ?? null)
        setRadioFmUpNext(data.up_next)
        setRadioFmQueuePreview(data.queue_preview ?? [])
      })
      .catch(() => setRadioFmIsLive(false))

    return () => {
      client.disconnect()
      setActiveRadioClient(null)
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


  // When FM now-playing changes, search API for cover + lyrics
  useEffect(() => {
    const title = radioFmNowPlaying?.title
    const artist = radioFmNowPlaying?.artist
    if (!title) { setRadioFmMatchedSong(null); return }
    const query = [title, artist].filter(Boolean).join(' ')
    let cancelled = false
    apiFetch<{ results: JWApiSong[] }>('/songs/', { search: query, page_size: 3 })
      .then(data => {
        if (cancelled) return
        const song = data.results[0]
        if (song) {
          setRadioFmMatchedSong({
            imageUrl: buildImageUrl(song.image_url) ?? null,
            lyrics: (song as JWApiSong & { lyrics?: string }).lyrics ?? null,
          })
        } else {
          setRadioFmMatchedSong(null)
        }
      })
      .catch(() => { if (!cancelled) setRadioFmMatchedSong(null) })
    return () => { cancelled = true }
  }, [radioFmNowPlaying?.title, radioFmNowPlaying?.artist])

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
