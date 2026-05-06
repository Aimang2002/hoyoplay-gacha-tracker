import React, { useMemo, useRef, useEffect } from 'react'
import ReactECharts from 'echarts-for-react'

const RANK_CONFIG = {
  4: { label: 'S级', color: '#f59e0b' },
  3: { label: 'A级', color: '#8b5cf6' },
  2: { label: 'B级', color: '#94a3b8' },
}

export default function GachaPieChart({ pool, stats, counts, isActive, onClick }) {
  const chartRef = useRef(null)

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
    const { total = 0, sCount = 0, aCount = 0, bCount = 0 } = counts
    if (total === 0) return null

    const pieData = []
    if (sCount > 0) pieData.push({
      name: 'S级', value: sCount, rankType: 4,
      itemStyle: {
        color: RANK_CONFIG[4].color,
        shadowBlur: 12,
        shadowColor: 'rgba(245, 158, 11, 0.35)',
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 20,
          shadowColor: 'rgba(245, 158, 11, 0.4)',
        }
      }
    })
    if (aCount > 0) pieData.push({
      name: 'A级', value: aCount, rankType: 3,
      itemStyle: {
        color: RANK_CONFIG[3].color,
        shadowBlur: 8,
        shadowColor: 'rgba(139, 92, 246, 0.3)',
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 20,
          shadowColor: 'rgba(139, 92, 246, 0.4)',
        }
      }
    })
    if (bCount > 0) pieData.push({
      name: 'B级', value: bCount, rankType: 2,
      itemStyle: { color: RANK_CONFIG[2].color },
      emphasis: {
        itemStyle: {
          shadowBlur: 16,
          shadowColor: 'rgba(148, 163, 184, 0.35)',
        }
      }
    })

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
  }, [counts])

  const { total = 0, sCount = 0, aCount = 0, bCount = 0 } = counts

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
        <div className="summary-item s-rank">
          <span className="summary-label">S</span>
          <span className="summary-value">{sCount}</span>
        </div>
        <div className="summary-item a-rank">
          <span className="summary-label">A</span>
          <span className="summary-value">{aCount}</span>
        </div>
        <div className="summary-item b-rank">
          <span className="summary-label">B</span>
          <span className="summary-value">{bCount}</span>
        </div>
      </div>
    </div>
  )
}
