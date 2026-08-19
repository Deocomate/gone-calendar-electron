---
title: Notion-like minimalist pastel theme and sidebar radius reduction
description: >-
  Transition entire website color scheme to a minimalist Notion + Notion
  Calendar aesthetic with soft pastel event palettes and reduce all sidebar
  items border radius to <5px (3-4px).
status: completed
priority: P2
branch: main
tags:
  - ui
  - frontend
  - design
  - theme
  - pastel
  - notion
blockedBy: []
blocks: []
created: '2026-08-19T05:15:30.597Z'
createdBy: 'ck:plan'
source: skill
---

# Notion-like minimalist pastel theme and sidebar radius reduction

## Overview

Redesign the application's overall color tokens and chrome to match a minimalist Notion + Notion Calendar aesthetic:
- **Color tokens:** Warm light paper `#f7f6f3`, deep charcoal `#37352f`, subtle hairline `#e9e9e7`, Notion dark mode `#191919`/`#202020`, soft coral today mark `#eb5757`, and clean Notion blue accent `#2383e2` (light) / `#529cca` (dark).
- **Pastel Palette:** Replace harsh saturated colors (Google primary red, bright blue, saturated green/orange/indigo) with soft, harmonious pastel tones across mini-calendar, event pills, overlapping columns, theme picker, and holiday calendars.
- **Sidebar border radius <5px:** Enforce 3px/4px radius on all sidebar items (task card, task icon container, task counter badge, mini-calendar cells/today indicator, calendar list items, checkboxes, holiday toggle cards, badges, and footer controls).
- **Chrome de-slop:** Purge remaining loud indigo/rose highlights from header task launcher, flyout cards, and month cell counter badges in favor of quiet Notion neutral & pastel styling.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Design tokens and color palette](./phase-01-design-tokens-and-color-palette.md) | Completed |
| 2 | [Sidebar and navigation chrome restyling](./phase-02-sidebar-and-navigation-chrome-restyling.md) | Completed |
| 3 | [Dialogs and views pastel polish](./phase-03-dialogs-and-views-pastel-polish.md) | Completed |
| 4 | [Verification and documentation](./phase-04-verification-and-documentation.md) | Completed |

## Dependencies

- Extends form-kit tokens from previous plan to full application canvas & chrome.
- No blocking dependencies.

## Success Criteria

- Light and Dark modes reflect authentic Notion minimalist aesthetic.
- All sidebar items have `border-radius` strictly < 5px (`rounded-[3px]` or `rounded-[4px]`).
- Event and theme palettes are soft pastel tones without harsh saturated contrasts.
- Zero remaining `indigo-*` or saturated gradients on sidebar, header, and flyout components.
- All unit tests pass and build succeeds.
