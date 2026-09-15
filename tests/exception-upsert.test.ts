import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createSqliteDriver, type ISqliteDatabase } from '../src/main/db/sqlite-driver'
import { runMigrations, seedDefaultData } from '../src/main/db/database'
import { GoogleSyncEngine } from '../src/main/sync/google-sync-engine'

/**
 * `idx_event_exceptions_master` was created non-unique in migration 001, but
 * both provider pulls upsert onto those columns with ON CONFLICT. SQLite needs a
 * UNIQUE index for that, so every page containing a recurring-occurrence
 * exception threw, rolled back its transaction, and aborted the calendar -
 * leaving calendars stuck at whole-page multiples or at zero. Nothing caught it
 * because no test ever pulled a page containing an exception.
 */

const CAL = 'cal_exc'

function jsonResponse(body: unknown): Response {
  return { ok: true, status: 200, json: async () => body, text: async () => '' } as Response
}

/** A recurring master plus an override of one of its occurrences. */
function pageWithException() {
  return {
    items: [
      {
        id: 'master-1',
        status: 'confirmed',
        summary: 'Weekly sync',
        start: { dateTime: '2026-04-06T09:00:00Z' },
        end: { dateTime: '2026-04-06T10:00:00Z' },
        recurrence: ['RRULE:FREQ=WEEKLY;BYDAY=MO'],
        etag: '"m1"'
      },
      {
        id: 'master-1_20260413T090000Z',
        status: 'confirmed',
        summary: 'Weekly sync (moved)',
        recurringEventId: 'master-1',
        originalStartTime: { dateTime: '2026-04-13T09:00:00Z' },
        start: { dateTime: '2026-04-13T11:00:00Z' },
        end: { dateTime: '2026-04-13T12:00:00Z' },
        etag: '"e1"'
      }
    ],
    nextSyncToken: 'tok'
  }
}

describe('pulling a page that contains an occurrence exception', () => {
  let db: ISqliteDatabase

  beforeEach(() => {
    db = createSqliteDriver(':memory:')
    runMigrations(db)
    seedDefaultData(db)
    const now = new Date().toISOString()
    db.prepare(
      `INSERT INTO calendars (id, account_id, name, color, is_visible, is_read_only, is_default, created_at, updated_at)
       VALUES (?, 'account-local-primary', 'Exc', '#000000', 1, 0, 0, ?, ?)`
    ).run(CAL, now, now)
  })

  afterEach(() => vi.unstubAllGlobals())

  it('enforces one exception row per (master, original start)', () => {
    const idx = db
      .prepare('PRAGMA index_list(event_exceptions)')
      .all<{ name: string; unique: number }>()
      .find((i) => i.name === 'idx_event_exceptions_master')
    expect(idx, 'idx_event_exceptions_master must exist').toBeTruthy()
    expect(idx!.unique, 'ON CONFLICT on these columns requires a UNIQUE index').toBe(1)
  })

  it('stores the exception and the master instead of rolling the page back', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(pageWithException())))

    const res = await new GoogleSyncEngine(db).pullCalendarEvents(CAL, 'token')

    // Before the fix this threw and committed nothing at all.
    expect(res.pulledCount).toBe(2)
    expect(db.prepare('SELECT COUNT(*) c FROM events WHERE calendar_id = ?').get<{ c: number }>(CAL)!.c).toBe(1)

    const exc = db
      .prepare('SELECT master_event_id, original_start_utc, dtstart_utc FROM event_exceptions')
      .all<{ master_event_id: string; original_start_utc: string; dtstart_utc: string }>()
    expect(exc).toHaveLength(1)
    expect(exc[0].master_event_id).toBe('master-1')
    expect(exc[0].original_start_utc).toContain('2026-04-13T09:00')
    expect(exc[0].dtstart_utc).toContain('2026-04-13T11:00')

    // The sync token must still land, so the next poll goes incremental.
    expect(
      db.prepare('SELECT sync_token FROM sync_state WHERE calendar_id = ?').get<{ sync_token: string }>(CAL)
        ?.sync_token
    ).toBe('tok')
  })

  it('updates the same row when the exception is pulled again', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(pageWithException())))
    const engine = new GoogleSyncEngine(db)
    await engine.pullCalendarEvents(CAL, 'token')
    await engine.pullCalendarEvents(CAL, 'token')

    // The upsert must collapse onto one row rather than duplicating it.
    expect(db.prepare('SELECT COUNT(*) c FROM event_exceptions').get<{ c: number }>()!.c).toBe(1)
  })

  it('records a per-calendar failure so a broken pull is visible', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 403, json: async () => ({}), text: async () => 'Forbidden' }) as Response)
    )
    const now = new Date().toISOString()
    db.prepare(
      `INSERT INTO accounts (id, type, name, email, is_active, created_at, updated_at)
       VALUES ('acc_g', 'google', 'G', 'g@example.com', 1, ?, ?)`
    ).run(now, now)

    const engine = new GoogleSyncEngine(db)
    vi.spyOn(engine['oauthManager'], 'getValidAccessToken').mockResolvedValue('token')
    vi.spyOn(engine, 'syncCalendarList').mockResolvedValue([CAL])

    await engine.syncAll('id', 'secret')

    const row = db
      .prepare('SELECT sync_status, error_message FROM sync_state WHERE calendar_id = ?')
      .get<{ sync_status: string; error_message: string }>(CAL)
    expect(row?.sync_status).toBe('error')
    expect(row?.error_message).toContain('Forbidden')
  })
})
