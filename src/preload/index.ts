import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  // Dialog
  openFolder: (): Promise<string | null> => ipcRenderer.invoke('dialog:openFolder'),
  openFiles: (): Promise<string[]> => ipcRenderer.invoke('dialog:openFiles'),
  openImage: (): Promise<string | null> => ipcRenderer.invoke('dialog:openImage'),

  // Library
  scanLibrary: (folderPaths: string | string[], filters?: ScanFilters): Promise<TrackInfo[]> =>
    ipcRenderer.invoke('library:scan', folderPaths, filters),
  addFiles: (filePaths: string[]): Promise<TrackInfo[]> =>
    ipcRenderer.invoke('library:addFiles', filePaths),

  // Track metadata
  getMetadata: (filePath: string): Promise<FullMetadata> =>
    ipcRenderer.invoke('track:getMetadata', filePath),
  getAlbumArt: (filePath: string): Promise<string | null> =>
    ipcRenderer.invoke('track:getAlbumArt', filePath),
  writeMetadata: (filePath: string, tags: Partial<EditableTags>): Promise<{ success?: boolean; error?: string }> =>
    ipcRenderer.invoke('track:writeMetadata', filePath, tags),
  exportCoverArt: (pngDataUri: string, trackTitle: string): Promise<string | null> =>
    ipcRenderer.invoke('track:exportCoverArt', pngDataUri, trackTitle),
  getFileUrl: (filePath: string): Promise<string> =>
    ipcRenderer.invoke('track:getFileUrl', filePath),

  // Persistence
  storeGet: <T>(key: string): Promise<T | null> => ipcRenderer.invoke('store:get', key),
  storeSet: (key: string, value: unknown): Promise<boolean> =>
    ipcRenderer.invoke('store:set', key, value),

  // App
  getVersion: (): Promise<string> => ipcRenderer.invoke('app:getVersion'),
  isDev: (): Promise<boolean> => ipcRenderer.invoke('app:isDev'),
  setVersion: (version: string): Promise<{ ok?: boolean; error?: string }> =>
    ipcRenderer.invoke('app:setVersion', version),

  // Lyrics search
  searchLyrics: (query: string, paths: string[]): Promise<string[]> =>
    ipcRenderer.invoke('track:searchLyrics', query, paths),

  // Provider ping
  pingProvider: (url: string): Promise<{ online: boolean; statusCode?: number }> =>
    ipcRenderer.invoke('provider:ping', url),

  // Crash log
  logCrash: (message: string, stack: string): Promise<{ ok: boolean; path?: string }> =>
    ipcRenderer.invoke('crash:log', message, stack),

  // File browser
  readDir: (dirPath: string): Promise<{ ok: boolean; entries: { name: string; path: string; isDir: boolean }[]; error?: string }> =>
    ipcRenderer.invoke('fs:readDir', dirPath),
  homeDir: (): Promise<string> =>
    ipcRenderer.invoke('fs:homeDir'),

  // File download (API files)
  downloadFile: (url: string, destDir: string | undefined, filename: string): Promise<{ ok: boolean; path?: string; error?: string }> =>
    ipcRenderer.invoke('file:download', url, destDir, filename),

  // Window
  minimize: (): Promise<void> => ipcRenderer.invoke('window:minimize'),
  maximize: (): Promise<void> => ipcRenderer.invoke('window:maximize'),
  close: (): Promise<void> => ipcRenderer.invoke('window:close')
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}

export interface ScanFilters {
  extensions: string[]
  minDuration: number
  excludeFolders: string[]
}

export interface TrackInfo {
  id: string; path: string; title: string; artist: string; album: string
  albumArtist: string; year: number | null; trackNumber: number | null
  duration: number; genre: string; hasAlbumArt: boolean
}

export interface FullMetadata extends TrackInfo {
  albumArt: string | null; lyrics: string | null; syncedLyrics: string | null
  producer: string | null; notes: string | null
  ext: string; error?: string
}

export interface EditableTags {
  title: string; artist: string; album: string; albumArtist: string
  year: number | null; trackNumber: number | null; genre: string
  producer: string | null; notes: string | null
  lyrics: string | null; syncedLyrics: string | null; coverArt?: string | null
}
