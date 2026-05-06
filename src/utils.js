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
    const r = Math.round(139 + (217 - 139) * t)
    const g = Math.round(92 + (119 - 92) * t)
    const b = Math.round(246 + (6 - 246) * t)
    return `rgb(${r},${g},${b})`
  } else {
    const t = (ratio - 0.5) / 0.5
    const r = Math.round(217 + (245 - 217) * t)
    const g = Math.round(119 + (158 - 119) * t)
    const b = Math.round(6 + (11 - 6) * t)
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

export { RANK_COLORS, RANK_LABELS, formatTime, formatDate, getDateKey, getPityColor, groupByDate }
