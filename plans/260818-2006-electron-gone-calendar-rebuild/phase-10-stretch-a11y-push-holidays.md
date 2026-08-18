---
phase: 10
title: "Stretch a11y push holidays"
status: pending
effort: M
priority: P3
dependencies: [9]
---

# Phase 10: Stretch a11y push holidays

## Overview

**STRETCH — skippable.** Expansion extras: keyboard/a11y, Google push if feasible, holiday calendars, recurring copy of **this instance only**, perf budget UR-NFR-01/02. R1–R3 remain complete if this phase is never cooked.

## Requirements

- Functional (stretch): UR-NFR-06 keyboard; holiday calendars read-only; DnD copy single occurrence; optional Google channel/push.
- Non-functional: cold start ≤ 3s target; month 200 events no multi-second stall.

## Architecture

- A11y: focus rings, dialog focus trap (Radix), view switch shortcuts, `aria-label` on cells.
- Push: Google `events.watch` is webhook-based — **desktop cannot receive public webhooks**. Stretch = shorter poll (60s) when window focused, exponential backoff when background. Do not invent a relay server unless user later asks.
- Holidays: offer subscribe to Google holiday calendar for `vi` / `en` locale.
- Copy instance: new event without rrule; original series unchanged (EXDATE not required on copy).
- Perf: virtualize month overflow; IPC range queries indexed (`dtstart_utc`, `calendar_id`).

## Related Code Files

- Modify: views (shortcuts, aria), `drop-action-popover` (copy instance option)
- Modify: `google-adapter.ts` polling policy
- Create: `src/renderer/onboarding/holiday-calendar-toggle.tsx`
- Create: `tests/copy-instance.test.ts`
- Delete: none

## Implementation Steps

1. Keyboard map documented in settings: T today, 1–5 views, N new, `/` search.
2. Contrast audit on calendar colors.
3. Copy instance in DnD + editor (alongside series copy).
4. Holiday calendar opt-in.
5. Indexes + profile month view; fix N+1 IPC.
6. Polling policy when focused vs tray.

## Success Criteria

- [ ] Keyboard-only create/edit event
- [ ] Copy instance test
- [ ] Holiday calendar optional, not default-spam
- [ ] Document that true Google push needs a server (out of URD)

## Risk Assessment

Do not slip a cloud relay into this phase. If perf fails, virtualize list first, then month.
