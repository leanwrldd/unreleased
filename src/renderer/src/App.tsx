import { useEffect } from 'react'
import { useStore } from './store/useStore'
import { ViewType } from './types'
import { apiFetch, songToTrack, JWApiPaginatedResponse } from './lib/juicewrldApi'

function getViewFromPath(pathname: string): ViewType {
  if (pathname.startsWith('/files')) return 'api-files'
  if (pathname === '/categories') return 'api-categories'
  if (pathname === '/editor') return 'editor'
  if (pathname === '/compilation') return 'compilation'
  if (pathname === '/admin') return 'admin'
  if (pathname === '/liked') return 'liked'
  if (pathname === '/playlists') return 'playlists'
  if (pathname.startsWith('/shared/')) return 'shared-playlist'
  return 'api-tracker'
}

import Sidebar from './components/Sidebar'
import BottomNav from './components/BottomNav'
import ApiTrackerView from './components/ApiTrackerView'
import ApiFilesView from './components/ApiFilesView'
import ApiCategoryView from './components/ApiCategoryView'
import ApiCompilationView from './components/ApiCompilationView'
import EditorPage from './components/EditorPage'
import AdminPage from './components/AdminPage'
import LikedSongsView from './components/LikedSongsView'
import PlaylistsView from './components/PlaylistsView'
import SharedPlaylistView from './components/SharedPlaylistView'
import UserAuthModal from './components/UserAuthModal'
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
  const { showNowPlaying, showQueue, showSettings, activeView, theme, accentColor, loadAccount, completeDiscordLogin, showUserAuth, setShowUserAuth } = useStore()
  const queueIndex = useStore((s) => s.queueIndex)
  const queueLength = useStore((s) => s.queue.length)
  const shuffle = useStore((s) => s.shuffle)

  // Auto-fetch next queue page.
  // Linear mode:  load when fewer than 15 songs remain ahead of the current position.
  // Shuffle mode: load until the pool has 150+ songs so random picks have real variety.
  useEffect(() => {
    const { queueFilter, queue, queueIndex: qi, shuffle: isShuffle } = useStore.getState()
    if (!queueFilter || !queueFilter.hasMore) return

    const shouldLoad = isShuffle
      ? queue.length < 150
      : queue.length - (qi + 1) < 15
    if (!shouldLoad) return

    let cancelled = false
    apiFetch<JWApiPaginatedResponse>('/songs/', {
      searchall: queueFilter.search || undefined,
      category: queueFilter.category || undefined,
      era: queueFilter.era || undefined,
      page: queueFilter.page,
      page_size: 50,
    }).then((data) => {
      if (cancelled) return
      const newTracks = data.results.filter((s) => !!s.path).map(songToTrack)
      useStore.setState((s) => ({
        queue: [...s.queue, ...newTracks],
        queueFilter: s.queueFilter
          ? { ...s.queueFilter, page: s.queueFilter.page + 1, hasMore: data.next !== null }
          : null,
      }))
    }).catch(() => {})
    return () => { cancelled = true }
  }, [queueIndex, queueLength, shuffle])

  // Sync view from URL on mount + handle back/forward
  useEffect(() => {
    const syncFromPath = (): void => {
      useStore.setState({ activeView: getViewFromPath(window.location.pathname) })
    }
    syncFromPath()
    window.addEventListener('popstate', syncFromPath)
    return () => window.removeEventListener('popstate', syncFromPath)
  }, [])

  // Complete Discord OAuth redirect, then load the public account
  useEffect(() => {
    if (window.location.pathname === '/auth/discord/callback') {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      const state = params.get('state')
      const finish = (): void => {
        window.history.replaceState({}, '', '/tracker')
        useStore.setState({ activeView: 'api-tracker' })
      }
      if (code && state) {
        completeDiscordLogin(code, state).catch(() => undefined).finally(finish)
      } else {
        finish()
      }
      return
    }
    loadAccount()
  }, [loadAccount, completeDiscordLogin])

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
              : activeView === 'api-files' ? <ApiFilesView />
              : activeView === 'api-categories' ? <ApiCategoryView />
              : activeView === 'editor' ? <EditorPage />
              : activeView === 'compilation' ? <ApiCompilationView />
              : activeView === 'admin' ? <AdminPage />
              : activeView === 'liked' ? <LikedSongsView />
              : activeView === 'playlists' ? <PlaylistsView />
              : activeView === 'shared-playlist' ? <SharedPlaylistView />
              : <ApiTrackerView />}
          </ErrorBoundary>
          {showNowPlaying && <ErrorBoundary><NowPlaying /></ErrorBoundary>}
          {showQueue && <ErrorBoundary><QueuePanel /></ErrorBoundary>}
        </main>
      </div>
      <Player />
      <BottomNav />
      {showSettings && <Settings />}
      {showUserAuth && <UserAuthModal onClose={() => setShowUserAuth(false)} />}
    </div>
  )
}
