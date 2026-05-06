const initSqlJs = require('sql.js')
const path = require('path')
const fs = require('fs')
const { app } = require('electron')

let db
let dbPath

const SCHEMA = `
CREATE TABLE IF NOT EXISTS accounts (
  uid TEXT PRIMARY KEY,
  authkey TEXT NOT NULL,
  region TEXT NOT NULL,
  game_biz TEXT NOT NULL,
  last_sync_time DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS icons (
  alias_name TEXT PRIMARY KEY,
  icon_url TEXT NOT NULL,
  item_type TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gacha_records (
  id TEXT PRIMARY KEY,
  uid TEXT NOT NULL,
  gacha_type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  item_type TEXT NOT NULL,
  rank_type INTEGER NOT NULL,
  gacha_time DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (uid) REFERENCES accounts(uid)
);

CREATE INDEX IF NOT EXISTS idx_gacha_uid ON gacha_records(uid);
CREATE INDEX IF NOT EXISTS idx_gacha_type ON gacha_records(gacha_type);
CREATE INDEX IF NOT EXISTS idx_gacha_rank ON gacha_records(rank_type);
CREATE INDEX IF NOT EXISTS idx_gacha_time ON gacha_records(gacha_time);
`

function saveDB() {
  if (!db) return
  const data = db.export()
  const buffer = Buffer.from(data)
  fs.writeFileSync(dbPath, buffer)
}

async function initDB() {
  const projectRoot = app.isPackaged ? path.dirname(process.execPath) : path.join(__dirname, '..')
  dbPath = path.join(projectRoot, 'data', 'gacha.db')

  const dataDir = path.dirname(dbPath)
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }

  let wasmPath
  if (app.isPackaged) {
    wasmPath = path.join(process.resourcesPath, 'sql-wasm.wasm')
  } else {
    wasmPath = path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm')
  }
  const SQL = await initSqlJs({ locateFile: () => wasmPath })

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath)
    db = new SQL.Database(fileBuffer)
  } else {
    db = new SQL.Database()
  }

  db.run(SCHEMA)
  saveDB()
}

function closeDB() {
  if (db) {
    saveDB()
    db.close()
  }
}

function queryAll(sql, params = []) {
  const stmt = db.prepare(sql)
  if (params.length > 0) stmt.bind(params)
  const results = []
  while (stmt.step()) {
    results.push(stmt.getAsObject())
  }
  stmt.free()
  return results
}

function queryOne(sql, params = []) {
  const results = queryAll(sql, params)
  return results.length > 0 ? results[0] : null
}

function getAccounts() {
  return queryAll('SELECT uid, region, game_biz, last_sync_time FROM accounts')
}

function upsertAccount(uid, authkey, region, gameBiz) {
  db.run(`INSERT OR REPLACE INTO accounts (uid, authkey, region, game_biz, created_at) 
    VALUES (?, ?, ?, ?, COALESCE((SELECT created_at FROM accounts WHERE uid = ?), CURRENT_TIMESTAMP))`, 
    [uid, authkey, region, gameBiz, uid])
  saveDB()
}

function upsertIcons(icons) {
  for (const item of icons) {
    db.run(`INSERT OR REPLACE INTO icons (alias_name, icon_url, item_type, updated_at) 
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)`, 
      [item.alias_name, item.icon_url, item.item_type])
  }
  saveDB()
}

function insertGachaRecords(records) {
  const before = queryOne('SELECT COUNT(*) as c FROM gacha_records').c
  for (const r of records) {
    db.run(`INSERT OR IGNORE INTO gacha_records (id, uid, gacha_type, item_id, item_name, item_type, rank_type, gacha_time) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [r.id, r.uid, r.gacha_type, r.item_id, r.name, r.item_type, parseInt(r.rank_type), r.time])
  }
  saveDB()
  const after = queryOne('SELECT COUNT(*) as c FROM gacha_records').c
  return after - before
}

function getExistingIds(uid, gachaType) {
  const rows = queryAll('SELECT id FROM gacha_records WHERE uid = ? AND gacha_type = ?', [uid, gachaType])
  return new Set(rows.map(r => r.id))
}

function getLatestRecordId(uid, gachaType) {
  const row = queryOne(
    `SELECT id FROM gacha_records WHERE uid = ? AND gacha_type = ? ORDER BY gacha_time DESC LIMIT 1`,
    [uid, gachaType]
  )
  return row ? row.id : null
}

function getGachaStats(uid, gachaType, minRank = 3) {
  return queryAll(
    `SELECT item_name, rank_type, COUNT(*) as count 
     FROM gacha_records 
     WHERE uid = ? AND gacha_type = ? AND rank_type >= ? 
     GROUP BY item_name, rank_type 
     ORDER BY rank_type DESC, count DESC`,
    [uid, gachaType, minRank]
  )
}

function getTimeline(uid, gachaType, minRank = 4) {
  return queryAll(
    `SELECT item_name, gacha_time, rank_type, gacha_type, id 
     FROM gacha_records 
     WHERE uid = ? AND gacha_type = ? AND rank_type >= ? 
     ORDER BY gacha_time ASC, id ASC`,
    [uid, gachaType, minRank]
  )
}

function getAllOrderedIds(uid, gachaType) {
  return queryAll(
    `SELECT id FROM gacha_records 
     WHERE uid = ? AND gacha_type = ? 
     ORDER BY gacha_time ASC, id ASC`,
    [uid, gachaType]
  )
}

function getIconMap() {
  const rows = queryAll('SELECT alias_name, icon_url FROM icons')
  const map = {}
  for (const row of rows) {
    map[row.alias_name] = row.icon_url
    map[`\u300c${row.alias_name}\u300d`] = row.icon_url
  }
  return map
}

function updateSyncTime(uid) {
  db.run('UPDATE accounts SET last_sync_time = CURRENT_TIMESTAMP WHERE uid = ?', [uid])
  saveDB()
}

function getGachaCountByType(uid, gachaType) {
  const row = queryOne('SELECT COUNT(*) as count FROM gacha_records WHERE uid = ? AND gacha_type = ?', [uid, gachaType])
  return row ? row.count : 0
}

function getGachaCountByRank(uid, gachaType, rankType) {
  const row = queryOne('SELECT COUNT(*) as count FROM gacha_records WHERE uid = ? AND gacha_type = ? AND rank_type = ?', [uid, gachaType, rankType])
  return row ? row.count : 0
}

function getPullPosition(uid, gachaType, gachaTime, recordId) {
  const row = queryOne(
    `SELECT COUNT(*) as count FROM gacha_records 
     WHERE uid = ? AND gacha_type = ? AND (gacha_time < ? OR (gacha_time = ? AND id <= ?))`,
    [uid, gachaType, gachaTime, gachaTime, recordId]
  )
  return row ? row.count : 0
}

function getCurrentPity(uid, gachaType, minRank) {
  const allIds = queryAll(
    `SELECT id FROM gacha_records WHERE uid = ? AND gacha_type = ? ORDER BY gacha_time ASC, id ASC`,
    [uid, gachaType]
  )
  if (allIds.length === 0) return 0

  const lastHit = queryOne(
    `SELECT id FROM gacha_records
     WHERE uid = ? AND gacha_type = ? AND rank_type >= ?
     ORDER BY gacha_time DESC LIMIT 1`,
    [uid, gachaType, minRank]
  )
  if (!lastHit) return allIds.length

  const hitIndex = allIds.findIndex(r => r.id === lastHit.id)
  if (hitIndex === -1) return allIds.length
  return allIds.length - hitIndex - 1
}

module.exports = {
  initDB, closeDB, getAccounts, upsertAccount, upsertIcons,
  insertGachaRecords, getLatestRecordId, getExistingIds, getGachaStats, getTimeline, getIconMap,
  updateSyncTime, getGachaCountByType, getGachaCountByRank, getPullPosition,
  getCurrentPity, getAllOrderedIds
}
