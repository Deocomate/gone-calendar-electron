---
type: code-reviewer
date: 2026-08-18
lens: red-team-all-four
---

# Red team: Electron Gone Calendar plan

Controller adjudication. Greenfield repo: evidence is plan `file:line`, not `src/`.

## Findings proposed Accept (8)

1. **Linux safeStorage may be plaintext** — High — Security — `plan.md:51`, `phase-05-google-sync-offline-notifications.md:19`
   - `safeStorage.isEncryptionAvailable()` is often false on Linux without gnome-keyring/kwallet. Plan forbids plaintext in SQLite but does not say what happens then.
   - Fix: refuse to store tokens if encryption unavailable; prompt to unlock keyring; never write refresh tokens unencrypted.

2. **No single-instance lock** — High — Failure — `plan.md:36`, `phase-09-mini-window-tasks-deep-theme.md` (second window, same DB)
   - Two app processes + one SQLite file → SQLITE_BUSY / corruption.
   - Fix: phase 1 `app.requestSingleInstanceLock()`; second instance focuses first.

3. **CalDAV “trust this host”** — High — Security — `phase-07-caldav-adapter-onboarding.md:56`
   - Global or sticky trust of self-signed certs is MITM.
   - Fix: default deny; per-host fingerprint pin; user confirms SHA-256; no “trust all”.

4. **ICS import unbounded** — Medium — Security — `plan.md:50`, `phase-02-domain-sqlite-ics-recurrence.md` ICS steps
   - Huge/malformed ICS can hang main process.
   - Fix: size cap, timeout, parse in bounded way; reject calendar bombs.

5. **IPC can write read-only calendars** — High — Security — `plan.md:60` (renderer IPC), `phase-04` save via IPC
   - No plan text that main rejects writes when `calendars.read_only`.
   - Fix: enforce in repos/IPC, not only UI.

6. **OAuth loopback hijack** — High — Security — `phase-05-google-sync-offline-notifications.md:24`
   - Loopback without state/PKCE/bind details.
   - Fix: bind `127.0.0.1` only, PKCE, OAuth `state`, one-shot server.

7. **Silent last-write-wins** — High — Failure — `phase-05-google-sync-offline-notifications.md:20`
   - Local dirty vs Google etag 412: user loses one side with only a toast.
   - Fix: keep local copy, surface conflict, retry/overwrite explicit. Still no 3-way merge (YAGNI).

8. **Google recurrence exceptions untested** — High — Assumption — `phase-05-google-sync-offline-notifications.md:25`
   - `singleEvents=false` masters without cancelled/moved instances will duplicate or drop.
   - Fix: fixture tests for cancelled instance + moved instance (`originalStartTime`).

## Findings Rejected (2)

9. **Cut R3/stretch** — Scope — Reject. User chose SCOPE EXPANSION. Plan already gates cook at phase 5.
10. **Drop better-sqlite3 fallback** — Scope — Reject. Validation Session 1 locked node:sqlite + fallback.

## Unresolved

None that block applying the 8 accepts.
