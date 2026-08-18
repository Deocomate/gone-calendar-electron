import { describe, it, expect, beforeEach } from 'vitest'
import { createSqliteDriver } from '../src/main/db/sqlite-driver'
import { runMigrations, seedDefaultData } from '../src/main/db/database'
import { CalendarsRepo } from '../src/main/db/repos/calendars-repo'
import { EventsRepo } from '../src/main/db/repos/events-repo'

describe('Recurring Scope Operations (this / future / all)', () => {
  let db: any
  let calendarsRepo: CalendarsRepo
  let eventsRepo: EventsRepo
  let testCalId: string

  beforeEach(() => {
    db = createSqliteDriver(':memory:')
    runMigrations(db)
    seedDefaultData(db)
    calendarsRepo = new CalendarsRepo(db)
    eventsRepo = new EventsRepo(db)

    const cal = calendarsRepo.createCalendar({ name: 'Work', color: '#8b5cf6' })
    testCalId = cal.id
  })

  it('should create an occurrence exception when updating scope "this"', () => {
    const master = eventsRepo.createEvent({
      calendarId: testCalId,
      title: 'Weekly Standup',
      dtStartUtc: '2026-08-03T09:00:00.000Z',
      dtEndUtc: '2026-08-03T09:30:00.000Z',
      rrule: 'FREQ=WEEKLY;BYDAY=MO'
    })

    const success = eventsRepo.updateRecurringScope({
      masterEventId: master.id,
      originalStartUtc: '2026-08-10T09:00:00.000Z',
      scope: 'this',
      updateInput: {
        title: 'Special Guest Standup',
        dtStartUtc: '2026-08-10T10:00:00.000Z',
        dtEndUtc: '2026-08-10T10:30:00.000Z'
      }
    })

    expect(success).toBe(true)

    // Verify exception exists in DB
    const exceptions = eventsRepo.getExceptionsForEvent(master.id)
    expect(exceptions).toHaveLength(1)
    expect(exceptions[0].title).toBe('Special Guest Standup')
    expect(exceptions[0].originalStartUtc).toBe('2026-08-10T09:00:00.000Z')
    expect(exceptions[0].isCancelled).toBe(false)
  })

  it('should mark an occurrence cancelled when deleting scope "this"', () => {
    const master = eventsRepo.createEvent({
      calendarId: testCalId,
      title: 'Daily Sync',
      dtStartUtc: '2026-08-01T08:00:00.000Z',
      dtEndUtc: '2026-08-01T08:30:00.000Z',
      rrule: 'FREQ=DAILY'
    })

    const success = eventsRepo.deleteRecurringScope({
      masterEventId: master.id,
      originalStartUtc: '2026-08-05T08:00:00.000Z',
      scope: 'this'
    })

    expect(success).toBe(true)

    const exceptions = eventsRepo.getExceptionsForEvent(master.id)
    expect(exceptions).toHaveLength(1)
    expect(exceptions[0].isCancelled).toBe(true)
    expect(exceptions[0].originalStartUtc).toBe('2026-08-05T08:00:00.000Z')
  })

  it('should split recurring series when updating scope "future"', () => {
    const master = eventsRepo.createEvent({
      calendarId: testCalId,
      title: 'Biweekly Planning',
      dtStartUtc: '2026-08-03T14:00:00.000Z',
      dtEndUtc: '2026-08-03T15:00:00.000Z',
      rrule: 'FREQ=WEEKLY;INTERVAL=2'
    })

    const success = eventsRepo.updateRecurringScope({
      masterEventId: master.id,
      originalStartUtc: '2026-08-17T14:00:00.000Z',
      scope: 'future',
      updateInput: {
        title: 'Biweekly Planning (New Time)',
        dtStartUtc: '2026-08-17T16:00:00.000Z',
        dtEndUtc: '2026-08-17T17:00:00.000Z'
      }
    })

    expect(success).toBe(true)

    // Master event RRULE should now be capped with UNTIL
    const updatedMaster = eventsRepo.getEventById(master.id)
    expect(updatedMaster?.event.rrule).toContain('UNTIL=')

    // Query range across August should find both series
    const occurrences = eventsRepo.queryEventsByRange(
      [testCalId],
      '2026-08-01T00:00:00.000Z',
      '2026-08-31T23:59:59.999Z'
    )

    const titles = occurrences.map((o) => o.title)
    expect(titles).toContain('Biweekly Planning')
    expect(titles).toContain('Biweekly Planning (New Time)')
  })
})
