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

describe('copyEvent all-day override', () => {
  let db: ISqliteDatabase
  let repo: EventsRepo
  let calendarId: string

  beforeEach(() => {
    db = initDatabase(':memory:')
    repo = new EventsRepo(db)
    calendarId = new CalendarsRepo(db).createCalendar({ name: 'Work', color: '#6366f1' }).id
  })

  afterEach(() => {
    closeDatabase()
  })

  function allDaySource() {
    return repo.createEvent({
      calendarId,
      title: 'Public holiday',
      dtStartUtc: '2026-09-20T00:00:00.000Z',
      dtEndUtc: '2026-09-20T23:59:59.999Z',
      allDay: true
    })
  }

  it('keeps the source all-day-ness when nothing is asked for', () => {
    const src = allDaySource()
    const copy = repo.copyEvent({
      sourceEventId: src.id,
      dtStartUtc: '2026-09-27T00:00:00.000Z',
      dtEndUtc: '2026-09-27T23:59:59.999Z'
    })
    expect(copy.allDay).toBe(true)
  })

  it('turns the copy into a timed event when alt-dragged onto the hourly grid', () => {
    // Without this the copy kept all_day = 1 while carrying an hour-long range,
    // so it drew in the all-day lane and ignored the time it was dropped at.
    const src = allDaySource()
    const copy = repo.copyEvent({
      sourceEventId: src.id,
      dtStartUtc: '2026-09-27T04:00:00.000Z',
      dtEndUtc: '2026-09-27T05:00:00.000Z',
      copyInstanceOnly: true,
      allDay: false
    })

    expect(copy.allDay).toBe(false)
    expect(copy.dtStartUtc).toBe('2026-09-27T04:00:00.000Z')
    expect(copy.dtEndUtc).toBe('2026-09-27T05:00:00.000Z')
  })
})
