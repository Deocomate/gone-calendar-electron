# Gone Calendar

Modern desktop calendar for **Windows and Linux** — local-first, multi-provider, Vietnamese lunar date support.

Built with Electron 35+, React 19, TypeScript 5, and Tailwind CSS 4.

---

## Features

- **Five calendar views** — Day, Week, Month, Year, List
- **Full event editor** — opens on every blank click, not a popover-first flow
- **Drag and drop** — Move / Copy / Cancel popover on every drop
- **Recurrence** — create and edit recurring events (this / this-and-future / all)
- **Vietnamese lunar dates** — secondary labels on month cells, week headers, list day headers
- **ISO week numbers** — visible on all views, togglable
- **Multi-provider sync** — Google Calendar, Microsoft 365 (Graph), CalDAV (Nextcloud, Synology, generic)
- **Offline-first** — browse and mutate local cache; sync when online
- **Local tasks** — title, due date, done toggle, optional calendar-day visibility
- **Mini window** — always-on-top tray companion with upcoming events and tasks
- **Holiday calendars** — Vietnamese (solar + lunar) and International holiday subscriptions
- **Deep theme** — light / dark / system, accent colors, custom wallpaper
- **OS notifications** — event reminders on Windows and Linux
- **Full-text search** — across cached events (FTS5)
- **Keyboard shortcuts** — single-key hotkeys for all major actions
- **Vietnamese + English** — full i18n via i18next

---

## Architecture

```
Renderer (React, sandboxed)
  views / editor / dnd / components
        │ contextBridge (window.gone)
Preload (typed IPC bridge)
        │ ipcMain.handle
Main process
  db (node:sqlite + migrations) │ sync workers │ OAuth │ safeStorage │ tray
        │
  Adapters: Local │ Google Calendar API v3 │ Microsoft Graph │ CalDAV (tsdav)
```

- **Main process** (`src/main`): Electron lifecycle, SQLite database, OAuth flows, provider sync engines, secure credential storage, system tray, mini window, OS notifications.
- **Preload** (`src/preload`): Typed `contextBridge` exposing `window.gone` — sandbox + contextIsolation always enabled.
- **Renderer** (`src/renderer`): React app with custom view layouts, event editor, DnD, i18n, and Zustand state cache.
- **Shared** (`src/shared`): Pure TypeScript contracts used by both main and renderer (`CalendarEvent`, `GoneAPI`, `IPC_CHANNELS`, etc.).

---

## Development

```bash
# Install dependencies
npm install

# Start development app (hot-reload)
npm run dev

# Type check (main + renderer)
npm run typecheck

# Run tests
npm run test

# Production build
npm run build
```

## Packaging

```bash
# Windows installer (NSIS x64)
npm run pack:win

# Linux AppImage (x64)
npm run pack:linux
```

See [`docs/deployment-guide.md`](docs/deployment-guide.md) for OAuth setup, environment variables, and Linux-specific notes.

---

## Documentation

| Document | Description |
|----------|-------------|
| [`docs/urd.md`](docs/urd.md) | User Requirements Document |
| [`docs/project-overview-pdr.md`](docs/project-overview-pdr.md) | Product overview and decision record |
| [`docs/codebase-summary.md`](docs/codebase-summary.md) | Directory map, module responsibilities, schema |
| [`docs/system-architecture.md`](docs/system-architecture.md) | Process model, data flows, IPC contract |
| [`docs/code-standards.md`](docs/code-standards.md) | Naming, patterns, security rules |
| [`docs/design-guidelines.md`](docs/design-guidelines.md) | Visual language and design tokens |
| [`docs/project-roadmap.md`](docs/project-roadmap.md) | Current state, open gaps, versioning plan |
| [`docs/deployment-guide.md`](docs/deployment-guide.md) | Setup, build, packaging, OAuth config |
