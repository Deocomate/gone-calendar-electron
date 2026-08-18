import { app, ipcMain } from 'electron'
import { IPC_CHANNELS, type AppLocale } from '@shared/ipc-contract'

let currentLocale: AppLocale = 'vi'

export function registerIpcHandlers(): void {
  // Clear any existing handlers to allow safe re-registration during dev reload
  ipcMain.removeHandler(IPC_CHANNELS.APP.GET_VERSION)
  ipcMain.removeHandler(IPC_CHANNELS.APP.GET_LOCALE)
  ipcMain.removeHandler(IPC_CHANNELS.APP.SET_LOCALE)
  ipcMain.removeHandler(IPC_CHANNELS.APP.GET_PLATFORM)

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
      return true
    }
    return false
  })

  // Return OS platform
  ipcMain.handle(IPC_CHANNELS.APP.GET_PLATFORM, () => {
    return process.platform
  })
}
