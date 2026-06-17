import { Music2 } from 'lucide-react'
import { Track } from '../types'

interface Props {
  track: Track
  size?: number
  className?: string
  shimmer?: boolean
  rootMargin?: string
}

// Web-only version — API tracks always have imageUrl, no IPC needed
export function AlbumArtThumbnail({ track, size = 40, className = '' }: Props): JSX.Element {
  if (track.imageUrl) {
    return (
      <img
        src={track.imageUrl}
        alt={track.title}
        width={size}
        height={size}
        className={`object-cover ${className}`}
        loading="lazy"
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
      />
    )
  }
  return (
    <div
      className={`flex items-center justify-center bg-surface-overlay text-text-muted ${className}`}
      style={{ width: size, height: size }}
    >
      <Music2 size={size * 0.4} />
    </div>
  )
}
