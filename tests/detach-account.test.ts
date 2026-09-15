import { describe, it, expect, beforeEach } from 'vitest'
import { createSqliteDriver, type ISqliteDatabase } from '../src/main/db/sqlite-driver'
import { runMigrations, seedDefaultData } from '../src/main/db/database'
import { EventsRepo } from '../src/main/db/repos/events-repo'
import { detachAccount, LOCAL_ACCOUNT_ID } from '../src/main/db/repos/detach-account'

/**
 * Disconnecting only deleted the token and set is_active = 0. The calendars kept
 * pointing at the dead account, and calendars.account_id carries ON DELETE
 * CASCADE - so anything that later removed that row would take every calendar,
 * event and exception with it. Detaching re-homes the data first, which is what
 * makes deleting the account safe.
 */
describe('detachAccount', () => {
  let db: ISqliteDatabase
  const GOOGLE_ACCOUNT = 'acc_google'
  const CAL_A = 'cal_a@group.calendar.google.com'
  const CAL_RO = 'cal_readonly@group.calendar.google.com'

  const count = (sql: string, ...params: unknown[]): number =>
    db.prepare(sql).get<{ c: number }>(...params)!.c

  beforeEach(() => {
    db = createSqliteDriver(':memory:')
    runMigrations(db)
    seedDefaultData(db)

    const now = new Date().toISOString()
    db.prepare(
      `INSERT INTO accounts (id, type, name, email, is_active, created_at, updated_at)
       VALUES (?, 'google', 'G', 'g@example.com', 1, ?, ?)`
    ).run(GOOGLE_ACCOUNT, now, now)
    db.prepare(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, 'secret', ?)`
    ).run(`token:${GOOGLE_ACCOUNT}`, now)

    for (const [id, ro] of [
      [CAL_A, 0],
      [CAL_RO, 1]
    ] as const) {
      db.prepare(
        `INSERT INTO calendars (id, account_id, name, color, is_visible, is_read_only, is_default, created_at, updated_at)
         VALUES (?, ?, 'Cal', '#123456', 1, ?, 0, ?, ?)`
      ).run(id, GOOGLE_ACCOUNT, ro, now, now)
      db.prepare(
        `INSERT INTO sync_state (calendar_id, sync_token, updated_at) VALUES (?, 'tok', ?)`
      ).run(id, now)
    }

    const repo = new EventsRepo(db)
    const master = repo.createEvent({
      calendarId: CAL_A,
      title: 'Weekly',
      dtStartUtc: '2026-03-02T09:00:00.000Z',
      dtEndUtc: '2026-03-02T09:30:00.000Z',
      rrule: 'FREQ=WEEKLY;BYDAY=MO'
    })
    db.prepare("UPDATE events SET etag = 'e1', dirty = 1, has_conflict = 1 WHERE id = ?").run(
      master.id
    )
    repo.upsertException({
      masterEventId: master.id,
      originalStartUtc: '2026-03-09T09:00:00.000Z',
      isCancelled: true
    })
    db.prepare("UPDATE event_exceptions SET etag = 'x1', provider_instance_id = 'inst'").run()
  })

  it('keeps every calendar and event', () => {
    const before = {
      cals: count('SELECT COUNT(*) c FROM calendars'),
      events: count('SELECT COUNT(*) c FROM events'),
      exceptions: count('SELECT COUNT(*) c FROM event_exceptions')
    }

    const result = detachAccount(db, GOOGLE_ACCOUNT)

    expect(result.success).toBe(true)
    expect(result.calendarCount).toBe(2)
    expect(result.eventCount).toBe(1)
    expect(count('SELECT COUNT(*) c FROM calendars')).toBe(before.cals)
    expect(count('SELECT COUNT(*) c FROM events')).toBe(before.events)
    expect(count('SELECT COUNT(*) c FROM event_exceptions')).toBe(before.exceptions)
  })

  it('re-homes the calendars onto the local account', () => {
    detachAccount(db, GOOGLE_ACCOUNT)

    expect(count('SELECT COUNT(*) c FROM calendars WHERE account_id = ?', LOCAL_ACCOUNT_ID)).toBe(3)
    expect(count('SELECT COUNT(*) c FROM calendars WHERE account_id = ?', GOOGLE_ACCOUNT)).toBe(0)
  })

  it('removes the account and its stored token only after re-homing', () => {
    detachAccount(db, GOOGLE_ACCOUNT)

    expect(count('SELECT COUNT(*) c FROM accounts WHERE id = ?', GOOGLE_ACCOUNT)).toBe(0)
    expect(count('SELECT COUNT(*) c FROM settings WHERE key = ?', `token:${GOOGLE_ACCOUNT}`)).toBe(0)
    // The cascade had nothing left to take.
    expect(count('SELECT COUNT(*) c FROM events')).toBe(1)
  })

  it('makes a read-only provider calendar editable', () => {
    detachAccount(db, GOOGLE_ACCOUNT)

    const ro = db
      .prepare('SELECT is_read_only FROM calendars WHERE id = ?')
      .get<{ is_read_only: number }>(CAL_RO)
    expect(ro?.is_read_only).toBe(0)

    // And the repo's write guard agrees.
    expect(() =>
      new EventsRepo(db).createEvent({
        calendarId: CAL_RO,
        title: 'Now editable',
        dtStartUtc: '2026-04-01T09:00:00.000Z',
        dtEndUtc: '2026-04-01T10:00:00.000Z'
      })
    ).not.toThrow()
  })

  it('clears sync bookkeeping so nothing queues for a provider that is gone', () => {
    detachAccount(db, GOOGLE_ACCOUNT)

    expect(count('SELECT COUNT(*) c FROM events WHERE etag IS NOT NULL')).toBe(0)
    expect(count('SELECT COUNT(*) c FROM events WHERE dirty = 1')).toBe(0)
    expect(count('SELECT COUNT(*) c FROM events WHERE has_conflict = 1')).toBe(0)
    expect(count('SELECT COUNT(*) c FROM event_exceptions WHERE etag IS NOT NULL')).toBe(0)
    expect(count('SELECT COUNT(*) c FROM event_exceptions WHERE dirty = 1')).toBe(0)
    expect(count('SELECT COUNT(*) c FROM event_exceptions WHERE provider_instance_id IS NOT NULL')).toBe(0)
    expect(count('SELECT COUNT(*) c FROM sync_state')).toBe(0)
  })

  it('refuses to detach the local account itself', () => {
    const result = detachAccount(db, LOCAL_ACCOUNT_ID)

    expect(result.success).toBe(false)
    expect(count('SELECT COUNT(*) c FROM accounts WHERE id = ?', LOCAL_ACCOUNT_ID)).toBe(1)
  })

  it('reports a missing account instead of throwing', () => {
    const result = detachAccount(db, 'acc_does_not_exist')
    expect(result.success).toBe(false)
    expect(result.message).toMatch(/not found/i)
  })

  it('is idempotent - detaching twice is not destructive', () => {
    detachAccount(db, GOOGLE_ACCOUNT)
    const second = detachAccount(db, GOOGLE_ACCOUNT)

    expect(second.success).toBe(false)
    expect(count('SELECT COUNT(*) c FROM events')).toBe(1)
    expect(count('SELECT COUNT(*) c FROM calendars')).toBe(3)
  })
})
