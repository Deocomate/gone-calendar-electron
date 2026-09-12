import { describe, it, expect, beforeEach } from 'vitest'
import { createSqliteDriver } from '../src/main/db/sqlite-driver'
import { runMigrations, seedDefaultData } from '../src/main/db/database'
import { CalendarsRepo } from '../src/main/db/repos/calendars-repo'
import { EventsRepo } from '../src/main/db/repos/events-repo'
import { generateIcs } from '../src/main/ics/write-ics'
import type { ISqliteDatabase } from '../src/main/db/sqlite-driver'
import type { Calendar } from '../src/shared/event-model'

/**
 * Occurrence exceptions used to be written locally and never pushed anywhere:
 * upsertException marked nothing dirty and every engine's push query read only
 * `events`. These cover the plumbing that makes them syncable.
 */
describe('occurrence exception sync', () => {
  let db: ISqliteDatabase
  let repo: EventsRepo
  let CAL_ID: string

  beforeEach(() => {
    db = createSqliteDriver(':memory:')
    runMigrations(db)
    seedDefaultData(db)
    repo = new EventsRepo(db)
    CAL_ID = new CalendarsRepo(db).createCalendar({ name: 'Test', color: '#000000' }).id
  })

  function createSeries(): string {
    const created = repo.createEvent({
      calendarId: CAL_ID,
      title: 'Standup',
      dtStartUtc: '2026-03-02T09:00:00.000Z',
      dtEndUtc: '2026-03-02T09:15:00.000Z',
      rrule: 'FREQ=WEEKLY;BYDAY=MO'
    })
    // Pretend the master has already reached the provider.
    db.prepare("UPDATE events SET etag = 'etag-1', dirty = 0 WHERE id = ?").run(created.id)
    return created.id
  }

  it('marks a cancellation dirty so it enters the push set', () => {
    const masterId = createSeries()
    repo.upsertException({
      masterEventId: masterId,
      originalStartUtc: '2026-03-09T09:00:00.000Z',
      isCancelled: true
    })

    const pending = repo.listDirtyExceptions(CAL_ID)
    expect(pending).toHaveLength(1)
    expect(pending[0].exception.isCancelled).toBe(true)
    expect(pending[0].master.id).toBe(masterId)
  })

  it('marks a single-occurrence edit dirty', () => {
    const masterId = createSeries()
    repo.upsertException({
      masterEventId: masterId,
      originalStartUtc: '2026-03-09T09:00:00.000Z',
      isCancelled: false,
      title: 'Standup (moved)',
      dtStartUtc: '2026-03-09T10:00:00.000Z',
      dtEndUtc: '2026-03-09T10:15:00.000Z'
    })

    const pending = repo.listDirtyExceptions(CAL_ID)
    expect(pending).toHaveLength(1)
    expect(pending[0].exception.title).toBe('Standup (moved)')
  })

  it('clears the flag once pushed and records the provider instance id', () => {
    const masterId = createSeries()
    const exc = repo.upsertException({
      masterEventId: masterId,
      originalStartUtc: '2026-03-09T09:00:00.000Z',
      isCancelled: true
    })

    repo.markExceptionSynced(exc.id, 'google-instance-id', 'etag-2')
    expect(repo.listDirtyExceptions(CAL_ID)).toHaveLength(0)

    // A later edit re-dirties it, and the cached instance id survives.
    repo.upsertException({
      masterEventId: masterId,
      originalStartUtc: '2026-03-09T09:00:00.000Z',
      isCancelled: false,
      title: 'Back on'
    })
    const pending = repo.listDirtyExceptions(CAL_ID)
    expect(pending).toHaveLength(1)
    expect(pending[0].providerInstanceId).toBe('google-instance-id')
  })

  it('skips series whose master has never been pushed', () => {
    const created = repo.createEvent({
      calendarId: CAL_ID,
      title: 'Local only',
      dtStartUtc: '2026-03-02T09:00:00.000Z',
      dtEndUtc: '2026-03-02T09:15:00.000Z',
      rrule: 'FREQ=WEEKLY;BYDAY=MO'
    })
    repo.upsertException({
      masterEventId: created.id,
      originalStartUtc: '2026-03-09T09:00:00.000Z',
      isCancelled: true
    })

    // No etag yet: there is no remote series to attach an instance override to.
    expect(repo.listDirtyExceptions(CAL_ID)).toHaveLength(0)
    // But the master itself is still listed for CalDAV's whole-series push.
    expect(repo.listMastersWithDirtyExceptions(CAL_ID).map((m) => m.id)).toEqual([created.id])
  })

  it('serialises cancellations and overrides into the pushed ICS', () => {
    const masterId = createSeries()
    repo.upsertException({
      masterEventId: masterId,
      originalStartUtc: '2026-03-09T09:00:00.000Z',
      isCancelled: true
    })
    repo.upsertException({
      masterEventId: masterId,
      originalStartUtc: '2026-03-16T09:00:00.000Z',
      isCancelled: false,
      title: 'Standup (long)',
      dtStartUtc: '2026-03-16T09:00:00.000Z',
      dtEndUtc: '2026-03-16T10:00:00.000Z'
    })

    const calendar: Calendar = {
      id: CAL_ID,
      accountId: '',
      name: 'Test',
      color: '#000000',
      isVisible: true,
      isReadOnly: false,
      isDefault: false,
      createdAt: '',
      updatedAt: ''
    }
    const master = repo.getEventById(masterId)!.event
    const ics = generateIcs(calendar, [master], repo.getExceptionsForEvent(masterId))

    expect(ics).toContain('RECURRENCE-ID:20260309T090000Z')
    expect(ics).toContain('STATUS:CANCELLED')
    expect(ics).toContain('RECURRENCE-ID:20260316T090000Z')
    expect(ics).toContain('SUMMARY:Standup (long)')
  })

  it('rejects an exception on a read-only calendar', () => {
    const masterId = createSeries()
    db.prepare('UPDATE calendars SET is_read_only = 1 WHERE id = ?').run(CAL_ID)

    expect(() =>
      repo.upsertException({
        masterEventId: masterId,
        originalStartUtc: '2026-03-09T09:00:00.000Z',
        isCancelled: true
      })
    ).toThrow(/read-only/i)
  })
})
