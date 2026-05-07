const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')

if (app.isPackaged) {
  app.setPath('userData', path.join(path.dirname(process.execPath), 'data'))
  app.setPath('cache', path.join(path.dirname(process.execPath), 'data', 'cache'))
}
const { initDB, closeDB, getAccounts, upsertAccount, upsertIcons, insertGachaRecords, getExistingIds, getGachaStats, getTimeline, getIconMap, updateSyncTime, getGachaCountByType, getGachaCountByRank, getCurrentPity, getAllOrderedIds } = require('./db')
const { getParser } = require('./parsers')
const { fetchAllGachaRecords, fetchWikiIcons, fetchUidFromApi } = require('./api')
const { GAMES } = require('./config')

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

ipcMain.handle('parse-log', async (event, game = 'zzz') => {
  const parser = getParser(game)
  return parser.parseLog()
})

ipcMain.handle('sync-data', async (event, game = 'zzz') => {
  console.log('[Main] sync-data: 开始同步, game:', game)
  try {
    await new Promise(r => setTimeout(r, 500))

    const parser = getParser(game)
    const authParams = parser.parseLog()
    console.log('[Main] sync-data: parseLog结果 - error:', authParams.error || '无', 'game_biz:', authParams.game_biz, 'region:', authParams.region)
    if (authParams.error) return { error: authParams.error }

    const parsedUrl = new URL(authParams.url)
    const authkey = parsedUrl.searchParams.get('authkey') || ''

    const gameConfig = GAMES[game] || GAMES.zzz
    console.log('[Main] sync-data: 开始获取UID...')
    let uid = await fetchUidFromApi(authParams)
    console.log('[Main] sync-data: 获取到UID:', uid)

    if (uid) {
      upsertAccount(uid, authkey, authParams.region, authParams.game_biz, game)
    }

    const gachaTypes = Object.keys(gameConfig.pools).map(Number)
    console.log('[Main] sync-data: 卡池类型:', gachaTypes)
    const results = {}

    for (const gachaType of gachaTypes) {
      console.log('[Main] sync-data: 开始拉取卡池:', gachaType, gameConfig.pools[gachaType])
      try {
        const existingIds = uid ? getExistingIds(uid, gachaType, game) : new Set()
        console.log('[Main] sync-data: 卡池', gachaType, '已有记录数:', existingIds.size)

        const records = await fetchAllGachaRecords(authParams, gachaType, (type, page, count) => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('sync-progress', {
              gachaType: type,
              poolName: gameConfig.pools[type] || type,
              page,
              count,
            })
          }
        }, existingIds)

        if (records.length > 0) {
          if (!uid) {
            uid = records[0].uid
            upsertAccount(uid, authkey, authParams.region, authParams.game_biz, game)
          }
          insertGachaRecords(records, game)
        }

        results[gachaType] = records.length
        console.log('[Main] sync-data: 卡池', gachaType, '完成, 新记录数:', records.length)
      } catch (e) {
        console.error('[Main] sync-data: 卡池', gachaType, '失败:', e.message)
        results[gachaType] = { error: e.message }
      }

      await new Promise(r => setTimeout(r, 2000))
    }

    if (uid) {
      updateSyncTime(uid, game)
    }

    try {
      const icons = await fetchWikiIcons(game)
      upsertIcons(icons, game)
    } catch (e) {
      console.error('图标同步失败:', e.message)
    }

    console.log('[Main] sync-data: 同步完成, uid:', uid, 'results:', JSON.stringify(results))
    return { uid, results }
  } catch (e) {
    console.error('[Main] sync-data: 同步异常:', e.message)
    return { error: e.message }
  }
})

ipcMain.handle('sync-icons', async (event, game = 'zzz') => {
  try {
    const icons = await fetchWikiIcons(game)
    upsertIcons(icons, game)
    return { count: icons.length }
  } catch (e) {
    return { error: e.message }
  }
})

ipcMain.handle('get-accounts', async (event, game = 'zzz') => {
  return getAccounts(game)
})

ipcMain.handle('get-gacha-stats', async (event, uid, gachaType, minRank, game = 'zzz') => {
  const stats = getGachaStats(uid, gachaType, minRank || 3, game)
  const iconMap = getIconMap(game)
  return stats.map(s => ({ ...s, icon: iconMap[s.item_name] || null }))
})

ipcMain.handle('get-timeline', async (event, uid, gachaType, minRank, game = 'zzz') => {
  const items = getTimeline(uid, gachaType, minRank || 4, game)
  const iconMap = getIconMap(game)

  const allIds = getAllOrderedIds(uid, gachaType, game)
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

ipcMain.handle('get-icon-map', async (event, game = 'zzz') => {
  return getIconMap(game)
})

ipcMain.handle('get-gacha-count', async (event, uid, gachaType, game = 'zzz') => {
  const total = getGachaCountByType(uid, gachaType, game)
  // For Genshin: rank 5 = S, rank 4 = A, rank 3 = B
  // For ZZZ: rank 4 = S, rank 3 = A, rank 2 = B
  const gameConfig = GAMES[game] || GAMES.zzz
  const rankKeys = Object.keys(gameConfig.rankConfig).map(Number).sort((a, b) => b - a)
  const counts = { total }
  for (const rank of rankKeys) {
    counts[`rank${rank}Count`] = getGachaCountByRank(uid, gachaType, rank, game)
  }
  return counts
})

ipcMain.handle('get-current-pity', async (event, uid, gachaType, minRank, game = 'zzz') => {
  return getCurrentPity(uid, gachaType, minRank || 4, game)
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
