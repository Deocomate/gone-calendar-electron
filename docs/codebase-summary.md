# Gone Calendar — Codebase Summary

**Last updated:** 2026-08-31  
**Version:** 0.1.0  
**Build status:** All 10 phases complete, 333/333 tests passing, 0 TypeScript errors, clean production build. CI (`.github/workflows/ci.yml`) runs typecheck + tests + build on every push and PR.

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
│   │       │   ├── shell/       # AppHeader.tsx, AppSidebar.tsx, ViewSwitcher.tsx
│   │       │   ├── ui/          # Primitives: TextInput, TextArea, NumberInput, CustomSelect, DatePicker, TimePicker, ToggleSwitch, Checkbox, FormRow, toast, index.ts
│   │       │   ├── MiniCalendar.tsx
│   │       │   ├── EventPill.tsx
│   │       │   ├── TimedEventBlock.tsx
│   │       │   ├── HourGutter.tsx       # Merged primary + secondary clock gutter
│   │       │   ├── DayPeekPopover.tsx   # Month-view day peek
│   │       │   ├── SettingsPanel.tsx    # Right-side settings drawer (root list + one level)
│   │       │   ├── AppearanceSettings.tsx
│   │       │   ├── LunarLabel.tsx
│   │       │   ├── WeekNumber.tsx
│   │       │   ├── ResizeTimeTooltip.tsx
│   │       │   ├── AccountManagerModal.tsx
│   │       │   ├── CalDavConnectModal.tsx
│   │       │   ├── SyncConflictsModal.tsx
│   │       │   ├── HolidayCalendarToggle.tsx
│   │       │   ├── KeyboardShortcutsModal.tsx
│   │       │   ├── SearchPaletteModal.tsx
│   │       │   └── ErrorBoundary.tsx
│   │       ├── editor/          # EventEditorDialog, RecurringScopeDialog, TitleSuggestInput
│   │       ├── dnd/             # Drag and drop: use-event-dnd.ts, drop-target.ts, DropActionPopover.tsx
│   │       ├── mini/            # MiniApp.tsx (companion window renderer)
│   │       ├── hooks/           # use-theme.ts, use-visible-range.ts
│   │       ├── i18n/            # i18next setup, vi/en translation strings
│   │       └── styles/          # index.css: design tokens, Tailwind layers
│   └── shared/                  # Shared contracts (used by both main and renderer)
│       ├── event-model.ts       # CalendarAccount, Calendar, CalendarEvent, ExpandedOccurrence, etc.
│       ├── all-day.ts           # Floating-date vs instant: inclusive/exclusive ends, day keys
│       ├── occurrence-order.ts  # Within-day ordering (all-day first, then by time)
│       ├── title-suggestions.ts # Ranking for the event-title autocomplete
│       ├── expand-occurrences.ts # RRULE + exception expansion
│       ├── lunar-vietnam.ts     # Vietnamese lunar calendar conversion
│       ├── timed-event-segments.ts # Splits multi-day timed occurrences per day
│       ├── day-highlight.ts     # Today / selection highlight rules
│       ├── holiday-calendars.ts # Built-in holiday subscription definitions
│       ├── time-format.ts       # 12h/24h formatting helpers
│       ├── settings-contract.ts # Settings keys and value types
│       ├── theme-mode.ts        # ThemeMode enum
│       ├── mini-calendar-grid.ts # Grid computation utilities
│       ├── visible-range.ts     # Visible date range helpers
│       └── ipc-contract.ts      # IPC_CHANNELS constants and GoneAPI interface
├── tests/                       # Vitest unit tests (333 tests / 41 files)
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
- Theme background layer and the `SettingsPanel` drawer
- Holiday toggle in sidebar

**Views:** All five calendar layouts are custom React components with no third-party calendar shell.

**DnD:** `use-event-dnd.ts` + `drop-target.ts` implement pointer-based drag.
Drops snap to the `dragSnapMinutes` setting (15 / 30 / 60), which is passed in
rather than read from context - `useEventDnD` is called from App's own body,
above the provider App renders. `resolveDropRange` makes the one decision a drop
has to make: the all-day lane makes an occurrence all-day, the hourly grid makes
it timed at the cursor for an hour, a plain day cell keeps its time and changes
the date, and anything else shifts by the drag delta with its span intact. The
start is always snapped onto the grid afterwards, because the delta is measured
from the dragged slice and would otherwise carry the event's own odd minutes
through. Alt-drag copies, and a copy keeps only the title, calendar and length.
On drop via the popover: `DropActionPopover` renders Move / Copy (full series) /
Copy (this instance only) / Cancel.

Edge resize (`use-event-resize.ts`) is **vertical only** - north and south change
the time on the same snap grid. East/west used to stretch an event across whole
days; it was easy to catch while aiming to drag a block, turned one-hour events
into 25-hour ones, and was removed. Multi-day timed occurrences are still split
for display in `timed-event-segments.ts`.

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
├── recurring-scope.test.ts        # this / this-and-future / all scope edits, and moving between calendars
├── occurrence-all-day-override.test.ts # Per-occurrence all-day detach (drag onto the hour grid)
├── occurrence-order.test.ts       # Within-day ordering: all-day first, then by time
├── title-suggestions.test.ts      # Title autocomplete ranking: frequency, recency, time and day fit
├── title-samples-repo.test.ts     # Which rows reach that ranking
├── copy-instance.test.ts          # Recurring single-instance copy
├── event-copy-uid.test.ts         # UID handling on event copy
├── all-day-end.test.ts            # Provider exclusive end ↔ app inclusive end
├── all-day-covers-date.test.ts    # Which days a multi-day all-day event marks
├── layout-allday-events.test.ts   # All-day lane layout (integer day arithmetic)
├── ics-roundtrip.test.ts          # ical.js import + RFC 5545 export round-trips
├── database-repos.test.ts         # SQLite calendars / events / settings repos
├── migration-007.test.ts          # Migration SQL applied directly, not by rewinding
├── provider-event-id.test.ts      # The local id never changes when a provider assigns its own
├── exception-upsert.test.ts       # event_exceptions upsert needs its UNIQUE index
├── exception-sync.test.ts         # Occurrence exceptions push to Google / Graph
├── calendar-color-ownership.test.ts # A local colour edit touches one calendar only
├── detach-account.test.ts         # Detach keeps calendars, events and exceptions
├── backup.test.ts                 # VACUUM INTO snapshot, WAL-safe
├── fts-search.test.ts             # FTS5 search over cached events
├── google-event-mapper.test.ts    # Google → canonical mapping
├── microsoft-event-mapper.test.ts # Graph → canonical mapping
├── graph-recurrence-map.test.ts   # Graph recurrence ↔ RRULE
├── sync-pagination.test.ts        # nextPageToken / @odata.nextLink paging
├── http-timeout.test.ts           # fetchWithTimeout aborts a stalled request; failures describe themselves
├── push-event-id.test.ts          # Outgoing payloads never carry our local event id
├── caldav-discover-url.test.ts    # RFC 6764 server discovery
├── secure-store.test.ts           # safeStorage fail-closed behavior
├── external-url-guard.test.ts     # will-navigate / window-open guards
├── holiday-calendars.test.ts      # Holiday generation and lunar-to-solar
├── visible-range.test.ts          # Date range utilities
├── mini-calendar-grid.test.ts     # Mini-window month grid computation
├── timed-event-segments.test.ts   # Multi-day timed occurrence splitting
├── drop-target.test.ts            # DnD drop target math, incl. all-day dropped onto the hour grid (renderer)
├── resize-math.test.ts            # Event edge-resize math and the snap-step setting (renderer)
├── ui-components.test.ts          # UI primitive + editor SSR smoke (renderer)
├── i18n-parity.test.ts            # vi and en keep the same key set
├── stale-event-error.test.ts      # Detecting an event re-keyed by a sync (renderer)
└── ipc-contract.test.ts           # IPC channel and API surface contract
```

**Total: 333 tests across 41 files. All passing.**

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
