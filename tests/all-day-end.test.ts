import { describe, it, expect } from 'vitest'
import { createSqliteDriver } from '../src/main/db/sqlite-driver'
import { runMigrations, seedDefaultData } from '../src/main/db/database'
import { exclusiveEndToInclusive, inclusiveEndToExclusiveDate } from '../src/shared/all-day'

/**
 * Providers use an exclusive all-day end; the app stores an inclusive one. The
 * importers stored the provider value verbatim, so every imported all-day event
 * rendered a day longer than it was.
 */
describe('all-day end conversion', () => {
  describe('provider -> app (exclusive to inclusive)', () => {
    it('collapses a single-day event to one day', () => {
      expect(
        exclusiveEndToInclusive('2026-09-14T00:00:00.000Z', '2026-09-15T00:00:00.000Z')
      ).toBe('2026-09-14T23:59:59.999Z')
    })

    it('keeps a multi-day span covering every day it includes', () => {
      expect(
        exclusiveEndToInclusive('2026-09-01T00:00:00.000Z', '2026-09-04T00:00:00.000Z')
      ).toBe('2026-09-03T23:59:59.999Z')
    })

    it('treats a zero-length span as a single day', () => {
      expect(
        exclusiveEndToInclusive('2026-09-14T00:00:00.000Z', '2026-09-14T00:00:00.000Z')
      ).toBe('2026-09-14T23:59:59.999Z')
    })

    it('treats an end before the start as a single day', () => {
      expect(
        exclusiveEndToInclusive('2026-09-14T00:00:00.000Z', '2026-09-10T00:00:00.000Z')
      ).toBe('2026-09-14T23:59:59.999Z')
    })
  })

  describe('app -> provider (inclusive to exclusive)', () => {
    it('restores the exclusive date for a single-day event', () => {
      expect(
        inclusiveEndToExclusiveDate('2026-09-14T00:00:00.000Z', '2026-09-14T23:59:59.999Z')
      ).toBe('2026-09-15')
    })

    it('restores the exclusive date for a multi-day event', () => {
      expect(
        inclusiveEndToExclusiveDate('2026-09-01T00:00:00.000Z', '2026-09-03T23:59:59.999Z')
      ).toBe('2026-09-04')
    })

    it('passes through a value already at an exclusive midnight boundary', () => {
      expect(
        inclusiveEndToExclusiveDate('2026-09-14T00:00:00.000Z', '2026-09-15T00:00:00.000Z')
      ).toBe('2026-09-15')
    })

    it('never emits an end at or before the start', () => {
      expect(
        inclusiveEndToExclusiveDate('2026-09-14T00:00:00.000Z', '2026-09-10T00:00:00.000Z')
      ).toBe('2026-09-15')
    })
  })

  it('round-trips without drifting', () => {
    const start = '2026-09-14T00:00:00.000Z'
    const providerEnd = '2026-09-15T00:00:00.000Z'
    const stored = exclusiveEndToInclusive(start, providerEnd)
    expect(inclusiveEndToExclusiveDate(start, stored)).toBe(providerEnd.slice(0, 10))
  })
})

describe('migration 010 (repair already-imported all-day ends)', () => {
  it('rewrites exclusive ends and leaves inclusive ones alone', () => {
    const db = createSqliteDriver(':memory:')
    runMigrations(db)
    seedDefaultData(db)
    const cal = db.prepare('SELECT id FROM calendars LIMIT 1').get<{ id: string }>()!.id

    const insert = (id: string, start: string, end: string, allDay: number): void => {
      db.prepare(
        `INSERT INTO events (id, calendar_id, uid, title, dtstart_utc, dtend_utc, tzid, all_day,
                             dirty, is_deleted, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'UTC', ?, 0, 0, '', '')`
      ).run(id, cal, `${id}@t`, id, start, end, allDay)
    }

    // Imported from a provider: exclusive end.
    insert('imported', '2026-09-14T00:00:00.000Z', '2026-09-15T00:00:00.000Z', 1)
    // Created locally: already inclusive.
    insert('local', '2026-09-14T00:00:00.000Z', '2026-09-14T23:59:59.999Z', 1)
    // A timed event that happens to end at midnight must not be touched.
    insert('timed', '2026-09-14T22:00:00.000Z', '2026-09-15T00:00:00.000Z', 0)

    // Rewind past 010 and re-run it as an upgrade would.
    db.prepare('DELETE FROM schema_migrations WHERE version >= 10').run()
    runMigrations(db)

    const get = (id: string): string =>
      db.prepare('SELECT dtend_utc FROM events WHERE id = ?').get<{ dtend_utc: string }>(id)!
        .dtend_utc

    expect(get('imported')).toBe('2026-09-14T23:59:59.999Z')
    expect(get('local')).toBe('2026-09-14T23:59:59.999Z')
    expect(get('timed')).toBe('2026-09-15T00:00:00.000Z')
  })
})
