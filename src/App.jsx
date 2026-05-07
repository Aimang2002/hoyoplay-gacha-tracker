import React, { useState, useEffect, useCallback, useRef } from 'react'
import TitleBar from './components/TitleBar'
import GachaPieChart from './components/GachaPieChart'
import STimeline from './components/STimeline'
import ShareExport from './components/ShareExport'
import GameSelector from './components/GameSelector'
import { GAME_CONFIG } from './config'

export default function App() {
  const [currentGame, setCurrentGame] = useState('zzz')
  const [accounts, setAccounts] = useState([])
  const [currentUid, setCurrentUid] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState(null)
  const [activePool, setActivePool] = useState(null)
  const [rankFilter, setRankFilter] = useState(null)
  const [statsData, setStatsData] = useState({})
  const [timelineData, setTimelineData] = useState({})
  const [countData, setCountData] = useState({})
  const [iconMap, setIconMap] = useState({})
  const [pityData, setPityData] = useState({})
  const [lossData, setLossData] = useState({})

  const [switchingUid, setSwitchingUid] = useState(null)

  const gameConfig = GAME_CONFIG[currentGame]
  const GACHA_POOLS = gameConfig.pools
  const RANK_FILTERS = gameConfig.rankFilters

  // Initialize active pool and rank filter when game changes
  useEffect(() => {
    if (GACHA_POOLS.length > 0 && !GACHA_POOLS.find(p => p.type === activePool)) {
      setActivePool(GACHA_POOLS[0].type)
    }
    if (RANK_FILTERS.length > 0 && !RANK_FILTERS.find(f => f.value === rankFilter)) {
      setRankFilter(RANK_FILTERS[0].value)
    }
  }, [currentGame, GACHA_POOLS, RANK_FILTERS])

  const loadAccounts = useCallback(async () => {
    const accs = await window.electronAPI.getAccounts(currentGame)
    setAccounts(accs)
    return accs
  }, [currentGame])

  const loadIconMap = useCallback(async () => {
    const map = await window.electronAPI.getIconMap(currentGame)
    setIconMap(map)
  }, [currentGame])

  const loadStats = useCallback(async (overrideUid) => {
    const uid = overrideUid || currentUid
    if (!uid) return
    const newStats = {}
    const newTimeline = {}
    const newCounts = {}

    for (const pool of GACHA_POOLS) {
      const stats = await window.electronAPI.getGachaStats(uid, pool.type, 3, currentGame)
      newStats[pool.type] = stats

      const timeline = await window.electronAPI.getTimeline(uid, pool.type, rankFilter, currentGame)
      newTimeline[pool.type] = timeline

      const counts = await window.electronAPI.getGachaCount(uid, pool.type, currentGame)
      newCounts[pool.type] = counts
    }

    setStatsData(newStats)
    setTimelineData(newTimeline)
    setCountData(newCounts)
  }, [currentUid, rankFilter, currentGame, GACHA_POOLS])

  const loadPity = useCallback(async (overrideUid) => {
    const uid = overrideUid || currentUid
    if (!uid) return
    // 保底计数始终基于最高稀有度，不随筛选条件变化
    const topRank = currentGame === 'genshin' ? 5 : 4
    const newPity = {}
    for (const pool of GACHA_POOLS) {
      const pity = await window.electronAPI.getCurrentPity(uid, pool.type, topRank, currentGame)
      newPity[pool.type] = pity
    }
    setPityData(newPity)
  }, [currentUid, currentGame, GACHA_POOLS])

  const loadLosses = useCallback(async (overrideUid) => {
    const uid = overrideUid || currentUid
    if (!uid) return
    const newLoss = {}
    for (const pool of GACHA_POOLS) {
      const losses = await window.electronAPI.getConsecutiveLosses(uid, pool.type, currentGame)
      newLoss[pool.type] = losses
    }
    setLossData(newLoss)
  }, [currentUid, currentGame, GACHA_POOLS])

  useEffect(() => {
    loadAccounts().then(accs => {
      if (accs.length > 0 && !currentUid) {
        setCurrentUid(accs[0].uid)
      } else if (accs.length > 0 && accs.find(a => a.uid === currentUid)) {
        // currentUid still valid
      } else if (accs.length > 0) {
        setCurrentUid(accs[0].uid)
      }
    })
    loadIconMap()
  }, [])

  useEffect(() => {
    if (currentUid && !switchingUid) loadStats()
  }, [currentUid, rankFilter, loadStats])

  useEffect(() => {
    if (currentUid && !switchingUid) loadPity()
  }, [currentUid, loadPity])

  useEffect(() => {
    if (currentUid && !switchingUid) loadLosses()
  }, [currentUid, loadLosses])

  useEffect(() => {
    const cleanup1 = window.electronAPI.onSyncProgress((data) => {
      setSyncProgress(data)
    })
    const cleanup2 = window.electronAPI.onWindowStateChanged(() => {})
    return () => {
      cleanup1()
      cleanup2()
    }
  }, [])

  const handleSync = async () => {
    setSyncing(true)
    setSyncProgress(null)
    const result = await window.electronAPI.syncData(currentGame)
    setSyncing(false)
    setSyncProgress(null)

    if (result.error) {
      alert('同步失败: ' + result.error)
      return
    }

    const syncUid = result.uid
    if (syncUid) {
      setSwitchingUid(syncUid)
      setCurrentUid(syncUid)
    }

    await loadAccounts()
    await loadIconMap()
    await loadStats(syncUid || currentUid)
    await loadPity(syncUid || currentUid)
    await loadLosses(syncUid || currentUid)
    setSwitchingUid(null)
  }

  const handleAccountSwitch = async (uid) => {
    if (uid === currentUid) return
    setSwitchingUid(uid)
    setCurrentUid(uid)
    setStatsData({})
    setTimelineData({})
    setCountData({})
    setPityData({})
    setLossData({})
    await loadStats(uid)
    await loadPity(uid)
    await loadLosses(uid)
    setSwitchingUid(null)
  }

  const [timelineReady, setTimelineReady] = useState(true)

  const handleGameSwitch = async (newGame) => {
    if (newGame === currentGame || slidePhase !== 'idle') return
    const direction = newGame === 'genshin' ? 'left' : 'right'

    setTimelineFade('hidden')
    await new Promise(r => setTimeout(r, 100))

    setSlideDirection(direction)
    setSlidePhase('out')
    setTitleRoll('out')
    setTimelineReady(false)

    await new Promise(r => setTimeout(r, 450))

    setCurrentGame(newGame)
    setStatsData({})
    setTimelineData({})
    setCountData({})
    setPityData({})
    setLossData({})
    setActivePool(GAME_CONFIG[newGame].pools[0].type)
    setRankFilter(GAME_CONFIG[newGame].rankFilters[0].value)

    const gameAccounts = await window.electronAPI.getAccounts(newGame)
    setAccounts(gameAccounts)

    if (gameAccounts.length > 0) {
      setCurrentUid(gameAccounts[0].uid)
    } else {
      setCurrentUid(null)
    }

    const map = await window.electronAPI.getIconMap(newGame)
    setIconMap(map)

    setSlidePhase('prep')
    setTitleRoll('prep')

    await new Promise(r => setTimeout(r, 30))

    setSlidePhase('in')
    setTitleRoll('in')

    await new Promise(r => setTimeout(r, 500))

    setSlidePhase('idle')
    setSlideDirection(null)
    setTitleRoll('idle')
    setTimelineFade('visible')
    setTimelineReady(true)
  }

  const [uidDropdownOpen, setUidDropdownOpen] = useState(false)
  const uidDropdownRef = useRef(null)
  const [slidePhase, setSlidePhase] = useState('idle')
  const [slideDirection, setSlideDirection] = useState(null)
  const [titleRoll, setTitleRoll] = useState('idle')
  const [timelineFade, setTimelineFade] = useState('visible')

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (uidDropdownRef.current && !uidDropdownRef.current.contains(e.target)) {
        setUidDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const currentAccount = accounts.find(a => a.uid === currentUid)

  const rankColors = gameConfig.rankConfig

  const slideStyle = (() => {
    const outDuration = '0.45s'
    const inDuration = '0.5s'
    const outEasing = 'cubic-bezier(0.55, 0, 1, 0.45)'
    const inEasing = 'cubic-bezier(0.16, 1, 0.3, 1)'
    switch (slidePhase) {
      case 'out':
        return {
          transform: slideDirection === 'left'
            ? 'translateX(-105%) scale(0.88) rotate(-2deg)'
            : 'translateX(105%) scale(0.88) rotate(2deg)',
          transition: `transform ${outDuration} ${outEasing}`,
        }
      case 'prep':
        return {
          transform: slideDirection === 'left'
            ? 'translateX(105%) scale(0.88) rotate(2deg)'
            : 'translateX(-105%) scale(0.88) rotate(-2deg)',
          transition: 'none',
        }
      case 'in':
        return {
          transform: 'translateX(0) scale(1) rotate(0deg)',
          transition: `transform ${inDuration} ${inEasing}`,
        }
      default:
        return {}
    }
  })()

  const rollerStyle = (() => {
    const outDuration = '0.25s'
    const inDuration = '0.35s'
    switch (titleRoll) {
      case 'out':
        return {
          transform: 'translateY(-130%) scale(0.85)',
          opacity: 0,
          transition: `transform ${outDuration} cubic-bezier(0.55, 0, 1, 0.45), opacity ${outDuration} ease-in`,
        }
      case 'prep':
        return {
          transform: 'translateY(130%) scale(0.85)',
          opacity: 0,
          transition: 'none',
        }
      case 'in':
        return {
          transform: 'translateY(0) scale(1)',
          opacity: 1,
          transition: `transform ${inDuration} cubic-bezier(0.16, 1, 0.3, 1), opacity ${inDuration} ease-out`,
        }
      default:
        return {}
    }
  })()

  const timelineFadeStyle = (() => {
    switch (timelineFade) {
      case 'hidden':
        return {
          opacity: 0,
          transform: 'translateY(12px)',
          transition: 'opacity 0.1s ease-out, transform 0.1s ease-out',
        }
      default:
        return {
          opacity: 1,
          transform: 'translateY(0)',
          transition: 'opacity 0.2s ease-in, transform 0.2s ease-out',
        }
    }
  })()

  return (
    <div className="app">
      {syncing && (
        <div className="sync-overlay">
          <div className="loader">
            <div className="text"><span>SYNCING..</span></div>
            <div className="text"><span>SYNCING..</span></div>
            <div className="text"><span>SYNCING..</span></div>
            <div className="text"><span>SYNCING..</span></div>
            <div className="text"><span>SYNCING..</span></div>
            <div className="text"><span>SYNCING..</span></div>
            <div className="text"><span>SYNCING..</span></div>
            <div className="text"><span>SYNCING..</span></div>
            <div className="text"><span>SYNCING..</span></div>
          </div>
        </div>
      )}
      <TitleBar />

      <div className="toolbar">
        <div className="toolbar-left">
          <GameSelector currentGame={currentGame} onGameChange={handleGameSwitch} />
          <div className="app-title-roller">
            <h1 className="app-title" style={rollerStyle}>{gameConfig.name} · 抽卡统计</h1>
          </div>
          {accounts.length > 0 && (
            <div className="uid-selector" ref={uidDropdownRef}>
              <button
                className={`uid-selector-trigger ${uidDropdownOpen ? 'open' : ''}`}
                onClick={() => setUidDropdownOpen(!uidDropdownOpen)}
              >
                <span className="uid-number-roller">
                  <span className="uid-number" style={rollerStyle}>{currentUid}</span>
                </span>
                <span className="uid-chevron">
                  <svg width="10" height="6" viewBox="0 0 10 6">
                    <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </button>
              {uidDropdownOpen && (
                <div className="uid-selector-menu">
                  <div className="uid-menu-header">切换账号</div>
                  {accounts.map(acc => (
                    <button
                      key={acc.uid}
                      className={`uid-menu-item ${acc.uid === currentUid ? 'active' : ''}`}
                      onClick={() => {
                        handleAccountSwitch(acc.uid)
                        setUidDropdownOpen(false)
                      }}
                    >
                      <span className="uid-menu-dot" />
                      <div className="uid-menu-info">
                        <span className="uid-menu-uid">{acc.uid}</span>
                        {acc.last_sync_time && (
                          <span className="uid-menu-sync">
                            最近同步 {new Date(acc.last_sync_time).toLocaleDateString('zh-CN')}
                          </span>
                        )}
                      </div>
                      {acc.uid === currentUid && (
                        <svg className="uid-menu-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="toolbar-right">
          <ShareExport
            data={timelineData[activePool] || []}
            iconMap={iconMap}
            pityCount={pityData[activePool]}
            poolName={GACHA_POOLS.find(p => p.type === activePool)?.name || ''}
            uid={currentUid}
            rankFilter={rankFilter}
            gameTitle={gameConfig.title}
            rankColors={rankColors}
            consecutiveLosses={lossData[activePool] || 0}
            currentGame={currentGame}
          />
          <button
            className={`sync-btn ${syncing ? 'syncing' : ''}`}
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? (
              <>
                <span className="spinner" />
                {syncProgress ? `${syncProgress.poolName} 第${syncProgress.page}页...` : '同步中...'}
              </>
            ) : '同步数据'}
          </button>
        </div>
      </div>

      <div className="content-area">
        <div className="pie-grid" style={slideStyle}>
          {GACHA_POOLS.map(pool => {
            const poolCounts = countData[pool.type] || {}
            const counts = { total: poolCounts.total || 0 }
            for (const [rank, config] of Object.entries(rankColors)) {
              counts[`rank${rank}Count`] = poolCounts[`rank${rank}Count`] || 0
            }

            return (
              <GachaPieChart
                key={pool.type}
                pool={pool}
                stats={statsData[pool.type] || []}
                counts={counts}
                isActive={activePool === pool.type}
                onClick={() => setActivePool(pool.type)}
                rankColors={rankColors}
              />
            )
          })}
        </div>

        <div className={`timeline-section ${timelineReady ? 'timeline-ready' : 'timeline-pending'}`} style={timelineFadeStyle}>
          <div className="section-header">
            <h2>{gameConfig.recordLabel}</h2>
            <span className="pool-label">
              {GACHA_POOLS.find(p => p.type === activePool)?.name}
            </span>
            <div className="section-filter">
              {RANK_FILTERS.map(f => (
                <button
                  key={f.value}
                  className={`filter-btn ${rankFilter === f.value ? 'active' : ''}`}
                  onClick={() => setRankFilter(f.value)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <STimeline
            data={timelineData[activePool] || []}
            iconMap={iconMap}
            rankFilter={rankFilter}
            pityCount={pityData[activePool]}
            rankColors={rankColors}
            pityMax={gameConfig.pityMax}
            standardItems={gameConfig.standardItems}
            recordLabel={gameConfig.recordLabel}
            consecutiveLosses={lossData[activePool] || 0}
            currentGame={currentGame}
          />
        </div>
      </div>
    </div>
  )
}
