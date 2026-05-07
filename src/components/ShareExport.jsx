import React, { useRef, useCallback } from 'react'
import html2canvas from 'html2canvas'
import { formatTime, formatDate, getPityColor, groupByDate, getCaptureRadianceProb } from '../utils'

const DEFAULT_RANK_CONFIG = {
  4: { label: 'S', fullLabel: 'S级', color: '#f59e0b' },
  3: { label: 'A', fullLabel: 'A级', color: '#8b5cf6' },
  2: { label: 'B', fullLabel: 'B级', color: '#94a3b8' },
}

export default function ShareExport({ data, iconMap, pityCount, poolName, uid, rankFilter, gameTitle = '绝区零 · 抽卡统计', rankColors, pityMax = 90, consecutiveLosses = 0, currentGame = 'zzz' }) {
  const exportRef = useRef(null)
  const config = rankColors || DEFAULT_RANK_CONFIG

  const handleExport = useCallback(async () => {
    if (!exportRef.current) return

    try {
      const canvas = await html2canvas(exportRef.current, {
        width: 1080,
        height: 1920,
        scale: 1,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#f8fafc',
      })

      const gamePrefix = gameTitle.includes('原神') ? 'Genshin' : 'ZZZ'
      const link = document.createElement('a')
      link.download = `${gamePrefix}_${poolName}_${new Date().toISOString().slice(0, 10)}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (e) {
      console.error('导出失败:', e)
    }
  }, [poolName, gameTitle])

  const pityColor = getPityColor(pityCount || 0, pityMax)
  const itemsToShow = groupByDate(data || [])
  const isGenshinSmallPity = currentGame === 'genshin' && consecutiveLosses > 0
  const captureRadianceProb = isGenshinSmallPity ? getCaptureRadianceProb(consecutiveLosses) : 0

  return (
    <>
      <button className="share-btn" onClick={handleExport} title="导出分享图片">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
        分享
      </button>

      <div ref={exportRef} style={{
        position: 'absolute',
        left: '-9999px',
        top: 0,
        width: 1080,
        height: 1920,
        background: '#f8fafc',
        padding: '60px 48px',
        overflow: 'hidden',
        fontFamily: '-apple-system, "SF Pro Display", "Segoe UI", "Microsoft YaHei", sans-serif',
      }}>
        <div style={{
          fontSize: 36,
          fontWeight: 800,
          color: '#0f172a',
          marginBottom: 8,
          letterSpacing: '-0.5px',
        }}>
          {gameTitle}
        </div>
        <div style={{
          fontSize: 20,
          color: '#64748b',
          marginBottom: 32,
          display: 'flex',
          gap: 16,
          alignItems: 'center',
        }}>
          <span style={{
            background: '#e0f2fe',
            color: '#0ea5e9',
            padding: '4px 16px',
            borderRadius: 20,
            fontWeight: 600,
            fontSize: 16,
          }}>
            {poolName}
          </span>
          {uid && <span>UID: {uid}</span>}
        </div>

        {pityCount !== undefined && pityCount !== null && (
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 16,
            padding: '24px 32px',
            marginBottom: 32,
          }}>
            <div style={{
              width: '100%',
              height: 12,
              background: 'linear-gradient(90deg, #22c55e, #eab308, #ef4444)',
              borderRadius: 6,
              position: 'relative',
              marginBottom: 16,
            }}>
              <div style={{
                position: 'absolute',
                right: 0,
                top: 0,
                bottom: 0,
                width: `${Math.max(0, (1 - pityCount / pityMax) * 100)}%`,
                background: '#f1f5f9',
                borderRadius: '0 6px 6px 0',
              }} />
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{ fontSize: 20, fontWeight: 500, color: '#64748b' }}>当前祈愿数</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {isGenshinSmallPity && captureRadianceProb > 0 && (
                  <span style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#e879f9',
                    background: 'rgba(232, 121, 249, 0.1)',
                    padding: '4px 12px',
                    borderRadius: 8,
                  }}>
                    明光 {captureRadianceProb === 100 ? '100%' : `${captureRadianceProb}%`}
                  </span>
                )}
                <span style={{ fontSize: 36, fontWeight: 800, color: pityColor, letterSpacing: '-1px' }}>
                  {pityCount}<span style={{ fontSize: 18, fontWeight: 500, color: '#94a3b8' }}>/{pityMax}</span>
                </span>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {itemsToShow.map((item, index) => {
            const iconUrl = iconMap[item.item_name] || item.icon
            const rankConfig = config[item.rank_type] || { label: '?', fullLabel: '?', color: '#94a3b8' }
            const rankColor = rankConfig.color
            const rankLabel = rankConfig.label

            return (
              <div key={item.id || index}>
                {item.showDateHeader && (
                  <div style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: '#0f172a',
                    marginBottom: 12,
                    marginTop: index > 0 ? 16 : 0,
                  }}>
                    {formatDate(item.gacha_time)}
                  </div>
                )}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 20,
                  padding: '20px 28px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 16,
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 6,
                    background: rankColor,
                    opacity: 0.6,
                  }} />
                  {iconUrl && (
                    <img
                      src={iconUrl}
                      alt=""
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: 16,
                        background: '#f1f5f9',
                        objectFit: 'cover',
                        flexShrink: 0,
                      }}
                      crossOrigin="anonymous"
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: rankColor, lineHeight: 1.4 }}>
                      {item.item_name}
                    </div>
                    <div style={{ fontSize: 18, color: '#94a3b8', marginTop: 4 }}>
                      {formatTime(item.gacha_time)}
                      {item.pullsSinceLast !== null && item.pullsSinceLast !== undefined && (
                        <span style={{ color: rankColor, fontWeight: 700, marginLeft: 16 }}>
                          {item.pullsSinceLast}抽
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{
                    fontSize: 20,
                    fontWeight: 800,
                    color: rankColor,
                    background: `${rankColor}0d`,
                    border: `2px solid ${rankColor}20`,
                    padding: '6px 20px',
                    borderRadius: 12,
                    flexShrink: 0,
                  }}>
                    {rankLabel}级
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
