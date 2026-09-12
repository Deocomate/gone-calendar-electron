# Gone Calendar — Codebase Summary

**Last updated:** 2026-08-31  
**Version:** 0.1.0  
**Build status:** All 10 phases complete, 100/100 tests passing, 0 TypeScript errors, clean production build. CI (`.github/workflows/ci.yml`) runs typecheck + tests + build on every push and PR.

---

## Directory Map

```
gone-calendar/
├── src/
│   ├── main/                    # Electron main process
│   │   ├── index.ts             # App lifecycle, window creation, single-instance lock
│   │   ├── ipc.ts               # Central IPC handler registration
│   │   ├── ipc/                 # IPC handler modules
│   │   │   ├── auth-sync-ipc.ts # OAuth connect/disconnect + sync trigger handlers
│   │   │   ├── calendar-ipc.ts  # Calendar + event + ICS IPC handlers
│   │   │   ├── holiday-ipc.ts   # Holiday subscription IPC handlers
│   │   │   ├── settings-ipc.ts  # Settings get/set IPC handlers
│   │   │   └── tasks-ipc.ts     # Task CRUD IPC handlers
│   │   ├── db/                  # Database layer
│   │   │   ├── database.ts      # initDatabase, runMigrations, seedDefaultData
│   │   │   ├── sqlite-driver.ts # ISqliteDatabase abstraction (node:sqlite / better-sqlite3)
│   │   │   ├── migrations/      # SQL migration files (001-init, 002-fts-attendees, 003-tasks)
│   │   │   └── repos/           # Repository classes (calendars, events, settings, tasks)
│   │   ├── sync/                # Provider sync engines
│   │   │   ├── sync-worker.ts   # SyncWorker: poll loop, adaptive interval (60s focus / 5m blur)
│   │   │   ├── google-sync-engine.ts    # Google Calendar API v3 two-way sync
│   │   │   ├── google-event-mapper.ts   # Google event JSON ↔ canonical CalendarEvent
│   │   │   ├── microsoft-sync-engine.ts # Microsoft Graph two-way sync
│   │   │   ├── microsoft-event-mapper.ts # Graph event ↔ canonical CalendarEvent
│   │   │   ├── graph-recurrence-map.ts  # Graph recurrence patterns ↔ RFC 5545 RRULE
│   │   │   ├── caldav-sync-engine.ts    # CalDAV tsdav two-way sync
│   │   │   ├── caldav-adapter.ts        # CalDAV calendar discovery + adapter
│   │   │   └── caldav-discover.ts       # RFC 6764 DNS/well-known server discovery
│   │   ├── ics/                 # ICS import/export
│   │   │   ├── parse-ics.ts     # ical.js parser → canonical events
│   │   │   └── write-ics.ts     # Canonical events → RFC 5545 ICS file
│   │   ├── oauth/               # OAuth flows
│   │   ├── notifications/
│   │   │   └── reminder-scheduler.ts # OS notification scheduling (Windows + Linux)
│   │   ├── mini-window.ts       # Frameless companion mini window
│   │   ├── tray.ts              # System tray icon and context menu
│   │   ├── secure-store.ts      # safeStorage wrapper for OAuth tokens and CalDAV credentials
│   │   └── types/               # Third-party type stubs (ical.js)
│   ├── preload/
│   │   ├── index.ts             # contextBridge: exposes window.gone API (GoneAPI typed)
│   │   └── index.d.ts           # TypeScript declarations for preload
│   ├── renderer/
│   │   └── src/
│   │       ├── App.tsx          # Root component: shell, routing, global keyboard listener
│   │       ├── main.tsx         # Entry: dual-mode router (App vs MiniApp via #mini hash)
│   │       ├── views/           # Calendar view components
│   │       │   ├── DayView.tsx
│   │       │   ├── WeekView.tsx
│   │       │   ├── MonthView.tsx
│   │       │   ├── YearView.tsx
│   │       │   └── ListView.tsx
│   │       ├── components/      # UI components
│   │       │   ├── shell/       # AppHeader.tsx, ViewSwitcher.tsx
│   │       │   ├── ui/          # Primitives: NumberInput, TextInput, TextArea, ToggleSwitch, Checkbox, index.ts
│   │       │   ├── MiniCalendar.tsx
│   │       │   ├── EventPill.tsx
│   │       │   ├── EventHoverFlyout.tsx
│   │       │   ├── LunarLabel.tsx
│   │       │   ├── WeekNumber.tsx
│   │       │   ├── TaskPane.tsx
│   │       │   ├── TaskModal.tsx
│   │       │   ├── AccountManagerModal.tsx
│   │       │   ├── CalDavConnectModal.tsx
│   │       │   ├── HolidayCalendarToggle.tsx
│   │       │   ├── KeyboardShortcutsModal.tsx
│   │       │   ├── SearchPaletteModal.tsx
│   │       │   ├── ThemeSettingsModal.tsx
│   │       │   ├── AttendeeInput.tsx
│   │       │   └── ErrorBoundary.tsx
│   │       ├── editor/          # Event editor components
│   │       ├── dnd/             # Drag and drop: use-event-dnd.ts, drop-target.ts, DropActionPopover.tsx
│   │       ├── mini/            # MiniApp.tsx (companion window renderer)
│   │       ├── hooks/           # use-theme.ts, use-visible-range.ts
│   │       ├── i18n/            # i18next setup, vi/en translation strings
│   │       └── styles/          # index.css: design tokens, Tailwind layers
│   └── shared/                  # Shared contracts (used by both main and renderer)
│       ├── event-model.ts       # CalendarAccount, Calendar, CalendarEvent, ExpandedOccurrence, etc.
│       ├── task-model.ts        # TaskItem, CreateTaskInput, UpdateTaskInput, ThemeConfig
│       ├── settings-contract.ts # Settings keys and value types
│       ├── theme-mode.ts        # ThemeMode enum
│       ├── mini-calendar-grid.ts # Grid computation utilities
│       ├── visible-range.ts     # Visible date range helpers
│       └── ipc-contract.ts      # IPC_CHANNELS constants and GoneAPI interface
├── tests/                       # Vitest unit tests (100 tests / 22 files)
│   └── stubs/electron.ts        # `electron` module stub for main-process tests
├── docs/
│   ├── urd.md                   # User Requirements Document
│   ├── design-guidelines.md     # Visual language and design tokens
│   ├── project-overview-pdr.md  # Product overview + decision record (this plane)
│   ├── codebase-summary.md      # This file
│   ├── system-architecture.md
│   ├── code-standards.md
│   └── journals/                # Per-phase implementation journals
└── plans/
    └── 260818-2006-electron-gone-calendar-rebuild/
        ├── plan.md              # Master plan (all 10 phases)
        └── phase-01 … phase-10  # Phase detail documents
```

---

## Module Responsibilities

### `src/main` (Electron Main Process)

| File/Dir | Responsibility |
|----------|----------------|
| `index.ts` | App lifecycle, single-instance lock, window creation, focus/blur → adaptive sync |
| `ipc.ts` | Registers all IPC handler groups on startup |
| `ipc/` | Five handler modules: auth+sync, calendar+event+ICS, settings, tasks, holidays |
| `db/database.ts` | `initDatabase()`, `runMigrations()`, `seedDefaultData()` |
| `db/sqlite-driver.ts` | `ISqliteDatabase` abstraction over `node:sqlite` / `better-sqlite3` |
| `db/repos/` | Repository pattern: CalendarsRepo, EventsRepo, SettingsRepo, TasksRepo |
| `sync/sync-worker.ts` | Poll loop; 60s interval on window focus, 5m when blurred |
| `sync/*-sync-engine.ts` | Google, Microsoft Graph, CalDAV two-way sync engines |
| `ics/` | ICS file import (ical.js) and export (RFC 5545 writer) |
| `secure-store.ts` | `safeStorage` wrapper; fail-closed on Linux if keyring unavailable |
| `mini-window.ts` | Frameless 380×520 companion window; always-on-top toggle |
| `tray.ts` | System tray icon, context menu, single-click toggle |
| `notifications/reminder-scheduler.ts` | Polls upcoming events; fires OS notifications |

### `src/preload`

`index.ts` exposes `window.gone` via `contextBridge`. Sandbox + contextIsolation enabled. Renderer has no direct Node.js access.

**`window.gone` API namespaces:**

| Namespace | Methods |
|-----------|---------|
| `app` | `getVersion`, `getLocale`, `setLocale`, `getPlatform` |
| `settings` | `getAll`, `get`, `set` |
| `auth` | `connectGoogle`, `disconnectGoogle`, `connectMicrosoft`, `disconnectMicrosoft`, `connectCalDav`, `disconnectCalDav`, `listAccounts` |
| `sync` | `triggerNow`, `getStatus` |
| `calendars` | `list`, `create`, `update`, `delete` |
| `events` | `queryRange`, `getById`, `create`, `update`, `delete`, `move`, `copy`, `updateScope`, `deleteScope`, `upsertException`, `search`, `shareIcs` |
| `ics` | `importIcs`, `exportIcs` |
| `tasks` | `list`, `create`, `update`, `toggle`, `delete` |
| `mini` | `openMain`, `toggle`, `getUpcoming`, `setAlwaysOnTop` |
| `holidays` | `subscribe`, `unsubscribe` |

### `src/renderer` (React App)

Entry: `main.tsx` detects `#mini` URL hash to route to `MiniApp` (companion widget) vs `App` (main calendar).

**`App.tsx`** orchestrates:
- Active view routing (Day/Week/Month/Year/List)
- Global keyboard shortcuts listener (T=today, 1–5=views, N/C=new event, /=search, ?/F1=shortcuts modal)
- Sidebar tabs (Calendar vs Tasks)
- Theme background layer and ThemeSettingsModal
- Holiday toggle in sidebar

**Views:** All five calendar layouts are custom React components with no third-party calendar shell.

**DnD:** `use-event-dnd.ts` + `drop-target.ts` implement pointer-based drag. Timed Week/Day drops snap to 15 minutes (not whole hours), keep the grab point under the cursor, and shift multi-day timed events as a whole so a resized 2-day slice does not collapse to one hour. On drop: `DropActionPopover` renders Move / Copy (full series) / Copy (this instance only) / Cancel. Timed blocks on Week/Day also support edge resize (`use-event-resize.ts`): N/S changes time (15-min snap), E/W on Week stretches across days. Multi-day timed occurrences are split in `timed-event-segments.ts`.

### `src/shared`

TypeScript contracts shared between main and renderer via `@shared/*` path alias. Contains no runtime DOM or Node.js dependencies.

Key types: `CalendarEvent`, `ExpandedOccurrence`, `Calendar`, `CalendarAccount`, `TaskItem`, `GoneAPI`, `IPC_CHANNELS`.

---

## Database Schema (3 migrations)

**Migration 001 — Core:**
- `accounts` — provider accounts (local, google, graph, caldav)
- `calendars` — per-account calendars with visibility and color
- `events` — full event data including RRULE, attendees JSON, etag, dirty flag
- `event_exceptions` — VEVENT EXDATE overrides for recurring events
- `sync_state` — per-account/calendar sync tokens and last-sync timestamps
- `settings` — key/value settings store

**Migration 002 — FTS + Attendees:**
- `attendees` — normalized attendee rows (email, displayName, responseStatus)
- `events_fts` — FTS5 virtual table over title, notes, location (auto-maintained via triggers)

**Migration 003 — Tasks:**
- `tasks` — local tasks (title, due_date, completed, show_on_calendar)

---

## Test Coverage

```
tests/
├── lunar-vietnam.test.ts          # Lunar ↔ solar conversion accuracy
├── expand-occurrences.test.ts     # RRULE expansion correctness
├── recurring-scope.test.ts        # this / this-and-future / all scope edits
├── copy-instance.test.ts          # Recurring single-instance copy
├── event-copy-uid.test.ts         # UID handling on event copy
├── ics-roundtrip.test.ts          # ical.js import + RFC 5545 export round-trips
├── database-repos.test.ts         # SQLite calendars / events / settings repos
├── tasks-repo.test.ts             # Task CRUD, completion toggle, due date sort
├── fts-search.test.ts             # FTS5 search over cached events
├── google-event-mapper.test.ts    # Google → canonical mapping
├── microsoft-event-mapper.test.ts # Graph → canonical mapping
├── graph-recurrence-map.test.ts   # Graph recurrence ↔ RRULE
├── caldav-discover-url.test.ts     # RFC 6764 server discovery
├── secure-store.test.ts           # safeStorage fail-closed behavior
├── holiday-calendars.test.ts      # Holiday generation and lunar-to-solar
├── visible-range.test.ts          # Date range utilities
├── mini-calendar-grid.test.ts     # Mini-window month grid computation
├── timed-event-segments.test.ts   # Multi-day timed occurrence splitting
├── drop-target.test.ts            # DnD drop target math (renderer)
├── resize-math.test.ts            # Event edge-resize math (renderer)
├── ui-components.test.ts          # UI primitive + editor SSR smoke (renderer)
└── ipc-contract.test.ts           # IPC channel and API surface contract
```

**Total: 100 tests across 22 files. All passing.**

Main-process tests run in plain Node; the `electron` module is aliased to
`tests/stubs/electron.ts` in `vitest.config.ts` so they do not need the Electron
binary. Renderer-touching tests (`drop-target`, `resize-math`, `ui-components`)
are typechecked under `tsconfig.web.json`; all others under `tsconfig.node.json`.

---

## Key Dependencies

| Package | Role |
|---------|------|
| `electron` 35+ | Cross-platform desktop shell |
| `electron-vite` | Build + dev server |
| `react` 19 | Renderer UI |
| `tailwindcss` 4 | Styling |
| `luxon` | Date/time + timezone handling |
| `rrule` | RFC 5545 recurrence expansion |
| `ical.js` | ICS import/export |
| `i18next` / `react-i18next` | vi/en internationalization |
| `lucide-react` | Icon set |
| `vitest` | Unit test runner |
