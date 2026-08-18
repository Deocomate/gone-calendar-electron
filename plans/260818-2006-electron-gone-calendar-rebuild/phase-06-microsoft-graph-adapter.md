---
phase: 6
title: "Microsoft Graph adapter"
status: completed
effort: L
priority: P2
dependencies: [5]
---

# Phase 6: Microsoft Graph adapter

## Overview

Outlook.com / Microsoft 365 calendars via Microsoft Graph. Same UI and SQLite model as Google. No Exchange EWS.

## Requirements

- Functional: UR-SYNC-05, 08 for Microsoft accounts.
- Non-functional: MSAL Node only (not msal-browser). Same token rule as phase 5: no persist if `safeStorage` encryption unavailable. Loopback `127.0.0.1` + PKCE.

## Architecture

- `@azure/msal-node` authorization code + PKCE; system browser + loopback bind `127.0.0.1` (MSAL Electron desktop tutorial).
- `@microsoft/microsoft-graph-client`: `/me/calendars`, `/me/calendars/{id}/events`, delta queries when available.
- Map Graph recurrence object ↔ RRULE in adapter (do not leak Graph JSON to renderer).
- `MicrosoftGraphAdapter` implements same interface as `GoogleAdapter` (`pull`, `push`, `listCalendars`).

Scopes: `Calendars.ReadWrite`, `offline_access`, `User.Read`.

## Related Code Files

- Create: `src/main/oauth/microsoft-oauth.ts`
- Create: `src/main/sync/microsoft-graph-adapter.ts`
- Create: `src/main/sync/graph-recurrence-map.ts`, `tests/graph-recurrence-map.test.ts`
- Modify: `add-account-page.tsx` (Microsoft row), `sync-worker.ts`
- Create: `.env.example` Entra `MICROSOFT_CLIENT_ID`
- Delete: none

## Implementation Steps

1. Register Entra public client (desktop) documented in README.
2. Sign-in / sign-out; persist MSAL cache via safeStorage plugin or encrypted file.
3. Calendar list + two-way event sync.
4. Recurrence mapping tests (weekly, monthly Nth weekday).
5. Read-only calendars stay read-only in UI.
6. Auth errors reuse Google’s re-auth banner pattern.

## Success Criteria

- [x] 365/Outlook.com events appear in all five views
- [x] Edit in app appears in Outlook web
- [x] Disconnect removes account calendars from sidebar without wiping local-only calendars
- [x] No EWS code paths

## Risk Assessment

Personal Microsoft accounts vs work tenants (common vs org authority). Start with `organizations` + `consumers` via `common` and document tenant failures. Graph delta token expiry → full resync.
