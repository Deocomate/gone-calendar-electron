# Gone Calendar — System Architecture

**Last updated:** 2026-08-18

---

## Process Architecture

Gone Calendar follows Electron's multi-process model with strict security boundaries.

```
┌─────────────────────────────────────────────────────────────┐
│  Renderer Process (sandboxed, contextIsolation, no Node.js) │
│                                                             │
│  React App (App.tsx)                                        │
│  ├── Views: Day / Week / Month / Year / List                │
│  ├── Editor: Event editor (full form, not popover-first)    │
│  ├── DnD: use-event-dnd + DropActionPopover                 │
│  ├── Sidebar: MiniCalendar + CalendarList + TaskPane        │
│  ├── Modals: AccountManager, CalDavConnect, Search,         │
│  │            ThemeSettings, KeyboardShortcuts              │
│  └── State: Zustand stores (UI cache only)                  │
│                                                             │
│  MiniApp (companion window via #mini hash)                  │
│  └── Upcoming events list + task quick-add                  │
└───────────────────────┬─────────────────────────────────────┘
                        │ contextBridge (window.gone)
                        │ contextIsolation: true
                        │ nodeIntegration: false
┌───────────────────────▼─────────────────────────────────────┐
│  Preload Script                                             │
│  exposes window.gone (GoneAPI) via contextBridge            │
│  Typed IPC_CHANNELS from @shared/ipc-contract               │
└───────────────────────┬─────────────────────────────────────┘
                        │ ipcRenderer.invoke / ipcMain.handle
┌───────────────────────▼─────────────────────────────────────┐
│  Main Process                                               │
│                                                             │
│  index.ts                                                   │
│  ├── App lifecycle (single-instance lock, BrowserWindow)    │
│  ├── ipc.ts → registers all IPC handler groups              │
│  │                                                          │
│  ├── DB Layer                                               │
│  │   ├── sqlite-driver.ts (node:sqlite / better-sqlite3)   │
│  │   ├── database.ts (migrations, seed)                     │
│  │   └── repos/ (CalendarsRepo, EventsRepo, TasksRepo, …)  │
│  │                                                          │
│  ├── Sync Layer                                             │
│  │   ├── sync-worker.ts (poll loop, adaptive interval)      │
│  │   ├── google-sync-engine.ts (Calendar API v3)            │
│  │   ├── microsoft-sync-engine.ts (Graph API)               │
│  │   └── caldav-sync-engine.ts (tsdav)                     │
│  │                                                          │
│  ├── ICS Layer (ical.js import, RFC 5545 export)           │
│  ├── OAuth (loopback PKCE for Google; MSAL for Microsoft)  │
│  ├── Secure Store (safeStorage wrapper)                     │
│  ├── Notifications (reminder-scheduler.ts)                  │
│  ├── System Tray (tray.ts)                                  │
│  └── Mini Window (mini-window.ts, frameless BrowserWindow) │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### Reading Events (Renderer → Main → SQLite)

```
User navigates to Week view
  → App.tsx computes visible date range
  → window.gone.events.queryRange(calendarIds, startUtc, endUtc)
  → ipcMain.handle(EVENT.QUERY_RANGE)
  → EventsRepo.queryRange() → SQLite SELECT + RRULE expansion
  → Returns ExpandedOccurrence[] to renderer
  → Zustand store updates → React re-renders
```

### Writing an Event

```
User submits event editor
  → window.gone.events.create(input) or .update(id, input)
  → ipcMain.handle(EVENT.CREATE/UPDATE)
  → EventsRepo writes to SQLite (dirty = 1 for synced calendars)
  → Returns saved event to renderer
  → Renderer updates Zustand store
  → SyncWorker next poll: pushes dirty events to provider
```

### Sync Loop

```
SyncWorker.start()
  → setInterval (60s focused / 5m blurred)
  → For each active account:
      GoogleSyncEngine.sync() / MicrosoftSyncEngine.sync() / CalDavSyncEngine.sync()
      → Pull: fetch remote changes → upsert into SQLite (dirty = 0)
      → Push: SELECT events WHERE dirty = 1 → push to provider → clear dirty
  → Emit sync-complete IPC event to renderer
```

### Authentication (Google example)

```
window.gone.auth.connectGoogle()
  → Main opens loopback HTTP server on random port
  → shell.openExternal(Google OAuth URL with redirect_uri=localhost:PORT)
  → User authorizes in OS browser
  → Loopback server captures ?code=... callback
  → Main exchanges code for access_token + refresh_token
  → safeStorage.encryptString(refresh_token) → stored in SQLite encrypted
  → Account row inserted → calendars fetched → initial sync triggered
```

---

## Database Schema

### Tables

```sql
-- Provider accounts
accounts (id, type, name, email, is_active, created_at, updated_at)

-- Calendars belonging to accounts
calendars (id, account_id FK→accounts, name, color, is_visible, is_read_only,
           is_default, sync_token, created_at, updated_at)

-- Calendar events (master records)
events (id, calendar_id FK→calendars, uid, title, notes, location,
        dtstart_utc, dtend_utc, tzid, all_day, rrule, rdate, exdate,
        color, meeting_url, etag, dirty, is_deleted, created_at, updated_at)

-- VEVENT overrides for recurring series
event_exceptions (id, master_event_id FK→events, original_start_utc,
                  is_cancelled, title, notes, location, dtstart_utc,
                  dtend_utc, tzid, color, created_at, updated_at)

-- Attendees (normalized, R2+)
attendees (id, event_id FK→events, email, display_name, response_status,
           is_organizer, created_at)

-- FTS5 full-text search over events
events_fts (event_id UNINDEXED, title, notes, location)
-- Maintained by INSERT/UPDATE/DELETE triggers

-- Per-account/calendar sync state
sync_state (id, account_id FK→accounts, calendar_id FK→calendars,
            last_synced_at, sync_token, sync_status, error_message)

-- App settings (key/value)
settings (key, value, updated_at)

-- Local tasks (R3+)
tasks (id, title, due_date, completed, show_on_calendar, created_at, updated_at)
```

### Key Indexes

- `idx_events_calendar_range` — on `(calendar_id, is_deleted, dtstart_utc, dtend_utc)` for view range queries
- `idx_events_uid` — for upsert-by-UID during sync
- `idx_event_exceptions_master` — for recurrence exception lookup
- `idx_tasks_due_date`, `idx_tasks_completed` — for task filtering

---

## IPC Contract

All IPC channels are constants in `src/shared/ipc-contract.ts`. The `GoneAPI` interface mirrors `window.gone` and is the single source of truth for the preload bridge.

**Namespace groups:** `APP`, `SETTINGS`, `AUTH`, `SYNC`, `CALENDAR`, `EVENT`, `ICS`, `TASK`, `MINI`, `HOLIDAYS`

---

## Provider Adapter Design

Each provider has a sync engine that implements the same pattern:

```ts
class GoogleSyncEngine {
  async sync(account: CalendarAccount): Promise<SyncResult>
  // 1. Fetch remote changes (incremental via syncToken, or full if absent)
  // 2. Normalize: Google event JSON → CalendarEvent (via google-event-mapper.ts)
  // 3. Upsert into SQLite (EventsRepo.upsertFromSync)
  // 4. Push dirty local events to Google API (EventsRepo.getDirty → PATCH/POST)
  // 5. Update sync tokens in sync_state
}
```

**Normalization rule:** Provider-specific fields (Google `recurringEventId`, Graph `seriesMasterId`, iCal `RECURRENCE-ID`) are mapped to the canonical model before being stored. No provider JSON leaks into SQLite or the renderer.

---

## Shared Module (`src/shared`)

The `shared` directory is the only place that both main and renderer can import. It must have **zero Node.js and zero DOM dependencies**.

Key contracts:
- `event-model.ts` — all domain types
- `ipc-contract.ts` — IPC channel names and `GoneAPI` interface
- `settings-contract.ts` — settings keys and types
- `task-model.ts` — task and theme types
- `mini-calendar-grid.ts` — pure grid computation
- `visible-range.ts` — date range helpers

---

## Security Boundaries

| Control | Value |
|---------|-------|
| `sandbox` | `true` on all BrowserWindows |
| `contextIsolation` | `true` |
| `nodeIntegration` | `false` |
| `webSecurity` | `true` |
| Token storage | `safeStorage.encryptString()` only |
| External links | `shell.openExternal()`, never `loadURL()` |
| CalDAV TLS | Default-deny self-signed; per-host SHA-256 pin only |
| ICS import | Size-capped to prevent memory exhaustion |
| Read-only calendars | IPC handlers reject writes with explicit error |

---

## Mini Window Architecture

The companion mini window (`mini-window.ts`) is a second frameless `BrowserWindow` that loads the same renderer HTML file but with `#mini` appended to the URL. `main.tsx` detects this hash and renders `MiniApp` instead of `App`, keeping a single Vite build output for both surfaces.

The mini window communicates with the main process via its own set of IPC handlers registered by `registerMiniIpcHandlers()` (separate from the main event IPC to avoid channel collisions).

---

## Build & Packaging

```
electron-vite build
├── out/main/index.js      # Main process bundle (Node.js ESM)
├── out/preload/index.js   # Preload bundle (CommonJS)
└── out/renderer/          # React app (Vite static bundle)

electron-builder
├── Windows: NSIS x64 installer (pack:win)
└── Linux:   AppImage x64 (pack:linux)
```

**R1 Linux target:** Ubuntu LTS + AppImage. Fedora and `.deb` deferred post-R1.
