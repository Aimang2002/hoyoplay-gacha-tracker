const initSqlJs = require('sql.js')
const path = require('path')
const fs = require('fs')
const { app } = require('electron')

let db
let dbPath

const TABLE_SCHEMAS = {
  accounts: (table) => `
    CREATE TABLE IF NOT EXISTS ${table} (
      uid TEXT NOT NULL,
      authkey TEXT NOT NULL,
      region TEXT NOT NULL,
      game_biz TEXT NOT NULL,
      last_sync_time DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(uid)
    )`,
  gacha_records: (table) => `
    CREATE TABLE IF NOT EXISTS ${table} (
      id TEXT PRIMARY KEY,
      uid TEXT NOT NULL,
      gacha_type TEXT NOT NULL,
      item_id TEXT NOT NULL,
      item_name TEXT NOT NULL,
      item_type TEXT NOT NULL,
      rank_type INTEGER NOT NULL,
      gacha_time DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
  icons: (table) => `
    CREATE TABLE IF NOT EXISTS ${table} (
      alias_name TEXT NOT NULL,
      icon_url TEXT NOT NULL,
      item_type TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(alias_name)
    )`,
}

const TABLE_INDEXES = {
  gacha_records: (table) => [
    `CREATE INDEX IF NOT EXISTS idx_${table}_uid ON ${table}(uid)`,
    `CREATE INDEX IF NOT EXISTS idx_${table}_type ON ${table}(gacha_type)`,
    `CREATE INDEX IF NOT EXISTS idx_${table}_rank ON ${table}(rank_type)`,
    `CREATE INDEX IF NOT EXISTS idx_${table}_time ON ${table}(gacha_time)`,
  ],
  accounts: () => [],
  icons: () => [],
}

const GAMES_LIST = ['zzz', 'genshin']

function tbl(game, base) {
  return `${game}_${base}`
}

function saveDB() {
  if (!db) return
  const data = db.export()
  const buffer = Buffer.from(data)
  fs.writeFileSync(dbPath, buffer)
}

function tableExists(tableName) {
  const result = db.exec(`SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}'`)
  return result.length > 0 && result[0].values.length > 0
}

function migrateOldTables() {
  const oldTables = ['accounts', 'gacha_records', 'icons']
  const hasOld = oldTables.some(t => tableExists(t))
  if (!hasOld) return

  console.log('[DB] 检测到旧版统一表，开始迁移...')

  for (const game of GAMES_LIST) {
    for (const base of oldTables) {
      const newTable = tbl(game, base)
      if (tableExists(newTable)) continue

      db.run(TABLE_SCHEMAS[base](newTable))
      ;(TABLE_INDEXES[base](newTable) || []).forEach(idx => db.run(idx))

      if (tableExists(base)) {
        try {
          if (base === 'accounts') {
            db.run(`INSERT OR IGNORE INTO ${newTable} (uid, authkey, region, game_biz, last_sync_time, created_at)
              SELECT uid, authkey, region, game_biz, last_sync_time, created_at FROM ${base} WHERE game = ?`, [game])
          } else if (base === 'gacha_records') {
            db.run(`INSERT OR IGNORE INTO ${newTable} (id, uid, gacha_type, item_id, item_name, item_type, rank_type, gacha_time, created_at)
              SELECT id, uid, gacha_type, item_id, item_name, item_type, rank_type, gacha_time, created_at FROM ${base} WHERE game = ?`, [game])
          } else if (base === 'icons') {
            db.run(`INSERT OR IGNORE INTO ${newTable} (alias_name, icon_url, item_type, updated_at)
              SELECT alias_name, icon_url, item_type, updated_at FROM ${base} WHERE game = ?`, [game])
          }
        } catch (e) {
          console.error(`[DB] 迁移 ${base} → ${newTable} 失败:`, e.message)
        }
      }
    }
  }

  for (const t of oldTables) {
    if (tableExists(t)) {
      db.run(`DROP TABLE IF EXISTS ${t}`)
    }
  }

  saveDB()
  console.log('[DB] 旧表迁移完成')
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

  const isNewDB = !fs.existsSync(dbPath)
  if (isNewDB) {
    db = new SQL.Database()
  } else {
    const fileBuffer = fs.readFileSync(dbPath)
    db = new SQL.Database(fileBuffer)
  }

  for (const game of GAMES_LIST) {
    for (const [base, schemaFn] of Object.entries(TABLE_SCHEMAS)) {
      const table = tbl(game, base)
      db.run(schemaFn(table))
      ;(TABLE_INDEXES[base](table) || []).forEach(idx => db.run(idx))
    }
  }

  if (!isNewDB) {
    migrateOldTables()
  }

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

function getAccounts(game = 'zzz') {
  return queryAll(`SELECT uid, region, game_biz, last_sync_time FROM ${tbl(game, 'accounts')}`, [])
}

function upsertAccount(uid, authkey, region, gameBiz, game = 'zzz') {
  db.run(`INSERT OR REPLACE INTO ${tbl(game, 'accounts')} (uid, authkey, region, game_biz, created_at)
    VALUES (?, ?, ?, ?, COALESCE((SELECT created_at FROM ${tbl(game, 'accounts')} WHERE uid = ?), CURRENT_TIMESTAMP))`,
    [uid, authkey, region, gameBiz, uid])
  saveDB()
}

function upsertIcons(icons, game = 'zzz') {
  const table = tbl(game, 'icons')
  for (const item of icons) {
    db.run(`INSERT OR REPLACE INTO ${table} (alias_name, icon_url, item_type, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
      [item.alias_name, item.icon_url, item.item_type])
  }
  saveDB()
}

function insertGachaRecords(records, game = 'zzz') {
  const table = tbl(game, 'gacha_records')
  for (const r of records) {
    db.run(`INSERT OR IGNORE INTO ${table} (id, uid, gacha_type, item_id, item_name, item_type, rank_type, gacha_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [r.id, r.uid, r.gacha_type, r.item_id, r.name, r.item_type, parseInt(r.rank_type), r.time])
  }
  saveDB()
}

function getExistingIds(uid, gachaType, game = 'zzz') {
  const rows = queryAll(`SELECT id FROM ${tbl(game, 'gacha_records')} WHERE uid = ? AND gacha_type = ?`, [uid, gachaType])
  return new Set(rows.map(r => r.id))
}

function getGachaStats(uid, gachaType, minRank = 3, game = 'zzz') {
  return queryAll(
    `SELECT item_name, rank_type, COUNT(*) as count
     FROM ${tbl(game, 'gacha_records')}
     WHERE uid = ? AND gacha_type = ? AND rank_type >= ?
     GROUP BY item_name, rank_type
     ORDER BY rank_type DESC, count DESC`,
    [uid, gachaType, minRank]
  )
}

function getTimeline(uid, gachaType, minRank = 4, game = 'zzz') {
  return queryAll(
    `SELECT item_name, gacha_time, rank_type, gacha_type, id
     FROM ${tbl(game, 'gacha_records')}
     WHERE uid = ? AND gacha_type = ? AND rank_type >= ?
     ORDER BY gacha_time ASC, id ASC`,
    [uid, gachaType, minRank]
  )
}

function getAllOrderedIds(uid, gachaType, game = 'zzz') {
  return queryAll(
    `SELECT id FROM ${tbl(game, 'gacha_records')}
     WHERE uid = ? AND gacha_type = ?
     ORDER BY gacha_time ASC, id ASC`,
    [uid, gachaType]
  )
}

function getIconMap(game = 'zzz') {
  const rows = queryAll(`SELECT alias_name, icon_url FROM ${tbl(game, 'icons')}`, [])
  const map = {}
  for (const row of rows) {
    map[row.alias_name] = row.icon_url
    map[`\u300c${row.alias_name}\u300d`] = row.icon_url
  }
  return map
}

function updateSyncTime(uid, game = 'zzz') {
  db.run(`UPDATE ${tbl(game, 'accounts')} SET last_sync_time = CURRENT_TIMESTAMP WHERE uid = ?`, [uid])
  saveDB()
}

function getGachaCountByType(uid, gachaType, game = 'zzz') {
  const row = queryOne(`SELECT COUNT(*) as count FROM ${tbl(game, 'gacha_records')} WHERE uid = ? AND gacha_type = ?`, [uid, gachaType])
  return row ? row.count : 0
}

function getGachaCountByRank(uid, gachaType, rankType, game = 'zzz') {
  const row = queryOne(`SELECT COUNT(*) as count FROM ${tbl(game, 'gacha_records')} WHERE uid = ? AND gacha_type = ? AND rank_type = ?`, [uid, gachaType, rankType])
  return row ? row.count : 0
}

function getCurrentPity(uid, gachaType, minRank, game = 'zzz') {
  const allIds = queryAll(
    `SELECT id FROM ${tbl(game, 'gacha_records')} WHERE uid = ? AND gacha_type = ? ORDER BY gacha_time ASC, id ASC`,
    [uid, gachaType]
  )
  if (allIds.length === 0) return 0

  const lastHit = queryOne(
    `SELECT id FROM ${tbl(game, 'gacha_records')}
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
  insertGachaRecords, getExistingIds, getGachaStats, getTimeline, getIconMap,
  updateSyncTime, getGachaCountByType, getGachaCountByRank,
  getCurrentPity, getAllOrderedIds
}
