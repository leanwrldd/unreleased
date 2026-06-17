import { LayoutDashboard, SearchCode, Radio, HardDrive, Settings } from 'lucide-react'
import { useStore } from '../store/useStore'
import { ViewType } from '../types'

export default function BottomNav(): JSX.Element {
  const { activeView, setActiveView, setShowSettings } = useStore()

  const items: { icon: React.ReactNode; label: string; view: ViewType }[] = [
    { icon: <LayoutDashboard size={22} />, label: 'Categories', view: 'api-categories' },
    { icon: <SearchCode size={22} />, label: 'Tracker', view: 'api-tracker' },
    { icon: <Radio size={22} />, label: 'Radio', view: 'api-radio' },
    { icon: <HardDrive size={22} />, label: 'Files', view: 'api-files' },
  ]

  return (
    <nav className="md:hidden flex items-stretch bg-sidebar shrink-0" style={{ borderTop: '1px solid var(--border)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      {items.map(({ icon, label, view }) => {
        const active = activeView === view
        return (
          <button
            key={view}
            onClick={() => setActiveView(view)}
            className="flex-1 flex flex-col items-center justify-center py-2.5 gap-1 transition-colors relative overflow-hidden"
            style={{ color: active ? 'var(--accent)' : undefined }}
          >
            {/* Active indicator line at top */}
            {active && (
              <span
                className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                style={{ background: 'var(--accent)' }}
              />
            )}
            <span className={active ? '' : 'text-text-muted'}>{icon}</span>
            <span
              className="text-[10px] font-semibold leading-none w-full text-center truncate px-0.5"
              style={{ color: active ? 'var(--accent)' : undefined }}
            >
              {label}
            </span>
          </button>
        )
      })}
      <button
        onClick={() => setShowSettings(true)}
        className="flex-1 flex flex-col items-center justify-center py-2.5 gap-1 text-text-muted transition-colors overflow-hidden"
      >
        <Settings size={22} />
        <span className="text-[10px] font-semibold leading-none w-full text-center truncate px-0.5">Settings</span>
      </button>
    </nav>
  )
}
