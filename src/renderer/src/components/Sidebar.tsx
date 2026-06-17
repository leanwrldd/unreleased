import { LayoutDashboard, SearchCode, Radio, HardDrive, Settings, Github } from 'lucide-react'
import logo from '../assets/logo.png'
import { useStore } from '../store/useStore'
import { ViewType } from '../types'

export default function Sidebar(): JSX.Element {
  const { activeView, setActiveView, setShowSettings } = useStore()

  const items: { icon: React.ReactNode; label: string; view: ViewType }[] = [
    { icon: <LayoutDashboard size={18} />, label: 'Categories', view: 'api-categories' },
    { icon: <SearchCode size={18} />, label: 'Tracker', view: 'api-tracker' },
    { icon: <Radio size={18} />, label: 'Radio', view: 'api-radio' },
    { icon: <HardDrive size={18} />, label: 'Files', view: 'api-files' },
  ]

  return (
    <aside className="hidden md:flex flex-col h-full bg-sidebar w-60 shrink-0 border-r border-[var(--border)]">
      {/* Logo */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-2">
          <img src={logo} alt="unreleased" className="h-16 w-auto object-contain" />
          <span className="font-bold text-text-primary text-lg tracking-[0.08em]">unreleased</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="px-3 space-y-1 flex-1">
        {items.map(({ icon, label, view }) => (
          <button
            key={view}
            onClick={() => setActiveView(view)}
            className={`flex items-center gap-3 w-full px-3 py-2 rounded text-sm font-medium transition-colors ${
              activeView === view
                ? 'bg-surface-raised text-text-primary'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised'
            }`}
          >
            {icon}
            <span className="flex-1 text-left">{label}</span>
          </button>
        ))}
      </nav>

      {/* Bottom: Settings + GitHub */}
      <div className="px-3 pb-4 space-y-1">
        <button
          onClick={() => setShowSettings(true)}
          className="flex items-center gap-3 w-full px-3 py-2 rounded text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors"
        >
          <Settings size={18} />
          <span>Settings</span>
        </button>
        <a
          href="https://github.com/leanwrldd/unreleased"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 w-full px-3 py-2 rounded text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors"
        >
          <Github size={18} />
          <span>GitHub</span>
        </a>
      </div>
    </aside>
  )
}
