import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-contract'
import type { AppSettings } from '@shared/settings-contract'
import { SettingsRepo } from '../db/repos/settings-repo'
import { getDatabase } from '../db/database'

export function registerSettingsIpcHandlers(): void {
  const db = getDatabase()
  const settingsRepo = new SettingsRepo(db)

  ipcMain.removeHandler(IPC_CHANNELS.SETTINGS.GET_ALL)
  ipcMain.removeHandler(IPC_CHANNELS.SETTINGS.GET)
  ipcMain.removeHandler(IPC_CHANNELS.SETTINGS.SET)

  ipcMain.handle(IPC_CHANNELS.SETTINGS.GET_ALL, () => {
    return settingsRepo.getAllSettings()
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS.GET, (_event, key: keyof AppSettings) => {
    return settingsRepo.getSetting(key)
  })

  ipcMain.handle(
    IPC_CHANNELS.SETTINGS.SET,
    (_event, key: keyof AppSettings, value: any) => {
      return settingsRepo.setSetting(key, value)
    }
  )
}
