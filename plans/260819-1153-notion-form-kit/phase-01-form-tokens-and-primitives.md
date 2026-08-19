---
phase: 1
title: "Form tokens and primitives"
status: pending
priority: P1
dependencies: []
effort: "S"
---

# Phase 1: Form tokens and primitives

## Overview

Add radius tokens, restyle `components/ui/*` onto app tokens, add `FormRow` + `ghost|boxed` variants. No dialog layout yet — later phases consume these primitives. Highest leverage: every dialog inherits quiet inputs.

## Requirements

- Functional: same props/behavior for TextInput, TextArea, CustomSelect, DatePicker, TimePicker, NumberInput, Checkbox, ToggleSwitch. Add optional `variant`.
- Non-functional: no `indigo-*` / `slate-*` on these files; focus visible 1px accent; light+dark.

## Architecture

**Tokens** in `src/renderer/src/styles/index.css` `:root` / `.dark` (and `@theme` if needed for Tailwind):

```css
--radius-control: 3px;
--radius-dialog: 4px;
```

`.gc-dialog`: `rounded-[var(--radius-dialog)]` instead of `rounded-xl`. Do **not** change `.gc-btn` / `.gc-icon-btn` (chrome).

**FormRow** (`src/renderer/src/components/ui/FormRow.tsx`):

```tsx
// label ~132px muted 12px/400 sentence case | children grow
// min-h ~32px, hover:bg-hover, optional bottom hairline
```

When a field sits in `FormRow`, pass `label` only to `FormRow` — primitive `label` stays unused (avoid double label).

**Input variants**

| variant | Use | Surface |
|---------|-----|---------|
| `ghost` (default) | Page-like | transparent; hover 1px hairline; focus 1px accent; no ring |
| `boxed` | Settings-like | `bg-surface` + 1px hairline; radius 3px; focus 1px accent; no slate fill, no glow |

Shared label style if primitive still shows a stacked label (boxed standalone): 12px, 400, `text-muted`, sentence case — **not** uppercase tracking.

**Control specifics**

- Checkbox: 3px radius; checked = `bg-accent` + white check; focus-visible 1px accent.
- Toggle: **keep pill**; on = `bg-accent`; off = hairline/muted track. Only rounded-full exception.
- Select/Date/Time popover: radius 4px, `border-hairline`, `bg-surface`, `shadow-sm` — not `rounded-2xl` / `shadow-2xl`.
- Selected option: `bg-hover`, not indigo wash.
- Error: `border-today` or rose + 11px message under field. No indigo.

## Related Code Files

- Create: `src/renderer/src/components/ui/FormRow.tsx`
- Modify: `src/renderer/src/styles/index.css`
- Modify: `src/renderer/src/components/ui/index.ts`
- Modify: `TextInput.tsx`, `TextArea.tsx`, `CustomSelect.tsx`, `DatePicker.tsx`, `TimePicker.tsx`, `NumberInput.tsx`, `Checkbox.tsx`, `ToggleSwitch.tsx`

## Implementation Steps

1. Add `--radius-control` / `--radius-dialog`. Point `.gc-dialog` at dialog radius.
2. Add `FormRow`; export from `ui/index.ts`.
3. Restyle each primitive to tokens + `variant`. Kill `indigo-*`, `slate-*`, `ring-2`, `rounded-xl`.
4. Grep `src/renderer/src/components/ui` for `indigo-` `rounded-xl` `rounded-2xl` `slate-` — should be zero (or only comments).
5. `npm run typecheck`. Manually open a screen that already uses TextInput (CalDAV still old layout is OK) and tab through: focus = 1px accent.

## Success Criteria

- [ ] `--radius-control: 3px` and `--radius-dialog: 4px` exist
- [ ] `.gc-dialog` uses 4px radius
- [ ] `FormRow` exists and is exported
- [ ] Primitives support `ghost` | `boxed`; default ghost
- [ ] No indigo/slate/rounded-xl/2xl/glow ring in `components/ui/*`
- [ ] Toggle still pill; checkbox 3px
- [ ] Typecheck passes; keyboard focus visible

## Risk Assessment

- Ghost fields look inert until hover — placeholder + hover hairline required.
- Defaulting to ghost may make CalDAV (phase 3) look wrong if someone forgets `variant="boxed"`. Phase 3 must set boxed explicitly.
- `.gc-dialog` leak to Search/Shortcuts — accepted in plan overview.
