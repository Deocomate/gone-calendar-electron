import { describe, it, expect, beforeEach } from 'vitest'
import { createSqliteDriver, type ISqliteDatabase } from '../src/main/db/sqlite-driver'
import { runMigrations, seedDefaultData } from '../src/main/db/database'
import { CalendarsRepo } from '../src/main/db/repos/calendars-repo'
import { EventsRepo, ReadOnlyCalendarError } from '../src/main/db/repos/events-repo'
import {
  subscribeHolidayCalendar,
  unsubscribeHolidayCalendar
} from '../src/main/holidays/holiday-subscription'

describe('Database Repositories & Read-Only Protections', () => {
  let db: ISqliteDatabase
  let calendarsRepo: CalendarsRepo
  let eventsRepo: EventsRepo

  beforeEach(() => {
    db = createSqliteDriver(':memory:')
    runMigrations(db)
    seedDefaultData(db)
    calendarsRepo = new CalendarsRepo(db)
    eventsRepo = new EventsRepo(db)
  })

  it('should seed default personal account and calendar', () => {
    const cals = calendarsRepo.listCalendars()
    expect(cals.length).toBeGreaterThanOrEqual(1)
    expect(cals[0].name).toBe('Personal Calendar')
    expect(cals[0].isReadOnly).toBe(false)
  })

  it('should perform calendar CRUD operations', () => {
    const created = calendarsRepo.createCalendar({
      name: 'Project Work',
      color: '#10b981'
    })
    expect(created.name).toBe('Project Work')
    expect(created.color).toBe('#10b981')

    const updated = calendarsRepo.updateCalendar(created.id, {
      name: 'Project Work (Renamed)',
      color: '#059669'
    })
    expect(updated.name).toBe('Project Work (Renamed)')
    expect(updated.color).toBe('#059669')

    const deleted = calendarsRepo.deleteCalendar(created.id)
    expect(deleted).toBe(true)
    expect(calendarsRepo.getCalendarById(created.id)).toBeNull()
  })

  it('should perform event CRUD operations and query occurrences', () => {
    const cals = calendarsRepo.listCalendars()
    const calId = cals[0].id

    const event = eventsRepo.createEvent({
      calendarId: calId,
      title: 'Design Review',
      dtStartUtc: '2026-08-18T10:00:00.000Z',
      dtEndUtc: '2026-08-18T11:00:00.000Z',
      tzid: 'UTC',
      allDay: false
    })

    expect(event.title).toBe('Design Review')
    expect(event.dirty).toBe(true)

    const occurrences = eventsRepo.queryEventsByRange(
      [calId],
      '2026-08-01T00:00:00.000Z',
      '2026-08-31T23:59:59.999Z'
    )
    expect(occurrences).toHaveLength(1)
    expect(occurrences[0].title).toBe('Design Review')

    const updated = eventsRepo.updateEvent(event.id, {
      title: 'Updated Design Review'
    })
    expect(updated.title).toBe('Updated Design Review')

    const deleted = eventsRepo.deleteEvent(event.id)
    expect(deleted).toBe(true)

    const afterDelete = eventsRepo.queryEventsByRange(
      [calId],
      '2026-08-01T00:00:00.000Z',
      '2026-08-31T23:59:59.999Z'
    )
    expect(afterDelete).toHaveLength(0)
  })

  it('should reject event creation, update, and delete in read-only calendar', () => {
    const readOnlyCal = calendarsRepo.createCalendar({
      name: 'Vietnamese Holidays (Subscribed)',
      color: '#f59e0b',
      isReadOnly: true
    })
    expect(readOnlyCal.isReadOnly).toBe(true)

    // 1. Create rejected
    expect(() =>
      eventsRepo.createEvent({
        calendarId: readOnlyCal.id,
        title: 'New Year Day',
        dtStartUtc: '2026-01-01T00:00:00.000Z',
        dtEndUtc: '2026-01-01T23:59:59.999Z'
      })
    ).toThrowError(ReadOnlyCalendarError)

    // Bypass check directly in DB to insert a fixture event for testing update/delete rejection
    const rawEvtId = 'fixture-ro-evt'
    db.prepare(
      `INSERT INTO events (id, calendar_id, uid, title, dtstart_utc, dtend_utc, tzid, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(rawEvtId, readOnlyCal.id, 'uid@test', 'Holiday', '2026-01-01T00:00:00.000Z', '2026-01-01T23:59:59.999Z', 'UTC', '2026-01-01', '2026-01-01')

    // 2. Update rejected
    expect(() =>
      eventsRepo.updateEvent(rawEvtId, { title: 'Modified Holiday' })
    ).toThrowError(ReadOnlyCalendarError)

    // 3. Delete rejected
    expect(() =>
      eventsRepo.deleteEvent(rawEvtId)
    ).toThrowError(ReadOnlyCalendarError)

    // 4. Upsert exception rejected
    expect(() =>
      eventsRepo.upsertException({
        masterEventId: rawEvtId,
        originalStartUtc: '2026-01-01T00:00:00.000Z',
        isCancelled: true
      })
    ).toThrowError(ReadOnlyCalendarError)
  })

  it('should seed holiday events into a read-only calendar via system subscribe', () => {
    const first = subscribeHolidayCalendar(db, 'vietnam')
    expect(first.count).toBeGreaterThan(15)

    const seeded = eventsRepo.queryEventsByCalendar(first.calendarId)
    expect(seeded.length).toBe(first.count)

    const cal = calendarsRepo.getCalendarById(first.calendarId)
    expect(cal?.isReadOnly).toBe(true)

    expect(() =>
      eventsRepo.createEvent({
        calendarId: first.calendarId,
        title: 'User should not write here',
        dtStartUtc: '2026-01-01T00:00:00.000Z',
        dtEndUtc: '2026-01-01T23:59:59.999Z'
      })
    ).toThrowError(ReadOnlyCalendarError)

    const second = subscribeHolidayCalendar(db, 'vietnam')
    expect(second.calendarId).toBe(first.calendarId)
    expect(eventsRepo.queryEventsByCalendar(second.calendarId).length).toBe(second.count)

    expect(unsubscribeHolidayCalendar(db, 'vietnam')).toBe(true)
    expect(calendarsRepo.getCalendarById(first.calendarId)).toBeNull()
  })

  it('should expand, materialize, and detach a lunar-recurring anniversary', () => {
    const calId = calendarsRepo.listCalendars()[0].id
    const syncCal = calendarsRepo.createCalendar({ name: 'Google', color: '#4285f4' })

    const master = eventsRepo.createEvent({
      calendarId: calId,
      title: 'Giỗ bà ngoại',
      dtStartUtc: '2024-04-18T00:00:00.000Z',
      dtEndUtc: '2024-04-18T23:59:59.999Z',
      allDay: true,
      lunarRule: { day: 10, month: 3, leap: false }
    })
    expect(master.lunarRule).toEqual({ day: 10, month: 3, leap: false })

    // Synthetic expansion: one all-day occurrence per year, no rrule needed.
    const occ2026 = eventsRepo.queryEventsByRange(
      [calId],
      '2026-01-01T00:00:00.000Z',
      '2026-12-31T23:59:59.999Z'
    )
    expect(occ2026).toHaveLength(1)
    expect(occ2026[0].startUtc).toBe('2026-04-26T00:00:00.000Z')
    expect(occ2026[0].allDay).toBe(true)

    // Materialize into the syncable calendar through 2028.
    const res = eventsRepo.materializeLunarEvent({
      masterEventId: master.id,
      targetCalendarId: syncCal.id,
      throughYear: 2028
    })
    const thisYear = new Date().getUTCFullYear()
    expect(res.count).toBe(2028 - thisYear + 1)

    const children = eventsRepo.queryEventsByCalendar(syncCal.id)
    expect(children.length).toBe(res.count)
    expect(children.every((c) => c.dirty && !c.rrule && !c.lunarRule)).toBe(true)
    expect(children.every((c) => c.lunarSourceEventId === master.id)).toBe(true)

    // Re-running only fills gaps (idempotent per year).
    const rerun = eventsRepo.materializeLunarEvent({
      masterEventId: master.id,
      targetCalendarId: syncCal.id,
      throughYear: 2028
    })
    expect(rerun.count).toBe(0)

    // The master no longer double-draws for materialized years.
    const combined = eventsRepo.queryEventsByRange(
      [calId, syncCal.id],
      `${thisYear}-01-01T00:00:00.000Z`,
      `${thisYear}-12-31T23:59:59.999Z`
    )
    expect(combined).toHaveLength(1)

    // Detach removes the never-synced children.
    const detached = eventsRepo.detachLunarMaterialized({ masterEventId: master.id })
    expect(detached.count).toBe(res.count)
    expect(eventsRepo.queryEventsByCalendar(syncCal.id)).toHaveLength(0)
  })

  it('should support nested transactions using savepoints without errors', () => {
    db.transaction(() => {
      calendarsRepo.createCalendar({ name: 'Outer Cal', color: '#111111' })

      db.transaction(() => {
        calendarsRepo.createCalendar({ name: 'Inner Cal', color: '#222222' })
      })()
    })()

    const names = calendarsRepo.listCalendars().map((c) => c.name)
    expect(names).toContain('Outer Cal')
    expect(names).toContain('Inner Cal')
  })
})
