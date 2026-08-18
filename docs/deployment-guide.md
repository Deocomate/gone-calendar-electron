# Gone Calendar — Deployment Guide

**Last updated:** 2026-08-18

---

## Prerequisites

- Node.js 20+ (LTS recommended)
- npm 10+
- Git

---

## Development Setup

```bash
# Clone the repository
git clone https://github.com/gone-calendar/gone-calendar
cd gone-calendar

# Install dependencies
npm install

# Start the Electron dev app (hot-reload via electron-vite)
npm run dev
```

The dev server starts the Electron app with Vite HMR for the renderer process.

---

## Type Checking

```bash
# Check both main process and renderer
npm run typecheck

# Check individually
npm run typecheck:node   # Main + preload (tsconfig.node.json)
npm run typecheck:web    # Renderer (tsconfig.web.json)
```

---

## Running Tests

```bash
npm run test
# Runs: vitest run (all 66 tests across 17 files)
```

Test files live in `tests/` at the project root and use `:memory:` SQLite for database tests.

---

## Building for Production

```bash
npm run build
# Outputs to:
#   out/main/index.js       (Electron main process)
#   out/preload/index.js    (contextBridge preload)
#   out/renderer/           (React static bundle)
```

---

## Packaging

### Windows (NSIS x64 Installer)

```bash
npm run pack:win
# Runs: electron-vite build && electron-builder --win --x64
# Output: dist/*.exe (NSIS installer)
```

Requirements:
- Run on Windows or use a CI Windows runner.
- Code signing optional for personal use; required for public distribution (no SmartScreen warning).

### Linux (AppImage x64)

```bash
npm run pack:linux
# Runs: electron-vite build && electron-builder --linux AppImage --x64
# Output: dist/*.AppImage
```

**R1 validated target:** Ubuntu LTS + AppImage x64.

To run the AppImage on Linux:
```bash
chmod +x GoneCalendar-*.AppImage
./GoneCalendar-*.AppImage
```

---

## electron-builder Configuration

See [`electron-builder.yml`](file:///c:/Users/minhlong/Desktop/projects/gone-calendar/electron-builder.yml) at the project root. Key settings:

- `appId`: `com.gone-calendar.app`
- `productName`: `Gone Calendar`
- `nsis.oneClick`: false (installer shows options)
- `linux.category`: `Office`
- `linux.target`: AppImage

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `ELECTRON_RENDERER_URL` | Set automatically by electron-vite in dev mode. Points to the Vite dev server. In production, renderer loads `index.html` from disk. |
| `GONE_GOOGLE_CLIENT_ID` | Google OAuth Desktop client ID (required for live Google sync). Set in OS environment or via a `.env` file in dev. |
| `GONE_GOOGLE_CLIENT_SECRET` | Google OAuth Desktop client secret. |
| `GONE_MS_CLIENT_ID` | Microsoft Entra app client ID (required for Microsoft Graph sync). |

> **Note:** `.env` is in `.gitignore`. Never commit OAuth credentials.

See `.env.example` for the full list of environment variables.

---

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project (or use an existing one).
3. Enable the **Google Calendar API**.
4. Create OAuth credentials: **Desktop app** type.
5. Download the client ID and client secret.
6. Set `GONE_GOOGLE_CLIENT_ID` and `GONE_GOOGLE_CLIENT_SECRET` in your environment.
7. Add test users in the OAuth consent screen (while in testing mode).

The app uses a loopback redirect URI (`http://127.0.0.1:<random-port>/oauth/callback`) — no redirect URI pre-registration is needed for Desktop app type.

---

## Microsoft Graph OAuth Setup

1. Go to [Azure Portal → Entra](https://portal.azure.com/).
2. Register a new application.
3. Set redirect URI to `http://localhost` (Desktop app).
4. Add API permissions: `Calendars.ReadWrite`, `offline_access`.
5. Set `GONE_MS_CLIENT_ID` in your environment.

The app uses `@azure/msal-node` with the system browser + loopback flow.

---

## Data Storage Locations

| Platform | Path |
|----------|------|
| Windows | `%APPDATA%\gone-calendar\gone-calendar.sqlite` |
| Linux | `~/.config/gone-calendar/gone-calendar.sqlite` |

Determined by `app.getPath('userData')` in Electron.

OAuth tokens are stored encrypted via `safeStorage` in the same `userData` directory.

---

## Single-Instance Lock

The app enforces a single-instance lock via `app.requestSingleInstanceLock()`. If a second instance is launched, it focuses the existing window and quits immediately.

---

## System Tray

On both Windows and Linux, the app creates a system tray icon on startup. The tray menu provides:
- Show Main Window
- Open Mini Window
- Quit

On Linux, tray support depends on the desktop environment (GNOME, KDE). Tray initialization failure is non-fatal — the app logs a warning and continues.

---

## Linux Notes

- **Notifications:** Uses Electron's `Notification` API (backed by `libnotify` / DBus). Works on GNOME and KDE.
- **Tray:** Works on KDE out of the box. On GNOME, requires the AppIndicator extension (`gnome-shell-extension-appindicator`) or equivalent.
- **safeStorage:** Backed by `libsecret` (Secret Service API). On headless environments without a keyring, the app will refuse to persist OAuth tokens and display a visible error. It will not silently fall back to plaintext storage.
- **AppImage:** The packaged AppImage is self-contained. Run with `--no-sandbox` if needed in restricted environments (not recommended for production use).
