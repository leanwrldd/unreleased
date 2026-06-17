import { Minus, Square, X, Settings, Sun, Moon } from 'lucide-react'
import logo from '../assets/logo.png'
import { useStore } from '../store/useStore'

export default function Titlebar(): JSX.Element {
  const { theme, setTheme, setShowSettings } = useStore()

  return (
    <div className="titlebar-drag h-11 bg-titlebar flex items-center px-3 gap-3 shrink-0 border-b border-[var(--border)]">
      {/* App identity */}
      <div className="titlebar-no-drag flex items-center gap-2 shrink-0">
        <img src={logo} alt="unreleased" className="h-7 w-auto object-contain" />
        <span className="text-text-primary text-xs font-semibold tracking-wide select-none">unreleased</span>
      </div>

      {/* Drag region filler */}
      <div className="flex-1" />

      {/* Controls */}
      <div className="titlebar-no-drag flex items-center gap-0.5">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="w-9 h-9 flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-surface-overlay transition-colors"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>

        <button
          onClick={() => setShowSettings(true)}
          className="w-9 h-9 flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-surface-overlay transition-colors"
          title="Settings"
        >
          <Settings size={14} />
        </button>

        <div className="w-px h-5 bg-[var(--border)] mx-1" />

        <button onClick={() => window.api.minimize()}
          className="w-9 h-9 flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-surface-overlay transition-colors">
          <Minus size={11} />
        </button>
        <button onClick={() => window.api.maximize()}
          className="w-9 h-9 flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-surface-overlay transition-colors">
          <Square size={9} />
        </button>
        <button onClick={() => window.api.close()}
          className="w-9 h-9 flex items-center justify-center rounded text-text-muted hover:text-white hover:bg-red-500 transition-colors">
          <X size={11} />
        </button>
      </div>
    </div>
  )
}
