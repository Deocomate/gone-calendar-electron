---
phase: 4
title: "Event editor and drag-drop"
status: completed
effort: L
priority: P1
dependencies: [3]
---

# Phase 4: Event editor and drag-drop

## Overview

Full event editor on blank-slot click (no quick-add). Drag-and-drop Move / Copy / Cancel on Day, Week (timed + all-day), Month. Recurrence create + this / this-and-future / all.

## Requirements

- Functional: UR-EDIT-01..06, UR-DND-01..05.
- Non-functional: dirty-close confirm; keyboard: Esc closes popover/dialog.

## Architecture

Editor dialog (Radix Dialog): summary, calendar, start/end, all-day, timezone (IANA list), recurrence (common presets + RRULE text advanced), attendees (emails stored locally; send in phase 8), reminders (minutes before), notes, location, color, meeting URL.

DnD: `@dnd-kit`. On drop, if same slot → no-op. Else popover at pointer: Move here / Copy here / Cancel.

Copy recurring: **whole series** (URD R1). Stretch instance-copy is phase 10.

## Related Code Files

- Create: `src/renderer/editor/event-editor-dialog.tsx`, `recurrence-fields.tsx`, `reminder-fields.tsx`
- Create: `src/renderer/dnd/drop-action-popover.tsx`, `use-event-dnd.ts`
- Modify: month/week/day views to open editor with prefilled range; wire drag sources
- Modify: `src/main/db/repos/events-repo.ts` (move/copy/recurrence-scope writes)
- Create: `tests/event-copy-uid.test.ts`
- Delete: none

## Implementation Steps

1. Editor opens from empty month cell, week timed select, week all-day, day grid. Prefill start/end.
2. Save/update/delete through IPC. Validation UR-EDIT-05.
3. Recurrence presets: none, daily, weekly, monthly, yearly, custom RRULE. Edit scope modal on save if `rrule` set.
4. Existing event click opens same editor.
5. Drag source on event chip. Drop targets on cells/slots.
6. Move = update dtstart/dtend keep uid. Copy = new uid.
7. Visual: filled blocks using calendar/event color (UR-VIEW-03, UR-THEME-01 calendar colors).

## Success Criteria

- [x] Blank click never shows title-only popover
- [x] Move relocates one event; Copy leaves original
- [x] Drop on original slot does nothing
- [x] Recurring save asks this / future / all
- [x] Cancel on dirty editor confirms

## Risk Assessment

dnd-kit + custom grid coordinates — hit-test by data attributes (`data-date`, `data-minutes`). Do not use HTML5 DnD only (poor Electron Linux).
