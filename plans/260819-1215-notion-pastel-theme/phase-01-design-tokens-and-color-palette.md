---
phase: 1
title: Design tokens and color palette
status: completed
priority: P2
dependencies: []
---

# Phase 1: Design tokens and color palette

## Overview
Update root CSS variables, Tailwind theme bindings, shared calendar constants, and holiday definitions to establish the minimalist Notion base colors and soft pastel event palette.

## Requirements
- Update `src/renderer/src/styles/index.css`:
  - Light mode: `--color-bg-app: #f7f6f3;`, `--color-bg-surface: #ffffff;`, `--color-bg-sidebar: #fbfbfa;`, `--color-border: #e9e9e7;`, `--color-text-main: #37352f;`, `--color-text-muted: #787774;`, `--color-today-mark: #eb5757;`, `--color-accent-mark: #2383e2;`, `--color-hover-fill: rgba(55, 53, 47, 0.06);`
  - Dark mode: `--color-bg-app: #191919;`, `--color-bg-surface: #202020;`, `--color-bg-sidebar: #191919;`, `--color-border: #2e2e2e;`, `--color-text-main: #ebebeb;`, `--color-text-muted: #9b9a97;`, `--color-today-mark: #eb5757;`, `--color-accent-mark: #529cca;`, `--color-hover-fill: rgba(255, 255, 255, 0.055);`
  - Event colors: green `#52b788`, blue `#529cca`, orange `#ea9a5f`, purple `#9a6dd7`, coral `#eb5757`, teal `#4dab9a`
  - Radius classes: update `.gc-btn`, `.gc-btn-primary`, `.gc-icon-btn`, `.gc-input`, `.gc-menu`, `.gc-menu-item`, `.gc-dialog` to use `var(--radius-control)` (3px) and `var(--radius-dialog)` (4px) instead of `rounded-lg`.
- Update `src/shared/mini-calendar-grid.ts`:
  - `DEFAULT_EVENT_COLOR`: `#529cca` (soft pastel blue)
  - `DEFAULT_ACCENT_COLOR`: `#2383e2` (Notion blue)
  - `TODAY_COLOR`: `#eb5757` (Notion coral)
- Update `src/shared/settings-contract.ts`:
  - `themeAccent`: `'#2383e2'`
- Update `src/shared/holiday-calendars.ts`:
  - Update holiday colors to soft pastel palette.

## Related Code Files
- Modify: `src/renderer/src/styles/index.css`
- Modify: `src/shared/mini-calendar-grid.ts`
- Modify: `src/shared/settings-contract.ts`
- Modify: `src/shared/holiday-calendars.ts`

## Success Criteria
- [ ] CSS tokens match Notion minimalist light & dark color palette.
- [ ] Shared constants export pastel defaults.
- [ ] Global utility classes use < 5px radius tokens.
