---
phase: 3
title: "Custom views lunar week numbers"
status: completed
effort: L
priority: P1
dependencies: [2]
---

# Phase 3: Custom views lunar week numbers

## Overview

Custom Day, Week, Month, Year, List views on local SQLite data. ISO week numbers. Vietnamese lunar secondary labels (Ho Ngoc Duc / UTC+7). Dense colored blocks. No FullCalendar as layout source.

## Requirements

- Functional: UR-VIEW-01..08, UR-LUNAR-01..03. Query events for visible range via IPC.
- Non-functional: month/week usable with ~200 events (measure later in phase 10). No layout stall of multiple seconds.

## Architecture

- `src/shared/lunar-vietnam.ts` — pure, no Electron.
- `src/renderer/views/month-view.tsx`, `week-view.tsx`, `day-view.tsx`, `year-view.tsx`, `list-view.tsx`
- Layout engine: CSS grid + absolute event blocks (week/day). Month: stacked chips + overflow `+N`.
- List: virtualize if needed (`@tanstack/react-virtual`); hide empty days; sticky date header; extend range on scroll end.
- Week numbers: ISO (`Luxon.weekNumber`). GSettings-equivalent in `settings` table.

Lunar format: `dd/M`; emphasize month on lunar day 1. Default on if locale is `vi`.

## Related Code Files

- Create: `src/shared/lunar-vietnam.ts`, `tests/lunar-vietnam.test.ts`
- Create: `src/renderer/views/*`, `src/renderer/hooks/use-visible-range.ts`
- Create: `src/renderer/components/week-number.tsx`, `lunar-label.tsx`
- Modify: `src/renderer/app.tsx` (wire view switch + today + date)
- Delete: none

## Implementation Steps

1. Port Ho Ngoc Duc solar→lunar (leap month). Tests: known dates (e.g. Tết several years).
2. Month view: 6-row grid, today highlight, calendar color chips from IPC range query.
3. Week + Day: 24h (or 6–22 with scroll) timed grid + all-day row. Drag-select **range state only** (editor in phase 4); show selection overlay.
4. Year: 12 mini months, click → month view on that month.
5. List: agenda, sticky headers, infinite extend ±N days.
6. Settings toggles: week numbers, lunar. Persist via IPC.
7. Sidebar: calendar list on/off (local calendars from phase 2).

## Success Criteria

- [x] All five views switch without losing selected date
- [x] Lunar tests pass; labels hide via toggle
- [x] Week numbers on month/week/year/list
- [x] Empty slot click still no editor (phase 4) but selection range is captured


## Risk Assessment

Custom week grid is the long pole. Ship a readable week before pixel-perfect overlap packing. Overlapping timed events: simple column split, not Google Calendar’s full packer, unless cheap.
