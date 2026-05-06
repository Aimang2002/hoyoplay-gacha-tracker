const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')

if (app.isPackaged) {
  app.setPath('userData', path.join(path.dirname(process.execPath), 'data'))
  app.setPath('cache', path.join(path.dirname(process.execPath), 'data', 'cache'))
}
const { initDB, closeDB, getAccounts, upsertAccount, upsertIcons, insertGachaRecords, getLatestRecordId, getExistingIds, getGachaStats, getTimeline, getIconMap, updateSyncTime, getGachaCountByType, getGachaCountByRank, getPullPosition, getCurrentPity, getAllOrderedIds } = require('./db')
const { parsePlayerLog } = require('./parser')
const { fetchAllGachaRecords, fetchWikiIcons, fetchUidFromApi, GACHA_TYPES } = require('./api')

let mainWindow

const BASE_WIDTH = 1280
const BASE_HEIGHT = 860

function updateZoom() {
  if (!mainWindow || mainWindow.isDestroyed()) return
  const [w, h] = mainWindow.getSize()
  const scale = Math.min(w / BASE_WIDTH, h / BASE_HEIGHT)
  mainWindow.webContents.setZoomFactor(Math.max(0.5, Math.min(2.0, scale)))
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: BASE_WIDTH,
    height: BASE_HEIGHT,
    minWidth: 1024,
    minHeight: 700,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    icon: path.join(__dirname, '..', 'build', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
  })

  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-state-changed', 'maximized')
    updateZoom()
  })
  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-state-changed', 'normal')
    updateZoom()
  })
  mainWindow.on('resize', updateZoom)

  if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
  mainWindow.webContents.on('did-finish-load', updateZoom)
}

app.whenReady().then(async () => {
  await initDB()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  closeDB()
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.handle('parse-log', async () => {
  return parsePlayerLog()
})

ipcMain.handle('sync-data', async (event) => {
  try {
    const authParams = parsePlayerLog()
    if (authParams.error) return { error: authParams.error }

    let uid = await fetchUidFromApi(authParams)

    if (uid) {
      upsertAccount(uid, authParams.authkey, authParams.region, authParams.game_biz)
    }

    const gachaTypes = Object.keys(GACHA_TYPES).map(Number)
    const results = {}

    for (const gachaType of gachaTypes) {
      try {
        const existingIds = uid ? getExistingIds(uid, gachaType) : new Set()

        const records = await fetchAllGachaRecords(authParams, gachaType, (type, page, count) => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('sync-progress', {
              gachaType: type,
              poolName: GACHA_TYPES[type],
              page,
              count,
            })
          }
        }, existingIds)

        if (records.length > 0) {
          if (!uid) {
            uid = records[0].uid
            upsertAccount(uid, authParams.authkey, authParams.region, authParams.game_biz)
          }
          insertGachaRecords(records)
        }

        results[gachaType] = records.length
      } catch (e) {
        results[gachaType] = { error: e.message }
      }
    }

    if (uid) {
      updateSyncTime(uid)
    }

    try {
      const icons = await fetchWikiIcons()
      upsertIcons(icons)
    } catch (e) {
      console.error('图标同步失败:', e.message)
    }

    return { uid, results }
  } catch (e) {
    return { error: e.message }
  }
})

ipcMain.handle('sync-icons', async () => {
  try {
    const icons = await fetchWikiIcons()
    upsertIcons(icons)
    return { count: icons.length }
  } catch (e) {
    return { error: e.message }
  }
})

ipcMain.handle('get-accounts', async () => {
  return getAccounts()
})

ipcMain.handle('get-gacha-stats', async (event, uid, gachaType, minRank) => {
  const stats = getGachaStats(uid, gachaType, minRank || 3)
  const iconMap = getIconMap()
  return stats.map(s => ({ ...s, icon: iconMap[s.item_name] || null }))
})

ipcMain.handle('get-timeline', async (event, uid, gachaType, minRank) => {
  const items = getTimeline(uid, gachaType, minRank || 4)
  const iconMap = getIconMap()

  const allIds = getAllOrderedIds(uid, gachaType)
  const idIndexMap = new Map()
  for (let i = 0; i < allIds.length; i++) {
    idIndexMap.set(allIds[i].id, i)
  }

  const lastIndexByRank = {}
  const result = []
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const entry = {
      ...item,
      icon: iconMap[item.item_name] || null,
      pullsSinceLast: null,
    }

    const currentIndex = idIndexMap.get(item.id)
    const rankKey = item.rank_type
    if (currentIndex !== undefined && lastIndexByRank[rankKey] !== undefined) {
      entry.pullsSinceLast = currentIndex - lastIndexByRank[rankKey]
    }
    if (currentIndex !== undefined) {
      lastIndexByRank[rankKey] = currentIndex
    }

    result.push(entry)
  }

  result.reverse()
  return result
})

ipcMain.handle('get-icon-map', async () => {
  return getIconMap()
})

ipcMain.handle('get-gacha-count', async (event, uid, gachaType) => {
  const total = getGachaCountByType(uid, gachaType)
  const sCount = getGachaCountByRank(uid, gachaType, 4)
  const aCount = getGachaCountByRank(uid, gachaType, 3)
  const bCount = getGachaCountByRank(uid, gachaType, 2)
  return { total, sCount, aCount, bCount }
})

ipcMain.handle('get-current-pity', async (event, uid, gachaType, minRank) => {
  return getCurrentPity(uid, gachaType, minRank || 4)
})

ipcMain.handle('window-minimize', () => mainWindow.minimize())
ipcMain.handle('window-maximize', () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow.maximize()
  }
})
ipcMain.handle('window-close', () => mainWindow.close())
