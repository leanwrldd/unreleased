export interface Track {
  id: string
  path: string
  title: string
  artist: string
  album: string
  albumArtist: string
  year: number | null
  trackNumber: number | null
  duration: number
  genre: string
  hasAlbumArt: boolean
  // API-sourced tracks
  streamUrl?: string  // if set, Player streams this URL instead of file:///
  imageUrl?: string   // if set, AlbumArtThumbnail uses this instead of getAlbumArt IPC
}

export interface FullTrack extends Track {
  albumArt: string | null
  lyrics: string | null
  syncedLyrics: string | null
  producer: string | null
  notes: string | null
  ext: string
  error?: string
  // File technical info
  sampleRate?: number
  bitrate?: number
  bitsPerSample?: number
  channels?: number
  fileSize?: number
}

export interface Playlist {
  id: string
  name: string
  trackIds: string[]
  createdAt: number
  pinned?: boolean
  folderId?: string
}

export interface PlaylistFolder {
  id: string
  name: string
  createdAt: number
  parentId?: string
}

export interface SyncedLyricLine {
  time: number // seconds
  text: string
}

export type ViewType = 'api-tracker' | 'api-files' | 'api-categories' | 'editor' | 'compilation' | 'admin' | 'liked' | 'playlists' | 'shared-playlist' | 'editor-profile' | 'docs' | 'radio-fm' | 'not-found'

export type SortField = 'default' | 'title' | 'artist' | 'album' | 'year' | 'genre' | 'duration'
export type SortDir = 'asc' | 'desc'
export interface Cols {
  art: boolean
  artist: boolean
  album: boolean
  year: boolean
  genre: boolean
  duration: boolean
}
