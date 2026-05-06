const https = require('https')
const zlib = require('zlib')

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

async function fetchGachaPage(authParams, gachaType, page = 1, size = 20, endId = '0') {
  const baseUrl = 'https://public-operation-nap.mihoyo.com/common/gacha_record/api/getGachaLog'
  const params = new URLSearchParams({
    authkey_ver: authParams.authkey_ver,
    sign_type: authParams.sign_type,
    auth_appid: authParams.auth_appid,
    win_mode: 'fullscreen',
    gacha_id: authParams.gacha_id,
    timestamp: authParams.timestamp,
    font_thickness_mode: '1',
    init_log_gacha_type: '2002',
    init_log_gacha_base_type: '2',
    button_mode: 'default',
    plat_type: 'pc',
    is_gacha: '1',
    no_joypad_close: '1',
    authkey: authParams.authkey,
    lang: authParams.lang || 'zh-cn',
    region: authParams.region,
    game_biz: authParams.game_biz,
    real_gacha_type: String(gachaType),
    page: String(page),
    size: String(size),
    end_id: String(endId),
  })

  const result = await fetchJSON(`${baseUrl}?${params.toString()}`)

  if (result.retcode === -111) {
    throw new Error('authkey已过期，请重新在游戏内打开抽卡历史页面')
  }
  if (result.retcode !== 0) {
    throw new Error(`API错误: ${result.message} (code: ${result.retcode})`)
  }

  return result.data
}

async function fetchAllGachaRecords(authParams, gachaType, onProgress, existingIds = new Set()) {
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

    await new Promise(r => setTimeout(r, 350))
  }

  return allRecords
}

async function fetchWikiIcons() {
  const url = 'https://act-api-takumi-static.mihoyo.com/common/blackboard/zzz_wiki/v1/home/content/list?app_sn=zzz_wiki&channel_id=2'
  const headers = {
    'Referer': 'https://act.mihoyo.com/',
  }
  const result = await fetchJSON(url, headers)

  if (result.retcode !== 0) {
    throw new Error(`Wiki API错误: ${result.message}`)
  }

  const icons = []
  const children = result.data.list[0].children
  const typeMap = { 0: 'agent', 1: 'w-engine', 2: 'bangboo' }

  for (const idx of [0, 1, 2]) {
    const category = children[idx]
    if (!category || !category.list) continue
    const itemType = typeMap[idx]
    for (const item of category.list) {
      const name = item.alias_name || item.title
      if (name && item.icon) {
        icons.push({
          alias_name: name,
          icon_url: item.icon,
          item_type: itemType,
        })
      }
    }
  }

  return icons
}

async function fetchUidFromApi(authParams) {
  const data = await fetchGachaPage(authParams, 2, 1, 1, '0')
  if (data.list && data.list.length > 0) {
    return data.list[0].uid
  }
  for (const gachaType of [3, 1, 5]) {
    const d = await fetchGachaPage(authParams, gachaType, 1, 1, '0')
    if (d.list && d.list.length > 0) {
      return d.list[0].uid
    }
  }
  return null
}

const GACHA_TYPES = {
  1: '常驻频段',
  2: '独家频段',
  3: '音擎频段',
  5: '邦布频段',
}

module.exports = { fetchGachaPage, fetchAllGachaRecords, fetchWikiIcons, GACHA_TYPES, fetchUidFromApi }
