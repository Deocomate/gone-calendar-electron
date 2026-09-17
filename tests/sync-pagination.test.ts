import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createSqliteDriver, type ISqliteDatabase } from '../src/main/db/sqlite-driver'
import { runMigrations, seedDefaultData } from '../src/main/db/database'
import { GoogleSyncEngine } from '../src/main/sync/google-sync-engine'
import { MicrosoftSyncEngine } from '../src/main/sync/microsoft-sync-engine'

/**
 * Both pull paths used to read a single page and stop, capping every calendar at
 * the page size. For Google it compounded: nextSyncToken only appears on the
 * final page, so a calendar larger than one page never stored a token and every
 * later poll refetched page one forever.
 */

const CAL = 'cal_paged'

function googleEvent(id: string, day: number) {
  return {
    id,
    status: 'confirmed',
    summary: `Event ${id}`,
    start: { dateTime: `2026-04-${String(day).padStart(2, '0')}T09:00:00Z` },
    end: { dateTime: `2026-04-${String(day).padStart(2, '0')}T10:00:00Z` },
    etag: `"etag-${id}"`
  }
}

function graphEvent(id: string, day: number) {
  return {
    id,
    subject: `Event ${id}`,
    start: { dateTime: `2026-04-${String(day).padStart(2, '0')}T09:00:00.0000000`, timeZone: 'UTC' },
    end: { dateTime: `2026-04-${String(day).padStart(2, '0')}T10:00:00.0000000`, timeZone: 'UTC' },
    '@odata.etag': `W/"etag-${id}"`
  }
}

function seedCalendar(db: ISqliteDatabase): void {
  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO calendars (id, account_id, name, color, is_visible, is_read_only, is_default, created_at, updated_at)
     VALUES (?, 'account-local-primary', 'Paged', '#000000', 1, 0, 0, ?, ?)`
  ).run(CAL, now, now)
}

function jsonResponse(body: unknown): Response {
  return { ok: true, status: 200, json: async () => body, text: async () => '' } as Response
}

describe('provider pull pagination', () => {
  let db: ISqliteDatabase

  beforeEach(() => {
    db = createSqliteDriver(':memory:')
    runMigrations(db)
    seedDefaultData(db)
    seedCalendar(db)
  })

  afterEach(() => vi.unstubAllGlobals())

  it('follows Google nextPageToken across every page', async () => {
    const calls: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        calls.push(url)
        if (!url.includes('pageToken')) {
          return jsonResponse({ items: [googleEvent('g1', 1), googleEvent('g2', 2)], nextPageToken: 'p2' })
        }
        if (url.includes('pageToken=p2')) {
          return jsonResponse({ items: [googleEvent('g3', 3)], nextPageToken: 'p3' })
        }
        // Final page: this is the only one carrying nextSyncToken.
        return jsonResponse({ items: [googleEvent('g4', 4)], nextSyncToken: 'sync-final' })
      })
    )

    const res = await new GoogleSyncEngine(db).pullCalendarEvents(CAL, 'token')

    expect(res.pulledCount).toBe(4)
    expect(calls).toHaveLength(3)
    expect(db.prepare('SELECT COUNT(*) c FROM events WHERE calendar_id = ?').get<{ c: number }>(CAL)!.c).toBe(4)

    // The token from the last page must be stored, or the next poll restarts.
    const tok = db
      .prepare('SELECT sync_token FROM sync_state WHERE calendar_id = ?')
      .get<{ sync_token: string }>(CAL)
    expect(tok?.sync_token).toBe('sync-final')
  })

  it('drops an invalidated Google syncToken and restarts a full listing', async () => {
    db.prepare(
      `INSERT INTO sync_state (calendar_id, sync_token, updated_at) VALUES (?, 'stale', '')`
    ).run(CAL)

    const calls: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        calls.push(url)
        if (url.includes('syncToken=stale')) {
          return { ok: false, status: 410, json: async () => ({}), text: async () => 'Gone' } as Response
        }
        return jsonResponse({ items: [googleEvent('g1', 1)], nextSyncToken: 'fresh' })
      })
    )

    const res = await new GoogleSyncEngine(db).pullCalendarEvents(CAL, 'token')

    expect(res.pulledCount).toBe(1)
    expect(calls[0]).toContain('syncToken=stale')
    expect(calls[1]).not.toContain('syncToken')
    expect(
      db.prepare('SELECT sync_token FROM sync_state WHERE calendar_id = ?').get<{ sync_token: string }>(CAL)
        ?.sync_token
    ).toBe('fresh')
  })

  it('follows Graph @odata.nextLink across every page', async () => {
    const calls: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        calls.push(url)
        if (!url.includes('skip')) {
          return jsonResponse({
            value: [graphEvent('m1', 1), graphEvent('m2', 2)],
            '@odata.nextLink': 'https://graph.microsoft.com/v1.0/me/events?$skip=2'
          })
        }
        return jsonResponse({ value: [graphEvent('m3', 3)] })
      })
    )

    const res = await new MicrosoftSyncEngine(db).pullCalendarEvents(CAL, 'token')

    expect(res.pulledCount).toBe(3)
    expect(calls).toHaveLength(2)
    expect(db.prepare('SELECT COUNT(*) c FROM events WHERE calendar_id = ?').get<{ c: number }>(CAL)!.c).toBe(3)
  })

  it('keeps syncing other calendars when one rejects the events endpoint', async () => {
    const now = new Date().toISOString()
    db.prepare(
      `INSERT INTO accounts (id, type, name, email, is_active, created_at, updated_at)
       VALUES ('acc_g', 'google', 'G', 'g@example.com', 1, ?, ?)`
    ).run(now, now)

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('calendarList')) {
          return jsonResponse({
            items: [
              { id: 'cal_bad', summary: 'Tasks', accessRole: 'owner' },
              { id: 'cal_good', summary: 'Work', accessRole: 'owner' }
            ]
          })
        }
        if (url.includes('cal_bad')) {
          return { ok: false, status: 403, json: async () => ({}), text: async () => 'Forbidden' } as Response
        }
        return jsonResponse({ items: [googleEvent('g1', 1)], nextSyncToken: 's' })
      })
    )

    const engine = new GoogleSyncEngine(db)
    vi.spyOn(engine['oauthManager'], 'getValidAccessToken').mockResolvedValue('token')

    const res = await engine.syncAll('client-id', 'secret')

    // The bad calendar is counted as an error but must not abandon the good one.
    expect(res.errorCount).toBeGreaterThan(0)
    expect(db.prepare('SELECT COUNT(*) c FROM events WHERE calendar_id = ?').get<{ c: number }>('cal_good')!.c).toBe(1)
  })
})
