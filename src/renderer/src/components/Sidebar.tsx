import React, { useState, useEffect } from 'react'
import { SearchCode, HardDrive, Settings, ShieldCheck, ListMusic, Library, LogIn, LogOut, ChevronLeft, ChevronRight } from 'lucide-react'
import logo from '../assets/logo.png'
import { useStore } from '../store/useStore'
import { ViewType } from '../types'

const LS_COLLAPSED = 'sidebar:collapsed'

export default function Sidebar(): JSX.Element {
  const { activeView, setActiveView, setShowSettings, account, logoutAccount, setShowUserAuth } = useStore()
  const isElectron = navigator.userAgent.includes('Electron')
  const isAdmin = !!account?.is_administrator

  const [collapsed, setCollapsed] = useState<boolean>(
    () => localStorage.getItem(LS_COLLAPSED) === 'true'
  )
  // showExpanded trails collapsed: hides immediately on collapse, appears
  // after ~120ms on expand so content doesn't pop in before the sidebar widens.
  const [showExpanded, setShowExpanded] = useState<boolean>(!collapsed)

  useEffect(() => {
    if (collapsed) {
      setShowExpanded(false)
    } else {
      const t = setTimeout(() => setShowExpanded(true), 120)
      return () => clearTimeout(t)
    }
  }, [collapsed])

  const toggle = (): void => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem(LS_COLLAPSED, String(next))
  }

  const items: { icon: React.ReactNode; label: string; view: ViewType }[] = [
    { icon: <SearchCode size={18} />, label: 'Tracker', view: 'api-tracker' },
    { icon: <HardDrive size={18} />, label: 'Files', view: 'api-files' },
    ...(isElectron ? [{ icon: <Library size={18} />, label: 'Library', view: 'library' as const }] : []),
    { icon: <ListMusic size={18} />, label: 'Playlists', view: 'playlists' },
    { icon: <img src={logo} alt="WRLD" className="w-[22px] h-[22px] object-contain" />, label: 'WRLD', view: 'wrld' },
  ]

  return (
    <aside
      className={`hidden md:flex flex-col h-full bg-sidebar shrink-0 border-r border-[var(--border)] transition-all duration-200 ${collapsed ? 'w-16' : 'w-60'}`}
    >
      {isElectron && (
        <div className="shrink-0 h-7 w-full select-none" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} />
      )}
      {/* Logo */}
      <div className={`pt-5 pb-4 flex flex-col items-center gap-1 shrink-0 ${collapsed ? 'px-2' : 'px-5'}`}>
        <img src={logo} alt="unreleased" className={`object-contain transition-all ${collapsed ? 'h-8 w-8' : 'h-32 w-auto'}`} />
        {showExpanded && (
          <span
            className="text-text-primary text-sm uppercase select-none"
            style={{ fontFamily: "'Josefin Sans', sans-serif", fontWeight: 300, letterSpacing: '0.35em' }}
          >
            unreleased
          </span>
        )}
      </div>

      {/* Nav items */}
      <nav className={`space-y-1 flex-1 ${collapsed ? 'px-2' : 'px-3'}`}>
        {items.map(({ icon, label, view }) => (
          <button
            key={view}
            onClick={() => {
              if (activeView === view && view === 'playlists') {
                window.dispatchEvent(new CustomEvent('playlists:back'))
              } else {
                setActiveView(view)
              }
            }}
            title={collapsed ? label : undefined}
            className={`flex items-center w-full py-2 rounded text-sm font-medium transition-colors ${collapsed ? 'justify-center px-2' : 'gap-3 px-3'} ${
              activeView === view
                ? 'bg-surface-raised text-text-primary'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised'
            }`}
          >
            {icon}
            {showExpanded && <span className="flex-1 text-left">{label}</span>}
          </button>
        ))}
      </nav>

      {/* Bottom section */}
      <div className={`pb-4 space-y-1 ${collapsed ? 'px-2' : 'px-3'}`}>
        {account ? (
          <div className={`flex items-center py-2 rounded text-sm ${collapsed ? 'justify-center px-2' : 'gap-3 px-3'}`}>
            <button
              onClick={() => setActiveView('editor-profile')}
              title={collapsed ? (account.display_name || account.discord_username) : undefined}
              className={`flex items-center gap-3 min-w-0 flex-1 cursor-pointer hover:opacity-80 transition-opacity ${collapsed ? 'justify-center' : ''}`}
            >
              {account.discord_avatar ? (
                <img src={account.discord_avatar} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center text-[10px] font-semibold shrink-0">
                  {(account.display_name || account.discord_username || '?').charAt(0).toUpperCase()}
                </div>
              )}
              {showExpanded && (
                <span className="min-w-0 truncate text-text-secondary text-sm font-medium">{account.display_name || account.discord_username}</span>
              )}
            </button>
            {showExpanded && (
              <button onClick={() => logoutAccount()} title="Log out" className="text-text-muted hover:text-text-primary transition-colors shrink-0">
                <LogOut size={16} />
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={() => setShowUserAuth(true)}
            title={collapsed ? 'Log in' : undefined}
            className={`flex items-center w-full py-2 rounded text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors ${collapsed ? 'justify-center px-2' : 'gap-3 px-3'}`}
          >
            <LogIn size={18} />
            {showExpanded && <span>Log in</span>}
          </button>
        )}
        {isAdmin && (
          <button
            onClick={() => setActiveView('admin')}
            title={collapsed ? 'Admin' : undefined}
            className={`flex items-center w-full py-2 rounded text-sm font-medium transition-colors ${collapsed ? 'justify-center px-2' : 'gap-3 px-3'} ${
              activeView === 'admin'
                ? 'bg-surface-raised text-text-primary'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised'
            }`}
          >
            <ShieldCheck size={18} />
            {showExpanded && <span>Admin</span>}
          </button>
        )}
        <button
          onClick={() => setShowSettings(true)}
          title={collapsed ? 'Settings' : undefined}
          className={`flex items-center w-full py-2 rounded text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors ${collapsed ? 'justify-center px-2' : 'gap-3 px-3'}`}
        >
          <Settings size={18} />
          {showExpanded && <span>Settings</span>}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={toggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={`flex items-center w-full py-2 rounded text-sm font-medium text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors ${collapsed ? 'justify-center px-2' : 'gap-3 px-3'}`}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          {showExpanded && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  )
}
