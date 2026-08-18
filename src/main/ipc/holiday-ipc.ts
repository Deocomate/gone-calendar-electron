import { ipcMain } from 'electron'
import { DateTime } from 'luxon'
import { IPC_CHANNELS } from '../../shared/ipc-contract'
import { generateHolidayEvents } from '../../shared/holiday-calendars'
import { CalendarsRepo } from '../db/repos/calendars-repo'
import { EventsRepo } from '../db/repos/events-repo'
import { getDatabase } from '../db/database'

export function registerHolidayIpcHandlers(): void {
  ipcMain.handle(
    IPC_CHANNELS.HOLIDAYS.SUBSCRIBE,
    async (_event, type: 'vietnam' | 'international') => {
      const db = getDatabase()
      const calendarsRepo = new CalendarsRepo(db)
      const eventsRepo = new EventsRepo(db)

      const calName = type === 'vietnam' ? 'Ngày lễ Việt Nam' : 'International Holidays'
      const calColor = type === 'vietnam' ? '#ef4444' : '#3b82f6'

      // Check if calendar already exists
      const allCals = calendarsRepo.listCalendars()
      let holidayCal = allCals.find((c) => c.name === calName)

      if (!holidayCal) {
        holidayCal = calendarsRepo.createCalendar({
          name: calName,
          color: calColor,
          isReadOnly: true
        })
      }

      // Clear existing events in this calendar to avoid duplicates
      const currentEvents = eventsRepo.queryEventsByCalendar(holidayCal.id)
      for (const ev of currentEvents) {
        eventsRepo.deleteEvent(ev.id)
      }

      // Generate 4 years of holidays
      const currentYear = DateTime.local().year
      const years = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2]
      const eventsToCreate = generateHolidayEvents(holidayCal.id, type, years)

      for (const evInput of eventsToCreate) {
        eventsRepo.createEvent(evInput)
      }

      return {
        calendarId: holidayCal.id,
        count: eventsToCreate.length
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.HOLIDAYS.UNSUBSCRIBE,
    async (_event, type: 'vietnam' | 'international') => {
      const db = getDatabase()
      const calendarsRepo = new CalendarsRepo(db)

      const calName = type === 'vietnam' ? 'Ngày lễ Việt Nam' : 'International Holidays'
      const allCals = calendarsRepo.listCalendars()
      const holidayCal = allCals.find((c) => c.name === calName)

      if (holidayCal) {
        calendarsRepo.deleteCalendar(holidayCal.id)
        return true
      }
      return false
    }
  )
}
