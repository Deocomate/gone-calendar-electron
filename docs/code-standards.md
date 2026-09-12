# Gone Calendar — Code Standards

**Last updated:** 2026-08-18

---

## Language & Toolchain

- **TypeScript 5** — strict mode. No `any` except where bridging a third-party library without types.
- **React 19** — functional components only. No class components.
- **Tailwind CSS 4** — utility-first; design tokens defined in `src/renderer/src/styles/index.css`.
- **Vitest** — unit tests for main process, shared modules, and event mappers.

---

## Project Structure Conventions

### Process Boundaries

| Layer | What it can import |
|-------|--------------------|
| `src/main` | Node.js APIs, Electron main APIs, `src/shared` |
| `src/preload` | Electron `contextBridge`, `ipcRenderer`, `src/shared` |
| `src/renderer` | React, DOM APIs, `src/shared`, `window.gone` (IPC bridge) |
| `src/shared` | Pure TypeScript only. No Node.js, no DOM, no Electron |

**Never import main-process modules from the renderer.** IPC is the only bridge.

### Path Aliases

```ts
// tsconfig.web.json / tsconfig.node.json
"@shared/*" → "src/shared/*"
"@renderer/*" → "src/renderer/src/*"
"@main/*" → "src/main/*"
```

---

## Naming Conventions

### Files

| Type | Convention | Example |
|------|-----------|---------|
| React components | `PascalCase.tsx` | `EventPill.tsx` |
| Hooks | `use-kebab-case.ts` | `use-event-dnd.ts` |
| Utilities/modules | `kebab-case.ts` | `google-event-mapper.ts` |
| IPC handlers | `kebab-case-ipc.ts` | `calendar-ipc.ts` |
| Test files | `kebab-case.test.ts` | `events-repo.test.ts` |

### TypeScript

- **Interfaces** for data shapes (`CalendarEvent`, `Calendar`, `TaskItem`).
- **Types** for unions and utility types (`AccountType`, `RecurringEditScope`, `ThemeMode`).
- **`I` prefix** only for the SQLite driver abstraction (`ISqliteDatabase`). Not for general interfaces.
- **Props type** inline or as `interface ComponentNameProps`.

### IPC Channels

All IPC channel strings are defined in `src/shared/ipc-contract.ts` under `IPC_CHANNELS`. Never use raw string literals in `ipcRenderer.invoke()` or `ipcMain.handle()`.

```ts
// Correct
ipcRenderer.invoke(IPC_CHANNELS.EVENT.CREATE, input)

// Wrong
ipcRenderer.invoke('event:create', input)
```

---

## Component Patterns

### Renderer Components

```tsx
// Good — typed props, named export
interface EventPillProps {
  event: ExpandedOccurrence
  onClick?: (event: ExpandedOccurrence) => void
}

export function EventPill({ event, onClick }: EventPillProps) {
  // ...
}
```

- Prefer named exports over default exports for components.
- Co-locate styles with components using Tailwind utility classes.
- Build conditional classes with template literals; there is no `clsx`/`cn()` helper in this project.

### Hooks

- Custom hooks start with `use` and live in `src/renderer/src/hooks/`.
- Hooks that call `window.gone.*` must handle errors gracefully and not throw to the render tree.

---

## Database Layer

### Repository Pattern

All database access goes through repository classes in `src/main/db/repos/`. Direct `db.exec()` or `db.prepare()` calls belong in repo methods, not in IPC handlers.

```ts
// IPC handler → repo method (correct)
ipcMain.handle(IPC_CHANNELS.EVENT.CREATE, (_, input) => {
  return eventsRepo.create(input)
})

// Direct DB call in IPC handler (wrong)
ipcMain.handle(IPC_CHANNELS.EVENT.CREATE, (_, input) => {
  return db.prepare('INSERT INTO events ...').run(...)
})
```

### Migrations

- Sequential numbered migrations in `src/main/db/database.ts` (`MIGRATION_001_SQL`, etc.).
- Schema version tracked in `schema_migrations` table.
- Never alter existing migrations — always add a new version.
- SQL also exists as reference files in `src/main/db/migrations/`.

### Timestamps

All timestamps stored as **ISO 8601 UTC strings** (`new Date().toISOString()`). Never store local time strings. Event start/end stored in UTC (`dtstart_utc`, `dtend_utc`) with a `tzid` column for the user's original timezone.

---

## IPC Conventions

### Handler Registration

IPC handlers are registered once at startup in `src/main/ipc.ts` which calls each module's registration function:

```ts
export function registerIpcHandlers(): void {
  registerCalendarIpcHandlers()
  registerAuthSyncIpcHandlers()
  registerSettingsIpcHandlers()
  registerTasksIpcHandlers()
  registerHolidayIpcHandlers()
}
```

### Read-Only Enforcement

IPC handlers must check `calendar.isReadOnly` before writing events. Read-only calendars (Google shared calendars, holiday subscriptions) must reject mutation requests with a clear error.

### Error Handling

IPC handlers should `try/catch` and return a typed error shape rather than throwing. Throwing in an IPC handler sends an unstructured error to the renderer.

---

## Security Rules

1. **`safeStorage` only** for OAuth tokens and CalDAV credentials. Never write tokens to SQLite plaintext.
2. **Fail-closed** on Linux if `safeStorage` is unavailable: refuse to persist tokens and display a visible error. Do not silently fall back to plaintext.
3. **Sandbox + contextIsolation enabled** on every `BrowserWindow`. `nodeIntegration: false`, `webSecurity: true`.
4. **External links** opened via `shell.openExternal()`, never by `loadURL()` inside the renderer window.
5. **ICS import size limit**: cap imported ICS files to prevent memory exhaustion.
6. **CalDAV TLS**: default-deny self-signed certs unless explicitly pinned by SHA-256. Per-host pin only.

---

## Sync Engine Rules

- **Adapters normalize** provider data into the canonical `CalendarEvent` model. Provider-specific JSON must not leak into the renderer.
- **Dirty flag**: events modified locally are marked `dirty = 1` in SQLite. The sync engine pushes dirty events before pulling.
- **Conflict strategy**: last-write-wins. If the provider rejects with 412 (Precondition Failed), surface a visible error to the user; do not silently overwrite.
- **Adaptive poll interval**: 20 seconds when the main window is focused; 5 minutes when blurred/minimized. Controlled via `SyncWorker.setFocusState()`.

---

## i18n Rules

- All user-visible strings go through i18next. Never hardcode English strings in JSX.
- Translation keys live in `src/renderer/src/i18n/index.ts`.
- Default language follows `app.getLocale()` from Electron (system locale). User can override in settings.
- Both `vi` and `en` namespaces must be kept in sync.

---

## Testing Standards

- **Test framework:** Vitest.
- **Coverage targets:** lunar/recurrence logic (must have golden tests), event mappers, SQLite repos.
- **Test location:** `tests/` at project root. Mirrors source module name (`events-repo.test.ts` for `src/main/db/repos/events-repo.ts`).
- **Database tests:** use `:memory:` SQLite via `initDatabase(':memory:')`.
- **No external network calls** in unit tests. Mock provider HTTP responses.

---

## Git & Branch Conventions

- All 10 phases were implemented on the main branch as a greenfield build.
- Commit messages follow the format: `feat(phase-N): brief description`.
- Plans saved under `plans/<timestamp>-<slug>/`.
- Journals saved under `docs/journals/<date>-<phase-slug>.md`.
