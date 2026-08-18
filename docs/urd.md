---
title: Gone Calendar — User Requirements Document
status: approved
created: 2026-08-18
replaces: GNOME Calendar C/GTK modification plan
platform: Windows, Linux
stack: Electron, React, Vite, TypeScript
---

# Gone Calendar — User Requirements Document

Desktop calendar for Windows and Linux. Product target is One Calendar (Code Spark / onecalendar.nl) behavior and density, plus Vietnamese lunar dates. **New app.** Not a fork or patch of GNOME Calendar.

This document supersedes the previous `docs/urd.md` (GTK4 / libadwaita / Evolution Data Server phases).

## 1. Problem

People who live on Windows and Linux need one window for Google, Microsoft 365, and CalDAV (iCloud, Nextcloud, Synology, …). GNOME Calendar is tied to the GNOME stack. One Calendar is the UX reference but has no Linux app and no Vietnamese lunar calendar.

Gone Calendar is a from-scratch Electron desktop client: local-first store, provider adapters, custom calendar views.

## 2. Users

| User | Need |
|------|------|
| Individual (vi/en) | Personal + work calendars in one UI, offline, lunar dates on month/week/list |
| Linux self-hoster | Nextcloud/Synology/generic CalDAV after R1 |
| Microsoft 365 user | Outlook.com / 365 via Graph in R2 |

Not in scope: mobile users, macOS users, on-prem Exchange admins.

## 3. Product principles

1. **Local-first.** SQLite on disk is source of truth for the UI. Providers sync in and out.
2. **Full editor, no quick-add.** Blank-slot click opens the complete event form (One Calendar-style).
3. **Explicit drop.** Drag-and-drop offers Move / Copy / Cancel.
4. **Same chrome on Windows and Linux.** No OS-only live tiles or lock-screen appointments.
5. **YAGNI on native extras.** No print, maps, Facebook, or One Task clone.

## 4. Constraints (non-negotiable)

| Item | Decision |
|------|----------|
| Delivery | New Electron app. Do not reuse GNOME `src/` |
| UI stack | Electron + React + Vite + TypeScript |
| Calendar UI | Custom views (not FullCalendar as the shell). Third-party libs OK for chrome, DnD, dates, DB |
| OS | Windows 10/11 and Linux. No macOS, no iOS/Android |
| Microsoft | Microsoft Graph only. No Exchange on-prem / EWS |
| Languages | Vietnamese and English |
| Credentials | OS secret store (Windows Credential Manager / libsecret). Not plaintext in SQLite |

## 5. Releases (MoSCoW)

Full product vision is One Calendar-class desktop. First installable build is **R1**, not the whole vision.

| Release | Intent | MoSCoW |
|---------|--------|--------|
| **R1** | Usable personal calendar | **Must** |
| **R2** | Provider + collaboration parity | **Should** |
| **R3** | Satellite UX | **Could** |

### 5.1 R1 Must

- Views: Day, Week, Month, Year, List
- Create / edit / delete events via full editor (blank click and existing event)
- Drag-and-drop with Move / Copy / Cancel on Day, Week (timed + all-day header), Month
- Recurrence create + edit (this / this-and-future / all) on local + Google
- Week numbers on all views, toggle
- Vietnamese lunar secondary labels (month cells, week header, list day headers), toggle
- Calendars: local (app DB / ICS import-export) + **Google Calendar** (OAuth)
- Offline: browse and mutate local cache; Google sync when online
- OS notifications for reminders (Windows + Linux)
- Show/hide calendars; color per calendar; optional color per event
- Light / dark (follow OS + in-app override)
- Basic theming: accent / calendar colors
- UI language vi + en
- Search **not** required in R1 (R2)

### 5.2 R2 Should

- Microsoft Graph (Outlook.com / Microsoft 365 calendars)
- CalDAV: iCloud, Nextcloud, Synology, generic URL + credentials + discovery
- Invite attendees; accept/decline incoming invites where the provider supports it
- Share appointment: export `.ics` + OS share sheet (e.g. pick an app). Not WhatsApp-only
- Full-text search across cached events
- Birthdays (contacts/birthday calendars when the provider exposes them)
- Filter events by color
- Multi-year history in cache (not capped to a few weeks)
- Near-real-time sync while online (provider polling / push where available)

### 5.3 R3 Could

- Mini window: always-on-top and/or tray popover with upcoming events (same UX on Win and Linux)
- Local tasks: title, due date, done flag, optional calendar-day visibility. No Google Tasks / Microsoft To Do / One Task clone
- Deep theme: accent, background image, custom text color

## 6. Out of scope

Explicit **out** for this product (do not sneak back in without a URD change):

- macOS, iOS, Android
- Print
- Lock screen / live tiles
- Maps, routing, navigation
- Facebook events
- Exchange on-premises / EWS
- GNOME Online Accounts, Evolution Data Server, GTK/libadwaita
- One Task or any project-management task system
- OS-native widgets (Windows 11 Widgets board, Linux desktop widgets)
- Monetization / ads / premium paywall (app is the product; no One Calendar free-vs-premium split)

## 7. Functional requirements

IDs are stable for plans and tests.

### 7.1 Shell and views

| ID | Requirement | Release |
|----|-------------|---------|
| UR-VIEW-01 | App provides Day, Week, Month, Year, List. User can switch without losing selected date. | R1 |
| UR-VIEW-02 | Today is visually distinct. Keyboard and control exist to jump to today. | R1 |
| UR-VIEW-03 | Month cells are dense: filled event blocks using calendar/event color, overflow indicator when events exceed cell space. | R1 |
| UR-VIEW-04 | Week view: timed grid + all-day row. Drag-select a time range opens the full editor with that range prefilled. | R1 |
| UR-VIEW-05 | Day view: single-day timed grid + all-day. Same create/edit/DnD contracts as week. | R1 |
| UR-VIEW-06 | Year view: 12 months, click-through to month/day, event presence visible (dots or bars). | R1 |
| UR-VIEW-07 | List view: scrolling agenda, sticky date headers, empty days hidden, range extends when the user scrolls near the edge. | R1 |
| UR-VIEW-08 | Week numbers visible on Month, Week, Year, and List (ISO week). User can hide them. | R1 |

### 7.2 Event editor

| ID | Requirement | Release |
|----|-------------|---------|
| UR-EDIT-01 | Clicking an empty slot (month cell, week/day grid, week all-day) opens the **full** editor, not a title-only popover. | R1 |
| UR-EDIT-02 | Editor fields: summary, calendar, start, end, all-day, timezone, recurrence, attendees, reminders, notes, location, event color, meeting URL. | R1 (attendees write-back may no-op until R2 invite) |
| UR-EDIT-03 | Opening an existing event loads the same editor for update/delete. | R1 |
| UR-EDIT-04 | Recurring edit asks this event / this and future / all, then persists according to RFC 5545 + provider rules. | R1 |
| UR-EDIT-05 | Validation: end ≥ start; required summary (or explicit untitled placeholder); timezone required when not all-day. | R1 |
| UR-EDIT-06 | Cancel discards unsaved changes after confirm if dirty. | R1 |

### 7.3 Drag and drop

| ID | Requirement | Release |
|----|-------------|---------|
| UR-DND-01 | Dropping an event on a new date/time shows Move here / Copy here / Cancel at the drop point. | R1 |
| UR-DND-02 | Drop on the original date/time is a no-op (no popover). | R1 |
| UR-DND-03 | Move updates the existing event (same UID). Recurring move uses the same this/future/all prompt as edit. | R1 |
| UR-DND-04 | Copy creates a new event (new UID) with the new date/time. Recurring copy copies the **series** (predictable; not a single instance) in R1. | R1 |
| UR-DND-05 | Same helper behavior on month cells, week timed grid, week all-day header, and day view. | R1 |

### 7.4 Lunar calendar (Vietnam)

| ID | Requirement | Release |
|----|-------------|---------|
| UR-LUNAR-01 | Solar → Vietnamese lunar conversion (Ho Ngoc Duc / astronomical, UTC+7), including leap month flag. | R1 |
| UR-LUNAR-02 | Secondary lunar label on month cells, week day headers, list day headers. Convention: `dd/M` style; month emphasized on lunar day 1. | R1 |
| UR-LUNAR-03 | User can hide lunar labels. Default: on when UI language is vi, off when en (user can override). | R1 |

### 7.5 Accounts and sync

| ID | Requirement | Release |
|----|-------------|---------|
| UR-SYNC-01 | Local calendars: create, rename, color, enable/disable, delete. Events persist in SQLite. | R1 |
| UR-SYNC-02 | Import and export `.ics` for a local calendar. | R1 |
| UR-SYNC-03 | Google: OAuth login, list calendars, two-way sync of events the user can write. | R1 |
| UR-SYNC-04 | Offline: all views work from cache. Local and queued Google mutations sync when connectivity returns. Conflicts: last-write-wins with a visible error if the provider rejects. | R1 |
| UR-SYNC-05 | Microsoft Graph calendars, two-way, same UI as Google. | R2 |
| UR-SYNC-06 | CalDAV: provider picker rows for iCloud, Nextcloud, Synology, Other (URL). Discovery + credentials. Two-way sync. | R2 |
| UR-SYNC-07 | Onboarding is a provider list, not a bare URL field as the only path. | R1 Google row; R2 remaining rows |
| UR-SYNC-08 | Per-account errors (auth expired, discovery fail) are visible and recoverable (re-auth / retry). | R1 |

### 7.6 Collaboration, share, search

| ID | Requirement | Release |
|----|-------------|---------|
| UR-COLLAB-01 | Invite attendees (email); send via provider when supported. | R2 |
| UR-COLLAB-02 | Incoming invites: accept / decline / tentative when the provider supplies them. | R2 |
| UR-SHARE-01 | Share an event: write `.ics` and invoke the OS share/open-with flow. | R2 |
| UR-SEARCH-01 | Search title, location, notes across cached events; jump to occurrence. | R2 |
| UR-FILTER-01 | Toggle calendars in a sidebar. Filter by event/calendar color. | R1 toggle; R2 color filter |
| UR-BDAY-01 | Show birthday events when a connected account exposes a birthday calendar. | R2 |

### 7.7 Reminders, widget, tasks, theme

| ID | Requirement | Release |
|----|-------------|---------|
| UR-NOTIF-01 | Event reminders fire OS notifications on Windows and Linux when the app or tray process is running. | R1 |
| UR-THEME-01 | Light, dark, system. Calendar colors and optional per-event color. | R1 |
| UR-THEME-02 | Background image + custom text/accent color. | R3 |
| UR-WID-01 | Compact always-on-top and/or tray window: upcoming events, click opens main window on that event. | R3 |
| UR-TASK-01 | Local tasks: title, due, completed. Optionally show on the due day in List/Month. No cloud task sync. | R3 |

## 8. Information architecture (screens)

```text
Main window
├── Sidebar: calendars on/off, add account, mini month (optional)
├── Toolbar: view switch, today, date, search (R2), settings
├── Canvas: Day | Week | Month | Year | List
└── Dialogs: event editor, account onboarding, Move/Copy popover, recurrence scope

R3: Mini/tray window (upcoming list)
Settings: language, week numbers, lunar, theme, notification, accounts
```

## 9. Data (logical)

Not a SQL schema. Implementation may split tables.

- **Account:** provider (`local` \| `google` \| `microsoft` \| `caldav`), display name, auth handle
- **Calendar:** account, remote id, name, color, selected, read-only
- **Event:** calendar, UID, title, notes, location, start/end (UTC + tz id), all-day, RRULE/RDATE/EXDATE, attendees, reminders, color override, meeting URL, etag/sync token, dirty flag
- **Task (R3):** title, due, completed, optional show-on-calendar
- **SyncState:** per calendar token, last success, last error

Recurrence and timezones follow RFC 5545 / RFC 5546 where the provider allows. Google and Graph map into this model; do not leak provider JSON into the renderer.

## 10. Architecture constraints (for planning)

These are product constraints, not an implementation plan.

- **Process:** Electron main owns SQLite + secret store + OAuth + sync workers. Renderer is React UI.
- **Adapters:** `LocalAdapter`, `GoogleAdapter` (R1); `MicrosoftGraphAdapter`, `CalDavAdapter` (R2). Same event write API.
- **Views:** custom layout. Date lib and `@dnd-kit` (or equivalent) allowed. Do not make FullCalendar/Schedule-X the source of layout truth.
- **Lunar:** pure function module, unit-tested, no network.

## 11. Non-functional

| ID | Requirement |
|----|-------------|
| UR-NFR-01 | Cold start to interactive month view ≤ 3s on a mid-range laptop with 2 years of cached events (target, measure in R1). |
| UR-NFR-02 | Month/week interaction stays usable with ~200 events visible (no multi-second layout stalls). |
| UR-NFR-03 | No calendar payload or tokens in logs at info level. |
| UR-NFR-04 | App works as a guest/offline user with only local calendars. |
| UR-NFR-05 | Linux: xdg desktop file + tray/notifications on common distros (GNOME/KDE). Exact distro matrix in the implementation plan. |
| UR-NFR-06 | Accessibility: editor and view switch reachable by keyboard; contrast for event text on calendar colors. |

## 12. Acceptance — how we know a release is done

### R1

- User runs a packaged Windows and Linux build.
- Creates a local event from a blank month cell → full editor → event appears in Week and List.
- Connects Google, sees existing events, edits one, sees the change in Google Calendar web.
- Turns off network, edits a local event, still sees it after restart.
- Drags an event to another day, chooses Copy, both events exist; Move relocates one.
- Vietnamese UI shows lunar labels; toggle hides them.
- Reminder notification appears on both OS (manual check acceptable in R1).

### R2

- Same as R1 plus: Microsoft 365 calendar visible; Nextcloud or generic CalDAV two-way; search finds an event by substring; share produces an `.ics`; invite path exists for Google or Graph.

### R3

- Mini/tray window shows upcoming events.
- Local task with due date visible on that day.
- Background image theme applies to main chrome without breaking event contrast.

## 13. Success metrics (product)

- R1: daily driver for a Google + local user on Windows **and** Linux.
- R2: user can drop GNOME Calendar / web Google / Outlook web for desktop use.
- Parity note: visual clone of One Calendar is **not** pixel-perfect; density, views, editor-first create, Move/Copy, theming, and provider set are the bar.

## 14. Traceability (old URD → this document)

| Old GNOME-mod item | Fate |
|--------------------|------|
| Phase 0 meson/GTK build | Dropped |
| Full editor on blank click | UR-EDIT-01, R1 |
| DnD Move/Copy | UR-DND-*, R1 |
| One Calendar-ish CSS on libadwaita | Replaced by custom React UI + UR-VIEW-03, UR-THEME-* |
| GOA onboarding | Replaced by UR-SYNC-07 |
| Week numbers | UR-VIEW-08, R1 Must (was optional) |
| Vietnamese lunar | UR-LUNAR-*, R1 Must (was optional) |
| Better list view | UR-VIEW-07, R1 Must (was optional) |
| Out: Day/Year | **In** R1 (UR-VIEW-05, UR-VIEW-06) |
| Out: widgets / sharing / theming / sync engines | Widgets R3 mini-window; share R2; theme R1+R3; sync engines are core |

## 15. Open questions (non-blocking)

- Linux distro support matrix (Ubuntu LTS + Fedora vs wider).
- Google OAuth client: published app vs testing-mode quota.
- Whether R1 Google sync includes Google Tasks birthdays/holidays calendars as read-only.
- Recurring copy: keep “whole series” forever or add “this instance only” in R2.
