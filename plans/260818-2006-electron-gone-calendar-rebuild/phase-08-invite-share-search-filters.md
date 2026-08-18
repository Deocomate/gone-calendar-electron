---
phase: 8
title: "Invite share search filters"
status: pending
effort: M
priority: P2
dependencies: [6, 7]
---

# Phase 8: Invite share search filters

## Overview

R2 collaboration and findability: attendees send/accept where provider allows, `.ics` + OS share, FTS search, color filter, birthday calendars, multi-year cache. **R2 ship gate.**

## Requirements

- Functional: UR-COLLAB-01..02, UR-SHARE-01, UR-SEARCH-01, UR-FILTER-01 color, UR-BDAY-01, UR-SYNC multi-year.
- Non-functional: search < 100ms on 2 years cached on mid laptop (target).

## Architecture

- Invites: Google `attendees` + `sendUpdates`; Graph attendees; CalDAV SCHEDULE if server supports, else store emails only + warn.
- Incoming: poll Google `events` with `attendees[].responseStatus`; Graph `responseRequested`.
- Share: write temp `.ics`, `shell.openPath` / Electron `shareItem` if available; Linux xdg.
- Search: SQLite FTS5 on title/location/notes.
- Birthdays: subscribe/show Google `addressbook#birthday` / holiday calendars read-only when present.
- Color filter: client-side on already-fetched range + search results.

## Related Code Files

- Create: `src/main/db/migrations/00x-fts.sql`
- Create: `src/main/sync/invite-ops.ts`
- Create: `src/renderer/search/search-palette.tsx`
- Create: `src/renderer/editor/attendee-list.tsx`
- Modify: event editor, sidebar filters, google/graph/caldav adapters
- Delete: none

## Implementation Steps

1. FTS migration + IPC `gone:search.query`.
2. Ctrl/Cmd+K or toolbar search; jump to occurrence date.
3. Attendee chips; send on save when provider supports.
4. Accept/decline/tentative on incoming (banner or editor).
5. Share button → ICS + OS open-with.
6. Color filter chips; calendar toggles already in R1.
7. Detect birthday calendars; show in month as all-day.
8. Sync window: default ±2 years; setting later if needed.

## Success Criteria

- [ ] URD §12 R2
- [ ] Search finds substring in notes
- [ ] Share produces a file another calendar app can import
- [ ] Invite path works on Google **or** Graph (document which if CalDAV cannot send)

## Risk Assessment

CalDAV scheduling (RFC 6638) support varies — degrade to “emails saved, not sent” with UI copy. Do not block R2 on iTIP perfection.
