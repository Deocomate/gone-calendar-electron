---
type: researcher
date: 2026-08-18
---

# Research: Electron Gone Calendar stack lock

## Summary

electron-vite is the 2026 default Electron+React+TS toolchain. DB: `node:sqlite` in main, `better-sqlite3` fallback. Google Calendar API v3 (not CalDAV) for R1. MSAL Node + Graph for Microsoft. tsdav for CalDAV. Recurrence expanded locally with rrule.

## Findings

- Native sqlite must rebuild against Electron ABI; document Win vs Linux toolchains.
- msal-browser is unsupported in Electron; use `@azure/msal-node` + loopback/system browser.
- Google `events.watch` needs a public webhook; desktop stretch = smarter polling, not a relay.
- iCloud CalDAV remains the fragile provider; isolate errors.

## Recommendations

1. Follow plan locked stack (`node:sqlite` first). Do not add FullCalendar.
2. Cook through phase 5 (R1) before Graph/CalDAV. Live Google required to call R1 done.
3. safeStorage for tokens, not SQLite plaintext.

## Unresolved Questions

- Google OAuth app publication vs test users
- Linux distro matrix: R1 = Ubuntu LTS + AppImage (validated).
- GNOME tray reliability for phase 9
