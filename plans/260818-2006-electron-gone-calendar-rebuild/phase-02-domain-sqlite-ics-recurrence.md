---
phase: 2
title: "Domain SQLite ICS recurrence"
status: completed
effort: L
priority: P1
dependencies: [1]
---

# Phase 2: Domain SQLite ICS recurrence

## Overview

Canonical calendar model in SQLite (main process). Local calendars, events, recurrence fields, ICS import/export, dirty/sync columns for later adapters. Renderer talks only through IPC.

## Requirements

- Functional: create/rename/delete local calendar; CRUD events; import/export `.ics`; expand RRULE for a date range.
- Non-functional: DB in `app.getPath('userData')`; WAL; migrations versioned.

## Architecture

Tables (logical): `accounts`, `calendars`, `events`, `event_exceptions`, `sync_state`, `settings`. Event stores RFC-ish fields: uid, title, notes, location, dtstart_utc, dtend_utc, tzid, all_day, rrule, rdate, exdate, color, meeting_url, etag, dirty, deleted_at.

Shared `expandOccurrences(event, range)` using `rrule` + Luxon. Adapters map to this model; they do not own UI types.

IPC: `gone:cal.*`, `gone:event.*`, `gone:ics.import/export`.

Do **not** add Drizzle unless raw SQL becomes painful. Prefer `node:sqlite` `DatabaseSync` + `src/main/db/migrations/*.sql`. If `import('node:sqlite')` fails, fall back to `better-sqlite3` behind the same repo interface.

Wrap DB in `src/main/db/sqlite-driver.ts` so repos never import the engine directly.
<!-- Updated: Validation Session 1 - node:sqlite primary -->

## Related Code Files

- Create: `src/main/db/sqlite-driver.ts`, `src/main/db/database.ts`, `src/main/db/migrations/001-init.sql`
- Create: `src/main/db/repos/calendars-repo.ts`, `src/main/db/repos/events-repo.ts`
- Create: `src/shared/event-model.ts`, `src/shared/expand-occurrences.ts`
- Create: `src/main/ics/parse-ics.ts`, `src/main/ics/write-ics.ts`
- Create: `src/main/ipc/calendar-ipc.ts`
- Create: `tests/expand-occurrences.test.ts`, `tests/ics-roundtrip.test.ts`
- Modify: `src/main/index.ts` (open DB on ready), `electron-builder.yml` (asarUnpack **only** if native fallback)
- Delete: none

## Implementation Steps

1. Implement `sqlite-driver.ts`: try `node:sqlite` `DatabaseSync` first (WAL). Catch missing binding → `better-sqlite3` + electron-vite native rebuild + asarUnpack.
2. Write `001-init.sql` + migration runner (apply in order, record in `schema_migrations`).
3. Repos with prepared statements. Transactions for create event + exceptions.
4. Implement expandOccurrences: DTSTART, RRULE, EXDATE, this-and-future as EXDATE+new series (store as two events or exception rows — pick exception table, document in code comment).
5. ICS roundtrip for a non-recurring and a weekly event. Reject files over a documented size cap (e.g. 5 MB) and abort parse on timeout; do not parse in the renderer.
6. Repos: if `calendars.read_only` then create/update/delete events throw; IPC maps to a user-visible error. UI hide is not enough.
7. Vitest for expansion (DST boundary, all-day, COUNT, UNTIL).
8. IPC + a throwaway settings page or renderer hook to create a local event (debug is OK; real editor is phase 4).
<!-- Updated: Red Team Session 1 - ICS cap + read-only IPC -->

## Success Criteria

- [x] Local calendar + event survive app restart
- [x] ICS import creates events visible via IPC query-by-range
- [x] Recurrence expansion tests cover weekly + EXDATE
- [x] Tokens/secrets columns **not** created; auth stays in safeStorage later
- [x] Oversize/malformed ICS import fails cleanly (no hung main process)
- [x] Write to a read-only calendar is rejected at the repo/IPC layer


## Risk Assessment

Recurrence “this and future” is the hardest local op — implement a documented algorithm now or Google sync in phase 5 will fork logic. All-day as date (no time) vs UTC midnight — pick date-only string for all-day. `node:sqlite` FTS5 in phase 8: if compile omits FTS5, use LIKE fallback and document.
<!-- Updated: Validation Session 1 - node:sqlite primary -->
