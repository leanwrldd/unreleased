import { JWAPI_BASE } from './juicewrldApi'

export interface RadioLibraryTrack {
  id: string
  title: string
  artist: string
}

export interface RadioLibraryEra {
  name: string
  tracks: RadioLibraryTrack[]
}

export interface RadioLibrary {
  eras: RadioLibraryEra[]
}

export async function fetchRadioLibrary(): Promise<RadioLibrary> {
  const res = await fetch(`${JWAPI_BASE}/radio/library/`)
  if (!res.ok) throw new Error(`Radio library ${res.status}`)
  return res.json()
}
