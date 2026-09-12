const RANK_COLORS = { 4: '#f59e0b', 3: '#8b5cf6' }
const RANK_LABELS = { 4: 'S', 3: 'A' }

function formatTime(dateStr) {
  const d = new Date(dateStr)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  const month = d.getMonth() + 1
  const day = d.getDate()
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']
  const weekDay = weekDays[d.getDay()]
  return `${month}月${day}日 周${weekDay}`
}

function getDateKey(dateStr) {
  return dateStr ? dateStr.split(' ')[0] : ''
}

function getPityColor(count, max) {
  const ratio = Math.min(count / max, 1)
  if (ratio < 0.5) {
    const t = ratio / 0.5
    const r = Math.round(34 + (234 - 34) * t)
    const g = Math.round(197 + (179 - 197) * t)
    const b = Math.round(94 + (8 - 94) * t)
    return `rgb(${r},${g},${b})`
  } else {
    const t = (ratio - 0.5) / 0.5
    const r = Math.round(234 + (239 - 234) * t)
    const g = Math.round(179 + (68 - 179) * t)
    const b = Math.round(8 + (68 - 8) * t)
    return `rgb(${r},${g},${b})`
  }
}

function groupByDate(items) {
  const groups = []
  let lastDateKey = ''
  for (const item of items) {
    const dateKey = getDateKey(item.gacha_time)
    groups.push({ ...item, showDateHeader: dateKey !== lastDateKey })
    lastDateKey = dateKey
  }
  return groups
}

function getCaptureRadianceProb(consecutiveLosses) {
  if (consecutiveLosses <= 0) return 0
  if (consecutiveLosses === 1) return 4.55
  if (consecutiveLosses === 2) return 45.45
  return 100
}

// 服务器时间字符串('YYYY-MM-DD HH:mm:ss'，UTC+8) → 时间戳
function parseServerTime(str) {
  if (!str) return NaN
  return Date.parse(String(str).replace(' ', 'T') + '+08:00')
}

// 原神卡池相位编号：同一编号即同一期卡池（42天一版本，上半场/下半场交替）。
// 返回 null 表示时间早于锚点或配置缺失，调用方需退化为按天数估算
function getGenshinPhaseIndex(timeMs, schedule) {
  if (!timeMs || Number.isNaN(timeMs) || !schedule || !schedule.anchor) return null
  const anchorMs = Date.parse(schedule.anchor)
  if (Number.isNaN(anchorMs)) return null
  const versionMs = (schedule.versionDays || 42) * 86400000
  const offsetMs = (schedule.phaseTwoOffsetHours || 487) * 3600000
  const k = Math.floor((timeMs - anchorMs) / versionMs)
  if (k < 0) return null
  const inCycle = timeMs - (anchorMs + k * versionMs)
  return inCycle < offsetMs ? k * 2 : k * 2 + 1
}

export { RANK_COLORS, RANK_LABELS, formatTime, formatDate, getDateKey, getPityColor, groupByDate, getCaptureRadianceProb, parseServerTime, getGenshinPhaseIndex }
