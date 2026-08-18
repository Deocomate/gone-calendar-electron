import { describe, it, expect, beforeEach } from 'vitest'
import { createSqliteDriver } from '../src/main/db/sqlite-driver'
import { runMigrations, seedDefaultData } from '../src/main/db/database'
import { CalendarsRepo } from '../src/main/db/repos/calendars-repo'
import { EventsRepo } from '../src/main/db/repos/events-repo'

describe('Event Copy and Move Operations', () => {
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

    const cal = calendarsRepo.createCalendar({ name: 'Personal', color: '#6366f1' })
    testCalId = cal.id
  })

  it('should copy an event with a new ID and unique UID without mutating the original', () => {
    const original = eventsRepo.createEvent({
      calendarId: testCalId,
      title: 'Original Strategy Meeting',
      notes: 'Quarterly review agenda',
      location: 'HQ Room 402',
      dtStartUtc: '2026-08-18T09:00:00.000Z',
      dtEndUtc: '2026-08-18T10:00:00.000Z',
      color: '#6366f1'
    })

    const copied = eventsRepo.copyEvent({
      sourceEventId: original.id,
      dtStartUtc: '2026-08-19T14:00:00.000Z',
      dtEndUtc: '2026-08-19T15:00:00.000Z'
    })

    expect(copied.id).not.toBe(original.id)
    expect(copied.uid).not.toBe(original.uid)
    expect(copied.title).toBe(original.title)
    expect(copied.notes).toBe(original.notes)
    expect(copied.location).toBe(original.location)
    expect(copied.color).toBe(original.color)
    expect(copied.dtStartUtc).toBe('2026-08-19T14:00:00.000Z')
    expect(copied.dtEndUtc).toBe('2026-08-19T15:00:00.000Z')

    // Verify original remains unmodified
    const fetchedOriginal = eventsRepo.getEventById(original.id)
    expect(fetchedOriginal?.event.dtStartUtc).toBe('2026-08-18T09:00:00.000Z')
  })

  it('should move an event by updating start and end times while preserving ID and UID', () => {
    const original = eventsRepo.createEvent({
      calendarId: testCalId,
      title: 'Design Sprint',
      dtStartUtc: '2026-08-18T10:00:00.000Z',
      dtEndUtc: '2026-08-18T11:00:00.000Z'
    })

    const moved = eventsRepo.moveEvent({
      eventId: original.id,
      dtStartUtc: '2026-08-20T13:00:00.000Z',
      dtEndUtc: '2026-08-20T14:00:00.000Z'
    })

    expect(moved.id).toBe(original.id)
    expect(moved.uid).toBe(original.uid)
    expect(moved.dtStartUtc).toBe('2026-08-20T13:00:00.000Z')
    expect(moved.dtEndUtc).toBe('2026-08-20T14:00:00.000Z')
  })
})
