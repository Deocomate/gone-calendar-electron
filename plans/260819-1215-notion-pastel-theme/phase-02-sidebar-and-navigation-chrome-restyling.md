---
phase: 2
title: Sidebar and navigation chrome restyling
status: completed
priority: P2
dependencies:
  - 1
---

# Phase 2: Sidebar and navigation chrome restyling

## Overview
Restyle `AppSidebar`, `MiniCalendar`, `HolidayCalendarToggle`, and `AppHeader` to strictly apply `<5px` border radius on all sidebar items and remove all remaining indigo/loud color styling in favor of Notion minimalist chrome.

## Requirements
- **AppSidebar.tsx:**
  - Tasks launcher card: replace `rounded-xl`, `border-indigo-500/30`, `bg-indigo-50/70` with `rounded-[4px]`, `border-hairline`, `bg-surface`, `hover:bg-hover`, `text-primary`.
  - Tasks icon container: replace `rounded-lg`, `bg-indigo-500/20`, `text-indigo-600` with `rounded-[3px]`, `bg-hover`, `text-muted`, `group-hover:text-primary`.
  - Tasks count badge: replace `rounded-full`, `bg-indigo-600` with `rounded-[3px]`, `bg-accent/15`, `text-accent`, `text-[10px]`.
  - Chevron & section icons: replace `text-indigo-400`/`text-indigo-500` with `text-muted`.
  - Calendars list item: `rounded-[3px]`, `hover:bg-hover`.
  - Calendar checkbox: `rounded-[3px]`.
  - Read-only tag: `rounded-[3px]`.
  - Footer status & refresh button: `rounded-[3px]`, soft pastel emerald `#52b788` status dot.
- **MiniCalendar.tsx:**
  - Date buttons: `rounded-[3px]`, `hover:bg-hover`.
  - Today indicator: `rounded-[3px]` with `TODAY_COLOR` (`#eb5757`) and white text.
  - Event indicators: `rounded-[1px]`.
  - Navigation buttons: `gc-icon-btn` with `rounded-[3px]`.
- **HolidayCalendarToggle.tsx:**
  - Toggle items: `rounded-[4px]`, `border-hairline`, `hover:bg-hover`.
  - Active state: soft pastel tint `bg-accent/10 border-accent/30 text-primary`.
  - Active badge: `rounded-[3px]`, `bg-accent/20 text-accent`.
  - Header icon: `text-muted`.
- **AppHeader.tsx:**
  - Tasks icon button: replace `text-indigo-600 hover:bg-indigo-50` with `text-muted hover:text-primary hover:bg-hover`.
  - Tasks badge: `rounded-[3px] bg-accent text-[9px] font-bold text-white`.
  - Action buttons (`gc-btn`, `gc-btn-primary`, `ViewSwitcher`, `OverflowMenu`): clean Notion minimalist look with `<5px` radius.

## Related Code Files
- Modify: `src/renderer/src/components/shell/AppSidebar.tsx`
- Modify: `src/renderer/src/components/MiniCalendar.tsx`
- Modify: `src/renderer/src/components/HolidayCalendarToggle.tsx`
- Modify: `src/renderer/src/components/shell/AppHeader.tsx`
- Modify: `src/renderer/src/components/shell/ViewSwitcher.tsx`
- Modify: `src/renderer/src/components/shell/OverflowMenu.tsx`

## Success Criteria
- [ ] Every item in the sidebar has a border radius strictly < 5px (3px/4px).
- [ ] Tasks button and holiday toggles look quiet, clean, and elegant in both light and dark modes.
- [ ] AppHeader tasks button and badges match the Notion palette.
