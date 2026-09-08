# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev            # electron-vite dev app with renderer HMR
npm run build          # production bundle -> out/{main,preload,renderer}
npm run typecheck      # typecheck:node && typecheck:web (run this before commit)
npm run typecheck:node # tsc -p tsconfig.node.json  (main + preload + shared + most tests)
npm run typecheck:web  # tsc -p tsconfig.web.json   (renderer + shared + renderer-touching tests)
npm run test           # vitest run (whole suite)
npm run pack:win       # build + electron-builder NSIS x64
npm run pack:linux     # build + electron-builder AppImage x64
```

Single test / focused runs (vitest is not exposed as an npm script):

```bash
npx vitest run tests/events-repo.test.ts     # one file
npx vitest run -t "expands weekly RRULE"      # one test by name
npx vitest                                    # watch mode
```

There is **no linter or formatter configured** (some source files contain `eslint-disable` comments but no ESLint is installed). `npm run typecheck` with the project's strict flags (`noUnusedLocals`, `noImplicitReturns`, etc.) is the only static gate. CI (`.github/workflows/ci.yml`) runs typecheck + test + build on every push/PR.

## Architecture

Electron desktop calendar (Windows + Linux). Local-first: **SQLite is the single source of truth for the UI**; provider sync engines only push/pull against it.

### Four layers, strict import boundaries

| Layer | May import | Notes |
|---|---|---|
| `src/main` | Node, Electron main, `src/shared` | app lifecycle, DB, OAuth, sync, tray, notifications |
| `src/preload` | `contextBridge`, `ipcRenderer`, `src/shared` | exposes `window.gone` |
| `src/renderer` | React, DOM, `src/shared`, `window.gone` | never imports `src/main` |
| `src/shared` | pure TS only | no Node, no DOM, no Electron — used by both sides |

IPC is the only bridge between renderer and main. See `docs/code-standards.md` for the full conventions (naming, i18n, security rules); the points below are the ones that span multiple files.

### IPC contract (touch all of these together)

`src/shared/ipc-contract.ts` holds `IPC_CHANNELS` (channel-string constants, grouped by domain) and the `GoneAPI` interface. Adding or changing an IPC method means editing, in lockstep:

1. `IPC_CHANNELS` + `GoneAPI` in `src/shared/ipc-contract.ts`
2. the bridge in `src/preload/index.ts` (and `src/preload/index.d.ts`)
3. a handler in the relevant `src/main/ipc/<domain>-ipc.ts` module
4. its `register*IpcHandlers()` call in `src/main/ipc.ts`

Never pass raw channel strings to `invoke`/`handle`. `tests/ipc-contract.test.ts` guards that the surface stays in sync.

### Database

- `src/main/db/sqlite-driver.ts` — `ISqliteDatabase` abstraction. Prefers `node:sqlite` (`DatabaseSync`), falls back to `better-sqlite3` if that native module is present (it is **not** a declared dependency). WAL + `foreign_keys = ON`. Nested `transaction()` calls use savepoints.
- Migrations are **inline SQL string constants** in `src/main/db/database.ts` (`MIGRATION_001_SQL` …), applied by `runMigrations()`, version-tracked in `schema_migrations`. The files under `src/main/db/migrations/*.sql` are reference copies only. Never edit an applied migration — add the next-numbered one and update both places.
- All SQL lives in repo classes under `src/main/db/repos/`. IPC handlers call repo methods, never `db.prepare` directly.
- Timestamps are ISO 8601 UTC strings everywhere. Events store `dtstart_utc` / `dtend_utc` + a `tzid` column for the original zone.

### Events, recurrence, read-only

- Canonical model: `CalendarEvent` / `ExpandedOccurrence` in `src/shared/event-model.ts`. Provider JSON is normalized by `src/main/sync/*-event-mapper.ts` and must never reach the renderer.
- `src/shared/expand-occurrences.ts` expands recurring masters via `rrule` and applies `event_exceptions` rows (EXDATE cancellations + per-instance overrides).
- Edit/delete of a recurring series is scoped `this` / `this-and-future` / `all` (`RecurringEditScope`); the renderer prompts via `RecurringScopeDialog`.
- **Lunar anniversaries** (`giỗ` / âm lịch): an event with a `lunar_rule` JSON column (`{day,month,leap}`) and no `rrule`. `expand-occurrences.ts` resolves one all-day occurrence per Gregorian year via `resolveLunarOccurrence()` in `src/shared/lunar-vietnam.ts` (leap-month + 29-day-month fallbacks, memoized). The master is local-only; `EventsRepo.materializeLunarEvent()` writes standalone `dirty=1` instances (linked by `lunar_source_event_id`) into a syncable calendar so they push to providers as ordinary events. `queryEventsByRange` passes a covered-years set so the synthetic master and its materialized instances never double-draw. Editing a lunar occurrence always applies to the whole series (no scope prompt); deleting still offers this-year vs series.
- Calendars with `is_read_only` (holiday subscriptions, some provider calendars) must have mutations rejected in the IPC handler.

### Sync

`src/main/sync/sync-worker.ts` runs one poll loop across all connected accounts. Interval is adaptive — 20s while the main window is focused, 5m when blurred — driven by `SyncWorker.setFocusState()`, wired to `BrowserWindow` `focus`/`blur` in `src/main/index.ts`. (`docs/code-standards.md` still says 60s for the focused interval — that doc is stale, trust the code.) Local edits set `dirty = 1`; the engine pushes dirty rows before pulling. Conflict strategy is last-write-wins; a provider 412 surfaces a visible error rather than silently overwriting. Per-provider engines: `google-sync-engine.ts`, `microsoft-sync-engine.ts`, `caldav-sync-engine.ts`.

### Secrets

`src/main/secure-store.ts` wraps Electron `safeStorage`. OAuth tokens / CalDAV credentials are encrypted and stored in the `settings` table under key `token:<accountId>` — never plaintext. On Linux with no available keyring it **fails closed** (refuses to persist, shows a visible error); do not add a plaintext fallback.

### Renderer

- `src/renderer/src/main.tsx` inspects the URL hash: `#mini` → `MiniApp` (frameless always-on-top tray companion), otherwise `App`.
- `App.tsx` is a single large `useState` container that owns view routing (Day/Week/Month/Year/List), the global keyboard-shortcut listener, and all modal state. `zustand` is a dependency but is currently unused — follow the existing `useState` pattern unless deliberately introducing a store.
- All five calendar views are hand-built React components (no third-party calendar library). Drag/drop and edge-resize math lives in `src/renderer/src/dnd/` with pure functions unit-tested separately.
- All user-visible strings go through i18next; keys in `src/renderer/src/i18n/index.ts`, `vi` + `en` kept in sync.

### Testing notes

- Main-process tests run in plain Node. `vitest.config.ts` aliases `electron` → `tests/stubs/electron.ts`, so tests do not need the Electron binary. Extend that stub if a test needs another Electron API.
- DB tests call `initDatabase(':memory:')`. No network in unit tests — mock provider HTTP.
- A test that imports renderer code (`src/renderer/**`) must be added to `tsconfig.web.json`'s `include` **and** `tsconfig.node.json`'s `exclude` (see how `drop-target` / `resize-math` / `ui-components` tests are wired), or `npm run typecheck` fails.

## Gotchas

- **Path aliases are declared twice** — in `electron.vite.config.ts` (per-bundle, for the build) and in each `tsconfig.*.json` + `vitest.config.ts` (for typecheck/tests). Adding an alias means updating both.
- **Electron binary install can silently fail** — if `node_modules/electron/dist/` contains only `locales/`, `npm run dev` and packaging break (tests still pass via the stub). Recover with:
  ```bash
  cd node_modules/electron/dist && unzip -q ~/.cache/electron/*/electron-v*-linux-x64.zip && printf electron > ../path.txt
  ```
- Docs live in `docs/` (URD, PDR, architecture, code-standards, roadmap). Implementation history is in `docs/journals/`; plans in `plans/<timestamp>-<slug>/`. Commit messages follow `feat(scope): …` / `fix(scope): …`.
