import { app, shell, BrowserWindow, ipcMain, dialog, protocol, net } from 'electron'
import { join, extname, basename } from 'path'
import { promises as fs, existsSync } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'

// Dynamic import for ESM-only packages
let parseFile: (path: string) => Promise<import('music-metadata').IAudioMetadata>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let NodeID3: any

async function loadModules(): Promise<void> {
  const mm = await import('music-metadata')
  parseFile = mm.parseFile
  NodeID3 = (await import('node-id3')).default
}

const ALL_SUPPORTED_EXTENSIONS = new Set(['.mp3', '.flac', '.wav', '.m4a', '.ogg', '.aac', '.opus'])

interface ScanFilters {
  extensions?: string[]
  minDuration?: number
  excludeFolders?: string[]
}

function getDataPath(filename: string): string {
  return join(app.getPath('userData'), filename)
}

// --- Window ------------------------------------------------------------------

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    frame: false,
    icon: join(__dirname, process.platform === 'win32' ? '../../resources/icon.ico' : '../../resources/icon.png'),
    backgroundColor: '#121212',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow.show())

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('Renderer process gone:', details.reason, details.exitCode)
    if (details.reason !== 'clean-exit') setTimeout(() => mainWindow.reload(), 500)
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// --- App lifecycle -----------------------------------------------------------

app.whenReady().then(async () => {
  await loadModules()

  protocol.handle('music', (request) => {
    const filePath = decodeURIComponent(request.url.replace('music://', ''))
    return net.fetch(`file:///${filePath}`)
  })

  electronApp.setAppUserModelId('com.musicplayer')
  app.on('browser-window-created', (_, window) => optimizer.watchWindowShortcuts(window))

  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// --- IPC: Dialog -------------------------------------------------------------

ipcMain.handle('dialog:openFolder', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('dialog:openFiles', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Audio Files', extensions: ['mp3', 'flac', 'wav', 'm4a', 'ogg', 'aac', 'opus'] }]
  })
  return result.canceled ? [] : result.filePaths
})

ipcMain.handle('dialog:openImage', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'bmp'] }]
  })
  if (result.canceled) return null
  const imgPath = result.filePaths[0]
  const data = await fs.readFile(imgPath)
  const imgExt = extname(imgPath).toLowerCase()
  const mimeMap: Record<string, string> = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.png': 'image/png', '.webp': 'image/webp', '.bmp': 'image/bmp'
  }
  return `data:${mimeMap[imgExt] || 'image/jpeg'};base64,${data.toString('base64')}`
})

// Export cover art — renderer converts to PNG first, then sends data URI here
ipcMain.handle('track:exportCoverArt', async (_event, pngDataUri: string, trackTitle: string) => {
  const result = await dialog.showSaveDialog({
    title: 'Export Cover Art',
    defaultPath: `${trackTitle.replace(/[/\\?%*:|"<>]/g, '_')} - Cover Art.png`,
    filters: [{ name: 'PNG Image', extensions: ['png'] }]
  })
  if (result.canceled || !result.filePath) return null
  const commaIdx = pngDataUri.indexOf(',')
  const b64 = pngDataUri.substring(commaIdx + 1)
  await fs.writeFile(result.filePath, Buffer.from(b64, 'base64'))
  return result.filePath
})

// --- IPC: Library scan -------------------------------------------------------

ipcMain.handle('library:scan', async (_event, folderPaths: string | string[], filters?: ScanFilters) => {
  const folders = Array.isArray(folderPaths) ? folderPaths : [folderPaths]
  const tracks: TrackInfo[] = []
  for (const folder of folders) await scanDir(folder, tracks, filters)
  return tracks
})

ipcMain.handle('library:addFiles', async (_event, filePaths: string[]) => {
  const tracks: TrackInfo[] = []
  for (const filePath of filePaths) {
    const ext = extname(filePath).toLowerCase()
    if (!ALL_SUPPORTED_EXTENSIONS.has(ext)) continue
    try {
      const meta = await parseFile(filePath)
      const common = meta.common
      tracks.push({
        id: Buffer.from(filePath).toString('base64'),
        path: filePath,
        title: common.title || basename(filePath, ext),
        artist: common.artist || 'Unknown Artist',
        album: common.album || 'Unknown Album',
        albumArtist: common.albumartist || common.artist || 'Unknown Artist',
        year: common.year || null,
        trackNumber: common.track?.no || null,
        duration: meta.format.duration || 0,
        genre: common.genre?.[0] || '',
        hasAlbumArt: (common.picture?.length ?? 0) > 0
      })
    } catch { /* skip */ }
  }
  return tracks
})

interface TrackInfo {
  id: string; path: string; title: string; artist: string; album: string
  albumArtist: string; year: number | null; trackNumber: number | null
  duration: number; genre: string; hasAlbumArt: boolean
}

async function scanDir(dir: string, results: TrackInfo[], filters?: ScanFilters): Promise<void> {
  let entries: string[]
  try { entries = await fs.readdir(dir) } catch { return }

  const allowedExts = filters?.extensions?.length
    ? new Set(filters.extensions)
    : ALL_SUPPORTED_EXTENSIONS
  const excludeFolders = filters?.excludeFolders || []
  const minDuration = filters?.minDuration || 0

  for (const entry of entries) {
    const fullPath = join(dir, entry)
    let stat
    try { stat = await fs.stat(fullPath) } catch { continue }

    if (stat.isDirectory()) {
      const dirName = entry.toLowerCase()
      if (excludeFolders.some((ex) => dirName.includes(ex.toLowerCase()))) continue
      await scanDir(fullPath, results, filters)
    } else if (allowedExts.has(extname(entry).toLowerCase())) {
      try {
        const meta = await parseFile(fullPath)
        const common = meta.common
        results.push({
          id: Buffer.from(fullPath).toString('base64'),
          path: fullPath,
          title: common.title || basename(entry, extname(entry)),
          artist: common.artist || 'Unknown Artist',
          album: common.album || 'Unknown Album',
          albumArtist: common.albumartist || common.artist || 'Unknown Artist',
          year: common.year || null,
          trackNumber: common.track?.no || null,
          duration: meta.format.duration || 0,
          genre: common.genre?.[0] || '',
          hasAlbumArt: (common.picture?.length ?? 0) > 0
        })
        // Apply min duration filter after reading metadata
        const last = results[results.length - 1]
        if (last && minDuration > 0 && last.duration < minDuration) results.pop()
      } catch { /* skip */ }
    }
  }
}

// --- IPC: Album art (fast path for MP3 via node-id3) -------------------------

const albumArtCache = new Map<string, string | null>()

ipcMain.handle('track:getAlbumArt', async (_event, filePath: string) => {
  if (albumArtCache.has(filePath)) return albumArtCache.get(filePath) ?? null

  const ext = extname(filePath).toLowerCase()
  try {
    if (ext === '.mp3') {
      // Fast path: node-id3 reads only the ID3 header, not the audio data
      const tags = NodeID3.read(filePath)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const img = tags.image as any
      if (img?.imageBuffer) {
        const art = `data:${img.mime || 'image/jpeg'};base64,${img.imageBuffer.toString('base64')}`
        albumArtCache.set(filePath, art)
        return art
      }
      albumArtCache.set(filePath, null)
      return null
    } else {
      const meta = await parseFile(filePath)
      const pic = meta.common.picture?.[0]
      const art = pic ? `data:${pic.format};base64,${Buffer.from(pic.data).toString('base64')}` : null
      albumArtCache.set(filePath, art)
      return art
    }
  } catch {
    albumArtCache.set(filePath, null)
    return null
  }
})

// --- IPC: Metadata -----------------------------------------------------------

// Convert LRC text → SYLT synchronisedText array (timestamps in ms)
function lrcToSylt(lrc: string): Array<{ text: string; timeStamp: number }> {
  const result: Array<{ text: string; timeStamp: number }> = []
  for (const line of lrc.split('\n')) {
    const m = line.match(/^\[(\d{1,2}):(\d{2})\.(\d{2,3})\](.*)/)
    if (!m) continue
    const [, mm, ss, frac, text] = m
    const ms = parseInt(mm) * 60000 + parseInt(ss) * 1000 +
      (frac.length === 2 ? parseInt(frac) * 10 : parseInt(frac))
    result.push({ text: text.trim(), timeStamp: ms })
  }
  return result
}

// Convert SYLT synchronisedText array → LRC text
function syltToLrc(lines: Array<{ text: string; timeStamp: number }>): string {
  const result: string[] = []
  for (const { text, timeStamp } of lines) {
    const mm = Math.floor(timeStamp / 60000).toString().padStart(2, '0')
    const ss = Math.floor((timeStamp % 60000) / 1000).toString().padStart(2, '0')
    const cs = Math.floor((timeStamp % 1000) / 10).toString().padStart(2, '0')
    const prefix = `[${mm}:${ss}.${cs}]`
    // Some taggers embed multiple lines in a single SYLT entry — expand them
    for (const sub of text.split(/\r?\n/)) {
      result.push(`${prefix}${sub}`)
    }
  }
  return result.join('\n')
}

// Extract unsynced lyrics (USLT) from music-metadata result
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractUnsyncedLyrics(meta: any): string | null {
  const common = meta.common
  if (common.lyrics?.length) {
    const tag = common.lyrics[0]
    // music-metadata returns either a plain string or { language, text }
    if (typeof tag === 'string' && tag.trim()) return tag
    if (typeof tag?.text === 'string' && tag.text.trim()) return tag.text
  }
  // Native USLT fallback for tricky encodings / non-standard frames
  for (const key of ['ID3v2.4', 'ID3v2.3', 'ID3v2.2']) {
    const frames = meta.native[key]
    if (!frames) continue
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const uslt = frames.find((f: any) => f.id === 'USLT')
    if (uslt?.value) {
      const text = typeof uslt.value === 'string' ? uslt.value : uslt.value.text ?? null
      if (text?.trim()) return text
    }
  }
  return null
}

ipcMain.handle('track:getMetadata', async (_event, filePath: string) => {
  try {
    const meta = await parseFile(filePath)
    const common = meta.common
    let albumArtBase64: string | null = null

    if (common.picture?.length) {
      const pic = common.picture[0]
      albumArtBase64 = `data:${pic.format};base64,${Buffer.from(pic.data).toString('base64')}`
    }

    const unsyncedLyrics = extractUnsyncedLyrics(meta)

    // Synced lyrics: read SYLT frame (MP3 only — standard ID3 embedded)
    let syncedLyrics: string | null = null
    if (extname(filePath).toLowerCase() === '.mp3') {
      const id3 = NodeID3.read(filePath)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sylt = (id3.synchronisedLyrics as any)?.[0]
      if (sylt?.synchronisedText?.length) {
        syncedLyrics = syltToLrc(sylt.synchronisedText)
      }
    }

    // Standard tags: producer = TCOM (composer), notes = COMM (comment)
    const producer: string | null = common.composer?.[0] ?? null
    let notes: string | null = null
    if (common.comment?.length) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const c = common.comment[0] as any
      notes = (typeof c?.text === 'string' ? c.text : typeof c === 'string' ? c : null) || null
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!notes) notes = (common as any).description ?? null

    // File size
    let fileSize: number | undefined
    try {
      const stat = await fs.stat(filePath)
      fileSize = stat.size
    } catch (_) {}

    return {
      albumArt: albumArtBase64,
      title: common.title || basename(filePath, extname(filePath)),
      artist: common.artist || 'Unknown Artist',
      album: common.album || 'Unknown Album',
      albumArtist: common.albumartist || common.artist || 'Unknown Artist',
      year: common.year || null,
      trackNumber: common.track?.no || null,
      genre: common.genre?.[0] || '',
      duration: meta.format.duration || 0,
      lyrics: unsyncedLyrics,
      syncedLyrics,
      producer,
      notes,
      ext: extname(filePath).toLowerCase(),
      sampleRate: meta.format.sampleRate,
      bitrate: meta.format.bitrate,
      bitsPerSample: meta.format.bitsPerSample,
      channels: meta.format.numberOfChannels,
      fileSize
    }
  } catch (err) {
    return { error: String(err) }
  }
})

ipcMain.handle('track:writeMetadata', async (_event, filePath: string, tags: Record<string, unknown>) => {
  const ext = extname(filePath).toLowerCase()
  try {
    if (ext === '.mp3') {
      const id3Tags: Record<string, unknown> = {}
      if (tags.title !== undefined) id3Tags.title = tags.title
      if (tags.artist !== undefined) id3Tags.artist = tags.artist
      if (tags.album !== undefined) id3Tags.album = tags.album
      if (tags.year !== undefined) id3Tags.year = tags.year ? String(tags.year) : ''
      if (tags.genre !== undefined) id3Tags.genre = tags.genre
      if (tags.trackNumber !== undefined) id3Tags.trackNumber = tags.trackNumber ? String(tags.trackNumber) : ''

      // Unsynced lyrics → USLT
      if (tags.lyrics !== undefined) {
        id3Tags.unsynchronisedLyrics = tags.lyrics
          ? { language: 'eng', text: tags.lyrics as string }
          : ''
      }

      // Standard fields: producer → TCOM, notes → COMM
      if (tags.producer !== undefined) id3Tags.composer = (tags.producer as string) || ''
      if (tags.notes !== undefined) {
        id3Tags.comment = tags.notes ? { language: 'eng', text: tags.notes as string } : ''
      }

      // Cover art → APIC
      if (tags.coverArt) {
        const dataUri = tags.coverArt as string
        const commaIdx = dataUri.indexOf(',')
        if (commaIdx !== -1) {
          const header = dataUri.substring(0, commaIdx)
          const b64data = dataUri.substring(commaIdx + 1)
          const mime = (header.split(':')[1] || 'image/jpeg').split(';')[0]
          id3Tags.image = { mime, type: { id: 3 }, description: 'Cover', imageBuffer: Buffer.from(b64data, 'base64') }
          albumArtCache.delete(filePath)
        }
      }

      // Synced lyrics → SYLT (standard synchronized lyrics frame)
      if (tags.syncedLyrics !== undefined) {
        if (tags.syncedLyrics) {
          id3Tags.synchronisedLyrics = [{
            language: 'eng',
            timeStampFormat: 2, // milliseconds
            contentType: 1,     // lyrics
            synchronisedText: lrcToSylt(tags.syncedLyrics as string)
          }]
        } else {
          id3Tags.synchronisedLyrics = []
        }
      }

      // NodeID3.update() has a bug where it silently keeps existing SYLT frames
      // instead of replacing them. Read existing tags, merge, then write fresh.
      const existing = NodeID3.read(filePath)
      const merged = { ...existing, ...id3Tags }
      NodeID3.write(merged, filePath)
    }

    return { success: true }
  } catch (err) {
    return { error: String(err) }
  }
})

// --- IPC: Lyrics search -------------------------------------------------------

ipcMain.handle('track:searchLyrics', async (_event, query: string, paths: string[]) => {
  const q = query.toLowerCase().trim()
  if (!q || !paths.length) return []
  const results: string[] = []
  for (const filePath of paths) {
    try {
      const meta = await parseFile(filePath)
      const lyrics = extractUnsyncedLyrics(meta)
      if (lyrics && lyrics.toLowerCase().includes(q)) {
        results.push(filePath)
      }
    } catch { /* skip unreadable files */ }
  }
  return results
})

// --- IPC: Provider ping ------------------------------------------------------

ipcMain.handle('provider:ping', async (_event, url: string) => {
  return new Promise<{ online: boolean; statusCode?: number }>((resolve) => {
    try {
      const request = net.request({ url, method: 'HEAD' })
      const timer = setTimeout(() => {
        resolve({ online: false })
        try { request.abort() } catch { /* ignore */ }
      }, 5000)
      request.on('response', (response) => {
        clearTimeout(timer)
        // Treat anything below 500 as "online" (even 404 means the server is up)
        resolve({ online: (response.statusCode ?? 0) < 500, statusCode: response.statusCode })
      })
      request.on('error', () => {
        clearTimeout(timer)
        resolve({ online: false })
      })
      request.end()
    } catch {
      resolve({ online: false })
    }
  })
})

// --- IPC: Crash log ----------------------------------------------------------

ipcMain.handle('crash:log', async (_event, message: string, stack: string) => {
  try {
    const logPath = join(app.getPath('logs'), 'crash.log')
    const timestamp = new Date().toISOString()
    const entry = `\n[${ timestamp }]\n${ message }\n${ stack }\n${'─'.repeat(80)}\n`
    await fs.appendFile(logPath, entry, 'utf-8')
    return { ok: true, path: logPath }
  } catch (e) {
    return { ok: false }
  }
})

// --- IPC: File browser -------------------------------------------------------

ipcMain.handle('fs:readDir', async (_event, dirPath: string) => {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    const MEDIA_EXTS = new Set([
      '.mp3', '.flac', '.wav', '.m4a', '.ogg', '.aac', '.opus', '.wma', '.alac', // audio
      '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.avif',                  // image
      '.mp4', '.mov', '.webm', '.m4v', '.mkv', '.avi',                            // video
    ])
    const result: { name: string; path: string; isDir: boolean }[] = []
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue // skip hidden
      const fullPath = join(dirPath, entry.name)
      if (entry.isDirectory()) {
        result.push({ name: entry.name, path: fullPath, isDir: true })
      } else if (entry.isFile()) {
        const ext = extname(entry.name).toLowerCase()
        if (MEDIA_EXTS.has(ext)) result.push({ name: entry.name, path: fullPath, isDir: false })
      }
    }
    // Sort: dirs first, then files, each group alphabetically
    result.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    return { ok: true, entries: result }
  } catch (e) {
    return { ok: false, entries: [], error: String(e) }
  }
})

ipcMain.handle('fs:homeDir', () => app.getPath('home'))

// --- IPC: File download ------------------------------------------------------

ipcMain.handle('file:download', async (_event, url: string, destDir: string | undefined, filename: string) => {
  try {
    const dir = destDir || app.getPath('downloads')
    // Ensure directory exists
    await fs.mkdir(dir, { recursive: true })
    const dest = join(dir, filename)
    const response = await net.fetch(url)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const buffer = await response.arrayBuffer()
    await fs.writeFile(dest, Buffer.from(buffer))
    return { ok: true, path: dest }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
})

// --- IPC: Persistence --------------------------------------------------------

ipcMain.handle('store:get', async (_event, key: string) => {
  try {
    const storePath = getDataPath('store.json')
    if (!existsSync(storePath)) return null
    const raw = await fs.readFile(storePath, 'utf-8')
    const data = JSON.parse(raw)
    return data[key] ?? null
  } catch {
    return null
  }
})

ipcMain.handle('store:set', async (_event, key: string, value: unknown) => {
  try {
    const storePath = getDataPath('store.json')
    let data: Record<string, unknown> = {}
    if (existsSync(storePath)) {
      try { data = JSON.parse(await fs.readFile(storePath, 'utf-8')) } catch { /* start fresh */ }
    }
    data[key] = value
    await fs.writeFile(storePath, JSON.stringify(data, null, 2), 'utf-8')
    return true
  } catch {
    return false
  }
})

// --- IPC: Window controls ----------------------------------------------------

// --- IPC: App info -----------------------------------------------------------

ipcMain.handle('app:getVersion', async () => {
  try {
    const storePath = getDataPath('store.json')
    if (existsSync(storePath)) {
      const data = JSON.parse(await fs.readFile(storePath, 'utf-8'))
      if (data.customVersion) return data.customVersion
    }
  } catch { /* fall through */ }
  return app.getVersion()
})

ipcMain.handle('app:isDev', () => !app.isPackaged)

ipcMain.handle('app:setVersion', async (_event, version: string) => {
  if (app.isPackaged) return { error: 'Cannot set version in production' }
  try {
    const pkgPath = join(app.getAppPath(), 'package.json')
    const raw = await fs.readFile(pkgPath, 'utf-8')
    const pkg = JSON.parse(raw)
    pkg.version = version
    await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8')
    // Also persist to store so the new version shows immediately without restart
    const storePath = getDataPath('store.json')
    let storeData: Record<string, unknown> = {}
    if (existsSync(storePath)) {
      try { storeData = JSON.parse(await fs.readFile(storePath, 'utf-8')) } catch { /* start fresh */ }
    }
    storeData.customVersion = version
    await fs.writeFile(storePath, JSON.stringify(storeData, null, 2), 'utf-8')
    return { ok: true }
  } catch (e) {
    return { error: String(e) }
  }
})

// --- IPC: Window controls ----------------------------------------------------

ipcMain.handle('window:minimize', () => {
  BrowserWindow.getFocusedWindow()?.minimize()
})

ipcMain.handle('window:maximize', () => {
  const win = BrowserWindow.getFocusedWindow()
  if (win?.isMaximized()) win.unmaximize()
  else win?.maximize()
})

ipcMain.handle('window:close', () => {
  BrowserWindow.getFocusedWindow()?.close()
})
