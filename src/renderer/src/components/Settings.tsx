import { useState, useEffect, useRef } from 'react'
import { X, Moon, Sun, Palette, Volume2, Zap, Clock, Info, Github, MessageCircle, PenLine } from 'lucide-react'
import { useStore } from '../store/useStore'

const ACCENT_PRESETS = [
  '#1db954', '#7c3aed', '#2563eb', '#dc2626',
  '#ea580c', '#d97706', '#059669', '#db2777',
]

export default function Settings(): JSX.Element {
  const {
    setShowSettings, setActiveView,
    account,
    theme, setTheme,
    accentColor, setAccentColor,
    audioOutput, setAudioOutput,
    crossfadeEnabled, crossfadeDuration, setCrossfade,
    playbackSpeed, setPlaybackSpeed,
    sleepTimerEnd, setSleepTimer,
  } = useStore()

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [customAccent, setCustomAccent] = useState(accentColor)
  const [sleepMinutes, setSleepMinutes] = useState(30)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices().then((devs) => {
      setDevices(devs.filter((d) => d.kind === 'audiooutput'))
    }).catch(() => {})
  }, [])

  const toggleSleepTimer = (): void => {
    if (sleepTimerEnd) {
      setSleepTimer(null)
    } else {
      setSleepTimer(Date.now() + sleepMinutes * 60 * 1000)
    }
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === overlayRef.current) setShowSettings(false) }}
    >
      <div className="bg-surface border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-[520px] mx-3 max-h-[88vh] md:max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <h2 className="text-text-primary font-bold text-lg">Settings</h2>
          <button onClick={() => setShowSettings(false)} className="text-text-muted hover:text-text-primary transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-8">

          {/* Appearance */}
          <section>
            <h3 className="text-text-secondary text-xs font-semibold uppercase tracking-widest mb-4">Appearance</h3>

            {/* Theme */}
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

            {/* Accent color */}
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
                  onChange={(e) => { setCustomAccent(e.target.value); setAccentColor(e.target.value) }}
                  className="w-7 h-7 rounded-full cursor-pointer border-0 p-0 bg-transparent"
                  title="Custom color"
                />
              </div>
            </div>
          </section>

          {/* Playback */}
          <section>
            <h3 className="text-text-secondary text-xs font-semibold uppercase tracking-widest mb-4">Playback</h3>

            {/* Audio output */}
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

            {/* Playback speed */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-text-muted" />
                <span className="text-text-primary text-sm">Playback speed</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-text-muted text-xs">{playbackSpeed.toFixed(2)}×</span>
                <input
                  type="range" min={0.5} max={2} step={0.05}
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                  className="w-24 accent-[var(--accent)]"
                />
              </div>
            </div>

            {/* Crossfade */}
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

            {/* Sleep timer */}
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

          {/* About */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Info size={14} className="text-text-muted" />
              <h3 className="text-text-secondary text-xs font-semibold uppercase tracking-widest">About</h3>
            </div>
            <p className="text-text-muted text-xs mb-3">
              unreleased v1.5.0 — powered by{' '}
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
                href="https://discord.gg/qq7DMNkBJ4"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors px-2.5 py-1.5 rounded-lg bg-surface-overlay hover:bg-surface-raised border border-[var(--border)]"
              >
                <MessageCircle size={13} />
                Discord
              </a>
              <a
                href="https://unreleased-juicewrldapi.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors px-2.5 py-1.5 rounded-lg bg-surface-overlay hover:bg-surface-raised border border-[var(--border)]"
              >
                <span className="w-3 h-3 flex items-center justify-center">▲</span>
                Vercel
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
          </section>
        </div>
      </div>
    </div>
  )
}
