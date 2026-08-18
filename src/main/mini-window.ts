import { BrowserWindow, screen, ipcMain, nativeTheme } from 'electron'
import { join } from 'node:path'
import { IPC_CHANNELS } from '@shared/ipc-contract'
import { getDatabase } from './db/database'
import { EventsRepo } from './db/repos/events-repo'
import { CalendarsRepo } from './db/repos/calendars-repo'
import { TasksRepo } from './db/repos/tasks-repo'
import { DateTime } from 'luxon'

let miniWindow: BrowserWindow | null = null
let mainWindowRef: BrowserWindow | null = null

export function getMiniWindow(): BrowserWindow | null {
  return miniWindow
}

export function createMiniWindow(mainWin: BrowserWindow): BrowserWindow {
  mainWindowRef = mainWin
  if (miniWindow && !miniWindow.isDestroyed()) {
    return miniWindow
  }

  const isDark = nativeTheme.shouldUseDarkColors
  const initialBg = isDark ? '#090d16' : '#ffffff'

  miniWindow = new BrowserWindow({
    width: 380,
    height: 560,
    minWidth: 320,
    minHeight: 400,
    show: false,
    frame: false,
    resizable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: initialBg,
    title: 'Gone Calendar Mini',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    }
  })

  // Load URL with #mini hash
  if (process.env['ELECTRON_RENDERER_URL']) {
    miniWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#mini`)
  } else {
    miniWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'mini' })
  }

  miniWindow.on('blur', () => {
    // Optional: auto-hide on blur if not alwaysOnTop
    if (miniWindow && !miniWindow.isAlwaysOnTop()) {
      miniWindow.hide()
    }
  })

  miniWindow.on('closed', () => {
    miniWindow = null
  })

  return miniWindow
}

export function positionMiniWindow(trayBounds?: { x: number; y: number; width: number; height: number }): void {
  if (!miniWindow || miniWindow.isDestroyed()) return

  const display = screen.getPrimaryDisplay()
  const { width: screenWidth, height: screenHeight } = display.workAreaSize

  const winBounds = miniWindow.getBounds()

  if (trayBounds) {
    // Position near tray icon
    let x = Math.round(trayBounds.x + trayBounds.width / 2 - winBounds.width / 2)
    let y = trayBounds.y > screenHeight / 2
      ? Math.round(trayBounds.y - winBounds.height - 8)
      : Math.round(trayBounds.y + trayBounds.height + 8)

    // Clamp inside screen bounds
    if (x + winBounds.width > screenWidth) x = screenWidth - winBounds.width - 12
    if (x < 12) x = 12
    if (y + winBounds.height > screenHeight) y = screenHeight - winBounds.height - 12
    if (y < 12) y = 12

    miniWindow.setPosition(x, y, false)
  } else {
    // Default to top-right corner
    const x = screenWidth - winBounds.width - 24
    const y = 48
    miniWindow.setPosition(x, y, false)
  }
}

export function toggleMiniWindow(trayBounds?: { x: number; y: number; width: number; height: number }): void {
  if (!miniWindow || miniWindow.isDestroyed()) {
    if (mainWindowRef) {
      createMiniWindow(mainWindowRef)
    }
  }

  if (!miniWindow) return

  if (miniWindow.isVisible()) {
    miniWindow.hide()
  } else {
    positionMiniWindow(trayBounds)
    miniWindow.show()
    miniWindow.focus()
  }
}

export function registerMiniIpcHandlers(mainWin: BrowserWindow): void {
  mainWindowRef = mainWin
  const db = getDatabase()
  const eventsRepo = new EventsRepo(db)
  const calendarsRepo = new CalendarsRepo(db)
  const tasksRepo = new TasksRepo(db)

  ipcMain.removeHandler(IPC_CHANNELS.MINI.OPEN_MAIN)
  ipcMain.removeHandler(IPC_CHANNELS.MINI.TOGGLE)
  ipcMain.removeHandler(IPC_CHANNELS.MINI.GET_UPCOMING)
  ipcMain.removeHandler(IPC_CHANNELS.MINI.SET_ALWAYS_ON_TOP)

  ipcMain.handle(IPC_CHANNELS.MINI.OPEN_MAIN, () => {
    if (mainWindowRef && !mainWindowRef.isDestroyed()) {
      if (mainWindowRef.isMinimized()) mainWindowRef.restore()
      mainWindowRef.show()
      mainWindowRef.focus()
    }
  })

  ipcMain.handle(IPC_CHANNELS.MINI.TOGGLE, () => {
    toggleMiniWindow()
  })

  ipcMain.handle(IPC_CHANNELS.MINI.GET_UPCOMING, (_event, limit = 10) => {
    const cals = calendarsRepo.listCalendars()
    const activeCalIds = cals.filter((c) => c.isVisible).map((c) => c.id)

    const now = DateTime.utc()
    const startUtc = now.minus({ hours: 1 }).toISO()!
    const endUtc = now.plus({ days: 7 }).toISO()!

    const occurrences = activeCalIds.length > 0
      ? eventsRepo.queryEventsByRange(activeCalIds, startUtc, endUtc).slice(0, limit)
      : []

    const tasks = tasksRepo.listTasks({ includeCompleted: false }).slice(0, limit)

    return { occurrences, tasks }
  })

  ipcMain.handle(IPC_CHANNELS.MINI.SET_ALWAYS_ON_TOP, (_event, flag: boolean) => {
    if (miniWindow && !miniWindow.isDestroyed()) {
      miniWindow.setAlwaysOnTop(flag)
      return miniWindow.isAlwaysOnTop()
    }
    return false
  })
}
