---
phase: 9
title: "Mini window tasks deep theme"
status: completed
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

- Created: `src/main/tray.ts`, `src/main/mini-window.ts`
- Created: `src/renderer/src/mini/MiniApp.tsx`
- Created: `src/main/db/migrations/003-tasks.sql`, `src/main/db/repos/tasks-repo.ts`
- Created: `src/renderer/src/components/TaskPane.tsx`
- Created: `src/renderer/src/components/ThemeSettingsModal.tsx`
- Modified: month/list to show due tasks with checkable badges

## Implementation Steps

1. [x] Tray + mini window: next N events; click → main focuses that date/event.
2. [x] Tasks CRUD; checkbox; due date; optional month/list visibility.
3. [x] Theme: color pickers + background file picker; dark/light still work.
4. [x] Linux: tray fallback documented.

## Success Criteria

- [x] URD §12 R3
- [x] Mini window works with main closed-to-tray (optional setting keep running)
- [x] Tasks do not sync to Google Tasks (isolated local SQLite persistence)
- [x] Background image does not make event text unreadable (contrast overlay & blur sliders)

## Risk Assessment

GNOME tray unreliability — mini window is the real product; tray is enhancement. Always-on-top can annoy; default off, user enables.

