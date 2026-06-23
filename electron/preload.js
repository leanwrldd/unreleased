const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  // Window controls
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  forceUpdate:     () => ipcRenderer.invoke('force-update'),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow:    () => ipcRenderer.invoke('close-window'),
  isMaximized:    () => ipcRenderer.invoke('is-maximized'),
  platform: process.platform,

  // Local filesystem
  browseLocal: (dirPath) => ipcRenderer.invoke('browse-local', dirPath),
  pickFolder:  ()        => ipcRenderer.invoke('pick-folder'),
  openPath:    (p)       => ipcRenderer.invoke('open-path', p),

  // App settings
  getAppSettings:  ()           => ipcRenderer.invoke('get-app-settings'),
  setAppSetting:   (key, value) => ipcRenderer.invoke('set-app-setting', key, value),

  // Update status events (returns cleanup fn)
  onUpdateStatus: (cb) => {
    const fn = (_, d) => cb(d)
    ipcRenderer.on('update-status', fn)
    return () => ipcRenderer.removeListener('update-status', fn)
  },

  // Download events (returns cleanup fn)
  onDownloadStarted: (cb) => {
    const fn = (_, d) => cb(d)
    ipcRenderer.on('download-started', fn)
    return () => ipcRenderer.removeListener('download-started', fn)
  },
  onDownloadProgress: (cb) => {
    const fn = (_, d) => cb(d)
    ipcRenderer.on('download-progress', fn)
    return () => ipcRenderer.removeListener('download-progress', fn)
  },
  onDownloadDone: (cb) => {
    const fn = (_, d) => cb(d)
    ipcRenderer.on('download-done', fn)
    return () => ipcRenderer.removeListener('download-done', fn)
  },
})
