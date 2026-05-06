const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  parseLog: () => ipcRenderer.invoke('parse-log'),
  syncData: () => ipcRenderer.invoke('sync-data'),
  syncIcons: () => ipcRenderer.invoke('sync-icons'),
  getAccounts: () => ipcRenderer.invoke('get-accounts'),
  getGachaStats: (uid, gachaType, minRank) => ipcRenderer.invoke('get-gacha-stats', uid, gachaType, minRank),
  getTimeline: (uid, gachaType, minRank) => ipcRenderer.invoke('get-timeline', uid, gachaType, minRank),
  getIconMap: () => ipcRenderer.invoke('get-icon-map'),
  getGachaCount: (uid, gachaType) => ipcRenderer.invoke('get-gacha-count', uid, gachaType),
  getCurrentPity: (uid, gachaType, minRank) => ipcRenderer.invoke('get-current-pity', uid, gachaType, minRank),

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
