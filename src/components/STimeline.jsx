import React from 'react'
import { RANK_COLORS, RANK_LABELS, formatTime, formatDate, getPityColor, groupByDate } from '../utils'

export default function STimeline({ data, iconMap, rankFilter, pityCount }) {
  if (!data || data.length === 0) {
    return (
      <div className="timeline-empty">
        <div>该频段暂无获取记录</div>
      </div>
    )
  }

  const pityColor = getPityColor(pityCount || 0, 90)
  const grouped = groupByDate(data)

  return (
    <div className="timeline-list" id="timeline-export-area">
      {pityCount !== undefined && pityCount !== null && (
        <div className="tl-pity-bar">
          <div className="pity-bar-track">
            <div
              className="pity-bar-unfilled"
              style={{ width: `${Math.max(0, (1 - pityCount / 90) * 100)}%` }}
            />
          </div>
          <div className="pity-bar-info">
            <span className="pity-label">当前已调频数</span>
            <span className="pity-value" style={{ color: pityColor }}>{pityCount}<span className="pity-max">/90</span></span>
          </div>
        </div>
      )}

      {grouped.map((item, index) => {
        const iconUrl = iconMap[item.item_name] || item.icon
        const rankColor = RANK_COLORS[item.rank_type] || '#94a3b8'
        const rankLabel = RANK_LABELS[item.rank_type] || '?'

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
