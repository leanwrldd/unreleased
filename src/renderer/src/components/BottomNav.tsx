import { LayoutDashboard, SearchCode, Radio, HardDrive, Settings } from 'lucide-react'
import { useStore } from '../store/useStore'
import { ViewType } from '../types'

export default function BottomNav(): JSX.Element {
  const { activeView, setActiveView, setShowSettings } = useStore()

  const items: { icon: React.ReactNode; label: string; view: ViewType }[] = [
    { icon: <LayoutDashboard size={20} />, label: 'Categories', view: 'api-categories' },
    { icon: <SearchCode size={20} />, label: 'Tracker', view: 'api-tracker' },
    { icon: <Radio size={20} />, label: 'Radio', view: 'api-radio' },
    { icon: <HardDrive size={20} />, label: 'Files', view: 'api-files' },
  ]

  return (
    <nav className="md:hidden flex items-stretch border-t border-[var(--border)] bg-sidebar shrink-0">
      {items.map(({ icon, label, view }) => (
        <button
          key={view}
          onClick={() => setActiveView(view)}
          className={`flex-1 flex flex-col items-center justify-center py-2 gap-1 transition-colors ${
            activeView === view ? 'text-accent' : 'text-text-muted hover:text-text-primary'
          }`}
        >
          {icon}
          <span className="text-[10px] font-medium leading-none">{label}</span>
        </button>
      ))}
      <button
        onClick={() => setShowSettings(true)}
        className="flex-1 flex flex-col items-center justify-center py-2 gap-1 text-text-muted hover:text-text-primary transition-colors"
      >
        <Settings size={20} />
        <span className="text-[10px] font-medium leading-none">Settings</span>
      </button>
    </nav>
  )
}
