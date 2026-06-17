export const AUDIO_EXTS = new Set(['.mp3', '.flac', '.wav', '.m4a', '.ogg', '.aac', '.opus', '.wma', '.alac'])
export const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.avif'])
export const VIDEO_EXTS = new Set(['.mp4', '.mov', '.webm', '.m4v', '.mkv', '.avi'])

export type FileMediaType = 'audio' | 'image' | 'video' | 'folder' | 'other'

export function getFileExt(name: string): string {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i).toLowerCase() : ''
}

export function getMediaType(name: string): FileMediaType {
  const ext = getFileExt(name)
  if (AUDIO_EXTS.has(ext)) return 'audio'
  if (IMAGE_EXTS.has(ext)) return 'image'
  if (VIDEO_EXTS.has(ext)) return 'video'
  return 'other'
}

/** Convert an OS-native absolute path to a file:// URL usable in <img>/<video> src */
export function toFileUrl(absPath: string): string {
  const posix = absPath.replace(/\\/g, '/')
  return posix.startsWith('/') ? `file://${posix}` : `file:///${posix}`
}
