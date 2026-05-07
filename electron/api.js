const https = require('https')
const zlib = require('zlib')
const { GAMES, GAME_BIZ_PREFIXES } = require('./config')

function getGameByBiz(gameBiz) {
  const prefix = Object.keys(GAME_BIZ_PREFIXES).find(p => gameBiz.startsWith(p))
  if (prefix) {
    return GAMES[GAME_BIZ_PREFIXES[prefix]]
  }
  return null
}

function fetchJSON(url, customHeaders = {}) {
  return new Promise((resolve, reject) => {
    const defaultHeaders = {
      'Accept-Encoding': 'gzip, deflate, br',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    }
    const options = {
      timeout: 15000,
      headers: { ...defaultHeaders, ...customHeaders },
    }
    const req = https.get(url, options, (res) => {
      const chunks = []
      let stream = res
      const encoding = res.headers['content-encoding']
      if (encoding === 'gzip') {
        stream = res.pipe(zlib.createGunzip())
      } else if (encoding === 'deflate') {
        stream = res.pipe(zlib.createInflate())
      } else if (encoding === 'br') {
        stream = res.pipe(zlib.createBrotliDecompress())
      }
      stream.on('data', chunk => chunks.push(chunk))
      stream.on('end', () => {
        const buffer = Buffer.concat(chunks)
        const text = buffer.toString('utf-8')
        try {
          resolve(JSON.parse(text))
        } catch (e) {
          reject(new Error('JSON解析失败'))
        }
      })
    })
    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('请求超时'))
    })
  })
}

function getApiBaseUrl(gameBiz) {
  const gameConfig = getGameByBiz(gameBiz)
  if (gameConfig) {
    if (gameConfig.apiUrls && gameConfig.apiUrls[gameBiz]) {
      return gameConfig.apiUrls[gameBiz]
    }
    return gameConfig.apiUrl
  }
  return GAMES.zzz.apiUrl
}

function buildGachaApiUrl(rawUrl, gachaType, page, size, endId) {
  const parsed = new URL(rawUrl)
  parsed.searchParams.delete('page')
  parsed.searchParams.delete('size')
  parsed.searchParams.delete('gacha_type')
  parsed.searchParams.delete('real_gacha_type')
  parsed.searchParams.delete('end_id')

  parsed.searchParams.set('gacha_type', String(gachaType))
  parsed.searchParams.set('real_gacha_type', String(gachaType))
  parsed.searchParams.set('page', String(page))
  parsed.searchParams.set('size', String(size))
  parsed.searchParams.set('end_id', String(endId))

  const gameBiz = parsed.searchParams.get('game_biz')
  const baseUrl = getApiBaseUrl(gameBiz)

  return `${baseUrl}?${parsed.searchParams.toString()}`
}

async function fetchGachaPage(authParams, gachaType, page = 1, size = 20, endId = '0') {
  const url = buildGachaApiUrl(authParams.url, gachaType, page, size, endId)
  console.log('[API] fetchGachaPage: gachaType:', gachaType, 'page:', page)

  let result
  try {
    result = await fetchJSON(url)
  } catch (e) {
    console.error('[API] fetchGachaPage: 请求失败:', e.message)
    throw e
  }

  console.log('[API] fetchGachaPage: retcode:', result.retcode, 'message:', result.message)

  if (result.retcode === -111) {
    throw new Error('authkey已过期，请重新在游戏内打开抽卡历史页面')
  }
  if (result.retcode !== 0) {
    throw new Error(`API错误: ${result.message} (code: ${result.retcode})`)
  }

  const listLen = result.data?.list?.length || 0
  console.log('[API] fetchGachaPage: 返回记录数:', listLen)
  return result.data
}

async function fetchAllGachaRecords(authParams, gachaType, onProgress, existingIds = new Set()) {
  console.log('[API] fetchAllGachaRecords: gachaType:', gachaType, 'existingIds:', existingIds.size)
  const allRecords = []
  let page = 1
  let endId = '0'

  while (true) {
    const data = await fetchGachaPage(authParams, gachaType, page, 20, endId)
    if (!data.list || data.list.length === 0) break

    let hasExisting = false
    for (const record of data.list) {
      if (existingIds.has(record.id)) {
        hasExisting = true
        break
      }
      allRecords.push(record)
    }

    if (hasExisting) break

    endId = data.list[data.list.length - 1].id
    page++

    if (onProgress) onProgress(gachaType, page, allRecords.length)

    await new Promise(r => setTimeout(r, 500))
    if (page % 10 === 0) {
      await new Promise(r => setTimeout(r, 1500))
    }
  }

  console.log('[API] fetchAllGachaRecords: gachaType:', gachaType, '共', allRecords.length, '条新记录')
  return allRecords
}

async function fetchWikiIcons(game = 'zzz') {
  const gameConfig = GAMES[game] || GAMES.zzz
  const headers = {
    'Referer': 'https://act.mihoyo.com/',
  }

  const urls = gameConfig.iconApis || (gameConfig.iconApi ? [gameConfig.iconApi] : [])
  const icons = []

  for (const url of urls) {
    try {
      const result = await fetchJSON(url, headers)
      if (result.retcode !== 0) continue

      const topList = result.data.list
      if (!topList || topList.length === 0) continue

      if (game === 'genshin') {
        const category = topList[0]
        const name = category.name
        const typeMap = { '角色': 'avatar', '武器': 'weapon' }
        const itemType = typeMap[name] || 'item'
        if (category.list) {
          for (const item of category.list) {
            if (item.title && item.icon) {
              icons.push({
                alias_name: item.title,
                icon_url: item.icon,
                item_type: itemType,
              })
            }
          }
        }
      } else {
        const children = topList[0]?.children || []
        const typeMap = { 0: 'agent', 1: 'w-engine', 2: 'bangboo' }
        for (let idx = 0; idx < children.length; idx++) {
          const cat = children[idx]
          if (!cat || !cat.list) continue
          const itemType = typeMap[idx] || 'item'
          for (const item of cat.list) {
            const itemName = item.alias_name || item.title
            if (itemName && item.icon) {
              icons.push({
                alias_name: itemName,
                icon_url: item.icon,
                item_type: itemType,
              })
            }
          }
        }
      }
    } catch (e) {
      console.error('[API] fetchWikiIcons: 请求失败:', url, e.message)
    }
  }

  console.log('[API] fetchWikiIcons: game:', game, '共', icons.length, '个图标')
  return icons
}

async function fetchUidFromApi(authParams) {
  const gameBiz = authParams.game_biz
  const gameConfig = getGameByBiz(gameBiz) || GAMES.genshin
  const gachaTypes = Object.keys(gameConfig.pools).map(Number)
  console.log('[API] fetchUidFromApi: game_biz:', gameBiz, '卡池类型:', gachaTypes)

  for (const gachaType of gachaTypes) {
    try {
      const d = await fetchGachaPage(authParams, gachaType, 1, 1, '0')
      if (d.list && d.list.length > 0) {
        console.log('[API] fetchUidFromApi: 找到UID:', d.list[0].uid)
        return d.list[0].uid
      }
    } catch (e) {
      console.log('[API] fetchUidFromApi: gachaType', gachaType, '失败:', e.message)
    }
    await new Promise(r => setTimeout(r, 1500))
  }
  console.log('[API] fetchUidFromApi: 所有卡池均未找到UID')
  return null
}

module.exports = { fetchGachaPage, fetchAllGachaRecords, fetchWikiIcons, fetchUidFromApi }
