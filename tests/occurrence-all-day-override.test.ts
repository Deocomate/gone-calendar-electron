import { describe, it, expect, beforeEach } from 'vitest'
import { createSqliteDriver, type ISqliteDatabase } from '../src/main/db/sqlite-driver'
import { runMigrations, seedDefaultData } from '../src/main/db/database'
import { CalendarsRepo } from '../src/main/db/repos/calendars-repo'
import { EventsRepo } from '../src/main/db/repos/events-repo'
import { expandOccurrences } from '../src/shared/expand-occurrences'
import { mapGoogleEventToDomain } from '../src/main/sync/google-event-mapper'

/**
 * Google and Outlook both allow converting a single occurrence of an all-day
 * series into a timed one, leaving the rest of the series all-day.
 * `event_exceptions` had no all_day column, so expand-occurrences fell back to
 * the master's flag and those occurrences kept rendering in the all-day bar
 * despite carrying real start/end times.
 */
describe('per-occurrence all-day override', () => {
  let db: ISqliteDatabase
  let repo: EventsRepo
  let calId: string

  beforeEach(() => {
    db = createSqliteDriver(':memory:')
    runMigrations(db)
    seedDefaultData(db)
    repo = new EventsRepo(db)
    calId = new CalendarsRepo(db).createCalendar({ name: 'T', color: '#000' }).id
  })

  function allDayWeeklySeries(): string {
    return repo.createEvent({
      calendarId: calId,
      title: 'Sanctuary',
      dtStartUtc: '2026-09-01T00:00:00.000Z',
      dtEndUtc: '2026-09-01T23:59:59.999Z',
      allDay: true,
      rrule: 'FREQ=WEEKLY;BYDAY=TU'
    }).id
  }

  it('renders the overridden occurrence as timed and the rest as all-day', () => {
    const masterId = allDayWeeklySeries()
    repo.upsertException({
      masterEventId: masterId,
      originalStartUtc: '2026-09-08T00:00:00.000Z',
      isCancelled: false,
      dtStartUtc: '2026-09-08T23:00:00.000Z',
      dtEndUtc: '2026-09-09T00:00:00.000Z',
      allDay: false
    })

    const master = repo.getEventById(masterId)!
    const occs = expandOccurrences(
      master.event,
      master.exceptions,
      '2026-09-01T00:00:00.000Z',
      '2026-09-30T00:00:00.000Z'
    )

    const overridden = occs.find((o) => o.originalStartUtc === '2026-09-08T00:00:00.000Z')
    expect(overridden, 'the overridden occurrence must still be produced').toBeDefined()
    expect(overridden!.allDay, 'it became a timed occurrence').toBe(false)
    expect(overridden!.startUtc).toBe('2026-09-08T23:00:00.000Z')

    // Every other occurrence keeps the series' all-day shape.
    for (const o of occs) {
      if (o.originalStartUtc === '2026-09-08T00:00:00.000Z') continue
      expect(o.allDay, `${o.originalStartUtc} should stay all-day`).toBe(true)
    }
  })

  it('inherits the master when the override does not specify all-day', () => {
    const masterId = allDayWeeklySeries()
    repo.upsertException({
      masterEventId: masterId,
      originalStartUtc: '2026-09-08T00:00:00.000Z',
      isCancelled: false,
      title: 'Renamed only'
    })

    const master = repo.getEventById(masterId)!
    const occs = expandOccurrences(
      master.event,
      master.exceptions,
      '2026-09-01T00:00:00.000Z',
      '2026-09-30T00:00:00.000Z'
    )
    const overridden = occs.find((o) => o.originalStartUtc === '2026-09-08T00:00:00.000Z')!
    expect(overridden.title).toBe('Renamed only')
    expect(overridden.allDay, 'unspecified all-day inherits the series').toBe(true)
  })

  it('round-trips the flag through the repo', () => {
    const masterId = allDayWeeklySeries()
    repo.upsertException({
      masterEventId: masterId,
      originalStartUtc: '2026-09-08T00:00:00.000Z',
      isCancelled: false,
      allDay: false
    })
    expect(repo.getExceptionsForEvent(masterId)[0].allDay).toBe(false)

    // Converting it back to all-day must persist too, not read as "unspecified".
    repo.upsertException({
      masterEventId: masterId,
      originalStartUtc: '2026-09-08T00:00:00.000Z',
      isCancelled: false,
      allDay: true
    })
    expect(repo.getExceptionsForEvent(masterId)[0].allDay).toBe(true)
  })

  it('imports a timed override of an all-day Google series', () => {
    const mapped = mapGoogleEventToDomain(
      {
        id: 'master_20260908',
        status: 'confirmed',
        summary: 'Sanctuary',
        recurringEventId: 'master',
        originalStartTime: { date: '2026-09-08' },
        start: { dateTime: '2026-09-08T23:00:00Z' },
        end: { dateTime: '2026-09-09T00:00:00Z' }
      },
      calId
    )

    expect(mapped.isException).toBe(true)
    expect(mapped.exception!.allDay, 'a timed override must not be flagged all-day').toBe(false)
    expect(mapped.exception!.dtStartUtc).toBe('2026-09-08T23:00:00.000Z')
    // The original start is still the all-day date the series produced.
    expect(mapped.exception!.originalStartUtc).toBe('2026-09-08T00:00:00.000Z')
  })
})
