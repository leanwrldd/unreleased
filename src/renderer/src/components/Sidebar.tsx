import { SearchCode, HardDrive, Settings, Github, MessageCircle, Archive, ShieldCheck, PenLine, Heart, ListMusic, LogIn, LogOut } from 'lucide-react'
import logo from '../assets/logo.png'
import { useStore } from '../store/useStore'
import { ViewType } from '../types'

export default function Sidebar(): JSX.Element {
  const { activeView, setActiveView, setShowSettings, account, logoutAccount, setShowUserAuth } = useStore()
  const isAdmin = !!account?.is_administrator

  const items: { icon: React.ReactNode; label: string; view: ViewType }[] = [
    { icon: <SearchCode size={18} />, label: 'Tracker', view: 'api-tracker' },
    { icon: <Archive size={18} />, label: 'Compilation', view: 'compilation' },
    { icon: <HardDrive size={18} />, label: 'Files', view: 'api-files' },
    { icon: <Heart size={18} />, label: 'Liked Songs', view: 'liked' },
    { icon: <ListMusic size={18} />, label: 'Playlists', view: 'playlists' },
    { icon: <PenLine size={18} />, label: 'Contribute', view: 'editor' },
  ]

  return (
    <aside className="hidden md:flex flex-col h-full bg-sidebar w-60 shrink-0 border-r border-[var(--border)]">
      <div className="px-5 pt-6 pb-4">
        <div className="flex flex-col items-center gap-1">
          <img src={logo} alt="unreleased" className="h-32 w-auto object-contain" />
          <span
            className="text-text-primary text-sm uppercase select-none"
            style={{ fontFamily: "'Josefin Sans', sans-serif", fontWeight: 300, letterSpacing: '0.35em' }}
          >
            unreleased
          </span>
        </div>
      </div>

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

      <div className="px-3 pb-4 space-y-1">
        {account ? (
          <div className="flex items-center gap-2 px-3 py-2 rounded text-sm">
            {account.discord_avatar ? (
              <img src={account.discord_avatar} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-semibold shrink-0">
                {(account.display_name || account.discord_username || '?').charAt(0).toUpperCase()}
              </div>
            )}
            <span className="flex-1 min-w-0 truncate text-text-secondary">{account.display_name || account.discord_username}</span>
            <button onClick={() => logoutAccount()} title="Log out" className="text-text-muted hover:text-text-primary transition-colors shrink-0">
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowUserAuth(true)}
            className="flex items-center gap-3 w-full px-3 py-2 rounded text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors"
          >
            <LogIn size={18} />
            <span>Log in</span>
          </button>
        )}
        {isAdmin && (
          <button
            onClick={() => setActiveView('admin')}
            className={`flex items-center gap-3 w-full px-3 py-2 rounded text-sm font-medium transition-colors ${
              activeView === 'admin'
                ? 'bg-surface-raised text-text-primary'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised'
            }`}
          >
            <ShieldCheck size={18} />
            <span>Admin</span>
          </button>
        )}
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
        <a
          href="https://discord.gg/qq7DMNkBJ4"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 w-full px-3 py-2 rounded text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors"
        >
          <MessageCircle size={18} />
          <span>Discord</span>
        </a>
      </div>
    </aside>
  )
}
