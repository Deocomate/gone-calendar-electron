---
type: brainstorm
date: 2026-08-18
status: approved
modes: []
urd: docs/urd.md
---

# Brainstorm: Electron Gone Calendar URD

## Summary

Old `docs/urd.md` was a GNOME Calendar C/GTK patch plan. User wants a **new** desktop calendar: One Calendar-class UX, Windows + Linux, Electron + React + Vite + TypeScript. Design A approved: local-first SQLite, custom views, provider adapters. URD rewritten as product spec with MoSCoW releases R1–R3. No code.

## Problem-first

### 1. Solution-jumping diagnosis

Signal: “build lại hoàn toàn bằng Electron, chức năng giống One Calendar.” Pain underneath: GNOME stack is the wrong product on Windows; One Calendar is the UX people want; Linux has no One Calendar.

### 2. Underlying problem

Need a desktop client that unifies personal/work calendars with dense views, offline use, and Vietnamese lunar dates — without depending on GNOME.

### 3. Assumption challenges

| Assumption | Risk if wrong | Check |
|------------|---------------|-------|
| Electron is the right shell | Heavier than Tauri; native module pain (SQLite) | User locked Electron; keep |
| “Giống One Calendar” = full commercial clone | Years of work; URD unusable | Split R1/R2/R3 |
| All providers in first binary | OAuth/CalDAV blocks UI | R1 = Local + Google only |
| Widget = OS widget | Win11 ≠ Linux | Mini/tray window, R3 |
| Tasks = One Task | Second product | Local to-do only, R3 |

### 4. Problem statement

- **Users:** individuals on Windows/Linux, vi+en, Google + later 365/CalDAV.
- **Struggle:** no one app with One Calendar density + lunar + Linux.
- **Cause:** GNOME Calendar is desktop-Linux/GNOME; One Calendar is UWP/mobile/Mac, no Linux, no lunar.
- **Consequence:** fork-mod URD pointed at the wrong codebase.
- **Success:** R1 daily-driver for Google + local; R2 replaces web Google/Outlook for desktop; lunar and week numbers always on.

### 5. Alternative framings

- **A (chosen):** Local-first custom UI + adapters (Google/Graph/CalDAV).
- **B:** Library-first (FullCalendar/Schedule-X). Faster time-grid, worse density/lunar/DnD fidelity.
- **C:** CalDAV-only hub. Conflicts with Google/Graph parity.

### 6. Evidence status

**Weak–medium.** User intent + old URD (editor, DnD, lunar, list) + public One Calendar feature list. No usage telemetry.

### 7. Validation plan

Kill/shrink if: Google OAuth unpublished-app quota blocks R1; month grid + 200 events unusable; CalDAV iCloud too unstable for R2. Prototype: R1 shell + local CRUD + one Google sync before Graph/CalDAV.

### 8. Stakeholder message

Keep One Calendar as the **UX bar**, not a pixel-perfect or same-release clone. First ship is a real calendar (all views, editor, Move/Copy, Google, lunar). Providers and share/search next. Widget/tasks last.

## Findings

### Repo

Only `docs/urd.md`. No README, no `src`, no plans. Touchpoint = rewrite URD.

### Old URD vs One Calendar

Old In: full editor, Move/Copy, light CSS, GOA onboarding. Optional: week numbers, lunar, list. Old Out: Day/Year, widgets, theming, sharing, sync engines.

One Calendar In: Day/Week/Month/Year/List, all major providers, offline, invite, share, search, theme, widgets, One Task integration. No Linux. No Vietnamese lunar.

### User locks

- Artifact: product URD (not code).
- Vision: full clone with MoSCoW releases (not all-Must first binary).
- Stack: Electron + React + Vite + TS; third-party libs OK.
- OS: Windows + Linux. Out: Mac, mobile, print, lock screen, maps, Facebook, EWS.
- Widget: mini/tray window. Tasks: local. Theme + share in product; share is R2, deep theme R3.
- R1 providers: Local + Google.

## Evaluated approaches

| | A Local-first custom (chosen) | B Library-first | C CalDAV-only |
|--|------------------------------|-----------------|---------------|
| UX bar | Highest | Fights the lib | OK UI, weak Google/MS |
| Sync | Adapters | Same | One protocol, bad Graph/Google |
| Cost | Highest UI | Lower week/day | Lowest sync, fails requirement |

## Final solution

See `docs/urd.md`.

- **R1 Must:** Day/Week/Month/Year/List, full editor, Move/Copy, week numbers, lunar VN, local + Google, offline cache, OS reminders, basic theme, vi+en.
- **R2 Should:** Graph, CalDAV, invite, ICS/OS share, search, birthdays, color filter.
- **R3 Could:** mini window, local tasks, background image theme.
- Architecture constraint: main process SQLite + secrets + sync; React renderer; custom views.

## Implementation considerations / risks

- Google OAuth desktop + token refresh is the R1 blocker, not the month grid.
- `better-sqlite3` native rebuild vs WASM sqlite — plan must pick one.
- Recurrence + timezone bugs will dominate QA.
- iCloud CalDAV historically fragile → R2, isolated adapter.
- Do not port GNOME C files; ignore old `src/gui/*.c` paths.

## Success metrics / validation

R1 packaged Win + Linux: blank-click editor, Google round-trip, offline local edit, Move vs Copy, lunar toggle. Details in URD §12.

## Next steps

1. `/ck:plan` using `docs/urd.md` + this report (user asked to plan after URD).
2. Recommend **default `/ck:plan`**, not `--tdd`: greenfield, no behavior to lock. Tests still belong in phases (lunar, recurrence, adapters).
3. Do not implement until the plan exists.

## Unresolved questions

- Linux distro matrix.
- Google Cloud OAuth app publication.
- Holiday/birthday calendars in R1 Google sync.
- Recurring copy: series-only vs instance in R2.
