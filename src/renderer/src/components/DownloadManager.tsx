import { useEffect, useState } from 'react'
import { Download, X, ChevronDown, ChevronUp, CheckCircle2, AlertCircle, Loader2, RefreshCw } from 'lucide-react'
import { useStore, DownloadItem } from '../store/useStore'

export default function DownloadManager(): JSX.Element | null {
  const { downloads, showDownloadManager, setShowDownloadManager, addDownload, updateDownload, clearCompletedDownloads, setUpdateStatus, updateStatus } = useStore()
  const [minimized, setMinimized] = useState(false)
  const el = (window as any).electron

  // Wire up Electron download events
  useEffect(() => {
    if (!el) return

    const offStarted = el.onDownloadStarted((d: { filename: string; savePath: string; total: number }) => {
      const item: DownloadItem = {
        id: `file-${d.filename}-${Date.now()}`,
        filename: d.filename,
        type: 'file',
        state: 'downloading',
        percent: 0,
        total: d.total,
        savePath: d.savePath,
      }
      addDownload(item)
      setShowDownloadManager(true)
    })

    const offProgress = el.onDownloadProgress((d: { filename: string; received: number; total: number; percent: number }) => {
      // Find last matching download by filename that's still downloading
      const { downloads: current } = useStore.getState()
      const match = [...current].reverse().find((x) => x.filename === d.filename && x.state === 'downloading')
      if (match) {
        updateDownload(match.id, { percent: d.percent, received: d.received, total: d.total })
      }
    })

    const offDone = el.onDownloadDone((d: { filename: string; state: string; savePath: string }) => {
      const { downloads: current } = useStore.getState()
      const match = [...current].reverse().find((x) => x.filename === d.filename && x.state === 'downloading')
      if (match) {
        const finalState = d.state === 'completed' ? 'done'
          : d.state === 'cancelled' ? 'cancelled'
          : 'error'
        updateDownload(match.id, { state: finalState, percent: finalState === 'done' ? 100 : match.percent, savePath: d.savePath })
      }
    })

    const offUpdate = el.onUpdateStatus((d: { type: string; version?: string; percent?: number; bytesPerSecond?: number; message?: string }) => {
      setUpdateStatus(d)
      if (d.type === 'downloading') {
        // Upsert update download item
        const { downloads: current } = useStore.getState()
        const existing = current.find((x) => x.type === 'update')
        if (existing) {
          updateDownload(existing.id, { percent: d.percent ?? 0, state: 'downloading' })
        } else {
          addDownload({
            id: 'update',
            filename: `Update${d.version ? ` v${d.version}` : ''}`,
            type: 'update',
            state: 'downloading',
            percent: d.percent ?? 0,
          })
          setShowDownloadManager(true)
        }
      } else if (d.type === 'downloaded') {
        const { downloads: current } = useStore.getState()
        const existing = current.find((x) => x.type === 'update')
        if (existing) updateDownload(existing.id, { state: 'done', percent: 100, filename: `Update v${d.version ?? ''} ready` })
      } else if (d.type === 'error') {
        const { downloads: current } = useStore.getState()
        const existing = current.find((x) => x.type === 'update' && x.state === 'downloading')
        if (existing) updateDownload(existing.id, { state: 'error', error: d.message })
      }
    })

    return () => {
      offStarted?.()
      offProgress?.()
      offDone?.()
      offUpdate?.()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!showDownloadManager && downloads.length === 0) return null

  const active = downloads.filter((d) => d.state === 'downloading').length
  const done = downloads.filter((d) => d.state === 'done').length
  const errors = downloads.filter((d) => d.state === 'error' || d.state === 'cancelled').length

  return (
    <div className="fixed bottom-20 right-4 z-[200] w-72 rounded-2xl border border-[var(--border)] bg-surface shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[var(--border)] bg-surface-overlay">
        <Download size={14} className="text-accent shrink-0" />
        <span className="text-text-primary text-xs font-semibold flex-1">
          Downloads
          {active > 0 && <span className="ml-1 text-text-muted">· {active} active</span>}
        </span>
        {done + errors > 0 && (
          <button
            onClick={clearCompletedDownloads}
            className="text-[10px] text-text-muted hover:text-text-primary transition-colors px-1"
            title="Clear completed"
          >
            Clear
          </button>
        )}
        <button
          onClick={() => setMinimized((v) => !v)}
          className="text-text-muted hover:text-text-primary transition-colors"
        >
          {minimized ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        <button
          onClick={() => setShowDownloadManager(false)}
          className="text-text-muted hover:text-text-primary transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Download list */}
      {!minimized && (
        <div className="max-h-64 overflow-y-auto divide-y divide-[var(--border)]">
          {downloads.length === 0 ? (
            <p className="text-text-muted text-xs text-center py-5">No downloads</p>
          ) : (
            downloads.map((item) => (
              <DownloadRow key={item.id} item={item} />
            ))
          )}
        </div>
      )}
    </div>
  )
}

function DownloadRow({ item }: { item: DownloadItem }): JSX.Element {
  const icon = item.state === 'done'
    ? <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
    : item.state === 'error' || item.state === 'cancelled'
    ? <AlertCircle size={14} className="text-red-400 shrink-0" />
    : item.type === 'update'
    ? <RefreshCw size={14} className="text-accent shrink-0 animate-spin" />
    : <Loader2 size={14} className="text-accent shrink-0 animate-spin" />

  const sizeLabel = item.total && item.total > 0
    ? `${fmtBytes(item.received ?? 0)} / ${fmtBytes(item.total)}`
    : item.received ? fmtBytes(item.received) : null

  return (
    <div className="px-3 py-2.5">
      <div className="flex items-center gap-2 mb-1.5">
        {icon}
        <span className="text-text-primary text-xs truncate flex-1" title={item.filename}>
          {item.filename}
        </span>
        {item.state === 'downloading' && (
          <span className="text-text-muted text-[10px] shrink-0">{item.percent}%</span>
        )}
      </div>
      {item.state === 'downloading' && (
        <div className="h-1 bg-surface-overlay rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-300"
            style={{ width: `${item.percent}%` }}
          />
        </div>
      )}
      {item.state === 'downloading' && sizeLabel && (
        <p className="text-[10px] text-text-muted mt-1">{sizeLabel}</p>
      )}
      {item.state === 'error' && item.error && (
        <p className="text-[10px] text-red-400 mt-0.5 truncate">{item.error}</p>
      )}
      {item.state === 'done' && item.savePath && (
        <p className="text-[10px] text-text-muted mt-0.5 truncate">{item.savePath}</p>
      )}
    </div>
  )
}

function fmtBytes(b: number): string {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`
  return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`
}
