---
phase: 3
title: "Settings dialogs and docs"
status: pending
priority: P2
dependencies: [2]
effort: "M"
---

# Phase 3: Settings dialogs and docs

## Overview

Apply **settings-like** boxed hairline language to CalDAV + Account. Quiet RecurringScope (text rows). Restyle AttendeeInput. Document tokens in `docs/design-guidelines.md`. Completes in-scope surface list from brainstorm.

## Requirements

- Functional: connect Google/Graph/CalDAV, disconnect, sync now, CalDAV validation messages, recurrence this/future/all — **unchanged**.
- Non-functional: boxed inputs; outline connect buttons; no gradients; no tinted icon boxes; docs match code.

## Architecture

**CalDAV** — `variant="boxed"` on URL/user/password/name.

- Header: title + subtitle, no emerald icon box.
- Provider switch: 4-segment, selected = `bg-surface` + hairline, unselected = transparent. No sky/indigo/emerald fills.
- Error/success: text + optional hairline row; error uses rose/`today`. No tinted banners if a single line suffices; if banner kept, hairline + muted bg, not `rose-500/10` slabs.
- Submit: `gc-btn-primary` (accent), not emerald gradient.

**Account**

- Same quiet header.
- Sync status: one row, not a card. Sync now = `gc-btn`.
- Account rows: hover wash list, not `rounded-xl` slate cards. Type as muted text (`Google`), not rose/sky/teal chips.
- Connect actions: three **outline** hairline buttons (label only). No `bg-gradient-to-r`.
- Action toast: muted/hover bg, not indigo banner.

**RecurringScopeDialog**

- Three full-width text rows (title + hint), hover `bg-hover`, no icon boxes.
- Delete vs edit: destructive copy only; no rose icon container.
- Cancel text button.

**AttendeeInput**

- Ghost/boxed consistent with editor row.
- Chip list: hairline 3px, no indigo avatar circles (use muted initial on `bg-hover`).

**Docs** — `docs/design-guidelines.md`

Add a **Forms** section:

- `--radius-control` 3px / `--radius-dialog` 4px
- Page-like vs settings-like
- Ghost vs boxed
- Ban list: indigo, gradient CTA, icon boxes, glow rings, uppercase tracking labels
- Toggle pill exception
- Note chrome (sidebar/header) still uses older indigo in places — out of this plan

Do not invent new color tokens. Map to existing `app` `surface` `hairline` `primary` `muted` `accent` `today` `hover`.

## Related Code Files

- Modify: `src/renderer/src/components/CalDavConnectModal.tsx`
- Modify: `src/renderer/src/components/AccountManagerModal.tsx`
- Modify: `src/renderer/src/editor/RecurringScopeDialog.tsx`
- Modify: `src/renderer/src/components/AttendeeInput.tsx`
- Modify: `docs/design-guidelines.md`

## Implementation Steps

1. CalDAV: boxed fields, quiet segmented provider, accent submit.
2. Account: outline connect buttons, quiet list, kill gradients/chips/icon box.
3. RecurringScope: three text rows.
4. AttendeeInput: match FormRow/ghost.
5. Grep in-scope dialog files + AttendeeInput for `indigo-` `gradient` `rounded-xl` `rounded-2xl`.
6. Update design-guidelines Forms section. Date = 2026-08-19.
7. Manual: connect UI (don't need live OAuth), CalDAV validation empty password, recurrence this/future/all on an existing series. Light+dark.
8. `npm run typecheck` (and focused tests if any dialog tests exist).

## Success Criteria

- [ ] CalDAV fields boxed hairline; provider tabs not rainbow
- [ ] Account connect buttons have no gradient
- [ ] Recurring scope has no tinted icon boxes
- [ ] AttendeeInput has no indigo avatars
- [ ] `docs/design-guidelines.md` documents form kit
- [ ] In-scope grep clean for slop classes
- [ ] Typecheck passes; connect/scope behavior unchanged

## Risk Assessment

- Outline OAuth buttons less “branded” — intentional; Google/Microsoft color on the button was the slop.
- Empty CalDAV URL still must look typeable — boxed variant exists for this.
- ErrorBoundary / DropActionPopover still indigo — **out of scope** (not in brainstorm file list). Do not expand.

## Unresolved Questions

- None blocking. Recurrence-as-select shipped in phase 2; only revisit if Weekly pick feels slow after using the editor.
