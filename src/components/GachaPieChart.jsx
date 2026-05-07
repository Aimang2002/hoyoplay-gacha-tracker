import React, { useMemo, useRef, useEffect } from 'react'
import ReactECharts from 'echarts-for-react'

const DEFAULT_RANK_CONFIG = {
  4: { label: 'S级', color: '#f59e0b' },
  3: { label: 'A级', color: '#8b5cf6' },
  2: { label: 'B级', color: '#94a3b8' },
}

export default function GachaPieChart({ pool, stats, counts, isActive, onClick, rankColors }) {
  const chartRef = useRef(null)
  const config = rankColors || DEFAULT_RANK_CONFIG

  useEffect(() => {
    const handleResize = () => {
      if (chartRef.current) {
        const instance = chartRef.current.getEchartsInstance()
        if (instance) instance.resize()
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const chartOption = useMemo(() => {
    const total = counts.total || 0
    if (total === 0) return null

    const pieData = []

    // Build pie data from rankColors config
    for (const [rank, rankConfig] of Object.entries(config)) {
      const countKey = `rank${rank}Count`
      const count = counts[countKey] || 0
      if (count > 0) {
        pieData.push({
          name: rankConfig.fullLabel || rankConfig.label,
          value: count,
          rankType: parseInt(rank),
          itemStyle: {
            color: rankConfig.color,
            shadowBlur: rank === '4' || rank === '5' ? 12 : 8,
            shadowColor: `${rankConfig.color}${rank === '4' || rank === '5' ? '59' : '4d'}`,
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 20,
              shadowColor: `${rankConfig.color}66`,
            }
          }
        })
      }
    }

    if (pieData.length === 0) return null

    return {
      tooltip: {
        trigger: 'item',
        backgroundColor: '#ffffff',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        textStyle: { color: '#0f172a', fontSize: 14 },
        extraCssText: 'box-shadow: 0 2px 8px rgba(0,0,0,0.08);',
        formatter: (params) => {
          return `<b>${params.name}</b><br/>${params.value}次 (${params.percent}%)`
        },
      },
      series: [{
        type: 'pie',
        radius: ['40%', '78%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 2,
          borderColor: '#ffffff',
          borderWidth: 1,
        },
        label: {
          show: true,
          position: 'outside',
          formatter: '{b}\n{d}%',
          fontSize: 12,
          color: '#64748b',
          lineHeight: 17,
        },
        labelLine: {
          lineStyle: { color: '#cbd5e1' },
        },
        emphasis: {
          label: {
            fontSize: 14,
            fontWeight: 'bold',
            color: '#0f172a',
          },
        },
        animationType: 'scale',
        animationEasing: 'cubicOut',
        data: pieData,
      }],
    }
  }, [counts, config])

  const total = counts.total || 0

  // Get first two ranks for summary display
  const sortedRanks = Object.keys(config).map(Number).sort((a, b) => b - a)
  const displayRanks = sortedRanks.slice(0, 3)

  return (
    <div
      className={`pie-card ${isActive ? 'active' : ''}`}
      onClick={onClick}
    >
      <div className="pie-header">
        <span className="pie-pool-name">{pool.name}</span>
        <span className="pie-total">共 {total} 抽</span>
      </div>

      {chartOption ? (
        <div className="pie-chart-container">
          <ReactECharts
            ref={chartRef}
            option={chartOption}
            style={{ height: '100%', width: '100%' }}
            opts={{ renderer: 'canvas' }}
            notMerge={true}
          />
        </div>
      ) : (
        <div className="pie-empty">暂无数据</div>
      )}

      <div className="pie-summary">
        {displayRanks.map(rank => {
          const rankConfig = config[rank]
          const countKey = `rank${rank}Count`
          const count = counts[countKey] || 0
          const sortedAllRanks = Object.keys(config).map(Number).sort((a, b) => b - a)
          const rankIndex = sortedAllRanks.indexOf(rank)
          const rankClass = rankIndex === 0 ? 's-rank' : rankIndex === 1 ? 'a-rank' : 'b-rank'

          return (
            <div key={rank} className={`summary-item ${rankClass}`}>
              <span className="summary-label">{rankConfig.label}</span>
              <span className="summary-value">{count}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
