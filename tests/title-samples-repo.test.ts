import { describe, it, expect, beforeEach } from 'vitest'
import { DateTime } from 'luxon'
import { createSqliteDriver, type ISqliteDatabase } from '../src/main/db/sqlite-driver'
import { runMigrations, seedDefaultData } from '../src/main/db/database'
import { CalendarsRepo } from '../src/main/db/repos/calendars-repo'
import { EventsRepo } from '../src/main/db/repos/events-repo'
import { rankTitleSuggestions } from '../src/shared/title-suggestions'

/**
 * The SQL feeding the title autocomplete. Ranking is covered in
 * title-suggestions.test.ts; what matters here is which rows ever reach it.
 */
describe('EventsRepo.listTitleSamples', () => {
  let db: ISqliteDatabase
  let calendarsRepo: CalendarsRepo
  let eventsRepo: EventsRepo
  let calendarId: string

  const NOW = DateTime.fromISO('2026-09-15T12:00:00.000Z', { zone: 'utc' })
  const windowStart = NOW.minus({ days: 365 }).toISO()!
  const windowEnd = NOW.plus({ days: 90 }).toISO()!

  const samples = () => eventsRepo.listTitleSamples(windowStart, windowEnd)
  const titles = () => samples().map((s) => s.title).sort()

  beforeEach(() => {
    db = createSqliteDriver(':memory:')
    runMigrations(db)
    seedDefaultData(db)
    calendarsRepo = new CalendarsRepo(db)
    eventsRepo = new EventsRepo(db)
    calendarId = calendarsRepo.listCalendars()[0].id
  })

  function add(title: string, startUtc: string, extra: Record<string, unknown> = {}) {
    return eventsRepo.createEvent({
      calendarId,
      title,
      dtStartUtc: startUtc,
      dtEndUtc: DateTime.fromISO(startUtc, { zone: 'utc' }).plus({ hours: 1 }).toISO()!,
      ...extra
    })
  }

  it('returns recent events flattened to what ranking needs', () => {
    add('Standup', '2026-09-14T09:00:00.000Z')

    const [s] = samples()
    expect(s.title).toBe('Standup')
    expect(s.calendarId).toBe(calendarId)
    expect(s.startUtc).toBe('2026-09-14T09:00:00.000Z')
    expect(s.allDay).toBe(false)
    expect(s.rrule).toBeNull()
  })

  it('keeps a recurring master whose start is far outside the window', () => {
    // The series is the strongest signal the feature has, and its dtstart is
    // always old. Filtering on the date would hide exactly the habitual events.
    add('Weekly sync', '2019-01-07T09:00:00.000Z', { rrule: 'FREQ=WEEKLY;BYDAY=MO' })
    add('Ancient one-off', '2019-01-08T09:00:00.000Z')

    expect(titles()).toEqual(['Weekly sync'])
  })

  it('drops events further ahead than the forward window', () => {
    add('Soon', NOW.plus({ days: 30 }).toISO()!)
    add('Next year', NOW.plus({ days: 300 }).toISO()!)

    expect(titles()).toEqual(['Soon'])
  })

  it('excludes deleted events', () => {
    const evt = add('Cancelled plan', '2026-09-14T09:00:00.000Z')
    eventsRepo.deleteEvent(evt.id)

    expect(titles()).toEqual([])
  })

  it('excludes read-only calendars, which nothing can be created on', () => {
    // A suggestion carries the calendar to create on, so offering one from a
    // holiday subscription would hand back a calendar that rejects the write.
    const holidays = calendarsRepo.createCalendar({ name: 'Holidays', color: '#888888' })
    db.prepare('UPDATE calendars SET is_read_only = 1 WHERE id = ?').run(holidays.id)
    db.prepare(
      `INSERT INTO events (id, calendar_id, uid, title, dtstart_utc, dtend_utc, tzid, all_day,
                           is_deleted, dirty, has_conflict, created_at, updated_at)
       VALUES ('ro-1', ?, 'ro-1@gone', 'National Day', '2026-09-02T00:00:00.000Z',
               '2026-09-02T00:00:00.000Z', 'UTC', 1, 0, 0, 0, ?, ?)`
    ).run(holidays.id, NOW.toISO()!, NOW.toISO()!)

    add('My own event', '2026-09-14T09:00:00.000Z')

    expect(titles()).toEqual(['My own event'])
  })

  it('ignores blank titles', () => {
    add('   ', '2026-09-14T09:00:00.000Z')
    add('Real', '2026-09-13T09:00:00.000Z')

    expect(titles()).toEqual(['Real'])
  })

  it('honours the row cap, newest first', () => {
    for (let i = 1; i <= 5; i++) {
      add(`Event ${i}`, NOW.minus({ days: i }).toISO()!)
    }

    const capped = eventsRepo.listTitleSamples(windowStart, windowEnd, 2)
    expect(capped.map((s) => s.title)).toEqual(['Event 1', 'Event 2'])
  })

  it('feeds ranking end to end: the right calendar comes back with the title', () => {
    const personal = calendarsRepo.createCalendar({ name: 'Personal', color: '#52b788' })
    add('Gym', '2026-09-14T18:00:00.000Z')
    eventsRepo.createEvent({
      calendarId: personal.id,
      title: 'Gym',
      dtStartUtc: '2026-09-12T18:00:00.000Z',
      dtEndUtc: '2026-09-12T19:00:00.000Z'
    })
    eventsRepo.createEvent({
      calendarId: personal.id,
      title: 'Gym',
      dtStartUtc: '2026-09-10T18:00:00.000Z',
      dtEndUtc: '2026-09-10T19:00:00.000Z'
    })
    add('Standup', '2026-09-14T09:00:00.000Z')

    const ranked = rankTitleSuggestions(samples(), {
      query: 'gy',
      targetStartUtc: '2026-09-16T18:00:00.000Z',
      targetAllDay: false,
      now: NOW
    })

    expect(ranked).toHaveLength(1)
    expect(ranked[0].title).toBe('Gym')
    expect(ranked[0].calendarId).toBe(personal.id)
    expect(ranked[0].durationMinutes).toBe(60)
  })
})
