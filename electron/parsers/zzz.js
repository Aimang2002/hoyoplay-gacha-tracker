const fs = require('fs')
const path = require('path')
const { GAMES } = require('../config')

function findLogPath() {
  const localAppData = process.env.LOCALAPPDATA
  if (!localAppData) return null
  const localLow = path.join(localAppData, '..', 'LocalLow')
  const config = GAMES.zzz
  return path.join(localLow, config.logPath, config.logFile)
}

function parseLog() {
  const logPath = findLogPath()
  if (!logPath || !fs.existsSync(logPath)) {
    return { error: '未找到Player.log，请确认游戏已运行过' }
  }

  const content = fs.readFileSync(logPath, 'utf-8')
  const matches = [...content.matchAll(/https:\/\/webstatic\.mihoyo\.com\/nap\/event\/e20230424gacha-v2\/index\.html\?[^\s,]+/g)]
  const urlMatch = matches.length > 0 ? matches[matches.length - 1] : null

  if (!urlMatch) {
    return { error: 'Player.log中未找到authkey，请先在游戏内打开抽卡历史页面' }
  }

  try {
    const rawUrl = urlMatch[0]
    const url = new URL(rawUrl)
    const params = Object.fromEntries(url.searchParams)

    if (!params.authkey) {
      return { error: 'authkey参数为空' }
    }

    return {
      url: rawUrl,
      game_biz: params.game_biz || 'nap_cn',
      region: params.region || 'prod_gf_cn',
    }
  } catch (e) {
    return { error: '解析authkey URL失败: ' + e.message }
  }
}

module.exports = { parseLog, findLogPath }
