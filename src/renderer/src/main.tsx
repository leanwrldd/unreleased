import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { StatusBar, Style } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'

// Capacitor native init — only runs inside the native app shell
const _isCapacitor = typeof (window as any).Capacitor !== 'undefined'
if (_isCapacitor) {
  // Global error overlay — shows the real crash info in WKWebView
  const _showCapError = (msg: string): void => {
    const el = document.createElement('div')
    el.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:#0a0a0a;color:#ff4444;padding:20px;font-family:monospace;font-size:11px;white-space:pre-wrap;overflow:auto;z-index:99999'
    el.textContent = msg
    document.body?.appendChild(el)
  }
  window.onerror = (_msg, src, line, _col, err) => {
    _showCapError(`JS ERROR\n${err?.message ?? _msg}\n${src}:${line}\n\n${err?.stack ?? ''}`)
    return false
  }
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason
    _showCapError(`UNHANDLED REJECTION\n${r?.message ?? String(r)}\n\n${r?.stack ?? ''}`)
  })

  StatusBar.setStyle({ style: Style.Dark }).catch(() => {})
  StatusBar.setBackgroundColor({ color: '#000000' }).catch(() => {})
  SplashScreen.hide({ fadeOutDuration: 300 }).catch(() => {})
}

declare global {
  interface Window {
    api: {
      openFolder: () => Promise<string | null>
      openFiles: () => Promise<string[]>
      openImage: () => Promise<string | null>
      scanLibrary: (folderPaths: string | string[], filters?: unknown) => Promise<import('./types').Track[]>
      addFiles: (filePaths: string[]) => Promise<import('./types').Track[]>
      getMetadata: (filePath: string) => Promise<import('./types').FullTrack>
      getAlbumArt: (filePath: string) => Promise<string | null>
      writeMetadata: (filePath: string, tags: Record<string, unknown>) => Promise<{ success?: boolean; error?: string }>
      exportCoverArt: (pngDataUri: string, trackTitle: string) => Promise<string | null>
      getFileUrl: (filePath: string) => Promise<string>
      storeGet: <T>(key: string) => Promise<T | null>
      storeSet: (key: string, value: unknown) => Promise<boolean>
      getVersion: () => Promise<string>
      isDev: () => Promise<boolean>
      setVersion: (version: string) => Promise<{ ok?: boolean; error?: string }>
      searchLyrics: (query: string, paths: string[]) => Promise<string[]>
      pingProvider: (url: string) => Promise<{ online: boolean; statusCode?: number }>
      logCrash: (message: string, stack: string) => Promise<{ ok: boolean; path?: string }>
      readDir: (dirPath: string) => Promise<{ ok: boolean; entries: { name: string; path: string; isDir: boolean }[]; error?: string }>
      homeDir: () => Promise<string>
      minimize: () => Promise<void>
      maximize: () => Promise<void>
      close: () => Promise<void>
    }
  }
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
