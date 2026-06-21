import { Music2 } from 'lucide-react'

export default function SyncedLyricsPage(): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
      <div className="w-14 h-14 rounded-2xl bg-surface-overlay border border-[var(--border)] flex items-center justify-center">
        <Music2 size={22} className="text-text-muted opacity-65" />
      </div>
      <div className="space-y-1.5">
        <p className="text-text-primary text-sm font-semibold">Synced Lyrics Editor</p>
        <p className="text-text-muted text-xs opacity-65 leading-relaxed">Coming soon</p>
      </div>
    </div>
  )
}
