---
phase: 9
title: "Mini window tasks deep theme"
status: pending
effort: M
priority: P3
dependencies: [8]
---

# Phase 9: Mini window tasks deep theme

## Overview

R3 satellite UX: always-on-top / tray upcoming window (same on Win+Linux), local tasks, background image + custom text/accent. **R3 ship gate.** Not OS-native widgets. Not One Task.

## Requirements

- Functional: UR-WID-01, UR-TASK-01, UR-THEME-02.
- Non-functional: mini window must not run a second sync engine; reuse main DB.

## Architecture

- Second `BrowserWindow`: small, `alwaysOnTop` optional, skip taskbar optional; tray icon click toggles it.
- Tasks table: id, title, due_date, completed, show_on_calendar. Local only.
- Theme: user image copied into userData; CSS variables for text/accent; ensure event chip contrast (fallback dark text on light chips).

## Related Code Files

- Create: `src/main/tray.ts`, `src/main/mini-window.ts`
- Create: `src/renderer/mini/mini-app.tsx`
- Create: `src/main/db/migrations/00x-tasks.sql`, `src/main/db/repos/tasks-repo.ts`
- Create: `src/renderer/tasks/task-pane.tsx`
- Create: `src/renderer/settings/theme-page.tsx`
- Modify: month/list to show due tasks as optional rows
- Delete: none

## Implementation Steps

1. Tray + mini window: next N events; click → main focuses that date/event.
2. Tasks CRUD; checkbox; due date; optional month/list visibility.
3. Theme: color pickers + background file picker; dark/light still work.
4. Linux: tray on GNOME may need `StatusNotifier`; document fallback (mini window without tray).

## Success Criteria

- [ ] URD §12 R3
- [ ] Mini window works with main closed-to-tray (optional setting keep running)
- [ ] Tasks do not sync to Google Tasks
- [ ] Background image does not make event text unreadable (contrast check)

## Risk Assessment

GNOME tray unreliability — mini window is the real product; tray is enhancement. Always-on-top can annoy; default off, user enables.
