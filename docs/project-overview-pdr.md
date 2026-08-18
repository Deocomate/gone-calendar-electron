# Gone Calendar — Project Overview & Product Decision Record

**Status:** All 10 phases complete (R1 + R2 + R3 + Stretch)  
**Last updated:** 2026-08-18  
**Version:** 0.1.0

---

## Product Summary

Gone Calendar is a local-first desktop calendar for **Windows and Linux**, built from scratch with Electron, React, TypeScript, and Tailwind CSS. It targets the feature density of One Calendar (compact views, solid event pills, week numbers) while adding Vietnamese lunar date support and multi-provider sync.

It is **not** a GNOME Calendar fork or patch. The previous GTK4/libadwaita/EDS plan was dropped and replaced by this greenfield Electron app.

---

## Problem & Motivation

People on Windows and Linux need one native window that unifies Google Calendar, Microsoft 365, and CalDAV (Nextcloud, Synology, iCloud). GNOME Calendar is GNOME-only. One Calendar has no Linux build and no Vietnamese lunar calendar. This app fills both gaps.

---

## User Targets

| User | Core Need |
|------|-----------|
| Individual (vi/en) | Personal + work calendars, offline-ready, lunar dates on Month/Week/List |
| Linux self-hoster | Nextcloud/Synology/generic CalDAV two-way sync |
| Microsoft 365 user | Outlook.com / 365 via Graph API |

**Out of scope:** macOS, mobile, Exchange on-prem, print, maps, lock-screen widgets, One Task clone.

---

## Release Summary

| Release | Scope | Status |
|---------|-------|--------|
| **R1** | Local + Google, all 5 views, editor-first, DnD, lunar, week numbers, notifications | Complete (Phase 5) |
| **R2** | Microsoft Graph, CalDAV, search, share ICS, invite attendees, color filter | Complete (Phase 8) |
| **R3** | Mini window, local tasks, deep theme (wallpaper, accent, overlay) | Complete (Phase 9) |
| **Stretch** | Keyboard accessibility, adaptive sync polling, holiday calendars, copy-single-instance | Complete (Phase 10) |

---

## Product Decision Record

### PDR-001 — App platform: Electron (not GNOME/GTK)
- **Decision:** Build a new Electron + React + TypeScript app targeting Windows and Linux.
- **Rationale:** GTK4/libadwaita approach required patching GNOME Calendar C source, which is unmaintainable and won't work on Windows. Electron provides a single cross-platform binary output.
- **Date:** 2026-08-18

### PDR-002 — SQLite engine: `node:sqlite` primary, `better-sqlite3` fallback
- **Decision:** Use `node:sqlite` (Electron built-in, available from Electron 35+) as primary. Fall back to `better-sqlite3` only if the Electron build was compiled without SQLite support.
- **Rationale:** Avoids native addon rebuild. Electron 35+ ships with SQLite enabled. Pin away from 37.2.0 regression.
- **Alternatives considered:** `sql.js` (WASM); `better-sqlite3` primary (requires asarUnpack and native rebuild).

### PDR-003 — Calendar views: custom layout (not FullCalendar/Schedule-X)
- **Decision:** Hand-written React components for Day, Week, Month, Year, List views.
- **Rationale:** One Calendar-class density requires full control over cell layout, event pill rendering, and overflow. Third-party calendar shells impose styling constraints.

### PDR-004 — Drag and drop: Move / Copy / Cancel popover on drop
- **Decision:** Dropping an event shows a three-action popover at the drop point rather than immediately moving.
- **Rationale:** URD requirement; prevents accidental moves; matches One Calendar UX.

### PDR-005 — OS credential storage: Electron `safeStorage`
- **Decision:** OAuth tokens and CalDAV credentials stored via `safeStorage`. Never stored in plaintext in SQLite.
- **Rationale:** Security red-team finding. Linux fallback: refuse token persist, prompt keyring.

### PDR-006 — Google OAuth: loopback PKCE (not embedded browser)
- **Decision:** Google OAuth uses a loopback HTTP listener on a random port for the code exchange.
- **Rationale:** Satisfies Google Desktop App OAuth requirements. State parameter guards against CSRF.

### PDR-007 — CalDAV: `tsdav` library, server discovery, iCloud best-effort
- **Decision:** Use `tsdav` for CalDAV requests. iCloud is best-effort in R2; Nextcloud/generic are Must.
- **Rationale:** iCloud has non-standard CalDAV behavior; blocking R2 on iCloud would delay ship.

### PDR-008 — Linux packaging: Ubuntu LTS + AppImage for R1
- **Decision:** R1 Linux target is Ubuntu LTS + AppImage x64. Fedora and `.deb` deferred.
- **Rationale:** Scope control. AppImage runs on most distros without per-distro packaging.

### PDR-009 — State management: Zustand (renderer) + SQLite (source of truth)
- **Decision:** Renderer uses Zustand for UI cache. Main process SQLite is authoritative. All mutations go through IPC.
- **Rationale:** Renderer is sandboxed and cannot access SQLite directly.

### PDR-010 — Recurrence: RFC 5545, expand in shared, exceptions in DB
- **Decision:** Recurring events stored as RRULE/RDATE/EXDATE strings. Expansion via the `rrule` library. Exceptions in `event_exceptions` table.
- **Rationale:** Keeps provider mapping clean; adapters normalize Google/Graph recurrence into RFC 5545.

---

## Key Constraints

| Area | Decision |
|------|----------|
| Delivery | New Electron app. No reuse of GNOME source |
| UI stack | Electron 35+ · React 19 · Vite (electron-vite) · TypeScript 5 |
| Calendar UI | Custom views. No FullCalendar/Schedule-X as shell |
| OS | Windows 10/11 and Linux. No macOS, iOS, Android |
| Microsoft | Microsoft Graph only. No Exchange on-prem / EWS |
| Languages | Vietnamese (`vi`) and English (`en`) via i18next |
| Credentials | `safeStorage` only. Never plaintext in SQLite |
