---
date: 2026-08-19
session: notion-form-kit-brainstorm
---

# Journal: 2026-08-19 — Notion-like form kit

## Context

Function of Gone Calendar OK. Maintainer asked to de-slop forms: quieter, less color, radius <5px, Notion-leaning. Brainstorm only; no implementation.

## What Happened

- Scouted: app tokens in `index.css` / design-guidelines vs a second language in `components/ui/*` (slate + indigo + rounded-xl + glow rings) and dialogs (gradient OAuth, tinted icon boxes).
- Inverted “make it Notion” to: forms do not share the calendar visual language.
- Rejected ui-ux-pro-max mapping of Notion → neubrutalism.
- Locked: forms+dialogs only; property-row for page-like; accent-only `#1A73E8`; design **B split surfaces**.
- Report: `plans/reports/260819-1149-brainstorm-notion-form-kit.md`.

## Reflection

Slop was not “missing polish” — it was a duplicate theme. Chrome already had a quieter Google Calendar system. Forms ignored it. Biggest trap was applying Notion property-row to CalDAV passwords; real Notion does not do that. Split surfaces is the honest reading.

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Scope = form/dialog only | User lock; canvas OK | Sidebar indigo stays until later |
| Split page vs settings | Matches real Notion; credential affordance | Two layouts, one token kit |
| Radius 3/4px, toggle pill exempt | <5px request; toggle meaning is the pill | Token `--radius-control/dialog` |
| Keep Inter | Font change pulls chrome | Anti-slop Inter swap deferred |
| Recurrence → select | 6 indigo chips are a slop tell | Slightly slower weekly pick |

## Next Steps

- Plan written: `plans/260819-1153-notion-form-kit/`
- Phases: primitives → page-like dialogs → settings + docs
- Next: `/ck:cook` or `/ck:plan validate`
