import { useState, useEffect, useRef } from 'react'
import { X, Folder, Plus, Trash2, RefreshCw, ListX, FileAudio, Timer, Layers, Filter, ChevronDown, Pencil, Globe, Download } from 'lucide-react'
import { useStore } from '../store/useStore'
import { CHANGELOG } from '../lib/changelog'

const ACCENT_PRESETS = [
  { name: 'Green',  color: '#1db954' },
  { name: 'Blue',   color: '#3b82f6' },
  { name: 'Purple', color: '#a855f7' },
  { name: 'Red',    color: '#ef4444' },
  { name: 'Orange', color: '#f97316' },
  { name: 'Pink',   color: '#ec4899' },
  { name: 'Yellow', color: '#eab308' },
  { name: 'Cyan',   color: '#06b6d4' },
]

const ALL_EXTS = ['.mp3', '.flac', '.wav', '.m4a', '.ogg', '.aac', '.opus']
const SLEEP_OPTIONS = [15, 30, 45, 60, 90]

export default function Settings(): JSX.Element {
  const {
    setShowSettings,
    libraryFolders, addLibraryFolder, removeLibraryFolder, setLibrary, setLibraryFolders,
    playlists, resetPlaylists,
    crossfadeEnabled, crossfadeDuration, setCrossfade,
    sleepTimerEnd, setSleepTimer,
    scanFilters, setScanFilters,
    accentColor, setAccentColor,
    addTracks,
    providers, addProvider, removeProvider,
    apiDownloadDir, setApiDownloadDir,
  } = useStore()

  const [scanning, setScanning] = useState(false)
  const [appVersion, setAppVersion] = useState('')
  const [isDev, setIsDev] = useState(false)
  const [editingVersion, setEditingVersion] = useState(false)
  const [versionInput, setVersionInput] = useState('')
  const [versionSaved, setVersionSaved] = useState(false)
  const [showChangelog, setShowChangelog] = useState(false)
  const [showScanFilters, setShowScanFilters] = useState(false)
  const [showProviders, setShowProviders] = useState(false)
  const [addingProvider, setAddingProvider] = useState(false)
  const [newProviderUrl, setNewProviderUrl] = useState('')
  const [providerStatuses, setProviderStatuses] = useState<Record<string, 'checking' | 'online' | 'offline'>>({})
  const versionInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    window.api.getVersion().then((v) => { setAppVersion(v); setVersionInput(v) })
    window.api.isDev().then(setIsDev)
  }, [])

  // Ping all providers whenever the list changes
  useEffect(() => {
    if (providers.length === 0) return
    const aborted = { value: false }
    setProviderStatuses((prev) => {
      const next = { ...prev }
      for (const url of providers) { next[url] = 'checking' }
      return next
    })
    const pingAll = async (): Promise<void> => {
      for (const url of providers) {
        if (aborted.value) break
        try {
          const result = await window.api.pingProvider(url)
          if (!aborted.value) {
            setProviderStatuses((prev) => ({ ...prev, [url]: result.online ? 'online' : 'offline' }))
          }
        } catch {
          if (!aborted.value) {
            setProviderStatuses((prev) => ({ ...prev, [url]: 'offline' }))
          }
        }
      }
    }
    pingAll()
    return () => { aborted.value = true }
  }, [providers])

  const handleSaveVersion = async (): Promise<void> => {
    const trimmed = versionInput.trim()
    if (!trimmed || trimmed === appVersion) { setEditingVersion(false); return }
    const result = await window.api.setVersion(trimmed)
    if (result.ok) {
      setAppVersion(trimmed)
      setVersionSaved(true)
      setTimeout(() => setVersionSaved(false), 2000)
    }
    setEditingVersion(false)
  }
  const [confirmReset, setConfirmReset] = useState(false)
  const [excludeInput, setExcludeInput] = useState(scanFilters.excludeFolders.join(', '))
  const handleAddFolder = async (): Promise<void> => {
    const folder = await window.api.openFolder()
    if (!folder) return
    addLibraryFolder(folder)
    const newFolders = [...libraryFolders, folder]
    setScanning(true)
    const tracks = await window.api.scanLibrary(newFolders, {
      extensions: scanFilters.extensions,
      minDuration: scanFilters.minDuration,
      excludeFolders: scanFilters.excludeFolders
    })
    setLibrary(tracks)
    await window.api.storeSet('libraryFolders', newFolders)
    await window.api.storeSet('library', tracks)
    setScanning(false)
  }

  const handleAddFiles = async (): Promise<void> => {
    const files = await window.api.openFiles()
    if (!files.length) return
    setScanning(true)
    const newTracks = await window.api.addFiles(files)
    addTracks(newTracks)
    const all = useStore.getState().library
    await window.api.storeSet('library', all)
    setScanning(false)
  }

  const handleRemoveFolder = async (folder: string): Promise<void> => {
    removeLibraryFolder(folder)
    const newFolders = libraryFolders.filter((f) => f !== folder)
    setScanning(true)
    const tracks = newFolders.length > 0 ? await window.api.scanLibrary(newFolders, {
      extensions: scanFilters.extensions,
      minDuration: scanFilters.minDuration,
      excludeFolders: scanFilters.excludeFolders
    }) : []
    setLibrary(tracks)
    await window.api.storeSet('libraryFolders', newFolders)
    await window.api.storeSet('library', tracks)
    setScanning(false)
  }

  const handleRescan = async (): Promise<void> => {
    if (libraryFolders.length === 0) return
    setScanning(true)
    const tracks = await window.api.scanLibrary(libraryFolders, {
      extensions: scanFilters.extensions,
      minDuration: scanFilters.minDuration,
      excludeFolders: scanFilters.excludeFolders
    })
    setLibrary(tracks)
    await window.api.storeSet('library', tracks)
    setScanning(false)
  }

  const toggleExt = (ext: string): void => {
    const exts = scanFilters.extensions.includes(ext)
      ? scanFilters.extensions.filter((e) => e !== ext)
      : [...scanFilters.extensions, ext]
    setScanFilters({ ...scanFilters, extensions: exts })
  }

  const applyExcludeFolders = (): void => {
    const folders = excludeInput.split(',').map((s) => s.trim()).filter(Boolean)
    setScanFilters({ ...scanFilters, excludeFolders: folders })
  }

  const sleepRemaining = sleepTimerEnd
    ? Math.max(0, Math.ceil((sleepTimerEnd - Date.now()) / 60000))
    : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={() => { setShowSettings(false); setConfirmReset(false) }}
    >
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative z-10 w-[520px] max-h-[85vh] bg-surface rounded-2xl shadow-2xl border border-[var(--border)] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border)] shrink-0">
          <h2 className="text-text-primary font-bold text-lg">Settings</h2>
          <button onClick={() => setShowSettings(false)} className="text-text-muted hover:text-text-primary transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-8">

          {/* Accent Color */}
          <section>
            <SectionHeader label="Accent Color" />
            <div className="bg-surface-raised rounded-xl px-4 py-4 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                {ACCENT_PRESETS.map((p) => {
                  const isActive = accentColor === p.color
                  return (
                    <button
                      key={p.color}
                      title={p.name}
                      onClick={() => setAccentColor(p.color)}
                      className="relative w-7 h-7 rounded-full transition-transform hover:scale-110 active:scale-95"
                      style={{ background: p.color, boxShadow: isActive ? `0 0 0 2px var(--surface-raised), 0 0 0 4px ${p.color}` : undefined }}
                    />
                  )
                })}
                {/* Custom color input */}
                <label className="relative w-7 h-7 rounded-full overflow-hidden cursor-pointer transition-transform hover:scale-110" title="Custom color"
                  style={{
                    background: ACCENT_PRESETS.some(p => p.color === accentColor)
                      ? 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)'
                      : accentColor,
                    boxShadow: !ACCENT_PRESETS.some(p => p.color === accentColor)
                      ? `0 0 0 2px var(--surface-raised), 0 0 0 4px ${accentColor}`
                      : undefined
                  }}>
                  <input
                    type="color"
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                  />
                </label>
              </div>
              <p className="text-text-muted text-xs">
                Current: <span className="font-mono" style={{ color: accentColor }}>{accentColor}</span>
              </p>
            </div>
          </section>

          {/* Music Library */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <SectionHeader label="Music Library" noMargin />
              <div className="flex items-center gap-2">
                {libraryFolders.length > 0 && (
                  <button onClick={handleRescan} disabled={scanning}
                    className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary disabled:opacity-50 transition-colors">
                    <RefreshCw size={13} className={scanning ? 'animate-spin' : ''} />
                    {scanning ? 'Scanning…' : 'Rescan'}
                  </button>
                )}
                <button onClick={handleAddFiles} disabled={scanning}
                  className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary disabled:opacity-50 transition-colors">
                  <FileAudio size={13} /> Add files
                </button>
                <button onClick={handleAddFolder} disabled={scanning}
                  className="flex items-center gap-1.5 text-xs text-accent hover:text-accent-hover disabled:opacity-50 transition-colors">
                  <Plus size={13} /> Add folder
                </button>
              </div>
            </div>

            {libraryFolders.length === 0 ? (
              <div className="flex gap-3">
                <button onClick={handleAddFolder}
                  className="flex-1 flex items-center gap-3 px-4 py-3 rounded-lg border border-dashed border-[var(--border)] text-text-muted hover:text-text-primary hover:border-text-muted transition-colors text-sm">
                  <Folder size={18} /> Add a music folder
                </button>
                <button onClick={handleAddFiles}
                  className="flex-1 flex items-center gap-3 px-4 py-3 rounded-lg border border-dashed border-[var(--border)] text-text-muted hover:text-text-primary hover:border-text-muted transition-colors text-sm">
                  <FileAudio size={18} /> Add individual files
                </button>
              </div>
            ) : (
              <ul className="space-y-2">
                {libraryFolders.map((folder) => (
                  <li key={folder} className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-surface-raised group">
                    <Folder size={16} className="text-text-muted shrink-0" />
                    <span className="flex-1 text-sm text-text-primary truncate" title={folder}>{folder}</span>
                    <button onClick={() => handleRemoveFolder(folder)} disabled={scanning}
                      className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-400 disabled:opacity-30 transition-all">
                      <Trash2 size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Scan Filters */}
          <section>
            <button
              onClick={() => setShowScanFilters((v) => !v)}
              className="w-full flex items-center justify-between mb-3 group"
            >
              <h3 className="text-text-secondary text-xs font-semibold uppercase tracking-widest flex items-center gap-1.5">
                <Filter size={12} />
                Scan Filters
              </h3>
              <ChevronDown size={14} className={`text-text-muted transition-transform duration-200 ${showScanFilters ? 'rotate-180' : ''}`} />
            </button>
            {showScanFilters && <div className="space-y-4">
              <div>
                <p className="text-text-secondary text-xs font-medium mb-2">File types</p>
                <div className="flex flex-wrap gap-2">
                  {ALL_EXTS.map((ext) => {
                    const on = scanFilters.extensions.includes(ext)
                    return (
                      <button key={ext} onClick={() => toggleExt(ext)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${on ? 'bg-accent border-accent text-black' : 'border-[var(--border)] text-text-muted hover:text-text-primary'}`}>
                        {ext.replace('.', '').toUpperCase()}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <p className="text-text-secondary text-xs font-medium mb-2">
                  Min duration: <span className="text-text-primary">{scanFilters.minDuration}s</span>
                </p>
                <input type="range" min={0} max={120} step={5} value={scanFilters.minDuration}
                  onChange={(e) => setScanFilters({ ...scanFilters, minDuration: parseInt(e.target.value) })}
                  className="w-full progress-track"
                  style={{ '--val': `${(scanFilters.minDuration / 120) * 100}%` } as React.CSSProperties} />
              </div>

              <div>
                <p className="text-text-secondary text-xs font-medium mb-2">Exclude folder names (comma-separated)</p>
                <input
                  type="text"
                  value={excludeInput}
                  onChange={(e) => setExcludeInput(e.target.value)}
                  onBlur={applyExcludeFolders}
                  onKeyDown={(e) => e.key === 'Enter' && applyExcludeFolders()}
                  placeholder="e.g. Podcasts, Audiobooks"
                  className="w-full bg-surface-overlay text-text-primary text-sm rounded-lg px-3 py-2 outline-none focus:ring-1 ring-accent border border-transparent focus:border-accent/40"
                />
              </div>
            </div>}
          </section>

          {/* Crossfade */}
          <section>
            <SectionHeader label="Crossfade" icon={<Layers size={12} />} />
            <div className="bg-surface-raised rounded-xl px-4 py-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-primary text-sm font-medium">Enable crossfade</p>
                  <p className="text-text-muted text-xs mt-0.5">Fade between tracks</p>
                </div>
                <ToggleSwitch on={crossfadeEnabled} onToggle={() => setCrossfade(!crossfadeEnabled, crossfadeDuration)} />
              </div>
              {crossfadeEnabled && (
                <div>
                  <p className="text-text-secondary text-xs font-medium mb-2">
                    Duration: <span className="text-text-primary">{crossfadeDuration}s</span>
                  </p>
                  <input type="range" min={1} max={12} step={1} value={crossfadeDuration}
                    onChange={(e) => setCrossfade(crossfadeEnabled, parseInt(e.target.value))}
                    className="w-full progress-track"
                    style={{ '--val': `${((crossfadeDuration - 1) / 11) * 100}%` } as React.CSSProperties} />
                </div>
              )}
            </div>
          </section>

          {/* Sleep Timer */}
          <section>
            <SectionHeader label="Sleep Timer" icon={<Timer size={12} />} />
            <div className="bg-surface-raised rounded-xl px-4 py-4">
              {sleepTimerEnd ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-text-primary text-sm font-medium">Pausing in ~{sleepRemaining} min</p>
                    <p className="text-text-muted text-xs mt-0.5">Playback will pause automatically</p>
                  </div>
                  <button onClick={() => setSleepTimer(null)}
                    className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 border border-red-400/30 hover:bg-red-400/10 rounded-lg transition-colors">
                    Cancel
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-text-secondary text-xs font-medium mb-3">Pause playback after</p>
                  <div className="flex flex-wrap gap-2">
                    {SLEEP_OPTIONS.map((min) => (
                      <button key={min} onClick={() => setSleepTimer(Date.now() + min * 60 * 1000)}
                        className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary bg-surface-overlay hover:bg-surface-highest border border-[var(--border)] transition-colors">
                        {min} min
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Playlists */}
          <section>
            <SectionHeader label="Playlists" />
            <div className="bg-surface-raised rounded-xl px-4 py-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-text-primary text-sm font-medium">{playlists.length} playlist{playlists.length !== 1 ? 's' : ''}</p>
                <p className="text-text-muted text-xs mt-0.5">Permanently delete all playlists</p>
              </div>
              {!confirmReset ? (
                <button onClick={() => setConfirmReset(true)} disabled={playlists.length === 0}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-red-400 border border-red-400/30 hover:bg-red-400/10 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0">
                  <ListX size={14} /> Reset all
                </button>
              ) : (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-text-muted">Are you sure?</span>
                  <button onClick={() => { resetPlaylists(); setConfirmReset(false) }}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors">
                    Delete all
                  </button>
                  <button onClick={() => setConfirmReset(false)}
                    className="px-3 py-1.5 text-xs text-text-muted hover:text-text-primary transition-colors">
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Providers */}
          <section>
            <button
              onClick={() => setShowProviders((v) => !v)}
              className="w-full flex items-center justify-between mb-3 group"
            >
              <h3 className="text-text-secondary text-xs font-semibold uppercase tracking-widest flex items-center gap-1.5">
                <Globe size={12} />
                Providers
              </h3>
              <ChevronDown size={14} className={`text-text-muted transition-transform duration-200 ${showProviders ? 'rotate-180' : ''}`} />
            </button>

            {showProviders && (
              <div className="space-y-2">
                {/* Existing providers */}
                {providers.length > 0 && (
                  <ul className="bg-surface-raised rounded-xl overflow-hidden divide-y divide-[var(--border)]">
                    {providers.map((url) => {
                      const status = providerStatuses[url]
                      const dotClass =
                        status === 'online' ? 'bg-green-500' :
                        status === 'offline' ? 'bg-red-500' :
                        status === 'checking' ? 'bg-yellow-400 animate-pulse' :
                        'bg-surface-overlay border border-[var(--border)]'
                      const dotTitle =
                        status === 'online' ? 'Online' :
                        status === 'offline' ? 'Offline' :
                        status === 'checking' ? 'Checking…' : 'Unknown'
                      return (
                      <li key={url} className="group flex items-center gap-3 px-4 py-3">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass}`} title={dotTitle} />
                        <span className="flex-1 text-sm text-text-primary truncate" title={url}>{url}</span>
                        <button
                          onClick={() => removeProvider(url)}
                          className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-400 transition-all shrink-0"
                          title="Remove provider"
                        >
                          <Trash2 size={14} />
                        </button>
                      </li>
                      )
                    })}
                  </ul>
                )}

                {/* Inline add input */}
                {addingProvider ? (
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      type="url"
                      placeholder="https://your-provider.com"
                      value={newProviderUrl}
                      onChange={(e) => setNewProviderUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (newProviderUrl.trim()) addProvider(newProviderUrl.trim())
                          setNewProviderUrl(''); setAddingProvider(false)
                        }
                        if (e.key === 'Escape') { setNewProviderUrl(''); setAddingProvider(false) }
                      }}
                      onBlur={() => {
                        if (newProviderUrl.trim()) addProvider(newProviderUrl.trim())
                        setNewProviderUrl(''); setAddingProvider(false)
                      }}
                      className="flex-1 bg-surface-overlay text-text-primary text-sm rounded-lg px-3 py-2 outline-none focus:ring-1 ring-accent border border-transparent focus:border-accent/40"
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingProvider(true)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-text-muted hover:text-text-primary bg-surface-raised hover:bg-surface-overlay rounded-lg border border-dashed border-[var(--border)] w-full transition-colors"
                  >
                    <Plus size={14} /> Add provider URL
                  </button>
                )}
              </div>
            )}
          </section>

          {/* API Download Folder */}
          <section>
            <h3 className="text-text-secondary text-xs font-semibold uppercase tracking-widest flex items-center gap-1.5 mb-3">
              <Download size={12} />
              API Downloads
            </h3>
            <div className="bg-surface-raised rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-text-secondary text-sm truncate">
                  {apiDownloadDir || <span className="text-text-muted italic">System Downloads folder</span>}
                </p>
                <p className="text-text-muted text-xs mt-0.5">Files downloaded from the API Files browser are saved here</p>
              </div>
              <button
                onClick={async () => {
                  const folder = await window.api.openFolder()
                  if (folder) setApiDownloadDir(folder)
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-surface-overlay hover:bg-surface-raised border border-[var(--border)] text-text-secondary transition-colors shrink-0"
              >
                <Folder size={12} /> Change
              </button>
              {apiDownloadDir && (
                <button
                  onClick={() => setApiDownloadDir('')}
                  className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-overlay transition-colors shrink-0"
                  title="Reset to default"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </section>

          {/* About */}
          <section className="pt-2 pb-4">
            <SectionHeader label="About" />
            <div className="bg-surface-raised rounded-xl overflow-hidden">
              {/* Version row */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                <span className="text-text-muted text-xs">unreleased</span>
                <div className="flex items-center gap-2">
                  {editingVersion ? (
                    <input
                      ref={versionInputRef}
                      autoFocus
                      value={versionInput}
                      onChange={(e) => setVersionInput(e.target.value)}
                      onBlur={handleSaveVersion}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveVersion()
                        if (e.key === 'Escape') { setVersionInput(appVersion); setEditingVersion(false) }
                      }}
                      className="w-24 bg-surface-overlay border border-accent/40 text-text-primary text-xs rounded px-2 py-1 outline-none text-right font-mono"
                    />
                  ) : (
                    <span className={`text-xs font-mono font-medium ${versionSaved ? 'text-accent' : 'text-text-primary'}`}>
                      {versionSaved ? '✓ saved' : appVersion ? `v${appVersion}` : '—'}
                    </span>
                  )}
                  {isDev && !editingVersion && (
                    <button
                      onClick={() => { setEditingVersion(true); setVersionInput(appVersion) }}
                      className="text-text-muted hover:text-accent transition-colors"
                      title="Edit version (dev only)"
                    >
                      <Pencil size={11} />
                    </button>
                  )}
                  {isDev && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-accent/15 text-accent font-semibold tracking-wide">DEV</span>
                  )}
                </div>
              </div>

              {/* Changelog toggle */}
              <button
                onClick={() => setShowChangelog((v) => !v)}
                className="flex items-center justify-between w-full px-4 py-3 hover:bg-surface-overlay transition-colors"
              >
                <span className="text-xs font-medium text-text-secondary">Changelog</span>
                <ChevronDown size={13} className={`text-text-muted transition-transform duration-200 ${showChangelog ? 'rotate-180' : ''}`} />
              </button>

              {showChangelog && (
                <div className="border-t border-[var(--border)] max-h-64 overflow-y-auto px-4 py-3 space-y-4">
                  {CHANGELOG.map((entry, ei) => (
                    <div key={entry.version} className={ei > 0 ? 'pt-4 border-t border-[var(--border)]' : ''}>
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-xs font-bold text-text-primary">v{entry.version}</span>
                        <span className="text-[10px] text-text-muted">{entry.date}</span>
                      </div>
                      <div className="space-y-1.5">
                        {entry.changes.map((c, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className={`shrink-0 text-[9px] font-bold uppercase tracking-wide px-1.5 py-px rounded mt-px ${
                              c.type === 'new' ? 'bg-accent/15 text-accent'
                              : c.type === 'fix' ? 'bg-red-500/15 text-red-400'
                              : 'bg-surface-highest text-text-muted'
                            }`}>
                              {c.type}
                            </span>
                            <span className="text-[11px] text-text-secondary leading-relaxed">{c.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

        </div>
      </div>
    </div>
  )
}

function SectionHeader({ label, icon, noMargin }: { label: string; icon?: React.ReactNode; noMargin?: boolean }): JSX.Element {
  return (
    <h3 className={`text-text-secondary text-xs font-semibold uppercase tracking-widest flex items-center gap-1.5 ${noMargin ? '' : 'mb-3'}`}>
      {icon}
      {label}
    </h3>
  )
}

function ToggleSwitch({ on, onToggle }: { on: boolean; onToggle: () => void }): JSX.Element {
  return (
    <button onClick={onToggle}
      className={`relative w-11 h-6 rounded-full transition-all duration-200 ease-in-out shrink-0 ${on ? 'bg-accent' : 'bg-surface-overlay border border-[var(--border)]'}`}>
      <span className={`absolute left-0 top-1 w-4 h-4 rounded-full shadow-md transition-all duration-200 ease-in-out ${on ? 'bg-white translate-x-6' : 'bg-text-muted translate-x-1'}`} />
    </button>
  )
}
