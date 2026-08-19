---
type: brainstorm
date: 2026-08-19
status: approved
modes: []
topic: resize calendar events by edge
---

# Brainstorm: Event edge resize

User skipped `/ck:plan` — implement after this report.

## Summary

Timed events on Week/Day can only move (HTML5 DnD), duration locked, drop snaps to whole hours. User wants Google-like edge resize: vertical changes start/end time (15-min snap + clock preview), horizontal stretches a timed event across consecutive days. Commit live like current move. Recurring = this occurrence. Esc cancels.

## Problem-first

Pain: changing duration or end date requires the full editor. Move keeps duration and floors minutes.

Chosen frame: in-grid resize, not editor shortcuts.

## Decision

**Approach 1 — pointer handles + per-day timed segments.**

- Week timed: 4 edges. N/S = time (may cross midnight). E/W = date of that edge, keep clock time.
- Day: N/S only.
- Live preview, mouseup saves via existing `move` / `updateScope('this')`. Read-only blocked.
- Snap 15 min. Tooltip `HH:mm · duration`; horizontal adds `dd/MM`.
- Multi-day timed painted as column slices (first/middle/last). Handles on outer edges only.
- Out: Month, Year, List, all-day strip, RecurringScope dialog, PDR-004 popover, changing move's hour snap.

## Touchpoints

`drop-target.ts`, new `resize-math.ts` + `use-event-resize.ts` + `timed-event-segments.ts`, `WeekView`, `DayView`, `App.tsx` persist path. No schema/IPC change.
