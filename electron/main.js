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
