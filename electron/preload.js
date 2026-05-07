const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  parseLog: (game) => ipcRenderer.invoke('parse-log', game),
  syncData: (game) => ipcRenderer.invoke('sync-data', game),
  syncIcons: (game) => ipcRenderer.invoke('sync-icons', game),
  getAccounts: (game) => ipcRenderer.invoke('get-accounts', game),
  getGachaStats: (uid, gachaType, minRank, game) => ipcRenderer.invoke('get-gacha-stats', uid, gachaType, minRank, game),
  getTimeline: (uid, gachaType, minRank, game) => ipcRenderer.invoke('get-timeline', uid, gachaType, minRank, game),
  getIconMap: (game) => ipcRenderer.invoke('get-icon-map', game),
  getGachaCount: (uid, gachaType, game) => ipcRenderer.invoke('get-gacha-count', uid, gachaType, game),
  getCurrentPity: (uid, gachaType, minRank, game) => ipcRenderer.invoke('get-current-pity', uid, gachaType, minRank, game),
  getConsecutiveLosses: (uid, gachaType, game) => ipcRenderer.invoke('get-consecutive-losses', uid, gachaType, game),

  onSyncProgress: (callback) => {
    const handler = (event, data) => callback(data)
    ipcRenderer.on('sync-progress', handler)
    return () => ipcRenderer.removeListener('sync-progress', handler)
  },
  onWindowStateChanged: (callback) => {
    const handler = (event, state) => callback(state)
    ipcRenderer.on('window-state-changed', handler)
    return () => ipcRenderer.removeListener('window-state-changed', handler)
  },

  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
})
