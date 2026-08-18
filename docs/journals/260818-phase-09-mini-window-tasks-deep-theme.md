# Journal: Phase 9 — Mini Window, Local Tasks & Deep Theme

- **Date**: 2026-08-18
- **Phase**: 09 (Mini window tasks deep theme)
- **Status**: Complete & Verified (60/60 tests passing, 0 TS errors, clean build)

---

## 1. Objectives & Context
Phase 9 delivers the **R3 Ship Gate** requirements for Gone Calendar:
- **UR-WID-01**: Lightweight companion mini window for quick glance at upcoming events & local tasks, toggled from system tray with `alwaysOnTop` support.
- **UR-TASK-01**: Local tasks management persisted in SQLite with due date, completion toggle, and optional visibility in Month and List views (without syncing to Google Tasks/CalDAV).
- **UR-THEME-02**: Deep theme customization with curated accent colors, custom background wallpaper with blur and darkness overlay sliders to preserve WCAG accessibility contrast.

---

## 2. Implementation Summary

### Data & Main Process
- **`src/shared/task-model.ts`**: Defined `TaskItem`, `CreateTaskInput`, `UpdateTaskInput`, and `ThemeConfig`.
- **`src/main/db/migrations/003-tasks.sql`**: Created SQLite `tasks` table with indexes on `due_date` and `completed`.
- **`src/main/db/repos/tasks-repo.ts`**: Built `TasksRepo` for CRUD operations, completion toggling, and date filtering.
- **`src/main/mini-window.ts`**: Implemented frameless companion window positioned near tray or screen bottom-right, with IPC handlers for `getUpcoming`, `openMain`, `toggle`, and `setAlwaysOnTop`.
- **`src/main/tray.ts`**: Created system tray icon with context menu (Show Main Window, Open Mini Window, Quit) and single-click toggle.
- **`src/main/ipc/tasks-ipc.ts`**: Registered task IPC handlers (`tasks:list`, `tasks:create`, `tasks:update`, `tasks:toggle`, `tasks:delete`).

### Renderer & UI
- **`src/renderer/src/mini/MiniApp.tsx`**: Mini companion widget interface showing upcoming calendar events and quick task list with live toggle and add.
- **`src/renderer/src/main.tsx`**: Dual-mode router detecting `#mini` hash to load `MiniApp` vs `App`.
- **`src/renderer/src/components/TaskPane.tsx`**: Sidebar task management panel with filters (All, Due Today, Pending, Completed), inline task creation, and calendar visibility toggles.
- **`src/renderer/src/components/ThemeSettingsModal.tsx`**: Deep theme modal with 8 accent colors, preset & custom wallpapers, and contrast overlay + blur sliders.
- **`src/renderer/src/views/MonthView.tsx` & `ListView.tsx`**: Integrated due tasks as checkable chips/rows on their respective due dates.
- **`src/renderer/src/App.tsx`**: Added Sidebar Tab switcher (`📅 Lịch` vs `✓ Nhiệm vụ`), theme background layer, and theme settings modal trigger.

---

## 3. Verification & Test Coverage
- `tests/tasks-repo.test.ts`: 3 unit tests verifying tasks CRUD, completion toggle, due date sorting, and calendar visibility.
- `tests/ipc-contract.test.ts`: Updated mock contract for `tasks` and `mini`.
- Full test suite: **60/60 tests passed across 15 test files**.
- TypeScript check (`npm run typecheck:node` and `npm run typecheck:web`): **0 errors**.
- Production build (`electron-vite build`): **Clean compilation**.
