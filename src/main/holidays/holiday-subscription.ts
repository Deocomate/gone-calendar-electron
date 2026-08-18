import { DateTime } from 'luxon'
import {
  generateHolidayEvents,
  HOLIDAY_CALENDAR_META,
  type HolidayCalendarType
} from '../../shared/holiday-calendars'
import { CalendarsRepo } from '../db/repos/calendars-repo'
import { EventsRepo } from '../db/repos/events-repo'
import type { ISqliteDatabase } from '../db/sqlite-driver'

export function subscribeHolidayCalendar(
  db: ISqliteDatabase,
  type: HolidayCalendarType
): { calendarId: string; count: number } {
  const calendarsRepo = new CalendarsRepo(db)
  const eventsRepo = new EventsRepo(db)
  const meta = HOLIDAY_CALENDAR_META[type]

  const existing = calendarsRepo.listCalendars().find((c) => c.name === meta.name)
  const holidayCal =
    existing ??
    calendarsRepo.createCalendar({
      name: meta.name,
      color: meta.color,
      isReadOnly: true
    })

  const currentYear = DateTime.local().year
  const years = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2]
  const eventsToCreate = generateHolidayEvents(holidayCal.id, type, years)

  db.transaction(() => {
    eventsRepo.deleteEventsByCalendar(holidayCal.id)
    for (const evInput of eventsToCreate) {
      eventsRepo.createEvent(evInput, { allowReadOnly: true })
    }
  })()

  return {
    calendarId: holidayCal.id,
    count: eventsToCreate.length
  }
}

export function unsubscribeHolidayCalendar(db: ISqliteDatabase, type: HolidayCalendarType): boolean {
  const calendarsRepo = new CalendarsRepo(db)
  const meta = HOLIDAY_CALENDAR_META[type]
  const holidayCal = calendarsRepo.listCalendars().find((c) => c.name === meta.name)
  if (!holidayCal) return false
  return calendarsRepo.deleteCalendar(holidayCal.id)
}
