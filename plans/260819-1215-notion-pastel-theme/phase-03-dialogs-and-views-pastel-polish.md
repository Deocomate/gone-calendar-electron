---
phase: 3
title: Dialogs and views pastel polish
status: completed
priority: P2
dependencies:
  - 1
  - 2
---

# Phase 3: Dialogs and views pastel polish

## Overview
Polish calendar views (`MonthView`, `WeekView`, `DayView`, `YearView`, `ListView`), event hover flyout, and editor dialogs to adopt the pastel palette and Notion minimalist styling.

## Requirements
- **WeekView.tsx & DayView.tsx:**
  - Replace saturated `GOOGLE_OVERLAP_PALETTE` with soft pastel Notion palette (`#529cca`, `#52b788`, `#ea9a5f`, `#9a6dd7`, `#eb5757`, `#4dab9a`, `#e06f9f`, `#868e96`, `#e3b341`).
- **MonthView.tsx:**
  - Update multi-event counter badge from `bg-indigo-50 text-indigo-600` to clean Notion `bg-hover text-muted border border-hairline font-mono text-[9px]`.
- **EventHoverFlyout.tsx:**
  - Replace `rounded-xl`, `border-slate-200/90`, `bg-indigo-50`, `text-indigo-600` with `rounded-[4px]`, `border-hairline`, neutral counter badge, `rounded-[3px]` event cards with soft shadow.
- **ThemeSettingsModal.tsx:**
  - Update `ACCENT_COLORS` palette to Notion pastel tones.
- **EventEditorDialog.tsx:**
  - Update `COLOR_PALETTE` to pastel tones.
- **OverflowMenu.tsx:**
  - Update `COLOR_FILTERS` to pastel colors.

## Related Code Files
- Modify: `src/renderer/src/views/WeekView.tsx`
- Modify: `src/renderer/src/views/DayView.tsx`
- Modify: `src/renderer/src/views/MonthView.tsx`
- Modify: `src/renderer/src/components/EventHoverFlyout.tsx`
- Modify: `src/renderer/src/components/ThemeSettingsModal.tsx`
- Modify: `src/renderer/src/editor/EventEditorDialog.tsx`
- Modify: `src/renderer/src/components/shell/OverflowMenu.tsx`

## Success Criteria
- [ ] Overlapping columns render in soft pastel colors.
- [ ] Month view multi-event badges are understated and clean.
- [ ] Hover flyout and theme pickers show consistent pastel palettes.
