const fs = require('fs')
const path = require('path')
const os = require('os')
const { execSync } = require('child_process')
const { GAMES } = require('../config')

const CACHE_URL_PATTERN = /https.+?auth_appid=webview_gacha.+?authkey=.+?game_biz=hk4e_\w+/g

const GACHA_URL_PATTERNS = [
  /https:\/\/webstatic\.mihoyo\.com\/hk4e\/event\/e20190909gacha-v3\/index\.html\?[^#\s]+/g,
  /https:\/\/webstatic\.mihoyo\.com\/hk4e\/event\/e20210201wish\/v2\/index\.html\?[^#\s]+/g,
  /https:\/\/webstatic\.hoyoverse\.com\/hk4e\/event\/e20190909gacha-v3\/index\.html\?[^#\s]+/g,
  /https:\/\/webstatic-sea\.mihoyo\.com\/hk4e\/event\/e20190909gacha-v3\/index\.html\?[^#\s]+/g,
  /https:\/\/hk4e-api-os\.mihoyo\.com\/hk4e\/event\/e20190909gacha-v3\/index\.html\?[^#\s]+/g,
]

function findLogPath() {
  const localAppData = process.env.LOCALAPPDATA
  if (localAppData) {
    const localLow = path.join(localAppData, '..', 'LocalLow')
    const cnPath = path.join(localLow, 'miHoYo', '原神', 'output_log.txt')
    if (fs.existsSync(cnPath)) return cnPath
    const intlPath = path.join(localLow, 'miHoYo', 'Genshin Impact', 'output_log.txt')
    if (fs.existsSync(intlPath)) return intlPath
  }
  const devPath = path.join(__dirname, '..', '..', 'output_log.txt')
  if (fs.existsSync(devPath)) return devPath
  return null
}

function extractGamePath(logContent) {
  const match = logContent.match(/(\w:[\/\\].+?(?:GenshinImpact_Data|YuanShen_Data))/)
  if (!match) return null
  return match[1].replace(/\//g, '\\')
}

function findData2File(gamePath) {
  if (!gamePath || !fs.existsSync(gamePath)) return null

  const webCachesDir = path.join(gamePath, 'webCaches')
  if (!fs.existsSync(webCachesDir)) return null

  const candidates = []

  const directPath = path.join(webCachesDir, 'Cache', 'Cache_Data', 'data_2')
  if (fs.existsSync(directPath)) candidates.push(directPath)

  try {
    const entries = fs.readdirSync(webCachesDir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const versionPath = path.join(webCachesDir, entry.name, 'Cache', 'Cache_Data', 'data_2')
        if (fs.existsSync(versionPath)) candidates.push(versionPath)
      }
    }
  } catch (e) {}

  if (candidates.length === 0) return null

  candidates.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)
  return candidates[0]
}

function copyLockedFile(srcPath) {
  const tmpPath = path.join(os.tmpdir(), `genshin_cache_${Date.now()}`)

  try {
    fs.copyFileSync(srcPath, tmpPath)
    return tmpPath
  } catch (e) {}

  try {
    const escapedSrc = srcPath.replace(/'/g, "''")
    const escapedDst = tmpPath.replace(/'/g, "''")
    execSync(
      `powershell -NoProfile -NonInteractive -Command "Copy-Item -LiteralPath '${escapedSrc}' -Destination '${escapedDst}' -Force"`,
      { timeout: 15000, windowsHide: true }
    )
    if (fs.existsSync(tmpPath)) return tmpPath
  } catch (e) {
    console.error('[Genshin Parser] PowerShell copy failed:', e.message)
  }

  return null
}

function extractUrlFromCache(cacheContent) {
  const matches = [...cacheContent.matchAll(CACHE_URL_PATTERN)]
  return matches.length > 0 ? matches[matches.length - 1][0] : null
}

function fixAuthkeyEncoding(url) {
  const match = url.match(/authkey=([^&]+)/)
  if (match && match[1].includes('=') && !match[1].includes('%')) {
    const encoded = encodeURIComponent(match[1])
    return url.replace(`authkey=${match[1]}`, `authkey=${encoded}`)
  }
  return url
}

function parseAuthUrl(urlStr) {
  try {
    const fixedUrl = fixAuthkeyEncoding(urlStr)
    const url = new URL(fixedUrl)
    const params = Object.fromEntries(url.searchParams)

    if (!params.authkey) {
      return { error: 'authkey参数为空' }
    }

    const host = url.hostname.toLowerCase()
    const isInternational = ['webstatic-sea', 'hk4e-api-os', 'hoyoverse'].some(x => host.includes(x))

    return {
      url: fixedUrl,
      game_biz: params.game_biz || (isInternational ? 'hk4e_global' : 'hk4e_cn'),
      region: params.region || (isInternational ? 'os_asia' : 'cn_gf01'),
    }
  } catch (e) {
    return { error: '解析authkey URL失败: ' + e.message }
  }
}

function parseLog() {
  const logPath = findLogPath()
  console.log('[Genshin Parser] 日志路径:', logPath)

  if (!logPath || !fs.existsSync(logPath)) {
    return { error: '未找到output_log.txt，请确认游戏已运行过' }
  }

  let logContent = ''
  try {
    logContent = fs.readFileSync(logPath, 'utf-8')
  } catch (e) {
    return { error: '无法读取output_log.txt' }
  }

  const gamePath = extractGamePath(logContent)
  console.log('[Genshin Parser] 游戏路径:', gamePath)

  if (gamePath) {
    const data2Path = findData2File(gamePath)
    console.log('[Genshin Parser] data_2路径:', data2Path)

    if (data2Path) {
      const tmpPath = copyLockedFile(data2Path)
      if (tmpPath) {
        try {
          const cacheContent = fs.readFileSync(tmpPath, 'utf-8')
          const url = extractUrlFromCache(cacheContent)
          try { fs.unlinkSync(tmpPath) } catch (e) {}
          if (url) {
            console.log('[Genshin Parser] 从data_2成功提取authkey')
            return parseAuthUrl(url)
          }
        } catch (e) {
          console.error('[Genshin Parser] 读取data_2失败:', e.message)
          try { fs.unlinkSync(tmpPath) } catch (e2) {}
        }
      }
    }
  }

  console.log('[Genshin Parser] data_2方法失败，尝试从output_log.txt提取')
  for (const pattern of GACHA_URL_PATTERNS) {
    const matches = [...logContent.matchAll(pattern)]
    if (matches.length > 0) {
      console.log('[Genshin Parser] 从output_log.txt提取到URL')
      return parseAuthUrl(matches[matches.length - 1][0])
    }
  }

  return { error: '未找到authkey，请先在游戏内打开抽卡历史页面' }
}

module.exports = { parseLog, findLogPath }
