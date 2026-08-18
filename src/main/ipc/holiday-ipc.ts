import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-contract'
import type { HolidayCalendarType } from '../../shared/holiday-calendars'
import { getDatabase } from '../db/database'
import { subscribeHolidayCalendar, unsubscribeHolidayCalendar } from '../holidays/holiday-subscription'

export function registerHolidayIpcHandlers(): void {
  ipcMain.removeHandler(IPC_CHANNELS.HOLIDAYS.SUBSCRIBE)
  ipcMain.removeHandler(IPC_CHANNELS.HOLIDAYS.UNSUBSCRIBE)

  ipcMain.handle(IPC_CHANNELS.HOLIDAYS.SUBSCRIBE, async (_event, type: HolidayCalendarType) => {
    return subscribeHolidayCalendar(getDatabase(), type)
  })

  ipcMain.handle(IPC_CHANNELS.HOLIDAYS.UNSUBSCRIBE, async (_event, type: HolidayCalendarType) => {
    return unsubscribeHolidayCalendar(getDatabase(), type)
  })
}
