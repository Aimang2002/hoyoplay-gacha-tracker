# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ZZZ Gacha Stats (绝区零抽卡统计) — a desktop app for tracking and visualizing gacha pull statistics from Zenless Zone Zero. Built with Electron 33 + React 18 + Vite 5.

## Commands

```bash
npm install        # Install dependencies
npm run dev        # Development (Vite on :5173 + Electron, uses concurrently + wait-on)
npm run build      # Vite production build to dist/
npm run build:win  # Build + electron-builder (Windows unpacked, outputs to release/)
npm run start      # Run production Electron build
```

No test runner, linter, or formatter is configured.

## Architecture

**Electron main process** (`electron/`):
- `main.js` — Window creation (frameless, transparent, 1280x860), IPC handler registration, dynamic zoom on resize
- `preload.js` — `contextBridge.exposeInMainWorld("electronAPI", ...)` — all renderer↔main communication goes through this
- `db.js` — sql.js (WASM SQLite) with write-through persistence (`saveDB()` called after every mutation). Tables: `accounts`, `icons`, `gacha_records`
- `api.js` — Fetches gacha records from `public-operation-nap.mihoyo.com` (paginated, 350ms throttle between pages) and Wiki icons. Implements incremental sync by checking latest record ID per pool type
- `parser.js` — Reads `Player.log` from `%LOCALAPPDATA%/../LocalLow/miHoYo/绝区零/` to extract authkey URL (Windows-specific)

**React renderer** (`src/`):
- `App.jsx` — Central state manager: accounts, UID, sync state, active pool, rank filter, stats/timeline/counts/icons/pity data. All data loaded via `window.electronAPI.invoke()` calls
- `components/GachaPieChart.jsx` — ECharts donut chart per gacha pool
- `components/STimeline.jsx` — Vertical timeline of S/A rank pulls with date grouping and pity progress bar
- `components/ShareExport.jsx` — Offscreen 1080x1920 DOM rendered via html2canvas for PNG export
- `components/TitleBar.jsx` — Custom frameless window controls (minimize/maximize/close via IPC)

**IPC channels**: `parse-log`, `sync-data`, `sync-icons`, `get-accounts`, `get-gacha-stats`, `get-timeline`, `get-icon-map`, `get-gacha-count`, `get-current-pity`, plus window control events and `sync-progress`/`window-state-changed` renderer-bound events.

## Key Details

- **Gacha pool types**: `1` (邦布), `2` (常驻), `3` (独家), `5` (活动). The API also supports `102`/`103` but the app uses 1/2/3/5
- **Rank types**: `"2"` = B, `"3"` = A, `"4"` = S. UI only displays A-rank and above
- **sql.js is in-memory WASM** — every write must be followed by `saveDB()` to persist to disk
- **Duplicate utility functions**: `formatTime`, `formatDate`, `getDateKey`, `getPityColor` exist in both `STimeline.jsx` and `ShareExport.jsx`
- **Single-file CSS**: all styles in `App.css` using CSS custom properties
- **Windows-only**: `parser.js` uses `LOCALAPPDATA` env var; `app.isPackaged` affects path resolution for DB and WASM files
- **electron-builder config** is in `package.json` under the `"build"` key, not a separate config file
- **ELECTRON_CACHE=.cache** — Electron binaries cached locally in `.cache/` directory
