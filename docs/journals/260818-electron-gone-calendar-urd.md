---
date: 2026-08-18
session: electron-gone-calendar-urd
---

# Journal: 2026-08-18 — Gone Calendar URD pivot

## Context

User asked to brainstorm and rewrite `docs/urd.md`. Old file was a GNOME Calendar C/GTK modification plan. Goal: new Electron app, One Calendar-like, not a GNOME fork.

## What happened

Scout: repo empty except old URD. Discovery locked full product vision with R1/R2/R3, Win+Linux, React/TS, Local+Google in R1. Wrote new URD and brainstorm report. No implementation.

## Decisions

- New app, Electron + React + Vite + TypeScript.
- Custom calendar views, local-first SQLite.
- R1 Local + Google; R2 Graph + CalDAV + invite/share/search; R3 mini-window + local tasks + deep theme.
- Out: macOS, mobile, print, lock screen, maps, Facebook, EWS, native widgets, One Task clone.
- Lunar VN and week numbers promoted to R1 Must.

## Reflection

“Full clone in v1” was uncompressed into a product URD with releases. Electron kept as user constraint despite Tauri being lighter.

## Next

Plan written: `plans/260818-2006-electron-gone-calendar-rebuild/plan.md`. Validate/red-team before cook. Cook R1 through phase 5 first.
