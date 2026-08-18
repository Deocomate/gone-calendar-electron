# Journal: Phase 3 Custom Views, Lunar Calendar & Week Numbers

- **Date:** 2026-08-18
- **Phase:** 3 (Custom views lunar week numbers)
- **Status:** Completed

## Summary

Implemented all 5 custom calendar views (Month, Week, Day, Year, List) directly on local SQLite range queries, integrated the Vietnamese lunar calendar calculation engine (Ho Ngoc Duc / UTC+7), added ISO week numbers, and established persistent preference storage in SQLite.

## Key Changes

1. **Vietnamese Lunar Engine**:
   - Built `src/shared/lunar-vietnam.ts` with astronomical solar-to-lunar conversion (Julian day numbers, new moon calculation, sun longitude, leap months).
   - Formatted lunar badges (`dd/M`) with special accents for day 1 (`mùng 1`), day 15 (`rằm`), and Tết Nguyên Đán.

2. **Custom Calendar Views**:
   - `MonthView`: 6-week × 7-day grid with ISO week numbers column, solar dates, lunar secondary labels, event chips, and overflow popovers.
   - `WeekView`: 7-day multi-column timed schedule (00:00–23:00) with all-day strip, live current-time indicator line, and absolute block layout.
   - `DayView`: Detailed 24-hour single-day agenda with event cards.
   - `YearView`: 12 mini months overview with event density dots and quick transition into MonthView.
   - `ListView`: Chronological agenda with sticky date headers, formatted time ranges, and lunar metadata.

3. **Settings Persistence & Visible Range**:
   - Created `settings-repo.ts` and `settings-ipc.ts` to persist user toggles (`showLunar`, `showWeekNumbers`).
   - Built `use-visible-range.ts` for unified query window calculation.

4. **Validation**:
   - 28 unit tests across 6 suites passed (100%).
   - `npm run typecheck` passed with 0 errors.
   - `npm run build` produced production bundles in `out/`.
