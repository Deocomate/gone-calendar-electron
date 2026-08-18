---
phase: 10
title: "Stretch a11y push holidays"
status: completed
effort: M
priority: P3
dependencies: [9]
---

# Phase 10: Stretch a11y push holidays

## Overview

**STRETCH — completed.** Expansion extras: keyboard/a11y, adaptive polling policy, holiday calendars (Vietnam Solar & Lunar + International), recurring copy of **this instance only**, perf budget UR-NFR-01/02.

## Requirements

- Functional (stretch): UR-NFR-06 keyboard; holiday calendars read-only; DnD copy single occurrence; adaptive sync polling policy (60s focused, 5m background).
- Non-functional: cold start ≤ 3s target; month 200 events no multi-second stall.

## Architecture

- A11y: global keyboard map (T today, 1–5 views, N/C new, Ctrl+K// search, ?/F1 help), focus rings, dialog shortcuts.
- Push & Polling: adaptive polling policy in `SyncWorker` (60s when focused, 5m when background/tray) saving CPU & battery while providing near instant updates.
- Holidays: one-click subscribe/unsubscribe for Vietnam (Solar & Lunar) and International holiday calendars stored in SQLite as read-only.
- Copy instance: `copyInstanceOnly: true` creates standalone non-recurring event at target date/time without altering the master recurring series.

## Related Code Files

- Modified: `src/renderer/src/App.tsx`, `src/renderer/src/dnd/DropActionPopover.tsx`
- Modified: `src/main/sync/sync-worker.ts`, `src/main/index.ts`
- Created: `src/shared/holiday-calendars.ts`, `src/main/ipc/holiday-ipc.ts`
- Created: `src/renderer/src/components/HolidayCalendarToggle.tsx`
- Created: `src/renderer/src/components/KeyboardShortcutsModal.tsx`
- Created: `tests/copy-instance.test.ts`, `tests/holiday-calendars.test.ts`

## Implementation Steps

1. [x] Keyboard map documented in shortcuts modal: T today, 1–5 views, N/C new, `/` search, ? help.
2. [x] Contrast audit on calendar colors & themes.
3. [x] Copy instance in DnD + editor (standalone event without rrule).
4. [x] Holiday calendar opt-in for Vietnam (Solar + Lunar) and International.
5. [x] Indexes + query optimizations.
6. [x] Adaptive polling policy when focused vs tray.

## Success Criteria

- [x] Keyboard-only navigation & create event
- [x] Copy instance test passing (`tests/copy-instance.test.ts`)
- [x] Holiday calendar optional, clean subscription toggle (`HolidayCalendarToggle.tsx`)
- [x] Documented that true Google push needs a server; adaptive focus polling solves desktop requirement cleanly

## Risk Assessment

Desktop webhook limitations cleanly resolved via adaptive focus/blur polling policy.

