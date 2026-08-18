import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { initDatabase, closeDatabase } from '../src/main/db/database'
import type { ISqliteDatabase } from '../src/main/db/sqlite-driver'
import { CalendarsRepo } from '../src/main/db/repos/calendars-repo'
import { EventsRepo } from '../src/main/db/repos/events-repo'

describe('Copy instance only from recurring event', () => {
  let db: ISqliteDatabase
  let calendarsRepo: CalendarsRepo
  let eventsRepo: EventsRepo
  let calId: string

  beforeEach(() => {
    db = initDatabase(':memory:')
    calendarsRepo = new CalendarsRepo(db)
    eventsRepo = new EventsRepo(db)

    const cal = calendarsRepo.createCalendar({ name: 'Work', color: '#6366f1' })
    calId = cal.id
  })

  afterEach(() => {
    closeDatabase()
  })

  it('should copy only a single instance as a standalone event when copyInstanceOnly is true', () => {
    // 1. Create weekly recurring meeting
    const recurringMaster = eventsRepo.createEvent({
      calendarId: calId,
      title: 'Weekly Standup',
      dtStartUtc: '2026-08-03T09:00:00Z',
      dtEndUtc: '2026-08-03T09:30:00Z',
      rrule: 'FREQ=WEEKLY;BYDAY=MO'
    })

    expect(recurringMaster.rrule).toBe('FREQ=WEEKLY;BYDAY=MO')

    // 2. Copy a specific instance to next Friday with copyInstanceOnly: true
    const copiedInstance = eventsRepo.copyEvent({
      sourceEventId: recurringMaster.id,
      dtStartUtc: '2026-08-07T14:00:00Z',
      dtEndUtc: '2026-08-07T14:30:00Z',
      copyInstanceOnly: true
    })

    // Assert: copied instance has NO rrule (standalone single event)
    expect(copiedInstance.id).not.toBe(recurringMaster.id)
    expect(copiedInstance.title).toBe('Weekly Standup')
    expect(copiedInstance.dtStartUtc).toBe('2026-08-07T14:00:00Z')
    expect(copiedInstance.rrule).toBeUndefined()

    // Assert: master recurring series remains unchanged with its rrule intact
    const refreshedMaster = eventsRepo.getEventById(recurringMaster.id)
    expect(refreshedMaster!.event.rrule).toBe('FREQ=WEEKLY;BYDAY=MO')
  })

  it('should duplicate the entire recurring series when copyInstanceOnly is false or omitted', () => {
    const recurringMaster = eventsRepo.createEvent({
      calendarId: calId,
      title: 'Bi-weekly Sprint Review',
      dtStartUtc: '2026-08-05T10:00:00Z',
      dtEndUtc: '2026-08-05T11:00:00Z',
      rrule: 'FREQ=WEEKLY;INTERVAL=2;BYDAY=WE'
    })

    const copiedSeries = eventsRepo.copyEvent({
      sourceEventId: recurringMaster.id,
      dtStartUtc: '2026-08-12T10:00:00Z',
      dtEndUtc: '2026-08-12T11:00:00Z',
      copyInstanceOnly: false
    })

    // Assert: full series is duplicated with rrule preserved
    expect(copiedSeries.id).not.toBe(recurringMaster.id)
    expect(copiedSeries.rrule).toBe('FREQ=WEEKLY;INTERVAL=2;BYDAY=WE')
  })
})
