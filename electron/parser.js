const fs = require('fs')
const path = require('path')

function findPlayerLogPath() {
  const localAppData = process.env.LOCALAPPDATA
  if (!localAppData) return null
  const userProfile = path.dirname(path.dirname(localAppData))
  return path.join(userProfile, 'AppData', 'LocalLow', 'miHoYo', '绝区零', 'Player.log')
}

function parsePlayerLog() {
  const logPath = findPlayerLogPath()
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
    const url = new URL(urlMatch[0])
    const params = Object.fromEntries(url.searchParams)

    if (!params.authkey) {
      return { error: 'authkey参数为空' }
    }

    return {
      authkey: params.authkey,
      authkey_ver: params.authkey_ver || '1',
      sign_type: params.sign_type || '2',
      auth_appid: params.auth_appid || 'webview_gacha',
      gacha_id: params.gacha_id || '0',
      timestamp: params.timestamp || '',
      region: params.region || 'prod_gf_cn',
      game_biz: params.game_biz || 'nap_cn',
      lang: params.lang || 'zh-cn',
    }
  } catch (e) {
    return { error: '解析authkey URL失败: ' + e.message }
  }
}

module.exports = { parsePlayerLog, findPlayerLogPath }
