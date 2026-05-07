import React from 'react'
import { formatTime, formatDate, getPityColor, groupByDate } from '../utils'

const DEFAULT_RANK_CONFIG = {
  4: { label: 'S', fullLabel: 'S级', color: '#f59e0b' },
  3: { label: 'A', fullLabel: 'A级', color: '#8b5cf6' },
  2: { label: 'B', fullLabel: 'B级', color: '#94a3b8' },
}

function getPityType(data, standardItems) {
  if (!data || data.length === 0 || !standardItems) return null

  const topRank = data[0]?.rank_type
  if (!topRank) return null

  for (let i = 0; i < data.length; i++) {
    if (data[i].rank_type >= topRank) {
      const isStandard = standardItems.includes(data[i].item_name)
      return isStandard ? '大保底' : '小保底'
    }
  }
  return null
}

export default function STimeline({ data, iconMap, rankFilter, pityCount, rankColors, pityMax = 90, standardItems = [], recordLabel = '祈愿记录' }) {
  const config = rankColors || DEFAULT_RANK_CONFIG

  if (!data || data.length === 0) {
    return (
      <div className="timeline-empty">
        <div>该频段暂无获取记录</div>
      </div>
    )
  }

  const pityColor = getPityColor(pityCount || 0, pityMax)
  const grouped = groupByDate(data)
  const pityType = getPityType(data, standardItems)

  return (
    <div className="timeline-list" id="timeline-export-area">
      {pityCount !== undefined && pityCount !== null && (
        <div className="tl-pity-bar">
          <div className="pity-bar-track">
            <div
              className="pity-bar-unfilled"
              style={{ width: `${Math.max(0, (1 - pityCount / pityMax) * 100)}%` }}
            />
          </div>
          <div className="pity-bar-info">
            <span className="pity-label">当前{recordLabel.replace('记录', '')}数</span>
            <div className="pity-right">
              {pityType && (
                <span className={`pity-type ${pityType === '大保底' ? 'pity-guaranteed' : 'pity-fifty'}`}>
                  {pityType}
                </span>
              )}
              <span className="pity-value" style={{ color: pityColor }}>{pityCount}<span className="pity-max">/{pityMax}</span></span>
            </div>
          </div>
        </div>
      )}

      {grouped.map((item, index) => {
        const iconUrl = iconMap[item.item_name] || item.icon
        const rankConfig = config[item.rank_type] || { label: '?', fullLabel: '?', color: '#94a3b8' }
        const rankColor = rankConfig.color
        const rankLabel = rankConfig.label

        return (
          <div className="tl-item" key={item.id || index} style={{ animationDelay: `${index * 50}ms` }}>
            <div className="tl-time-col">
              {item.showDateHeader && (
                <div className="tl-date-label">{formatDate(item.gacha_time)}</div>
              )}
              <div className="tl-time-label">{formatTime(item.gacha_time)}</div>
            </div>
            <div className="tl-rail-col">
              <div className="tl-dot" style={{ background: rankColor, boxShadow: `0 0 6px 2px ${rankColor}55` }} />
            </div>
            <div className="tl-card-col">
              <div className="tl-card" style={{ '--rank-color': rankColor }}>
                {iconUrl ? (
                  <img
                    className="tl-icon"
                    src={iconUrl}
                    alt={item.item_name}
                    onError={(e) => {
                      e.target.style.display = 'none'
                      e.target.nextSibling.style.display = 'flex'
                    }}
                  />
                ) : null}
                <div
                  className="tl-icon-fallback"
                  style={{ display: iconUrl ? 'none' : 'flex' }}
                >
                  ⭐
                </div>
                <div className="tl-card-body">
                  <div className="tl-name" style={{ color: rankColor }}>
                    {item.item_name}
                  </div>
                  <div className="tl-meta">
                    {item.pullsSinceLast !== null && item.pullsSinceLast !== undefined ? (
                      <span className="tl-pulls" style={{ color: rankColor }}>
                        {item.pullsSinceLast}抽
                      </span>
                    ) : (
                      <span className="tl-pulls tl-pulls-first">首次</span>
                    )}
                  </div>
                </div>
                <span
                  className="tl-rank-tag"
                  style={{ color: rankColor, background: `${rankColor}0d`, borderColor: `${rankColor}20` }}
                >
                  {rankLabel}级
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
