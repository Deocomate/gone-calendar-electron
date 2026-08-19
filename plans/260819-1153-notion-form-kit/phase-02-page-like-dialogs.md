---
phase: 2
title: "Page-like dialogs"
status: pending
priority: P1
dependencies: [1]
effort: "M"
---

# Phase 2: Page-like dialogs

## Overview

Rebuild Event editor, Task, and Theme as Notion **page properties**: large ghost title, `FormRow` fields, no nested gray cards, no indigo chips/icon boxes. Highest-traffic surface. Depends on phase 1 primitives.

## Requirements

- Functional: create/edit/save/delete/share/discard-unsaved, all-day, recurrence (including custom RRULE), attendees, color, calendar, timezone — **unchanged**.
- Non-functional: property-row layout; sentence-case labels; accent-only color; radius from tokens.

## Architecture

**Event editor** (`EventEditorDialog.tsx`)

```text
header: 12px color dot + title string + close (gc-icon-btn)
body:
  ghost title ~22px/600  (no "Tiêu đề" label)
  FormRow Lịch            CustomSelect ghost
  FormRow Múi giờ         CustomSelect ghost searchable
  FormRow Cả ngày         ToggleSwitch
  FormRow Bắt đầu         DatePicker + TimePicker (hidden if all-day)
  FormRow Kết thúc        DatePicker + TimePicker
  FormRow Lặp lại         CustomSelect (none/daily/weekly/monthly/yearly/custom)
  [if custom] boxed TextInput mono RRULE
  FormRow Địa điểm        TextInput ghost
  FormRow Link họp        TextInput ghost url
  FormRow Người tham gia  AttendeeInput (visual quiet; full restyle in phase 3 OK)
  FormRow Ghi chú         TextArea ghost
footer: text Delete / Share | text Cancel | primary Save (bg-accent, radius 3px, no shadow)
```

Must drop:

- Date-range `rounded-2xl` slate card
- Six recurrence chip buttons → one select
- Color dots `scale-125 ring-2 ring-indigo` → 12px dots, selected = 1px hairline
- Uppercase tracking labels
- Primary `shadow-md shadow-indigo-600/30`
- Discard confirm: no amber icon box; text + two buttons (hairline / destructive text)

**Task** (`TaskModal.tsx` + `TaskPane.tsx`)

- Modal: `gc-overlay` + `gc-dialog` (stop one-off `rounded-2xl` / indigo header icon).
- Task add row: ghost/hairline, not `rounded-xl` slate card.
- Task list rows: hover wash, no bordered mini-cards. Complete control stays checkbox-like, accent not indigo.

**Theme** (`ThemeSettingsModal.tsx`)

- Rows for accent / wallpaper / sliders via `FormRow`.
- Remove Sparkles/indigo section icons.
- Swatch selected = hairline, not indigo check glow.
- Range `accent-accent` not `accent-indigo-500`.
- Wallpaper list: text + check muted, no Unsplash restyle required (out of visual slop except indigo).

## Related Code Files

- Modify: `src/renderer/src/editor/EventEditorDialog.tsx`
- Modify: `src/renderer/src/components/TaskModal.tsx`
- Modify: `src/renderer/src/components/TaskPane.tsx`
- Modify: `src/renderer/src/components/ThemeSettingsModal.tsx`

## Implementation Steps

1. Event editor layout → FormRows + ghost title. Recurrence select. Quiet color dots. Quiet footer/discard.
2. TaskModal shell onto `gc-dialog`. TaskPane cards → rows/hover.
3. ThemeSettings onto FormRows; kill indigo icons.
4. Grep these four files for `indigo-` `rounded-xl` `rounded-2xl` `from-` `to-` `slate-` — should be zero.
5. Manual: create event, all-day, weekly recurrence, custom RRULE, unsaved discard, edit+delete path. Light and dark.
6. `npm run typecheck`.

## Success Criteria

- [ ] Event editor matches brainstorm ASCII (title + rows, no date card, no 6 chips)
- [ ] Primary save uses `accent`, no colored shadow
- [ ] Task modal has no tinted icon header box
- [ ] Theme has no indigo section icons
- [ ] Behavior: save, discard, recurrence scope still triggered as today (scope dialog restyle is phase 3)
- [ ] Typecheck passes

## Risk Assessment

- Recurrence select slower than chips — accepted in brainstorm. Keep option order identical to current six presets.
- AttendeeInput still sloppy until phase 3 — acceptable leftover inside editor.
- TimePicker width in a row: keep compact (~96px) so date+time fit one value cell.
