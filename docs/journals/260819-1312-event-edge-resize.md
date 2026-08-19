# Journal: Event edge resize

- **Date:** 2026-08-19
- **Status:** Completed
- **Scope:** Week/Day timed events

## Summary

Timed events on Week and Day can be resized from the edges. Vertical drag changes start or end time (15-minute snap, clock tooltip). Horizontal drag on Week changes the date of that edge and keeps the clock time, painting multi-day timed events as per-day slices. Commit is live, same persist path as move (`move` / `updateScope this`). Esc cancels. All-day, Month, and RecurringScope dialog are out of this round.

## Why

Move kept duration and floored to whole hours. Changing length required the full editor.

## Notes

HTML5 drag stays on the event body. Handles use pointer events so they do not start a move. Overnight/multi-day timed events were previously drawn only on the start day; they now split across columns.
