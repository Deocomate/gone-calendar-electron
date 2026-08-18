---
title: "Gone Calendar Electron rebuild"
description: "New Electron+React+TS desktop calendar (One Calendar-class UX) for Windows and Linux; R1 local+Google through R3 widget/tasks plus stretch."
status: pending
priority: P1
branch: ""
tags: [feature, frontend, backend, database, auth, electron]
blockedBy: []
blocks: []
created: "2026-08-18T13:07:03.193Z"
createdBy: "ck:plan"
source: skill
---

# Gone Calendar Electron rebuild

## Overview

Greenfield desktop app. Not a GNOME Calendar fork. Product contract: `docs/urd.md`. Design: local-first SQLite in Electron main, custom React views, provider adapters (Google R1, Graph+CalDAV R2).

Scope mode: **EXPANSION**. This plan covers R1+R2+R3 plus labeled stretch (phase 10). Cook stops at phase 5 for a usable R1; later phases are sequential follow-ons.

## Context

- URD: [docs/urd.md](../../docs/urd.md)
- Brainstorm: [brainstorm-electron-gone-calendar-urd.md](../260818-1959-electron-gone-calendar-rebuild/reports/brainstorm-electron-gone-calendar-urd.md)
- Repo today: URD + journals only. No `src/`, no git yet.

## Architecture

```text
Renderer (React, sandbox)
  views / editor / dnd / settings
        | IPC (preload, contextIsolation)
Main
  db (node:sqlite, fallback better-sqlite3) | oauth | sync workers | notifications | tray
        |
  adapters: local | google | microsoft-graph | caldav
```

**Locked stack**

| Layer | Choice | Why |
|-------|--------|-----|
| Shell | electron-vite + Electron + React + TS | User lock; 2026 default toolchain |
| UI chrome | Tailwind + Radix/shadcn-style | Fast dialogs/menus; calendar grid stays custom |
| State | Zustand in renderer; SQLite is source of truth | No Redux; UI cache only |
| DB | `node:sqlite` (`DatabaseSync`) in **main**; fallback `better-sqlite3` if Electron build lacks sqlite | Avoid native rebuild on modern Electron (≥35, sqlite enabled). WAL + FTS5 |
| Dates | Luxon + `rrule` | TZ + RFC 5545 expansion |
| ICS | `ical.js` | Import/export local calendars |
| Secrets | `safeStorage` (Electron) | No plaintext tokens in SQLite |
| Google | Calendar API v3 + loopback OAuth PKCE | Not Google CalDAV |
| Microsoft | `@azure/msal-node` + Graph SDK | System browser / loopback; not msal-browser |
| CalDAV | `tsdav` | Nextcloud/iCloud/Synology/generic |
| DnD | `@dnd-kit` | Move/Copy popover on drop |
| i18n | i18next, `vi` + `en` | URD |
| Pack | electron-builder: NSIS + AppImage | Win + Linux. R1 Linux target = Ubuntu LTS + AppImage only |
| Test | Vitest (main/shared), Playwright smoke later | Lunar/recurrence/adapters first |

Renderer never talks to Google/Graph/CalDAV directly.

## Phases

| Phase | Name | Status | Ships |
|-------|------|--------|-------|
| 1 | [Scaffold electron-vite React TypeScript](./phase-01-scaffold-electron-vite-react-typescript.md) | Completed | Dev app + pack skeleton |
| 2 | [Domain SQLite ICS recurrence](./phase-02-domain-sqlite-ics-recurrence.md) | Completed | Local CRUD API |
| 3 | [Custom views lunar week numbers](./phase-03-custom-views-lunar-week-numbers.md) | Completed | 5 views on local data |
| 4 | [Event editor and drag-drop](./phase-04-event-editor-and-drag-drop.md) | Completed | UR-EDIT + UR-DND |
| 5 | [Google sync offline notifications](./phase-05-google-sync-offline-notifications.md) | Completed | **R1** |
| 6 | [Microsoft Graph adapter](./phase-06-microsoft-graph-adapter.md) | Pending | Graph two-way |
| 7 | [CalDAV adapter onboarding](./phase-07-caldav-adapter-onboarding.md) | Pending | Nextcloud/generic Must; iCloud best-effort |
| 8 | [Invite share search filters](./phase-08-invite-share-search-filters.md) | Pending | **R2** |
| 9 | [Mini window tasks deep theme](./phase-09-mini-window-tasks-deep-theme.md) | Pending | **R3** |
| 10 | [Stretch a11y push holidays](./phase-10-stretch-a11y-push-holidays.md) | Pending | Stretch; skippable |

## Dependencies

- Google Cloud OAuth client (Desktop) before **live** phase 5. Adapter + fixtures can cook first; URD R1 is not done until a real Google round-trip.
- Microsoft Entra app registration before phase 6.
- CalDAV test account: Nextcloud or generic **required** before phase 7 live. iCloud app-password optional.
- No overlapping unfinished plans.

## Success Criteria

- [ ] R1 packaged Win + Linux matches URD §12 R1
- [ ] R2 matches URD §12 R2
- [ ] R3 matches URD §12 R3
- [ ] Phase 10 items labeled stretch; product still complete if skipped
- [ ] No GNOME/GTK/EDS code

## Risks

| Risk | Mitigation |
|------|------------|
| `node:sqlite` missing on some Electron builds | Pin Electron with sqlite enabled (avoid 37.2.0 regression). Fallback better-sqlite3 + asarUnpack only if import fails |
| Recurrence/TZ bugs | Canonical model in SQLite; expand in shared module; golden tests |
| Google testing-mode OAuth | Document test users; desktop loopback |
| iCloud CalDAV | Best-effort R2. Visible errors. Do not block Nextcloud/generic or R2 ship |
| Linux `safeStorage` unavailable | Refuse token persist; prompt keyring. Never plaintext refresh tokens |
| Second app instance | `requestSingleInstanceLock` in phase 1 before DB |
| CalDAV self-signed TLS | Per-host SHA-256 pin only; default deny |
| Silent sync overwrite | Keep local; explicit retry/overwrite on 412 |
| Scope explosion | Cook R1 (through phase 5) before starting R2 |

## Out of this plan (URD out)

macOS, mobile, print, lock screen, maps, Facebook, EWS, native OS widgets, One Task clone, GNOME stack.

## Next after this plan

`/ck:cook` from phase 1 after `/clear` recommended. Do not cook phase 6+ until R1 is a daily driver (includes live Google round-trip).

## Red Team Review

### Session — 2026-08-18
**Findings:** 10 (8 accepted, 2 rejected)
**Severity breakdown:** 0 Critical, 7 High, 1 Medium (accepted); 2 rejected (scope)

| # | Finding | Severity | Disposition | Applied To |
|---|---------|----------|-------------|------------|
| 1 | Linux safeStorage may be plaintext | High | Accept | Phase 5 |
| 2 | No single-instance lock | High | Accept | Phase 1 |
| 3 | CalDAV trust-this-host MITM | High | Accept | Phase 7 |
| 4 | ICS import unbounded | Medium | Accept | Phase 2 |
| 5 | IPC writes read-only calendars | High | Accept | Phase 2 |
| 6 | OAuth loopback hijack | High | Accept | Phase 5 |
| 7 | Silent last-write-wins | High | Accept | Phase 5 |
| 8 | Google recurrence exceptions untested | High | Accept | Phase 5 |
| 9 | Cut R3/stretch | — | Reject | User EXPANSION |
| 10 | Drop sqlite fallback | — | Reject | Validation Session 1 |

Report: [from-code-reviewer-to-planner-red-team-all-lenses-plan-review.md](./reports/from-code-reviewer-to-planner-red-team-all-lenses-plan-review.md)

### Whole-Plan Consistency Sweep
- Decision delta: encryption fail-closed; single-instance; TLS pin; ICS cap; read-only IPC; loopback harden; conflict UI; Google exception fixtures.
- Searched remaining “trust this host” / plaintext token / last-write-wins-only phrasing.
- Phase 6 still said “Tokens in safeStorage” without fail-closed — update with same rule as phase 5.
- **Unresolved contradictions:** none after phase 6 NFR sync.

## Validation Log

### Verification Results
- **Tier:** Full (10 phases)
- **Claims checked:** 18
- **Verified:** 4 | **Failed:** 0 | **Unverified:** 14
- Greenfield: no `src/` yet. `docs/urd.md` exists. All `Create:` paths are future files (not failures).
- Unverified: electron-vite scaffold package name, FTS5 compile flags in `node:sqlite`, iCloud live behavior.

### Session 1 — 2026-08-18
**Trigger:** `/ck:plan validate` after plan write
**Questions asked:** 4

#### Questions & Answers

1. **[Architecture]** Phase 2 SQLite engine?
   - Options: better-sqlite3 native | sql.js WASM | node:sqlite with better-sqlite3 fallback
   - **Answer:** node:sqlite if Electron is new enough; fallback better-sqlite3
   - **Rationale:** Skip native rebuild on Electron 35+ where `node:sqlite` is on by default. Pin a version that is not the 37.2.0 “No such binding: sqlite” regression.

2. **[Assumptions]** Google OAuth Desktop client before phase 5?
   - Options: have/create before live test | fixture until creds | R1 local-only (URD change)
   - **Answer:** Fixture/mock first; live OAuth when client ID exists. R1 not done without real Google round-trip.
   - **Rationale:** Unblocks cook of adapter code. Does not silently drop UR-SYNC-03.

3. **[Scope]** Linux distro/pack for R1?
   - Options: Ubuntu LTS + AppImage | Ubuntu+Fedora AppImage+.deb | AppImage unspecified
   - **Answer:** Ubuntu LTS + AppImage is enough for R1. Fedora/.deb later.
   - **Rationale:** Shrinks phase 1 pack matrix.

4. **[Risks]** iCloud CalDAV in R2?
   - Options: best-effort | Must two-way | move to R3
   - **Answer:** Best-effort. Nextcloud/generic are Must. iCloud row stays; errors must be visible; iCloud failure does not block R2.
   - **Rationale:** Matches known Apple CalDAV fragility without deleting the URD row.

#### Confirmed Decisions
- DB: `node:sqlite` primary, `better-sqlite3` fallback
- Phase 5: mock/fixture then live Google; R1 gate still requires live round-trip
- R1 Linux: Ubuntu LTS + AppImage
- iCloud: best-effort R2

#### Action Items
- [x] Update plan stack + risks
- [x] Phase 1 pack + sqlite unpack wording
- [x] Phase 2 DB implementation steps
- [x] Phase 5 fixture-then-live
- [x] Phase 7 iCloud best-effort

#### Impact on Phases
- Phase 1: AppImage/Ubuntu; asarUnpack only for fallback native sqlite
- Phase 2: node:sqlite first
- Phase 5: fixture path + live gate
- Phase 7: iCloud not a R2 blocker

### Whole-Plan Consistency Sweep
- **Session 1:** Re-read plan.md + phases 1–10 after propagation.
- Stale `better-sqlite3`-as-primary removed from plan.md, phase 01, phase 02. Remaining mentions are fallback-only.
- Linux pack: Ubuntu LTS + AppImage in plan.md + phase 01. No Fedora/.deb Must left except “later” in validation answers.
- Google: fixture-then-live in phase 05 + dependencies. R1 still requires live round-trip.
- iCloud: best-effort in phase 07 + plan phase table + risks. Nextcloud/generic Must.
- **Unresolved contradictions:** none.
- **Unverified remaining:** electron-vite exact `npm create` package name (phase 01); FTS5 in node:sqlite (phase 08).
