import { useEffect } from 'react'
import { useStore } from './store/useStore'
import { ViewType } from './types'
import { onAuthStateChange, getSession, getProfile } from './lib/supabase'

function getViewFromPath(pathname: string): ViewType {
  if (pathname.startsWith('/files')) return 'api-files'
  if (pathname === '/categories') return 'api-categories'
  if (pathname === '/radio') return 'api-radio'
  if (pathname === '/editor') return 'editor'
  if (pathname === '/compilation') return 'compilation'
  if (pathname === '/admin') return 'admin'
  return 'api-tracker'
}

import Sidebar from './components/Sidebar'
import BottomNav from './components/BottomNav'
import ApiTrackerView from './components/ApiTrackerView'
import ApiRadioView from './components/ApiRadioView'
import ApiFilesView from './components/ApiFilesView'
import ApiCategoryView from './components/ApiCategoryView'
import ApiCompilationView from './components/ApiCompilationView'
import EditorPage from './components/EditorPage'
import AdminPage from './components/AdminPage'
import Player from './components/Player'
import NowPlaying from './components/NowPlaying'
import QueuePanel from './components/QueuePanel'
import Settings from './components/Settings'
import ErrorBoundary from './components/ErrorBoundary'

function hexToRgb(hex: string): [number, number, number] {
  const num = parseInt(hex.replace('#', ''), 16)
  return [(num >> 16) & 0xff, (num >> 8) & 0xff, num & 0xff]
}

function lightenHex(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex)
  return `#${Math.min(255, r + amount).toString(16).padStart(2, '0')}${Math.min(255, g + amount).toString(16).padStart(2, '0')}${Math.min(255, b + amount).toString(16).padStart(2, '0')}`
}

export default function App(): JSX.Element {
  const { showNowPlaying, showQueue, showSettings, activeView, theme, accentColor, setSession, setUserProfile } = useStore()

  // Sync view from URL on mount + handle back/forward
  useEffect(() => {
    const syncFromPath = (): void => {
      useStore.setState({ activeView: getViewFromPath(window.location.pathname) })
    }
    syncFromPath()
    window.addEventListener('popstate', syncFromPath)
    return () => window.removeEventListener('popstate', syncFromPath)
  }, [])

  // Auth state listener
  useEffect(() => {
    // Load existing session on mount
    getSession().then(async (session) => {
      setSession(session)
      if (session) {
        const profile = await getProfile(session.user.id)
        setUserProfile(profile)
      }
    })

    // Listen for auth changes
    const unsubscribe = onAuthStateChange(async (session) => {
      setSession(session)
      if (session) {
        const profile = await getProfile(session.user.id)
        setUserProfile(profile)
      } else {
        setUserProfile(null)
      }
    })
    return unsubscribe
  }, [setSession, setUserProfile])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  useEffect(() => {
    const [r, g, b] = hexToRgb(accentColor)
    const hover = lightenHex(accentColor, 20)
    const [hr, hg, hb] = hexToRgb(hover)
    document.documentElement.style.setProperty('--accent', accentColor)
    document.documentElement.style.setProperty('--accent-rgb', `${r} ${g} ${b}`)
    document.documentElement.style.setProperty('--accent-hover', hover)
    document.documentElement.style.setProperty('--accent-hover-rgb', `${hr} ${hg} ${hb}`)
  }, [accentColor])

  return (
    <div className="flex flex-col h-dvh bg-surface overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden flex">
          <ErrorBoundary>
            {activeView === 'api-tracker' ? <ApiTrackerView />
              : activeView === 'api-radio' ? <ApiRadioView />
              : activeView === 'api-files' ? <ApiFilesView />
              : activeView === 'api-categories' ? <ApiCategoryView />
              : activeView === 'editor' ? <EditorPage />
              : activeView === 'compilation' ? <ApiCompilationView />
              : activeView === 'admin' ? <AdminPage />
              : <ApiTrackerView />}
          </ErrorBoundary>
          {showNowPlaying && <ErrorBoundary><NowPlaying /></ErrorBoundary>}
          {showQueue && <ErrorBoundary><QueuePanel /></ErrorBoundary>}
        </main>
      </div>
      <Player />
      <BottomNav />
      {showSettings && <Settings />}
    </div>
  )
}
