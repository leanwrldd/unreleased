const { app, BrowserWindow, shell, dialog, Menu, ipcMain } = require('electron')
const { autoUpdater } = require('electron-updater')
const path = require('path')
const fs = require('fs')

const isDev = process.env.NODE_ENV === 'development'

app.setAppUserModelId('Unreleased')
Menu.setApplicationMenu(null)

const logFile = path.join(app.getPath('userData'), 'updater.log')
function log(...args) {
  const line = `[${new Date().toISOString()}] ${args.join(' ')}\n`
  fs.appendFileSync(logFile, line)
  if (isDev) console.log(...args)
}

autoUpdater.logger = { info: log, warn: log, error: log, debug: () => {} }
autoUpdater.autoDownload = true
autoUpdater.autoInstallOnAppQuit = true

const iconPath = path.join(__dirname, 'icon.ico')
const preloadPath = path.join(__dirname, 'preload.js')

let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: '#0a0a0a',
    icon: iconPath,
    frame: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      preload: preloadPath,
    },
    show: false,
  })

  mainWindow.once('ready-to-show', () => mainWindow.show())

  if (isDev) {
    mainWindow.loadURL('http://localhost:3018')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

// IPC: renderer triggers a manual update check
ipcMain.handle('check-for-updates', () => {
  log('Manual update check triggered')
  return autoUpdater.checkForUpdatesAndNotify()
})

ipcMain.handle('minimize-window', () => { mainWindow?.minimize() })
ipcMain.handle('maximize-window', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize()
  else mainWindow?.maximize()
})
ipcMain.handle('close-window', () => { mainWindow?.close() })
ipcMain.handle('is-maximized', () => mainWindow?.isMaximized() ?? false)

app.whenReady().then(() => {
  createWindow()

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

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

autoUpdater.on('checking-for-update', () => log('Checking for update...'))
autoUpdater.on('update-available', (info) => log('Update available:', info.version))
autoUpdater.on('update-not-available', (info) => log('Up to date:', info.version))
autoUpdater.on('download-progress', (p) => log(`Downloading: ${Math.round(p.percent)}%`))

autoUpdater.on('update-downloaded', (info) => {
  log('Update downloaded:', info.version)
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
})
