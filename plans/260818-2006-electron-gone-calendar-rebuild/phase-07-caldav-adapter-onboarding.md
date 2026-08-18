---
phase: 7
title: "CalDAV adapter onboarding"
status: completed
effort: L
priority: P2
dependencies: [5]
---

# Phase 7: CalDAV adapter onboarding

## Overview

CalDAV two-way sync. **Must:** Nextcloud or generic URL. **Best-effort:** iCloud row + app-password docs; visible errors; iCloud failure does **not** block R2. Synology same family as generic. `tsdav` in main.
<!-- Updated: Validation Session 1 - iCloud best-effort -->

## Requirements

- Functional: UR-SYNC-06 for Nextcloud/generic (Must) and iCloud (best-effort); UR-SYNC-07 remaining rows; UR-SYNC-08.
- Non-functional: app-specific passwords for iCloud; never log password.

## Architecture

- `CalDavAdapter`: discover principal → calendar-home → calendars; sync-token / ctag when server supports RFC 6578, else range report.
- Auth: basic or bearer. Store in safeStorage keyed by account id.
- Onboarding rows: iCloud (appleid + app password, known URL), Nextcloud (`https://host/remote.php/dav`), Synology, Other (URL).
- Parse VEVENT via `ical.js` into domain model; expand RRULE locally.

Google/Microsoft stay on native APIs. Do not route them through CalDAV.

## Related Code Files

- Create: `src/main/sync/caldav-adapter.ts`, `src/main/sync/caldav-discover.ts`
- Create: `src/renderer/onboarding/caldav-form.tsx`
- Create: `tests/caldav-discover-url.test.ts` (URL normalization only; live optional)
- Modify: add-account page, sync-worker
- Delete: none

## Implementation Steps

1. URL helpers + discovery. Clear progress/error states in UI.
2. Fetch calendars, map display names/colors if provided.
3. Two-way: PUT/DELETE calendar objects; If-Match etag.
4. Nextcloud live test (primary). iCloud second (known flaky).
5. Multiple CalDAV accounts allowed.

## Success Criteria

- [x] Nextcloud (or generic CalDAV) two-way with a real server — **R2 Must**
- [x] Failed discovery shows actionable error (401 vs 404 vs TLS)
- [x] iCloud: documented app-password path; failure isolated; **R2 may ship if iCloud still fails**
- [x] Provider list is not a bare URL as the only entry

## Risk Assessment

iCloud CalDAV is historically brittle — URD still requires the row; treat as best-effort with explicit errors. Self-signed Synology/generic TLS: **default deny**. User may pin **one host** after confirming SHA-256 fingerprint stored in safeStorage. No “trust all certificates”. No global insecure flag.
<!-- Updated: Red Team Session 1 - TLS pin -->
