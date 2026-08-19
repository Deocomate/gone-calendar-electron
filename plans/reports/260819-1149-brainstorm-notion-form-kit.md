---
type: brainstorm
date: 2026-08-19
status: approved
modes: []
topic: notion-like form kit / anti-ai-slop
---

# Brainstorm: Notion-like form kit (anti AI slop)

## Summary

Calendar function OK. Form/dialog look LLM-default: indigo, `rounded-xl/2xl`, gradient CTAs, tinted icon boxes, `ring-2` glow, uppercase labels. Approved design **B — split surfaces, one token**: page-like property-row (event/task/theme) vs settings-like boxed hairline (CalDAV/account). Radius 3–4px. Single accent `#1A73E8`. No canvas/chrome restyle. No code this session.

## Problem-first

### 1. Solution-jumping diagnosis

Signal: “form AI slop, sạch hơn, bớt màu, radius <5px, thiên Notion.” Pain: form uses a second visual language that fights the Google Calendar chrome already documented in `docs/design-guidelines.md`.

### 2. Underlying problem

User edits events / connects accounts on a relatively quiet calendar. Forms shout with decorative color, large radius, nested cards. Reads as generated SaaS, not a desktop tool.


### 3. Assumption challenges

| Assumption | Risk if wrong | Check |
|------------|---------------|-------|
| “Notion-like” = property-row everywhere | Password/URL fields look like static text | Split: page vs settings (chosen) |
| Less color = no accent in forms | Focus/primary disappear; a11y fail | Keep `#1A73E8` for focus + primary only |
| Radius <5px includes toggles | Pill toggle is the control’s meaning | Exception: toggle stays pill |
| ui-ux-pro-max “Notion” = neubrutalism | Thick black borders, loud color — opposite of request | Ignore that mapping; use real Notion (gray, hover wash, 3–4px) |
| Swap Inter this round | Pulls chrome; Inter is both AI-tell and Notion-adjacent | Keep Inter; font out of scope |

### 4. Problem statement

- **Users:** desktop users filling Event editor, Tasks, Theme, CalDAV, Accounts.
- **Struggle:** forms feel cheap/generated; extra color and radius vs calendar canvas.
- **Cause:** `components/ui/*` + dialogs hardcoded `slate-*`/`indigo-*` instead of app tokens; card-in-card layout.
- **Consequence:** visual split-brain; trust/polish drop though behavior is fine.
- **Success:** forms look like Notion properties/settings; calendar chrome unchanged; same CRUD/connect behavior.

### 5. Alternative framings

- **A. Uniform property-row:** one language; weak type-here affordance on credentials.
- **B. Split surfaces (chosen):** Event/Task/Theme = Notion page properties; CalDAV/Account = Notion settings inputs.
- **C. Row + underline:** one layout, Linear-ish, less Notion page.

Rejected: full-app Notion restyle (user locked forms+dialogs). Rejected: neubrutalist “Notion” from style DB.

### 6. Evidence status

**Weak–medium.** Maintainer visual complaint + grep evidence (indigo/gradient/`rounded-2xl` concentrated in ui + dialogs). No user telemetry.

### 7. Validation plan

Kill/shrink if: ghost rows make date/time unparseable; CalDAV submit rate drops because fields not seen as inputs; dark mode contrast fails on hairline-only focus. Check: open Event editor + CalDAV in light and dark; keyboard tab through fields; unsaved-discard dialog still readable.

### 8. Stakeholder message

Not cloning Notion the product. Borrow density and quietness of Notion **page properties** and **settings**. Calendar stays Google-chrome. One accent already in the design system.

## Requirements (locked)

| Item | Decision |
|------|----------|
| Expected output | Restyle in-scope form primitives + dialogs; update `docs/design-guidelines.md`. Behavior unchanged. |
| Layout | **B split:** page-like property-row vs settings-like boxed hairline. |
| Color | Accent-only `#1A73E8` for focus/primary. Kill indigo/emerald/sky decorative, gradients, tinted icon boxes. Error = rose/`today`. |
| Radius | Control 3px, dialog 4px. Toggle pill exception. |
| Scope in | `components/ui/*`, EventEditor, TaskModal+TaskPane, ThemeSettings, CalDavConnect, AccountManager, RecurringScope, AttendeeInput, `.gc-dialog` token, design-guidelines. |
| Scope out | Month/week/day/year canvas, AppSidebar, AppHeader, MiniApp chrome, font swap, new icon set. |
| Side effect | `.gc-dialog` 4px also hits SearchPalette + KeyboardShortcuts (intentional). |

## Anti-slop rules applied

From `frontend-design` anti-slop + form UX (ui-ux-pro-max §8), **not** premium/maximal patterns.

Ban on in-scope surfaces: Inter swap not this round; indigo/purple glow; `rounded-xl/2xl`; gradient CTA; tinted icon containers; `ring-2 ring-indigo-500/20`; uppercase tracking labels; `shadow-md shadow-indigo-*`; card wrapping date range; 6 colored recurrence chips.

Keep: visible labels (property-row label is the label); error near field; focus visible (1px accent, not glow); `prefers-reduced-motion` already on overlays.

## Design (approved)

### Tokens

| Token | Value |
|-------|-------|
| `--radius-control` | 3px |
| `--radius-dialog` | 4px |
| Focus | 1px `accent`, no glow ring |
| Label | 12px / 400 / `text-muted` / sentence case |
| Event title | ~22px / 600 / borderless |
| Hover row | `bg-hover` |
| Primary btn | `bg-accent`, radius 3px, no tinted shadow |
| Secondary | text or hairline, no fill |
| Destructive | rose/`today` text + hover wash |

### Primitive

New `FormRow`: ~132px label | 1fr value; min-h ~32px; hover wash; optional bottom hairline.

`TextInput` / `TextArea` / `CustomSelect` / `DatePicker` / `TimePicker` / `NumberInput`: `variant="ghost" | "boxed"`. Ghost default (page-like). Boxed = hairline, `bg-surface`, no slate fill (settings-like).

Checkbox 3px, checked fill = accent. Toggle stays pill, track fill = accent when on.

Select/datepicker popover: radius 4px, `shadow-sm`, `border-hairline`, no `shadow-2xl`.

### Page-like — Event editor

```
[dot 12px]  Tạo sự kiện                    [x]
────────────────────────────────────────────
Họp sprint Q3|                    ← ghost title
────────────────────────────────────────────
Lịch           [Công việc ▾]
Múi giờ        [Asia/Ho_Chi_Minh ▾]
Cả ngày        [ toggle ]
Bắt đầu        19/08/2026  09:00
Kết thúc       19/08/2026  10:00
Lặp lại        Không lặp ▾        ← select, not 6 chips
Địa điểm       …
Link họp       …
Người tham gia …
Ghi chú        …
────────────────────────────────────────────
Xóa    Chia sẻ .ics          Hủy   [Lưu]
```

- Drop date-range `rounded-2xl` card.
- Color dots 12px; selected = 1px hairline, no scale + indigo ring.
- Recurrence presets → one `CustomSelect` (+ custom RRULE boxed mono if custom).
- Ghost empty: placeholder + hover 1px hairline (affordance without permanent box).

Task / Theme: same row language. No Sparkles/indigo section icons. Theme accent swatches: hairline selected, not indigo check glow.

### Settings-like — CalDAV / Account

- Boxed hairline inputs for URL / user / password.
- Provider switch: quiet segmented control, selected = `bg-surface` + hairline, not sky/indigo/emerald fills.
- Account connect buttons: outline hairline + label, no `bg-gradient-to-r`.
- Account type badge: muted text, no rose/sky/teal tint chips.
- No emerald/indigo header icon box.

### Recurring scope

Three text rows (title + one-line hint), hover wash, no icon boxes. Cancel = text button.

### Dialog chrome (in-scope)

Header `bg-surface` + hairline divider. No `bg-app` / `slate-50` header slab. Footer same.

## Evaluated approaches

| | Pros | Cons |
|---|------|------|
| A uniform rows | One layout | CalDAV password looks inert |
| **B split (approved)** | Matches real Notion page vs settings | Two layouts, one kit |
| C underline | One layout, clearer “type here” | Linear, not Notion page |

## Implementation notes

- Prefer restyle existing files; add `FormRow` only as real boundary.
- Replace `slate-*` / `indigo-*` in in-scope files with `primary` `muted` `hairline` `surface` `hover` `accent` `today`.
- Do not change `.gc-btn` / sidebar radius (chrome out of scope) except `.gc-dialog`.
- `TaskPane` only used by `TaskModal` — restyle it.
- Keep i18n strings; may shorten bilingual labels (“Tiêu đề sự kiện (Title)” → one language via existing i18n).
- Tests: no visual regression suite. Smoke: typecheck; open dialogs light/dark; CalDAV validation still shows error under field.

## Risks

- Ghost date/time unreadable → hover hairline + keep DatePicker/TimePicker trigger text weight 500.
- `.gc-dialog` radius change leaks to Search/Shortcuts — accept.
- Accent `#1A73E8` vs leftover indigo in chrome (sidebar) will look inconsistent until a later chrome pass. Do not “fix” sidebar this round (user lock).
- Dark mode hairline-on-surface may fail 3:1 for focus — verify; if fail use `accent` focus on both themes.

## Success metrics

- Zero `indigo-*`, gradient CTA, tinted icon box, `rounded-xl|2xl` on in-scope form/dialog files.
- Control radius 3px, dialog 4px (toggle exempt).
- Event editor reads as property list; CalDAV still boxed inputs.
- Light + dark; keyboard focus visible; save/delete/connect/recurrence-scope behavior unchanged.

## Next steps

1. `/ck:plan` (default, not `--tdd`) from this report — visual restyle, little existing UI test lock-in.
2. Implement primitives then Event editor (highest traffic) then settings dialogs.
3. Patch `docs/design-guidelines.md` Components/tokens for form radius and variants.
4. Optional later: chrome indigo leaks (sidebar/header) — separate brainstorm.

## Unresolved questions

- None blocking. Recurrence-as-select vs 6 quiet chips was left as select per approved ASCII. Revisit only if editor feels slower to pick Weekly.
- i18n label shortening not required for visual pass.
