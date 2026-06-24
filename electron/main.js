const { app, BrowserWindow, shell, dialog, Menu, Tray, ipcMain } = require('electron')
const { autoUpdater } = require('electron-updater')
const path = require('path')
const fs = require('fs')

const isDev = process.env.NODE_ENV === 'development'

app.setAppUserModelId('Unreleased')
Menu.setApplicationMenu(null)

// ── Settings persistence ──────────────────────────────────────────────────────
const settingsPath = path.join(app.getPath('userData'), 'app-settings.json')
let appSettings = {
  downloadPath: app.getPath('downloads'),
  autoDownload: true,
  minimizeToTray: false,
  startupView: 'api-tracker',
}
try {
  const saved = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
  appSettings = { ...appSettings, ...saved }
} catch {}

function saveSettings() {
  try { fs.writeFileSync(settingsPath, JSON.stringify(appSettings, null, 2)) } catch {}
}

// ── Logging ───────────────────────────────────────────────────────────────────
const logFile = path.join(app.getPath('userData'), 'updater.log')
function log(...args) {
  const line = `[${new Date().toISOString()}] ${args.join(' ')}\n`
  fs.appendFileSync(logFile, line)
  if (isDev) console.log(...args)
}

// ── Auto-updater setup ────────────────────────────────────────────────────────
autoUpdater.logger = { info: log, warn: log, error: log, debug: () => {} }
autoUpdater.autoDownload = appSettings.autoDownload
autoUpdater.autoInstallOnAppQuit = true

const iconPath = path.join(__dirname, 'icon.ico')
const preloadPath = path.join(__dirname, 'preload.js')

let mainWindow = null
let tray = null
let isQuitting = false

// ── Tray ──────────────────────────────────────────────────────────────────────
function createTray() {
  try {
    tray = new Tray(iconPath)
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Open Unreleased', click: () => mainWindow?.show() },
      { type: 'separator' },
      { label: 'Quit', click: () => { isQuitting = true; app.quit() } },
    ])
    tray.setToolTip('Unreleased')
    tray.setContextMenu(contextMenu)
    tray.on('click', () => mainWindow?.show())
  } catch (e) {
    log('Tray creation failed:', e.message)
  }
}

// ── Window creation ───────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280, height: 800, minWidth: 960, minHeight: 600,
    backgroundColor: '#0a0a0a', icon: iconPath, frame: false,
    webPreferences: {
      nodeIntegration: false, contextIsolation: true, webSecurity: true, preload: preloadPath,
    },
    show: false,
  })

  mainWindow.once('ready-to-show', () => mainWindow.show())

  mainWindow.on('close', (e) => {
    if (!isQuitting && appSettings.minimizeToTray && tray) {
      e.preventDefault()
      mainWindow.hide()
    }
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:3018')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Track file downloads via session
  mainWindow.webContents.session.on('will-download', (event, item) => {
    const filename = item.getFilename()
    const savePath = path.join(appSettings.downloadPath, filename)
    item.setSavePath(savePath)

    mainWindow.webContents.send('download-started', {
      filename,
      savePath,
      total: item.getTotalBytes(),
    })

    item.on('updated', (_, state) => {
      if (state === 'progressing') {
        const total = item.getTotalBytes()
        mainWindow.webContents.send('download-progress', {
          filename,
          received: item.getReceivedBytes(),
          total,
          percent: total > 0 ? Math.round((item.getReceivedBytes() / total) * 100) : 0,
        })
      }
    })

    item.once('done', (_, state) => {
      mainWindow.webContents.send('download-done', {
        filename,
        state,
        savePath: item.getSavePath(),
      })
    })
  })
}

// ── IPC: window controls ──────────────────────────────────────────────────────

ipcMain.handle('force-update', async () => {
  const https = require('https')
  log('Force update requested')

  function fetchJson(url) {
    return new Promise((resolve, reject) => {
      const opts = new URL(url)
      https.get({ hostname: opts.hostname, path: opts.pathname + opts.search, headers: { 'User-Agent': 'Unreleased-App', 'Accept': 'application/vnd.github+json' } }, (res) => {
        if (res.statusCode === 302 || res.statusCode === 301) return fetchJson(res.headers.location).then(resolve).catch(reject)
        let data = ''
        res.on('data', d => data += d)
        res.on('end', () => { try { resolve(JSON.parse(data)) } catch (e) { reject(e) } })
      }).on('error', reject)
    })
  }

  function downloadFile(url, dest, onProgress) {
    return new Promise((resolve, reject) => {
      function doGet(u) {
        const opts = new URL(u)
        https.get({ hostname: opts.hostname, path: opts.pathname + opts.search, headers: { 'User-Agent': 'Unreleased-App' } }, (res) => {
          if (res.statusCode === 302 || res.statusCode === 301) return doGet(res.headers.location)
          const total = parseInt(res.headers['content-length'] || '0', 10)
          let received = 0
          const out = fs.createWriteStream(dest)
          res.on('data', chunk => {
            received += chunk.length
            if (total > 0) onProgress(Math.round(received / total * 100))
          })
          res.pipe(out)
          out.on('finish', resolve)
          out.on('error', reject)
          res.on('error', reject)
        }).on('error', reject)
      }
      doGet(url)
    })
  }

  try {
    mainWindow?.webContents.send('update-status', { type: 'checking' })
    const release = await fetchJson('https://api.github.com/repos/leanwrldd/unreleased/releases/latest')
    const asset = release.assets.find(a => a.name.endsWith('.exe'))
    if (!asset) throw new Error('No installer found in latest release')

    const tmpPath = path.join(app.getPath('temp'), asset.name)
    log('Force-downloading installer:', asset.name, 'to', tmpPath)
    mainWindow?.webContents.send('update-status', { type: 'downloading', percent: 0, version: release.tag_name.replace(/^v/, '') })

    await downloadFile(asset.browser_download_url, tmpPath, (percent) => {
      mainWindow?.webContents.send('update-status', { type: 'downloading', percent, version: release.tag_name.replace(/^v/, '') })
    })

    log('Force update installer ready:', tmpPath)
    mainWindow?.webContents.send('update-status', { type: 'downloaded', version: release.tag_name.replace(/^v/, '') })

    const { response } = await dialog.showMessageBox(mainWindow, {
      type: 'info',
      buttons: ['Restart & Install', 'Later'],
      defaultId: 0,
      title: 'Update ready',
      message: `Version ${release.tag_name} is ready to install.`,
      detail: 'The app will restart and reinstall.',
    })
    if (response === 0) {
      shell.openPath(tmpPath)
      app.quit()
    }
  } catch (err) {
    log('Force update error:', err.message)
    mainWindow?.webContents.send('update-status', { type: 'error', message: err.message })
    throw err
  }
})

ipcMain.handle('check-for-updates', () => {
  log('Manual update check triggered')
  return autoUpdater.checkForUpdatesAndNotify()
})
ipcMain.handle('minimize-window', () => mainWindow?.minimize())
ipcMain.handle('maximize-window', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize()
  else mainWindow?.maximize()
})
ipcMain.handle('close-window', () => {
  isQuitting = true
  mainWindow?.close()
})
ipcMain.handle('is-maximized', () => mainWindow?.isMaximized() ?? false)

// ── IPC: local file browsing ──────────────────────────────────────────────────
ipcMain.handle('browse-local', async (_, dirPath) => {
  try {
    const target = dirPath || app.getPath('home')
    const st = fs.statSync(target)
    if (!st.isDirectory()) return { error: 'Not a directory', path: target, entries: [] }
    const names = fs.readdirSync(target)
    const entries = []
    for (const name of names) {
      if (name.startsWith('.')) continue
      try {
        const fullPath = path.join(target, name)
        const s = fs.statSync(fullPath)
        entries.push({
          name,
          path: fullPath,
          type: s.isDirectory() ? 'directory' : 'file',
          size: s.isFile() ? s.size : null,
        })
      } catch {}
    }
    entries.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    return { path: target, entries }
  } catch (err) {
    return { error: err.message, path: dirPath || '', entries: [] }
  }
})

ipcMain.handle('pick-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select folder',
  })
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('open-path', (_, p) => shell.openPath(p))

// ── IPC: app settings ─────────────────────────────────────────────────────────
ipcMain.handle('get-app-settings', () => appSettings)

ipcMain.handle('set-app-setting', (_, key, value) => {
  appSettings[key] = value
  saveSettings()
  if (key === 'autoDownload') autoUpdater.autoDownload = value
  return true
})


// ── IPC: library management ───────────────────────────────────────────────────

const AUDIO_EXTS = new Set(['.mp3', '.flac', '.aac', '.m4a', '.ogg', '.opus', '.wav', '.wma', '.aiff', '.ape', '.wv'])

const libraryDataPath = path.join(app.getPath('userData'), 'library-data.json')
const localPlaylistsPath = path.join(app.getPath('userData'), 'local-playlists.json')

function loadLibraryData() {
  try { return JSON.parse(fs.readFileSync(libraryDataPath, 'utf-8')) } catch { return { tracks: [], folders: [], lastScanned: null } }
}
function saveLibraryData(data) {
  try { fs.writeFileSync(libraryDataPath, JSON.stringify(data)) } catch(e) { log('saveLibraryData error:', e.message) }
}
function loadLocalPlaylists() {
  try { return JSON.parse(fs.readFileSync(localPlaylistsPath, 'utf-8')) } catch { return [] }
}
function saveLocalPlaylists(playlists) {
  try { fs.writeFileSync(localPlaylistsPath, JSON.stringify(playlists)) } catch(e) { log('saveLocalPlaylists error:', e.message) }
}

ipcMain.handle('load-library-data', () => loadLibraryData())
ipcMain.handle('save-library-data', (_, data) => { saveLibraryData(data); return true })
ipcMain.handle('load-local-playlists', () => loadLocalPlaylists())
ipcMain.handle('save-local-playlists', (_, playlists) => { saveLocalPlaylists(playlists); return true })

ipcMain.handle('scan-library', async (_, folders) => {
  let mm
  try { mm = require('music-metadata') } catch(e) { return { error: 'music-metadata not installed: ' + e.message, tracks: [] } }

  const tracks = []
  const errors = []

  async function scanDir(dirPath) {
    let entries
    try { entries = fs.readdirSync(dirPath, { withFileTypes: true }) } catch { return }
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue
      const fullPath = path.join(dirPath, entry.name)
      if (entry.isDirectory()) {
        await scanDir(fullPath)
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase()
        if (!AUDIO_EXTS.has(ext)) continue
        try {
          const metadata = await mm.parseFile(fullPath, { duration: true, skipCovers: true })
          const common = metadata.common
          const format = metadata.format
          const stat = fs.statSync(fullPath)
          tracks.push({
            id: 'local-' + fullPath,
            filePath: fullPath,
            ext: ext.slice(1),
            title: common.title || entry.name.replace(/\.[^.]+$/, ''),
            artist: (common.artists || []).join(', ') || common.artist || '',
            album: common.album || '',
            albumArtist: common.albumartist || '',
            year: common.year || null,
            trackNumber: common.track?.no || null,
            discNumber: common.disk?.no || null,
            composer: (common.composer || []).join(', '),
            genre: (common.genre || []).join(', '),
            duration: format.duration || 0,
            bitrate: format.bitrate ? Math.round(format.bitrate / 1000) : null,
            sampleRate: format.sampleRate || null,
            fileSize: stat.size,
            lastModified: stat.mtimeMs,
            hasAlbumArt: (common.picture && common.picture.length > 0) ? true : false,
            addedAt: Date.now(),
            // Not included: albumArt base64 (loaded on-demand), lyrics
          })
        } catch(e) {
          errors.push({ path: fullPath, error: e.message })
        }
      }
    }
  }

  for (const folder of folders) {
    await scanDir(folder)
  }

  return { tracks, errors }
})

ipcMain.handle('read-album-art', async (_, filePath) => {
  let mm
  try { mm = require('music-metadata') } catch { return null }
  try {
    const metadata = await mm.parseFile(filePath, { skipCovers: false, duration: false })
    const pic = metadata.common.picture?.[0]
    if (!pic) return null
    const b64 = Buffer.from(pic.data).toString('base64')
    return `data:${pic.format};base64,${b64}`
  } catch { return null }
})

ipcMain.handle('read-track-metadata', async (_, filePath) => {
  let mm
  try { mm = require('music-metadata') } catch { return null }
  try {
    const metadata = await mm.parseFile(filePath, { skipCovers: false, duration: true })
    const common = metadata.common
    const format = metadata.format
    const pic = common.picture?.[0]
    const albumArt = pic ? `data:${pic.format};base64,${Buffer.from(pic.data).toString('base64')}` : null
    return {
      title: common.title || '',
      artist: (common.artists || []).join(', ') || common.artist || '',
      album: common.album || '',
      albumArtist: common.albumartist || '',
      year: common.year || null,
      trackNumber: common.track?.no || null,
      discNumber: common.disk?.no || null,
      composer: (common.composer || []).join(', '),
      genre: (common.genre || []).join(', '),
      lyrics: common.lyrics?.[0]?.text || '',
      syncedLyrics: common.lyrics?.find(l => l.syncText)?.syncText?.map(s => `[${formatTime(s.timestamp)}]${s.text}`).join('\n') || '',
      albumArt,
      bitrate: format.bitrate ? Math.round(format.bitrate / 1000) : null,
      sampleRate: format.sampleRate || null,
      duration: format.duration || 0,
    }
  } catch(e) { return { error: e.message } }
})

function formatTime(ms) {
  const total = Math.floor(ms / 1000)
  const min = Math.floor(total / 60).toString().padStart(2, '0')
  const sec = (total % 60).toString().padStart(2, '0')
  const msRem = (ms % 1000).toString().padStart(3, '0')
  return `${min}:${sec}.${msRem}`
}

ipcMain.handle('write-track-metadata', async (_, filePath, metadata) => {
  const ext = path.extname(filePath).toLowerCase()
  if (ext !== '.mp3') return { error: 'Only MP3 metadata writing is supported currently' }
  let NodeID3
  try { NodeID3 = require('node-id3') } catch { return { error: 'node-id3 not installed' } }
  try {
    const tags = {}
    if (metadata.title !== undefined) tags.title = metadata.title
    if (metadata.artist !== undefined) tags.artist = metadata.artist
    if (metadata.album !== undefined) tags.album = metadata.album
    if (metadata.albumArtist !== undefined) tags.performerInfo = metadata.albumArtist
    if (metadata.year !== undefined) tags.year = metadata.year != null ? String(metadata.year) : ''
    if (metadata.trackNumber !== undefined) tags.trackNumber = metadata.trackNumber != null ? String(metadata.trackNumber) : ''
    if (metadata.composer !== undefined) tags.composer = metadata.composer
    if (metadata.genre !== undefined) tags.genre = metadata.genre
    if (metadata.lyrics !== undefined) tags.unsynchronisedLyrics = { language: 'eng', text: metadata.lyrics }
    if (metadata.albumArtBase64 !== undefined && metadata.albumArtBase64) {
      // albumArtBase64 is a data URL: "data:<mime>;base64,<data>"
      const match = metadata.albumArtBase64.match(/^data:([^;]+);base64,(.+)$/)
      if (match) {
        tags.image = {
          mime: match[1],
          type: { id: 3, name: 'front cover' },
          description: 'Cover',
          imageBuffer: Buffer.from(match[2], 'base64'),
        }
      }
    }
    const result = NodeID3.update(tags, filePath)
    if (result === false) return { error: 'Failed to write tags' }
    return { success: true }
  } catch(e) { return { error: e.message } }
})

ipcMain.handle('open-discord-login', (_, authorizeUrl) => {
  return new Promise((resolve) => {
    const loginWin = new BrowserWindow({
      width: 520, height: 720,
      parent: mainWindow || undefined,
      modal: false,
      title: 'Log in with Discord',
      webPreferences: { nodeIntegration: false, contextIsolation: true },
    })
    loginWin.setMenu(null)
    loginWin.loadURL(authorizeUrl)

    const CALLBACK_HOST = 'player.juicewrldapi.com'
    const CALLBACK_PATH = '/auth/discord/callback'

    const intercept = (_, url) => {
      try {
        const parsed = new URL(url)
        if (parsed.hostname === CALLBACK_HOST && parsed.pathname === CALLBACK_PATH) {
          const code = parsed.searchParams.get('code')
          const state = parsed.searchParams.get('state')
          loginWin.close()
          resolve(code && state ? { code, state } : null)
        }
      } catch {}
    }

    loginWin.webContents.on('will-navigate', intercept)
    loginWin.webContents.on('will-redirect', intercept)
    loginWin.on('closed', () => resolve(null))
  })
})

ipcMain.handle('select-image-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }],
    title: 'Select album art',
  })
  if (result.canceled || !result.filePaths[0]) return null
  try {
    const buf = fs.readFileSync(result.filePaths[0])
    const ext = path.extname(result.filePaths[0]).toLowerCase()
    const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg'
    return `data:${mime};base64,${buf.toString('base64')}`
  } catch { return null }
})

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow()
  createTray()

  if (!isDev) {
    mainWindow.once('ready-to-show', () => {
      log('Checking for updates on startup...')
      autoUpdater.checkForUpdatesAndNotify().catch(err => log('checkForUpdates error:', err.message))
    })
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', () => { isQuitting = true })

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ── Auto-updater events ───────────────────────────────────────────────────────
autoUpdater.on('checking-for-update', () => {
  log('Checking for update...')
  mainWindow?.webContents.send('update-status', { type: 'checking' })
})

autoUpdater.on('update-available', (info) => {
  log('Update available:', info.version)
  mainWindow?.webContents.send('update-status', { type: 'available', version: info.version })
})

autoUpdater.on('update-not-available', (info) => {
  log('Up to date:', info.version)
  mainWindow?.webContents.send('update-status', { type: 'not-available', version: info.version })
})

autoUpdater.on('download-progress', (p) => {
  log(`Downloading update: ${Math.round(p.percent)}%`)
  mainWindow?.webContents.send('update-status', {
    type: 'downloading',
    percent: Math.round(p.percent),
    bytesPerSecond: Math.round(p.bytesPerSecond),
  })
})

autoUpdater.on('update-downloaded', (info) => {
  log('Update downloaded:', info.version)
  mainWindow?.webContents.send('update-status', { type: 'downloaded', version: info.version })
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Update ready',
    message: `Unreleased ${info.version} has been downloaded.`,
    detail: 'Restart the app to apply the update.',
    buttons: ['Restart now', 'Later'],
    defaultId: 0,
  }).then(({ response }) => {
    if (response === 0) autoUpdater.quitAndInstall()
  })
})

autoUpdater.on('error', (err) => {
  log('Auto-updater error:', err.message)
  mainWindow?.webContents.send('update-status', { type: 'error', message: err.message })
})
