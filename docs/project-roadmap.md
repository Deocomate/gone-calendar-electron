# Gone Calendar — Project Roadmap

**Last updated:** 2026-08-31  
**Current version:** 0.1.0

---

## Current State

All 10 planned phases are **complete**. The codebase ships R1 + R2 + R3 + Stretch capabilities in version 0.1.0.

| Phase | Name | Status |
|-------|------|--------|
| 1 | Scaffold Electron + Vite + React + TypeScript | ✅ Complete |
| 2 | Domain, SQLite, ICS, Recurrence | ✅ Complete |
| 3 | Custom Views, Lunar, Week Numbers | ✅ Complete |
| 4 | Event Editor and Drag-and-Drop | ✅ Complete |
| 5 | Google Sync, Offline, Notifications | ✅ Complete — **R1 gate** |
| 6 | Microsoft Graph Adapter | ✅ Complete |
| 7 | CalDAV Adapter and Onboarding | ✅ Complete |
| 8 | Invite, Share, Search, Filters | ✅ Complete — **R2 gate** |
| 9 | Mini Window, Local Tasks, Deep Theme | ✅ Complete — **R3 gate** |
| 10 | Stretch: A11y, Adaptive Sync, Holidays | ✅ Complete |

---

## R1 Features (Complete)

- ✅ Five calendar views: Day, Week, Month, Year, List
- ✅ Full event editor on blank click (not a title-only popover)
- ✅ Create / edit / delete events with full field set
- ✅ Recurring event create + edit (this / this-and-future / all)
- ✅ Drag-and-drop with Move / Copy / Cancel popover
- ✅ Week numbers (ISO, toggle in settings)
- ✅ Vietnamese lunar secondary labels (toggle)
- ✅ Google Calendar OAuth + two-way sync
- ✅ Offline: browse and mutate local cache; sync when online
- ✅ OS notifications for reminders (Windows + Linux)
- ✅ Show/hide calendars; color per calendar; optional color per event
- ✅ Light / dark / system theme
- ✅ UI language vi + en

## R2 Features (Complete)

- ✅ Microsoft Graph (Outlook.com / Microsoft 365) two-way sync
- ✅ CalDAV: Nextcloud, Synology, generic URL — discovery + two-way sync
- ✅ Invite attendees; accept/decline where provider supports
- ✅ Share appointment: export `.ics` + OS open-with flow
- ✅ Full-text search across cached events (FTS5)
- ✅ Birthday calendars via provider (when exposed)
- ✅ Filter events by calendar color

## R3 Features (Complete)

- ✅ Mini window: always-on-top tray companion with upcoming events and tasks
- ✅ Local tasks: title, due date, done toggle, optional calendar-day visibility
- ✅ Deep theme: accent colors, custom wallpaper, blur + darkness overlay

## Stretch Features (Complete)

- ✅ Global keyboard shortcuts (T=today, 1–5=views, N/C=new, /=search, ?=help)
- ✅ Adaptive sync polling (60s focused / 5m blurred)
- ✅ Vietnamese and International holiday calendar subscriptions
- ✅ Copy single recurring instance (separate from full-series copy)

---

## Open Items / Known Gaps

These are non-blocking items that remain for post-0.1.0:

### Must Validate Before "Daily Driver" Gate

- [ ] **Live Google OAuth round-trip** — Requires a real Google Cloud OAuth Desktop client ID. The sync engine is complete but must be tested end-to-end with a real account before R1 is declared production-ready.
- [ ] **Linux `safeStorage` validation** — Verify fail-closed behavior on a headless Ubuntu environment where D-Bus / libsecret is unavailable.

### Known Deferrals (URD-tracked)

- [ ] **iCloud CalDAV** — Best-effort in R2. Known Apple non-standard behavior. Nextcloud/generic are the R2 Must targets.
- [ ] **Fedora / `.deb` packaging** — Deferred post-R1. Ubuntu LTS + AppImage is the only validated Linux package.
- [ ] **Linux distro matrix** — Full xdg desktop integration tested on Ubuntu LTS only.

### Open Architecture Questions (URD §15)

- [ ] Google OAuth client: published app vs testing-mode quota.
- [ ] Whether R1 Google sync includes Google Tasks, birthdays, and holidays calendars as read-only.
- [ ] Recurring copy: keep "whole series" as permanent behavior, or add "this instance only" promotion in R2 (already implemented as stretch).

---

## Post-0.1.0 Candidates

The following ideas are outside the current URD scope and require a URD change before planning:

| Idea | Notes |
|------|-------|
| macOS support | Out of scope (URD §6). Electron supports it; requires separate packager config and safeStorage behavior check. |
| Playwright smoke tests | Architecture supports it; not yet implemented. |
| Near-real-time sync (push) | Google / Graph push notifications via webhooks; currently polling-only. |
| Multi-year cache expansion | Currently pulls a bounded window. Full history requires a configurable cache depth. |
| `.deb` / Fedora RPM packaging | Follow-on after AppImage is validated. |
| CalDAV self-signed TLS UI | Per-host pin dialog exists in plan; implementation to be confirmed. |

---

## Versioning Plan

| Version | Milestone |
|---------|-----------|
| 0.1.0 | All 10 phases complete. R1+R2+R3+Stretch in codebase. |
| 0.2.0 | First packaged Windows + Linux installer with live Google OAuth tested. "Daily driver" gate. |
| 0.3.0 | iCloud CalDAV best-effort validated. Fedora AppImage. |
| 1.0.0 | Stable release after daily driver validation on both OS targets. |
