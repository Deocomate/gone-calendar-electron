# Journal: Phase 7 CalDAV Adapter & Onboarding

- **Date:** 2026-08-18
- **Phase:** 7 (CalDAV adapter onboarding)
- **Status:** Completed

## Summary

Implemented CalDAV two-way synchronization supporting Nextcloud, Apple iCloud, Synology, and Generic CalDAV endpoints. Built URL normalization, pure WebDAV HTTP client (`PROPFIND`, `REPORT`, `PUT`, `DELETE`), native RFC 5545 `.ics` payload serialization, encrypted credential storage via OS safeStorage, multi-account background sync, and renderer onboarding dialog.

## Key Changes

1. **Discovery & Normalizer (`caldav-discover.ts`)**:
   - Provider URL resolution for iCloud, Nextcloud, Synology, and Generic endpoints.
   - XML Multistatus parser extracting collections, display names, colors, ctags, sync-tokens, and access privileges.

2. **WebDAV Client (`caldav-adapter.ts`)**:
   - Executes `PROPFIND` for collections and `REPORT` (calendar-query) for events.
   - Conditional `PUT` with `If-Match` ETag concurrency headers and `DELETE` for removals.

3. **Sync Engine (`caldav-sync-engine.ts`, `sync-worker.ts`)**:
   - Upserts calendars and events into SQLite (`events`, `calendars`).
   - Pushes dirty queue items.
   - `SyncWorker` now concurrently syncs Google, Microsoft Graph, and CalDAV accounts.

4. **UI & Tests (`CalDavConnectModal.tsx`, `AccountManagerModal.tsx`)**:
   - Onboarding modal with provider tabs and Apple ID app-specific password instructions.
   - 54/54 tests passing in Vitest, 0 TypeScript errors, clean production bundle.
