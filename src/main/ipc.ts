import { app, ipcMain, dialog, BrowserWindow } from 'electron'
import { readFile } from 'node:fs/promises'
import { extname } from 'node:path'
import { IPC_CHANNELS, type AppLocale } from '@shared/ipc-contract'
import { registerCalendarIpcHandlers } from './ipc/calendar-ipc'
import { registerSettingsIpcHandlers } from './ipc/settings-ipc'
import { registerAuthSyncIpcHandlers } from './ipc/auth-sync-ipc'
import { registerHolidayIpcHandlers } from './ipc/holiday-ipc'
import { setMainLocale, loadMainLocaleFromDb, getMainLocale } from './i18n-main'

let currentLocale: AppLocale = 'en'

export function registerIpcHandlers(): void {
  loadMainLocaleFromDb()
  currentLocale = getMainLocale()

  // Clear any existing handlers to allow safe re-registration during dev reload
  ipcMain.removeHandler(IPC_CHANNELS.APP.GET_VERSION)
  ipcMain.removeHandler(IPC_CHANNELS.APP.GET_LOCALE)
  ipcMain.removeHandler(IPC_CHANNELS.APP.SET_LOCALE)
  ipcMain.removeHandler(IPC_CHANNELS.APP.GET_PLATFORM)
  ipcMain.removeHandler(IPC_CHANNELS.APP.PICK_BACKGROUND_IMAGE)

  // Return current application version
  ipcMain.handle(IPC_CHANNELS.APP.GET_VERSION, () => {
    return app.getVersion()
  })

  // Return current app locale
  ipcMain.handle(IPC_CHANNELS.APP.GET_LOCALE, () => {
    return currentLocale
  })

  // Update current app locale
  ipcMain.handle(IPC_CHANNELS.APP.SET_LOCALE, (_event, locale: AppLocale) => {
    if (locale === 'vi' || locale === 'en') {
      currentLocale = locale
      setMainLocale(locale)
      return true
    }
    return false
  })

  // Return OS platform
  ipcMain.handle(IPC_CHANNELS.APP.GET_PLATFORM, () => {
    return process.platform
  })

  // Let the user pick a local image file to use as the background wallpaper
  ipcMain.handle(IPC_CHANNELS.APP.PICK_BACKGROUND_IMAGE, async () => {
    const win = BrowserWindow.getFocusedWindow()
    const options: Electron.OpenDialogOptions = {
      title: 'Select background image',
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'] }]
    }
    const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options)
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    const filePath = result.filePaths[0]
    const buffer = await readFile(filePath)
    const ext = extname(filePath).slice(1).toLowerCase()
    const mime = ext === 'jpg' ? 'jpeg' : ext || 'png'
    return { dataUrl: `data:image/${mime};base64,${buffer.toString('base64')}` }
  })

  // Register domain calendar, event, settings, auth, sync, and holiday IPC handlers
  registerSettingsIpcHandlers()
  registerCalendarIpcHandlers()
  registerAuthSyncIpcHandlers()
  registerHolidayIpcHandlers()
}

