---
phase: 1
title: "Scaffold electron-vite React TypeScript"
status: completed
effort: M
priority: P1
dependencies: []
---

# Phase 1: Scaffold electron-vite React TypeScript

## Overview

Create the Electron app skeleton: main / preload / renderer, secure IPC, Tailwind, i18n stub, electron-builder for Windows NSIS and Linux AppImage. Empty calendar chrome only.

## Requirements

- Functional: `npm run dev` opens a window; view switcher stub; language toggle stub (vi/en); settings placeholder.
- Non-functional: `contextIsolation: true`, `nodeIntegration: false`, sandbox renderer. No remote module.

## Architecture

- `src/main` — BrowserWindow, IPC register, later DB.
- `src/preload` — typed `window.gone` API via contextBridge.
- `src/renderer` — React app.
- `src/shared` — types only (no Node).

IPC names: `gone:<domain>:<action>` e.g. `gone:app:get-locale`.

## Related Code Files

- Create: `package.json`, `electron.vite.config.ts`, `tsconfig*.json`, `electron-builder.yml`
- Create: `src/main/index.ts`, `src/preload/index.ts`, `src/shared/ipc-contract.ts`
- Create: `src/renderer/main.tsx`, `src/renderer/app.tsx`, `src/renderer/i18n/`
- Create: `README.md` (dev + pack commands only)
- Modify: none (greenfield)
- Delete: none

## Implementation Steps

1. Scaffold with `npm create @quick-start/electron` (electron-vite React TS) **or** equivalent official electron-vite React-TS template. App id: `app.gonecalendar.desktop`.
2. Enable TypeScript strict. Path aliases `@main`, `@renderer`, `@shared`.
3. Tailwind v4 (or v3 if v4 Electron friction) + CSS variables for light/dark (follow OS, in-app override stub).
4. Preload: expose `gone.app.getVersion`, `gone.app.getLocale`, `gone.app.setLocale`.
5. Layout: titlebar area, sidebar placeholder, toolbar with Day/Week/Month/Year/List buttons (no views yet — empty canvas + label).
5b. `app.requestSingleInstanceLock()` before any window/DB. Second process focuses the first and exits.
<!-- Updated: Red Team Session 1 - single instance -->
6. electron-builder: `win: nsis`, `linux: AppImage` only for R1. Target distro: Ubuntu LTS. No `.deb`/Fedora Must. `asarUnpack` **only if** phase 2 falls back to `better-sqlite3`.
7. Scripts: `dev`, `build`, `test` (vitest empty), `pack:win`, `pack:linux`.
8. Pin Electron ≥35 with working `node:sqlite` (do not ship 37.2.0 sqlite regression). Document fallback native build tools only for better-sqlite3.
<!-- Updated: Validation Session 1 - Ubuntu AppImage; sqlite unpack optional -->

## Success Criteria

- [x] `npm run dev` shows shell on Windows
- [x] Typecheck + lint pass
- [x] Packaged NSIS and AppImage produce a runnable empty shell (Linux pack may be CI-only if local is Windows; R1 Linux = Ubuntu LTS + AppImage)
- [x] Renderer cannot `require('fs')`
- [x] Second launch focuses existing window (single-instance lock)

## Risk Assessment

Template churn — pin electron-vite/Electron versions in README. Dark mode flash — set background in main before load.
