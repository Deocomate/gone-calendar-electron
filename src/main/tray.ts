import { app, Tray, Menu, nativeImage, BrowserWindow } from 'electron'
import { toggleMiniWindow } from './mini-window'
import { mt, loadMainLocaleFromDb } from './i18n-main'

let trayInstance: Tray | null = null

function createCalendarTrayIcon(): Electron.NativeImage {
  // Create a clean 16x16 icon programmatically if static icon asset is not present
  // 16x16 PNG with a rounded square calendar badge
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <rect width="18" height="18" x="3" y="4" rx="3" fill="#1e1b4b" />
      <path d="M16 2v4M8 2v4M3 10h18" stroke="#818cf8" />
    </svg>
  `
  return nativeImage.createFromBuffer(Buffer.from(svg))
}

export function setupTray(mainWindow: BrowserWindow): Tray {
  if (trayInstance && !trayInstance.isDestroyed()) {
    return trayInstance
  }

  loadMainLocaleFromDb()
  const icon = createCalendarTrayIcon()
  trayInstance = new Tray(icon)
  trayInstance.setToolTip('Gone Calendar')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: mt('tray.openMain'),
      click: () => {
        if (!mainWindow.isDestroyed()) {
          if (mainWindow.isMinimized()) mainWindow.restore()
          mainWindow.show()
          mainWindow.focus()
        }
      }
    },
    {
      label: mt('tray.miniWindow'),
      click: () => {
        toggleMiniWindow()
      }
    },
    { type: 'separator' },
    {
      label: mt('tray.quit'),
      click: () => {
        app.quit()
      }
    }
  ])

  // Left-click on tray toggles the mini popup window
  trayInstance.on('click', (_event, bounds) => {
    toggleMiniWindow(bounds)
  })

  // Right-click opens context menu
  trayInstance.on('right-click', () => {
    trayInstance?.popUpContextMenu(contextMenu)
  })

  return trayInstance
}

export function getTray(): Tray | null {
  return trayInstance
}
