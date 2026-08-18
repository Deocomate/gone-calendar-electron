---
phase: 5
title: "Google sync offline notifications"
status: pending
effort: L
priority: P1
dependencies: [4]
---

# Phase 5: Google sync offline notifications

## Overview

Google Calendar adapter + OAuth + two-way sync into SQLite. Offline queue. OS reminders. Basic theme. **R1 ship gate requires a live Google round-trip.** Cook may implement OAuth/adapter against fixtures first if Cloud client ID is not ready.
<!-- Updated: Validation Session 1 - fixture then live -->

## Requirements

- Functional: UR-SYNC-03, 04, 07 (Google row), 08; UR-NOTIF-01; UR-THEME-01.
- Non-functional: tokens only if `safeStorage.isEncryptionAvailable()`; else refuse connect and tell user to unlock OS keyring. Never write refresh tokens unencrypted. Last-write-wins is not silent: keep local row, show conflict, user chooses retry/overwrite.
<!-- Updated: Red Team Session 1 - encryption + conflict -->

## Architecture

- OAuth: Google Desktop client, loopback bind **`127.0.0.1` only** (not `0.0.0.0`), random port, PKCE, `state` CSRF, one-shot HTTP server then close (`google-auth-library`).
- Sync: Calendar API v3 `events.list` with `syncToken` per calendar; `singleEvents=false` store masters; expand locally (same as local events). Writes: insert/update/delete + sendUpdates as needed later.
- Queue: `events.dirty` + background worker (interval + on online).
- Notifications: Electron `Notification`; main-process timer from next 24h reminders; Linux may need libnotify.
- Onboarding UI: provider list; Google row launches OAuth.

Do not use tsdav for Google in R1.

## Related Code Files

- Create: `src/main/oauth/google-oauth.ts`, `src/main/secure-store.ts`
- Create: `src/main/sync/google-adapter.ts`, `src/main/sync/sync-worker.ts`, `tests/google-event-map.test.ts` (fixture JSON)
- Create: `src/main/notifications/reminder-scheduler.ts`
- Create: `src/renderer/onboarding/add-account-page.tsx`
- Modify: settings, sidebar accounts
- Create: `.env.example` with `GOOGLE_OAUTH_CLIENT_ID` (optional until live). No committed secrets.
- Delete: none

## Implementation Steps

1. `secure-store`: encrypt JSON blobs via `safeStorage.encryptString`. If `isEncryptionAvailable()` is false, all token writes fail closed.
2. Google event mapper + worker: unit tests from saved Calendar API JSON fixtures (no network). Include **cancelled instance** and **moved instance** (`originalStartTime`).
3. OAuth connect/disconnect when `GOOGLE_OAUTH_CLIENT_ID` is set; store refresh token **only** after encryption available. If unset, UI shows “add client ID” and adapter tests still pass.
4. List Google calendars → `calendars` rows (`provider=google`).
5. Incremental sync; map Google event ↔ domain model (recurrence, all-day, colorId → hex map).
6. Local edits to Google calendars set dirty → worker pushes.
7. Offline: disconnect network, edit, restart, reconnect, push (**live**).
8. Reminder: 10 min default; fire OS notification; click focuses event.
9. README: create Google Cloud project, Calendar API, OAuth desktop, test users.

## Success Criteria

- [ ] Mapper tests cover cancelled + moved recurring instances
- [ ] If encryption unavailable, Google connect is refused (no plaintext refresh token)
- [ ] etag/412 conflict: local copy kept; user can overwrite or retry — not a silent drop
- [ ] URD §12 R1 live checklist (Google web round-trip + offline queue) — **required to call R1 done**, may lag first cook of this phase
- [ ] Auth expiry shows re-auth, does not crash views
- [ ] Linux R1 pack: Ubuntu LTS AppImage (or documented skip if building on Windows only)

## Risk Assessment

Unpublished OAuth app: 100 test users. syncToken invalidation (410) → full resync. All-day timezone mismatches with Google `date` vs `dateTime` — golden tests on fixtures.
