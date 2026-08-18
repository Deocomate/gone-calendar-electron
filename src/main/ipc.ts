import { app, ipcMain } from 'electron'
import { IPC_CHANNELS, type AppLocale } from '@shared/ipc-contract'

let currentLocale: AppLocale = 'vi'

export function registerIpcHandlers(): void {
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
