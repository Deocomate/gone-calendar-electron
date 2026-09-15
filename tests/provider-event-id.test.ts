import { describe, it, expect, beforeEach } from 'vitest'
import { createSqliteDriver, type ISqliteDatabase } from '../src/main/db/sqlite-driver'
import { runMigrations, seedDefaultData, MIGRATION_014_SQL } from '../src/main/db/database'
import { EventsRepo } from '../src/main/db/repos/events-repo'
import { detachAccount } from '../src/main/db/repos/detach-account'

/**
 * An event created here gets `evt_...`. The first successful push used to
 * replace that with the id the provider assigned, so the renderer - still
 * holding the copy it loaded a moment earlier - failed with "Event not found"
 * on the next move, edit or delete. Every new event passed through that window.
 *
 * The provider's id now lives in its own column. These tests pin the two rules
 * that keeps honest: our id never changes, and a pull still recognises the event
 * it just accepted rather than inserting a second copy.
 */
describe('provider_event_id', () => {
  let db: ISqliteDatabase
  let repo: EventsRepo
  let calendarId: string

  beforeEach(() => {
    db = createSqliteDriver(':memory:')
    runMigrations(db)
    seedDefaultData(db)
    repo = new EventsRepo(db)
    calendarId = db.prepare('SELECT id FROM calendars LIMIT 1').get<{ id: string }>()!.id
  })

  function create(title = 'Locally made') {
    return repo.createEvent({
      calendarId,
      title,
      dtStartUtc: '2026-09-20T09:00:00.000Z',
      dtEndUtc: '2026-09-20T10:00:00.000Z'
    })
  }

  /** What the push does on a successful insert. */
  function recordPush(localId: string, providerId: string, etag = 'e1') {
    db.prepare(
      `UPDATE events SET provider_event_id = ?, etag = ?, dirty = 0, has_conflict = 0 WHERE id = ?`
    ).run(providerId, etag, localId)
  }

  /** What a pull does: find the local row for a provider id, else use it as the id. */
  function localIdFor(providerId: string): string {
    return (
      db
        .prepare('SELECT id FROM events WHERE calendar_id = ? AND provider_event_id = ?')
        .get<{ id: string }>(calendarId, providerId)?.id ?? providerId
    )
  }

  it('keeps our id after the provider assigns its own', () => {
    const evt = create()
    expect(evt.id).toMatch(/^evt_/)

    recordPush(evt.id, 'g00gleid123abc')

    const after = repo.getEventById(evt.id)
    expect(after, 'the row must still be reachable by the id the renderer holds').not.toBeNull()
    expect(after!.event.id).toBe(evt.id)
    expect(after!.event.providerEventId).toBe('g00gleid123abc')
  })

  it('still lets the renderer move the event after it has synced', () => {
    // The exact failure: move used the id the view was rendered with.
    const evt = create()
    recordPush(evt.id, 'g00gleid123abc')

    expect(() =>
      repo.moveEvent({
        eventId: evt.id,
        dtStartUtc: '2026-09-21T09:00:00.000Z',
        dtEndUtc: '2026-09-21T10:00:00.000Z'
      })
    ).not.toThrow()
  })

  it('recognises the pushed event on the next pull instead of duplicating it', () => {
    const evt = create()
    recordPush(evt.id, 'g00gleid123abc')

    expect(localIdFor('g00gleid123abc')).toBe(evt.id)
    expect(db.prepare('SELECT COUNT(*) c FROM events').get<{ c: number }>()!.c).toBe(1)
  })

  it('treats an unknown provider id as a new event', () => {
    expect(localIdFor('never-seen-before')).toBe('never-seen-before')
  })

  it('leaves exception rows pointing at a master that no longer moves', () => {
    // The old re-key had to drag event_exceptions.master_event_id along with it.
    const master = repo.createEvent({
      calendarId,
      title: 'Weekly',
      dtStartUtc: '2026-09-07T09:00:00.000Z',
      dtEndUtc: '2026-09-07T09:30:00.000Z',
      rrule: 'FREQ=WEEKLY;BYDAY=MO'
    })
    repo.upsertException({
      masterEventId: master.id,
      originalStartUtc: '2026-09-14T09:00:00.000Z',
      isCancelled: true
    })

    recordPush(master.id, 'seriesprovider1')

    const exceptions = repo.getExceptionsForEvent(master.id)
    expect(exceptions).toHaveLength(1)
    expect(exceptions[0].masterEventId).toBe(master.id)
  })

  it('scopes the provider id per calendar, so two calendars may share one', () => {
    // Google hands the same event id to every calendar an invitation lands in,
    // so the uniqueness has to be per calendar, not global.
    const now = new Date().toISOString()
    db.prepare(
      `INSERT INTO calendars (id, account_id, name, color, is_visible, is_read_only, is_default, created_at, updated_at)
       SELECT 'cal_two', account_id, 'Second', '#222222', 1, 0, 0, ?, ? FROM calendars WHERE id = ?`
    ).run(now, now, calendarId)

    const mine = create('Invitation')
    recordPush(mine.id, 'sharedid0001')

    const theirs = repo.createEvent({
      calendarId: 'cal_two',
      title: 'Invitation',
      dtStartUtc: '2026-09-20T09:00:00.000Z',
      dtEndUtc: '2026-09-20T10:00:00.000Z'
    })

    expect(() =>
      db
        .prepare('UPDATE events SET provider_event_id = ?, etag = ? WHERE id = ?')
        .run('sharedid0001', 'e2', theirs.id)
    ).not.toThrow()

    expect(
      db
        .prepare('SELECT COUNT(*) c FROM events WHERE provider_event_id = ?')
        .get<{ c: number }>('sharedid0001')!.c
    ).toBe(2)
  })

  it('refuses two rows in one calendar claiming the same provider id', () => {
    const a = create('A')
    const b = create('B')
    recordPush(a.id, 'dup0001')
    expect(() => recordPush(b.id, 'dup0001')).toThrow()
  })

  it('detaching clears the provider id along with the rest of the sync state', () => {
    const evt = create()
    recordPush(evt.id, 'g00gleid123abc')
    const now = new Date().toISOString()
    db.prepare(
      `INSERT INTO accounts (id, type, name, is_active, created_at, updated_at)
       VALUES ('acc_g', 'google', 'G', 1, ?, ?)`
    ).run(now, now)
    db.prepare('UPDATE calendars SET account_id = ? WHERE id = ?').run('acc_g', calendarId)

    detachAccount(db, 'acc_g')

    const after = repo.getEventById(evt.id)!.event
    expect(after.providerEventId).toBeUndefined()
  })
})

describe('migration 014 on a database that predates it', () => {
  it('adds the column without touching a single row', () => {
    // The backfill this replaced took 73 seconds on a real 7,800-event
    // database: trg_events_fts_update fires on any column change and re-indexes
    // the row in FTS5, so updating every row re-indexed every row.
    const db = createSqliteDriver(':memory:')
    db.exec(`CREATE TABLE events (id TEXT PRIMARY KEY, calendar_id TEXT NOT NULL, etag TEXT)`)
    db.prepare("INSERT INTO events VALUES ('googleid1', 'cal', 'etag1')").run()
    db.prepare("INSERT INTO events VALUES ('evt_local_1', 'cal', NULL)").run()

    db.exec(MIGRATION_014_SQL)

    const rows = db
      .prepare('SELECT id, provider_event_id FROM events ORDER BY id')
      .all<{ id: string; provider_event_id: string | null }>()
    expect(rows).toEqual([
      { id: 'evt_local_1', provider_event_id: null },
      { id: 'googleid1', provider_event_id: null }
    ])
    db.close()
  })

  it('still finds a legacy row, because its id is the provider id', () => {
    // No backfill means the lookup must degrade correctly: a provider id that
    // matches no provider_event_id is used as the local id, which is precisely
    // how those rows are keyed.
    const db = createSqliteDriver(':memory:')
    runMigrations(db)
    seedDefaultData(db)
    const calendarId = db.prepare('SELECT id FROM calendars LIMIT 1').get<{ id: string }>()!.id
    const now = new Date().toISOString()
    db.prepare(
      `INSERT INTO events (id, calendar_id, uid, title, dtstart_utc, dtend_utc, tzid, all_day,
                           etag, dirty, has_conflict, is_deleted, created_at, updated_at)
       VALUES ('legacygoogleid', ?, 'u@g', 'Pulled long ago', '2026-01-01T00:00:00.000Z',
               '2026-01-01T01:00:00.000Z', 'UTC', 0, 'e1', 0, 0, 0, ?, ?)`
    ).run(calendarId, now, now)

    const resolved =
      db
        .prepare('SELECT id FROM events WHERE calendar_id = ? AND provider_event_id = ?')
        .get<{ id: string }>(calendarId, 'legacygoogleid')?.id ?? 'legacygoogleid'

    expect(resolved).toBe('legacygoogleid')
    db.close()
  })
})
