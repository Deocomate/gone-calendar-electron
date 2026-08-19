---
title: "Notion-like form kit"
description: "Restyle in-scope form primitives and dialogs to a quiet Notion-like kit: property-row for event/task/theme, boxed hairline for CalDAV/account. Radius 3–4px. Single accent #1A73E8. No canvas/chrome restyle."
status: pending
priority: P2
branch: "main"
tags: [ui, frontend, design]
blockedBy: []
blocks: []
created: "2026-08-19T04:54:12.858Z"
createdBy: "ck:plan"
source: skill
---

# Notion-like form kit

## Overview

Calendar behavior stays. Forms currently use a second theme (`slate-*`, `indigo-*`, `rounded-xl/2xl`, gradient CTAs, tinted icon boxes). This plan applies approved design **B (split surfaces)** from the brainstorm: one token language, two layouts.

- **Page-like:** Event editor, Task, Theme — Notion property-row + large borderless title.
- **Settings-like:** CalDAV, Account — boxed hairline inputs, outline connect buttons.
- **Out:** month/week/day/year canvas, AppSidebar, AppHeader, MiniApp chrome, font swap.

Mode: **fast**. Scope: **HOLD** (locked in brainstorm). Rebuild plan `260818-2006` phases 1–10 are done in code; no `blockedBy`.

## Context

- Brainstorm: [../reports/260819-1149-brainstorm-notion-form-kit.md](../reports/260819-1149-brainstorm-notion-form-kit.md)
- Journal: [../../docs/journals/260819-1149-notion-form-kit.md](../../docs/journals/260819-1149-notion-form-kit.md)
- Tokens today: `src/renderer/src/styles/index.css`, `docs/design-guidelines.md`
- Slop concentration: `src/renderer/src/components/ui/*` + listed dialogs

## Architecture

```text
index.css
  --radius-control: 3px
  --radius-dialog: 4px
  .gc-dialog uses dialog radius
        |
FormRow (new)     TextInput/Select/Date/Time/Number/TextArea
  label | value     variant: ghost (default) | boxed
        |
Page-like dialogs          Settings-like dialogs
Event / Task / Theme       CalDAV / Account / RecurringScope
```

Do not introduce a second component library. Restyle existing primitives. One new file: `FormRow`.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Form tokens and primitives](./phase-01-form-tokens-and-primitives.md) | Pending |
| 2 | [Page-like dialogs](./phase-02-page-like-dialogs.md) | Pending |
| 3 | [Settings dialogs and docs](./phase-03-settings-dialogs-and-docs.md) | Pending |

## Dependencies

- None blocking. Rebuild plan implemented; this restyles its UI files.
- Side effect: `.gc-dialog` radius 4px also changes SearchPalette + KeyboardShortcuts. Accept.

## Success Criteria

- In-scope form/dialog files: no `indigo-*`, no gradient CTA, no tinted icon boxes, no `rounded-xl`/`rounded-2xl`.
- Control radius 3px, dialog 4px. Toggle stays pill.
- Event editor reads as property list. CalDAV still boxed inputs.
- Light + dark. Keyboard focus = 1px `accent`, no glow ring.
- Save / delete / connect / recurrence-scope behavior unchanged.
- `docs/design-guidelines.md` documents form tokens + variants.

## NOT in scope

- Sidebar indigo card, header indigo badge
- Canvas event pills, today mark, month chips
- Replacing Inter or Lucide
- Visual regression / Playwright suite
- i18n copy rewrite (optional shorten bilingual labels only if it unclutters a row)

## Next

`/ck:cook` this plan, or `/ck:plan validate` first if you want a critical-questions pass.
