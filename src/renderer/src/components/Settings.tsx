import { useState, useEffect, useRef } from 'react'
import {
  X, Moon, Sun, Palette, Volume2, Zap, Clock, Info, Github, MessageCircle,
  PenLine, BookOpen, Copy, Eye, EyeOff, ChevronDown, KeyRound, Globe, RefreshCw, DownloadCloud,
  FolderOpen, FolderPlus, Monitor, BellOff, Minus, Loader2,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { getToken } from '../lib/userApi'

const ACCENT_PRESETS = [
  '#1db954', '#7c3aed', '#2563eb', '#dc2626',
  '#ea580c', '#d97706', '#059669', '#db2777',
]

type UpdateState = 'idle' | 'checking' | 'available' | 'latest' | 'downloading' | 'downloaded' | 'error'

interface AppSettings {
  downloadPath: string
  autoDownload: boolean
  minimizeToTray: boolean
  startupView: string
  discordRpcEnabled: boolean
}

export default function Settings(): JSX.Element {
  const [showToken, setShowToken] = useState(false)
  const [tokenCopied, setTokenCopied] = useState(false)
  const [openAbout, setOpenAbout] = useState<string | null>(null)
  const {
    setShowSettings, setActiveView,
    account,
    theme, setTheme,
    accentColor, setAccentColor,
    audioOutput, setAudioOutput,
    crossfadeEnabled, crossfadeDuration, setCrossfade,
    playbackSpeed, setPlaybackSpeed,
    sleepTimerEnd, setSleepTimer,
    updateStatus,
    libraryFolders, addLibraryFolder, removeLibraryFolder, scanLibrary, libraryScanning, libraryTracks, libraryLastScanned,
  } = useStore()

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [customAccent, setCustomAccent] = useState(accentColor)
  const [sleepMinutes, setSleepMinutes] = useState(30)
  const [updateState, setUpdateState] = useState<UpdateState>('idle')
  const [updateVersion, setUpdateVersion] = useState<string | null>(null)
  const [updatePercent, setUpdatePercent] = useState(0)
  const accentDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const isElectron = navigator.userAgent.includes('Electron')
  const el = (window as any).electron

  const [appSettings, setAppSettings] = useState<AppSettings>({
    downloadPath: '',
    autoDownload: true,
    minimizeToTray: false,
    startupView: 'api-tracker',
    discordRpcEnabled: true,
  })

  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices().then((devs) => {
      setDevices(devs.filter((d) => d.kind === 'audiooutput'))
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!isElectron || !el) return
    el.getAppSettings().then((s: AppSettings) => setAppSettings(s)).catch(() => {})
  }, [isElectron, el])

  useEffect(() => {
    if (!isElectron || !el) return
    const off = el.onUpdateStatus?.((d: { type: string; version?: string; percent?: number; message?: string }) => {
      if (d.type === 'checking') { setUpdateState('checking'); setUpdateVersion(null) }
      else if (d.type === 'available') { setUpdateState('available'); setUpdateVersion(d.version ?? null) }
      else if (d.type === 'not-available') { setUpdateState('latest'); setUpdateVersion(d.version ?? null); setTimeout(() => setUpdateState('idle'), 5000) }
      else if (d.type === 'downloading') { setUpdateState('downloading'); setUpdatePercent(d.percent ?? 0) }
      else if (d.type === 'downloaded') { setUpdateState('downloaded'); setUpdateVersion(d.version ?? null) }
      else if (d.type === 'error') { setUpdateState('error'); setTimeout(() => setUpdateState('idle'), 5000) }
    })
    return () => off?.()
  }, [isElectron, el])

  useEffect(() => {
    if (!updateStatus) return
    if (updateStatus.type === 'downloading') { setUpdateState('downloading'); setUpdatePercent(updateStatus.percent ?? 0) }
    else if (updateStatus.type === 'downloaded') { setUpdateState('downloaded'); setUpdateVersion(updateStatus.version ?? null) }
    else if (updateStatus.type === 'available') { setUpdateState('available'); setUpdateVersion(updateStatus.version ?? null) }
    else if (updateStatus.type === 'checking') setUpdateState('checking')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setSetting = async (key: keyof AppSettings, value: unknown) => {
    if (!el) return
    setAppSettings((prev) => ({ ...prev, [key]: value }))
    await el.setAppSetting(key, value)
  }

  const pickDownloadFolder = async () => {
    if (!el) return
    const picked = await el.pickFolder()
    if (picked) setSetting('downloadPath', picked)
  }

  const toggleSleepTimer = (): void => {
    if (sleepTimerEnd) setSleepTimer(null)
    else setSleepTimer(Date.now() + sleepMinutes * 60 * 1000)
  }

  const updateBtnTitle = updateState === 'checking' ? 'Checking...'
    : updateState === 'available' ? `v${updateVersion} available`
    : updateState === 'downloading' ? `Downloading ${updatePercent}%`
    : updateState === 'downloaded' ? 'Ready to install'
    : updateState === 'latest' ? 'Up to date'
    : updateState === 'error' ? 'Check failed'
    : 'Check for updates'

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === overlayRef.current) setShowSettings(false) }}
    >
      <div className="bg-surface border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-[520px] mx-3 max-h-[88vh] md:max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <h2 className="text-text-primary font-bold text-lg">Settings</h2>
            {isElectron && (
              <button
                disabled={updateState === 'checking' || updateState === 'downloading'}
                title={updateBtnTitle}
                onClick={async () => {
                  if (updateState === 'downloaded') { (el as any)?.installUpdate?.(); return }
                  setUpdateState('checking')
                  try {
                    await el?.checkForUpdates()
                    setUpdateState((s: UpdateState) => s === 'checking' ? 'latest' : s)
                    setTimeout(() => setUpdateState((s: UpdateState) => s === 'latest' ? 'idle' : s), 4000)
                  } catch {
                    setUpdateState('error')
                    setTimeout(() => setUpdateState('idle'), 4000)
                  }
                }}
                className={`p-1 rounded transition-colors disabled:opacity-50 ${
                  updateState === 'latest' || updateState === 'downloaded' ? 'text-emerald-400' :
                  updateState === 'available' ? 'text-yellow-400' :
                  updateState === 'error' ? 'text-red-400' :
                  'text-text-muted hover:text-text-primary'
                }`}
              >
                <RefreshCw size={14} className={updateState === 'checking' || updateState === 'downloading' ? 'animate-spin' : ''} />
              </button>
            )}
            {isElectron && updateState !== 'downloading' && updateState !== 'checking' && (
              <button
                title="Force reinstall latest release"
                onClick={() => el?.forceUpdate?.()}
                className="p-1 rounded transition-colors text-text-muted hover:text-text-primary"
              >
                <DownloadCloud size={14} />
              </button>
            )}
            {updateState === 'downloading' && (
              <span className="text-[10px] text-accent font-medium">{updatePercent}%</span>
            )}
            {updateState === 'available' && updateVersion && (
              <span className="text-[10px] text-yellow-400">v{updateVersion}</span>
            )}
            {updateState === 'downloaded' && (
              <span className="text-[10px] text-emerald-400">Restart to update</span>
            )}
          </div>
          <button onClick={() => setShowSettings(false)} className="text-text-muted hover:text-text-primary transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-8">

          {/* Appearance */}
          <section>
            <h3 className="text-text-secondary text-xs font-semibold uppercase tracking-widest mb-4">Appearance</h3>
            <div className="flex items-center justify-between mb-4">
              <span className="text-text-primary text-sm">Theme</span>
              <div className="flex rounded-lg bg-surface-overlay p-0.5 gap-0.5">
                {(['dark', 'light'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      theme === t ? 'bg-surface text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    {t === 'dark' ? <Moon size={12} /> : <Sun size={12} />}
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Palette size={14} className="text-text-muted" />
                <span className="text-text-primary text-sm">Accent color</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {ACCENT_PRESETS.map((c) => (
                  <button
                    key={c}
                    onClick={() => { setAccentColor(c); setCustomAccent(c) }}
                    className="w-7 h-7 rounded-full transition-all hover:scale-110"
                    style={{ backgroundColor: c, outline: accentColor === c ? `2px solid ${c}` : 'none', outlineOffset: '2px' }}
                  />
                ))}
                <input
                  type="color"
                  value={customAccent}
                  onChange={(e) => {
                    setCustomAccent(e.target.value)
                    if (accentDebounceRef.current) clearTimeout(accentDebounceRef.current)
                    accentDebounceRef.current = setTimeout(() => setAccentColor(e.target.value), 80)
                  }}
                  className="w-7 h-7 rounded-full cursor-pointer border-0 p-0 bg-transparent"
                  title="Custom color"
                />
              </div>
            </div>
          </section>

          {/* Playback */}
          <section>
            <h3 className="text-text-secondary text-xs font-semibold uppercase tracking-widest mb-4">Playback</h3>
            {devices.length > 0 && (
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Volume2 size={14} className="text-text-muted" />
                  <span className="text-text-primary text-sm">Audio output</span>
                </div>
                <select
                  value={audioOutput}
                  onChange={(e) => setAudioOutput(e.target.value)}
                  className="bg-surface-overlay text-text-primary text-xs rounded-lg px-2 py-1.5 border border-[var(--border)] max-w-[180px] truncate"
                >
                  <option value="">Default</option>
                  {devices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>{d.label || `Device ${d.deviceId.slice(0, 6)}`}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-text-muted" />
                <span className="text-text-primary text-sm">Playback speed</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-text-muted text-xs">{playbackSpeed.toFixed(2)}x</span>
                <input
                  type="range" min={0.5} max={2} step={0.05}
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                  className="w-24 accent-[var(--accent)]"
                />
              </div>
            </div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-text-primary text-sm">Crossfade</span>
              <div className="flex items-center gap-3">
                {crossfadeEnabled && (
                  <div className="flex items-center gap-2">
                    <input
                      type="range" min={1} max={12} step={1}
                      value={crossfadeDuration}
                      onChange={(e) => setCrossfade(true, parseInt(e.target.value))}
                      className="w-20 accent-[var(--accent)]"
                    />
                    <span className="text-text-muted text-xs w-6">{crossfadeDuration}s</span>
                  </div>
                )}
                <button
                  onClick={() => setCrossfade(!crossfadeEnabled, crossfadeDuration)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${crossfadeEnabled ? 'bg-accent' : 'bg-surface-overlay'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${crossfadeEnabled ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-text-muted" />
                <span className="text-text-primary text-sm">Sleep timer</span>
              </div>
              <div className="flex items-center gap-2">
                {sleepTimerEnd ? (
                  <span className="text-accent text-xs">
                    {Math.max(0, Math.ceil((sleepTimerEnd - Date.now()) / 60000))} min left
                  </span>
                ) : (
                  <select
                    value={sleepMinutes}
                    onChange={(e) => setSleepMinutes(parseInt(e.target.value))}
                    className="bg-surface-overlay text-text-primary text-xs rounded px-2 py-1 border border-[var(--border)]"
                  >
                    {[15, 30, 45, 60, 90].map((m) => <option key={m} value={m}>{m} min</option>)}
                  </select>
                )}
                <button
                  onClick={toggleSleepTimer}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    sleepTimerEnd ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25' : 'bg-accent/15 text-accent hover:bg-accent/25'
                  }`}
                >
                  {sleepTimerEnd ? 'Cancel' : 'Start'}
                </button>
              </div>
            </div>
          </section>


          {/* Library Folders */}
          {isElectron && (
            <section>
              <h3 className="text-text-secondary text-xs font-semibold uppercase tracking-widest mb-4">Library Folders</h3>
              <div className="space-y-2 mb-3">
                {libraryFolders.length === 0 && (
                  <p className="text-text-muted text-xs">No folders added yet.</p>
                )}
                {libraryFolders.map((folder) => (
                  <div key={folder} className="flex items-center gap-2 bg-surface-overlay rounded-lg px-3 py-2 border border-[var(--border)]">
                    <FolderOpen size={13} className="text-text-muted shrink-0" />
                    <span className="flex-1 text-text-primary text-xs truncate" title={folder}>{folder}</span>
                    <button
                      onClick={() => removeLibraryFolder(folder)}
                      className="text-text-muted hover:text-red-400 transition-colors text-xs px-1"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => { if (!el) return; const p = await el.pickFolder(); if (p) addLibraryFolder(p) }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-surface-overlay border border-[var(--border)] text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors"
                >
                  <FolderPlus size={13} /> Add Folder
                </button>
                <button
                  onClick={() => scanLibrary()}
                  disabled={libraryScanning || libraryFolders.length === 0}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-accent/15 text-accent hover:bg-accent/25 disabled:opacity-40 transition-colors"
                >
                  {libraryScanning ? <Loader2 size={13} className="animate-spin" /> : null}
                  {libraryScanning ? 'Scanning…' : 'Scan Now'}
                </button>
              </div>
              {libraryLastScanned && (
                <p className="text-text-muted text-[10px] mt-2">
                  Last scanned: {new Date(libraryLastScanned).toLocaleString()} · {libraryTracks.length} tracks
                </p>
              )}
            </section>
          )}

          {/* App (Electron only) */}
          {isElectron && (
            <section>
              <h3 className="text-text-secondary text-xs font-semibold uppercase tracking-widest mb-4">App</h3>
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <FolderOpen size={14} className="text-text-muted" />
                  <span className="text-text-primary text-sm">Download folder</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-text-muted text-xs truncate bg-surface-overlay rounded-lg px-3 py-2 border border-[var(--border)]" title={appSettings.downloadPath}>
                    {appSettings.downloadPath || 'Default Downloads folder'}
                  </span>
                  <button
                    onClick={pickDownloadFolder}
                    className="shrink-0 px-3 py-2 rounded-lg text-xs font-medium bg-surface-overlay hover:bg-surface-raised border border-[var(--border)] text-text-secondary transition-colors"
                  >
                    Change
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Monitor size={14} className="text-text-muted" />
                  <span className="text-text-primary text-sm">Start on</span>
                </div>
                <select
                  value={appSettings.startupView}
                  onChange={(e) => setSetting('startupView', e.target.value)}
                  className="bg-surface-overlay text-text-primary text-xs rounded-lg px-2 py-1.5 border border-[var(--border)]"
                >
                  <option value="api-tracker">Tracker</option>
                  <option value="api-files">Files</option>
                  <option value="api-categories">Categories</option>
                  <option value="liked">Liked Songs</option>
                  <option value="playlists">Playlists</option>
                </select>
              </div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BellOff size={14} className="text-text-muted" />
                  <span className="text-text-primary text-sm">Auto-download updates</span>
                </div>
                <button
                  onClick={() => setSetting('autoDownload', !appSettings.autoDownload)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${appSettings.autoDownload ? 'bg-accent' : 'bg-surface-overlay'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${appSettings.autoDownload ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Minus size={14} className="text-text-muted" />
                  <span className="text-text-primary text-sm">Minimize to tray on close</span>
                </div>
                <button
                  onClick={() => setSetting('minimizeToTray', !appSettings.minimizeToTray)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${appSettings.minimizeToTray ? 'bg-accent' : 'bg-surface-overlay'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${appSettings.minimizeToTray ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageCircle size={14} className="text-text-muted" />
                  <span className="text-text-primary text-sm">Show Discord Status</span>
                </div>
                <button
                  onClick={() => setSetting('discordRpcEnabled', !appSettings.discordRpcEnabled)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${appSettings.discordRpcEnabled ? 'bg-accent' : 'bg-surface-overlay'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${appSettings.discordRpcEnabled ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>
            </section>
          )}

          {/* About */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Info size={14} className="text-text-muted" />
              <h3 className="text-text-secondary text-xs font-semibold uppercase tracking-widest">About</h3>
            </div>
            <p className="text-text-muted text-xs mb-3">
              unreleased v1.9.6 &mdash; powered by{' '}
              <a href="https://juicewrldapi.com" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                juicewrldapi.com
              </a>
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              <a
                href="https://github.com/leanwrldd/unreleased"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors px-2.5 py-1.5 rounded-lg bg-surface-overlay hover:bg-surface-raised border border-[var(--border)]"
              >
                <Github size={13} />
                GitHub
              </a>
              <a
                href="https://discord.gg/jwa"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors px-2.5 py-1.5 rounded-lg bg-surface-overlay hover:bg-surface-raised border border-[var(--border)]"
              >
                <MessageCircle size={13} />
                Discord
              </a>
              <a
                href="https://juicewrldapi.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors px-2.5 py-1.5 rounded-lg bg-surface-overlay hover:bg-surface-raised border border-[var(--border)]"
              >
                <Globe size={13} />
                API
              </a>
            </div>

            {(!account || (!account.is_editor && !account.is_administrator)) && (
              <button
                onClick={() => { setShowSettings(false); setActiveView('editor') }}
                className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl bg-accent/10 hover:bg-accent/15 border border-accent/25 text-accent text-sm font-medium transition-colors mt-2"
              >
                <PenLine size={15} />
                Become an Editor
              </button>
            )}
            {account && (
              <div className="mt-2 rounded-xl border border-[var(--border)] overflow-hidden">
                <button
                  onClick={() => setShowToken(v => !v)}
                  className="flex items-center gap-2 w-full px-3 py-2.5 bg-[var(--surface-raised)] hover:bg-[var(--surface-overlay)] text-text-secondary text-sm font-medium transition-colors"
                >
                  <KeyRound size={15} />
                  <span className="flex-1 text-left">Auth Token</span>
                  {showToken ? <EyeOff size={14} className="text-text-muted" /> : <Eye size={14} className="text-text-muted" />}
                </button>
                {showToken && (
                  <button
                    onClick={() => {
                      const t = getToken()
                      if (t) {
                        navigator.clipboard.writeText(t)
                        setTokenCopied(true)
                        setTimeout(() => setTokenCopied(false), 2000)
                      }
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2.5 bg-[var(--surface)] hover:bg-[var(--surface-raised)] transition-colors border-t border-[var(--border)] group"
                    title="Click to copy"
                  >
                    <code className="flex-1 text-left text-[10px] font-mono text-text-muted truncate">
                      {getToken() ?? '&#8212;'}
                    </code>
                    <span className={`flex-shrink-0 flex items-center gap-1 text-[10px] font-medium transition-colors ${tokenCopied ? 'text-emerald-500' : 'text-text-muted group-hover:text-text-primary'}`}>
                      {tokenCopied ? 'Copied!' : <><Copy size={11} /> Copy</>}
                    </span>
                  </button>
                )}
              </div>
            )}

            <button
              onClick={() => { setShowSettings(false); setActiveView('docs') }}
              className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl bg-[var(--surface-raised)] hover:bg-[var(--surface-overlay)] border border-[var(--border)] text-text-secondary text-sm font-medium transition-colors mt-2"
            >
              <BookOpen size={15} />
              API Docs
            </button>

            <div className="mt-4 rounded-xl border border-[var(--border)] overflow-hidden divide-y divide-[var(--border)]">
              {([
                {
                  q: 'What is this?',
                  a: "The Juice WRLD API is a RESTful API providing access to a comprehensive database of Juice WRLD songs, albums, and eras. Whether you are a fan, developer, or researcher, this API offers the tools you need to dive deep into Juice WRLD music.",
                  link: { text: 'Check out the documentation to get started.', href: 'https://juicewrldapi.com/docs' },
                },
                {
                  q: 'Who are you?',
                  a: "We are passionate Juice WRLD fans and developers who wanted to create an accessible platform for others to explore and analyze Juice WRLD musical legacy.",
                },
                {
                  q: 'Why did you build this?',
                  a: "We built this API to celebrate Juice WRLD legacy by making his music and history more accessible to fans and developers alike.",
                },
                {
                  q: 'Technical stuff?',
                  a: 'The Juice WRLD API is built with Django and PostgreSQL. This player (unreleased) is built with React, TypeScript, Vite, and Tailwind CSS.',
                },
              ] as { q: string; a: string; link?: { text: string; href: string } }[]).map(({ q, a, link }) => (
                <div key={q}>
                  <button
                    onClick={() => setOpenAbout(openAbout === q ? null : q)}
                    className="flex items-center justify-between w-full px-3 py-2.5 hover:bg-[var(--surface-raised)] transition-colors text-left"
                  >
                    <span className="text-text-secondary text-xs font-medium">{q}</span>
                    <ChevronDown size={12} className={`text-text-muted transition-transform duration-150 shrink-0 ml-2 ${openAbout === q ? 'rotate-180' : ''}`} />
                  </button>
                  {openAbout === q && (
                    <div className="px-3 pb-3 pt-0">
                      <p className="text-text-muted text-xs leading-relaxed">{a}</p>
                      {link && (
                        <a href={link.href} target="_blank" rel="noopener noreferrer"
                          className="mt-1.5 inline-block text-xs text-accent hover:underline">
                          {link.text}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
