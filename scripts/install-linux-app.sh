#!/usr/bin/env bash
# Build Gone Calendar and (re)install it as a clickable desktop app for the
# current user. Re-run this any time to update the installed app to the latest
# code — it overwrites the same paths, so the launcher entry always points at
# the newest build.
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

APP_NAME="Gone Calendar"
APP_ID="gone-calendar"
APPS_DIR="$HOME/Applications"
DESKTOP_DIR="$HOME/.local/share/applications"
ICON_DIR="$HOME/.local/share/icons"
TARGET_APPIMAGE="$APPS_DIR/${APP_NAME}.AppImage"

echo "==> Building production bundle + AppImage"
npm run pack:linux

SRC_APPIMAGE="$(find dist -maxdepth 1 -name '*.AppImage' -type f -printf '%T@ %p\n' \
  | sort -nr | head -1 | cut -d' ' -f2-)"
if [[ -z "${SRC_APPIMAGE:-}" || ! -f "$SRC_APPIMAGE" ]]; then
  echo "!! No .AppImage produced in dist/. Aborting." >&2
  exit 1
fi
echo "==> Built: $SRC_APPIMAGE"

mkdir -p "$APPS_DIR" "$DESKTOP_DIR" "$ICON_DIR"

install -m 755 "$SRC_APPIMAGE" "$TARGET_APPIMAGE"
install -m 644 resources/icon.png "$ICON_DIR/${APP_ID}.png"

cat > "$DESKTOP_DIR/${APP_ID}.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=${APP_NAME}
Comment=Modern desktop calendar with multi-provider sync
Exec="${TARGET_APPIMAGE}" %U
Icon=${ICON_DIR}/${APP_ID}.png
Terminal=false
Categories=Office;Calendar;
StartupWMClass=Gone Calendar
EOF
chmod 644 "$DESKTOP_DIR/${APP_ID}.desktop"

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "$DESKTOP_DIR" >/dev/null 2>&1 || true
fi
if command -v kbuildsycoca6 >/dev/null 2>&1; then
  kbuildsycoca6 --noincremental >/dev/null 2>&1 || true
elif command -v kbuildsycoca5 >/dev/null 2>&1; then
  kbuildsycoca5 --noincremental >/dev/null 2>&1 || true
fi

VERSION="$(node -p "require('./package.json').version")"
echo
echo "==> Installed '${APP_NAME}' v${VERSION}"
echo "    App image : ${TARGET_APPIMAGE}"
echo "    Launcher  : ${DESKTOP_DIR}/${APP_ID}.desktop"
echo "    Find it in your app menu as \"${APP_NAME}\" (search: calendar)."
echo "    Re-run this script after approving changes to update the app."
