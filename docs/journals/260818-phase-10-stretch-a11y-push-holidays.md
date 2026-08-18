# Journal: Phase 10 — Stretch A11y, Adaptive Sync Polling & Holiday Calendars

- **Date**: 2026-08-18
- **Phase**: 10 (Stretch a11y push holidays)
- **Status**: Complete & Verified (66/66 tests passing across 17 test files, 0 TS errors, clean build)

---

## 1. Objectives & Context
Phase 10 completes the final stretch enhancements for Gone Calendar:
- **UR-NFR-06 (Keyboard Accessibility & Navigation)**: Global single-key hotkeys (`T` for today, `1`-`5` for views, `N`/`C` for new event, `/` & `Ctrl+K` for search, `?`/`F1` for shortcuts cheat sheet modal).
- **Adaptive Sync Polling Policy**: Shorter 60s polling when the main window is focused, falling back to 5-minute intervals when hidden/minimized/in tray, optimizing battery & CPU usage while keeping active sessions fresh.
- **Vietnamese & International Holiday Calendars**: One-click subscription toggle for Vietnam Public (Solar + Lunar) and International holidays, with automatic solar date calculation for lunar events.
- **Copy Single Instance Only**: Option when dragging/dropping or duplicating recurring events to create a standalone non-recurring event at the target time without touching the parent recurring series.

---

## 2. Implementation Summary

### Data & Shared Logic
- **`src/shared/lunar-vietnam.ts`**: Added `convertLunarToSolar(lunarDay, lunarMonth, lunarYear, lunarLeap, timeZone)` to calculate precise solar dates for lunar holidays.
- **`src/shared/holiday-calendars.ts`**: Built `getVietnamHolidays`, `getInternationalHolidays`, and `generateHolidayEvents` across multi-year spans.
- **`src/shared/event-model.ts`**: Added `copyInstanceOnly?: boolean` to `CopyEventInput`.
- **`src/main/db/repos/events-repo.ts`**: Updated `copyEvent` to clear `rrule` and `exdate` when `copyInstanceOnly` is `true`. Added `queryEventsByCalendar` and `deleteEventsByCalendar`.

### Main Process & IPC
- **`src/main/sync/sync-worker.ts`**: Added `setFocusState(isFocused: boolean)` to adjust poll interval dynamically (60s vs 5m).
- **`src/main/index.ts`**: Attached `mainWindow.on('focus')` and `mainWindow.on('blur')` to drive the sync worker's focus state.
- **`src/main/ipc/holiday-ipc.ts`**: Created IPC handlers for `holidays:subscribe` and `holidays:unsubscribe`.
- **`src/preload/index.ts`**: Exposed `window.gone.holidays` methods.

### Renderer & UI
- **`src/renderer/src/components/KeyboardShortcutsModal.tsx`**: Interactive shortcuts cheat sheet organized into Navigation, Views, and Actions.
- **`src/renderer/src/components/HolidayCalendarToggle.tsx`**: Quick subscription card in sidebar with status indicators for 🇻🇳 Lễ Tết Việt Nam and 🌐 International Holidays.
- **`src/renderer/src/dnd/DropActionPopover.tsx`**: Updated with dual copy options (`Chỉ sao chép lần này` vs `Sao chép toàn bộ chuỗi`) for recurring occurrences.
- **`src/renderer/src/App.tsx`**: Integrated global keyboard listener, header keyboard help button, sidebar holiday toggle, and copy instance handler.

---

## 3. Verification & Test Coverage
- `tests/copy-instance.test.ts`: 2 unit tests verifying standalone copy of recurring instance vs full series duplication.
- `tests/holiday-calendars.test.ts`: 4 unit tests verifying lunar-to-solar conversions and multi-year holiday generation.
- `tests/ipc-contract.test.ts`: Updated mock contract for holidays API.
- Full test suite: **66/66 tests passed across 17 test files**.
- TypeScript check (`npm run typecheck`): **0 errors**.
- Production build (`electron-vite build`): **Clean bundle build**.
