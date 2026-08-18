# Gone Calendar

Modern Desktop Calendar for Windows and Linux built with Electron, React, TypeScript, and Tailwind CSS.

## Architecture

- **Main process** (`src/main`): Electron lifecycle, SQLite database sync, OAuth loops, secure storage, and single-instance locks.
- **Preload** (`src/preload`): Typed context bridge exposing `window.gone` APIs with sandboxing and context isolation enabled.
- **Renderer** (`src/renderer`): React application with custom view layouts (Day, Week, Month, Year, List), i18n support (`vi`/`en`), and fluid desktop UI.
- **Shared** (`src/shared`): Shared TypeScript contracts and interfaces.

## Development

```bash
# Install dependencies
npm install

# Start development app
npm run dev

# Run type checks
npm run typecheck

# Run test suite
npm run test

# Build production bundles
npm run build
```

## Packaging

```bash
# Build Windows installer (NSIS x64)
npm run pack:win

# Build Linux package (AppImage x64)
npm run pack:linux
```
