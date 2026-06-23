const { app, BrowserWindow, shell, dialog, ipcMain } = require('electron')
const { autoUpdater } = require('electron-updater')
const path = require('path')

const isDev = process.env.NODE_ENV === 'development'

// Silence auto-updater logs in prod; enable in dev for debugging
autoUpdater.logger = isDev ? console : null
autoUpdater.autoDownload = true
autoUpdater.autoInstallOnAppQuit = true

let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: '#0a0a0a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false,
  })

  mainWindow.once('ready-to-show', () => mainWindow.show())

  if (isDev) {
    mainWindow.loadURL('http://localhost:3018')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // Open target="_blank" links in the system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

app.whenReady().then(() => {
  createWindow()

  // Check for updates after window is ready (skip in dev)
  if (!isDev) {
    mainWindow.once('ready-to-show', () => {
      autoUpdater.checkForUpdatesAndNotify()
    })
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// --- Auto-updater events ---

autoUpdater.on('update-available', () => {
  // Update is downloading silently in the background
})

autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Update ready',
    message: 'A new version of Unreleased has been downloaded.',
    detail: 'Restart the app to apply the update.',
    buttons: ['Restart now', 'Later'],
    defaultId: 0,
  }).then(({ response }) => {
    if (response === 0) autoUpdater.quitAndInstall()
  })
})

autoUpdater.on('error', (err) => {
  // Silently ignore update errors — don't interrupt the user
  if (isDev) console.error('Auto-updater error:', err)
})
