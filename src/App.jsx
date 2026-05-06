import React, { useState, useEffect, useCallback, useRef } from 'react'
import TitleBar from './components/TitleBar'
import GachaPieChart from './components/GachaPieChart'
import STimeline from './components/STimeline'
import ShareExport from './components/ShareExport'

const GACHA_POOLS = [
  { type: '2', name: '独家频段' },
  { type: '3', name: '音擎频段' },
  { type: '1', name: '常驻频段' },
  { type: '5', name: '邦布频段' },
]

const RANK_FILTERS = [
  { value: 4, label: '仅S级' },
  { value: 3, label: 'A级以上' },
]

export default function App() {
  const [accounts, setAccounts] = useState([])
  const [currentUid, setCurrentUid] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState(null)
  const [activePool, setActivePool] = useState('2')
  const [rankFilter, setRankFilter] = useState(4)
  const [statsData, setStatsData] = useState({})
  const [timelineData, setTimelineData] = useState({})
  const [countData, setCountData] = useState({})
  const [iconMap, setIconMap] = useState({})
  const [pityData, setPityData] = useState({})

  const [switchingUid, setSwitchingUid] = useState(null)

  const loadAccounts = useCallback(async () => {
    const accs = await window.electronAPI.getAccounts()
    setAccounts(accs)
    return accs
  }, [])

  const loadIconMap = useCallback(async () => {
    const map = await window.electronAPI.getIconMap()
    setIconMap(map)
  }, [])

  const loadStats = useCallback(async (overrideUid) => {
    const uid = overrideUid || currentUid
    if (!uid) return
    const newStats = {}
    const newTimeline = {}
    const newCounts = {}

    for (const pool of GACHA_POOLS) {
      const stats = await window.electronAPI.getGachaStats(uid, pool.type, 3)
      newStats[pool.type] = stats

      const timeline = await window.electronAPI.getTimeline(uid, pool.type, rankFilter)
      newTimeline[pool.type] = timeline

      const counts = await window.electronAPI.getGachaCount(uid, pool.type)
      newCounts[pool.type] = counts
    }

    setStatsData(newStats)
    setTimelineData(newTimeline)
    setCountData(newCounts)
  }, [currentUid, rankFilter])

  const loadPity = useCallback(async (overrideUid) => {
    const uid = overrideUid || currentUid
    if (!uid) return
    const newPity = {}
    for (const pool of GACHA_POOLS) {
      const pity = await window.electronAPI.getCurrentPity(uid, pool.type, 4)
      newPity[pool.type] = pity
    }
    setPityData(newPity)
  }, [currentUid])

  useEffect(() => {
    loadAccounts().then(accs => {
      if (accs.length > 0 && !currentUid) {
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
    const result = await window.electronAPI.syncData()
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
    await loadStats(uid)
    await loadPity(uid)
    setSwitchingUid(null)
  }

  const [uidDropdownOpen, setUidDropdownOpen] = useState(false)
  const uidDropdownRef = useRef(null)

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

  return (
    <div className="app">
      <TitleBar />

      <div className="toolbar">
        <div className="toolbar-left">
          <h1 className="app-title">绝区零 · 抽卡统计</h1>
          {accounts.length > 0 && (
            <div className="uid-dropdown" ref={uidDropdownRef}>
              <button
                className={`uid-dropdown-trigger ${uidDropdownOpen ? 'open' : ''}`}
                onClick={() => setUidDropdownOpen(!uidDropdownOpen)}
              >
                <span className="uid-dropdown-label">UID: {currentUid}</span>
                <svg className="uid-dropdown-arrow" width="10" height="6" viewBox="0 0 10 6">
                  <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {uidDropdownOpen && (
                <div className="uid-dropdown-menu">
                  {accounts.map(acc => (
                    <button
                      key={acc.uid}
                      className={`uid-dropdown-item ${acc.uid === currentUid ? 'active' : ''}`}
                      onClick={() => {
                        handleAccountSwitch(acc.uid)
                        setUidDropdownOpen(false)
                      }}
                    >
                      <span className="uid-dropdown-uid">{acc.uid}</span>
                      {acc.last_sync_time && (
                        <span className="uid-dropdown-sync">
                          {new Date(acc.last_sync_time).toLocaleDateString('zh-CN')}
                        </span>
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

      <div className="pie-grid">
        {GACHA_POOLS.map(pool => (
          <GachaPieChart
            key={pool.type}
            pool={pool}
            stats={statsData[pool.type] || []}
            counts={countData[pool.type] || { total: 0, sCount: 0, aCount: 0, bCount: 0 }}
            isActive={activePool === pool.type}
            onClick={() => setActivePool(pool.type)}
          />
        ))}
      </div>

      <div className="timeline-section">
        <div className="section-header">
          <h2>调频记录</h2>
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
        />
      </div>
    </div>
  )
}
