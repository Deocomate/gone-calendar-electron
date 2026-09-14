import type { ISqliteDatabase } from '../sqlite-driver'
import type { DetachAccountResult } from '@shared/ipc-contract'

/** The account seeded by seedDefaultData that owns purely local calendars. */
export const LOCAL_ACCOUNT_ID = 'account-local-primary'

/**
 * Sever a provider link while keeping everything it brought in.
 *
 * Disconnecting an account only deleted its token and set `is_active = 0`. The
 * calendars kept pointing at it, and `calendars.account_id` carries
 * `ON DELETE CASCADE` - so anything that later deleted that account row would
 * take every calendar, event and exception under it with it. The data also
 * stayed marked as remote: read-only provider calendars could not be edited, and
 * rows still carried etags and sync tokens for a provider that was no longer
 * reachable.
 *
 * Detaching re-homes the calendars onto the local account and strips the sync
 * bookkeeping, so what is left is indistinguishable from calendars created here.
 * Only then is the provider account row safe to delete.
 */
export function detachAccount(db: ISqliteDatabase, accountId: string): DetachAccountResult {
  if (accountId === LOCAL_ACCOUNT_ID) {
    return {
      success: false,
      calendarCount: 0,
      eventCount: 0,
      message: 'The local account cannot be detached.'
    }
  }

  const account = db
    .prepare('SELECT id FROM accounts WHERE id = ?')
    .get<{ id: string }>(accountId)
  if (!account) {
    return { success: false, calendarCount: 0, eventCount: 0, message: 'Account not found.' }
  }

  const local = db
    .prepare('SELECT id FROM accounts WHERE id = ?')
    .get<{ id: string }>(LOCAL_ACCOUNT_ID)
  if (!local) {
    return {
      success: false,
      calendarCount: 0,
      eventCount: 0,
      message: 'No local account to detach onto.'
    }
  }

  const calendars = db
    .prepare('SELECT id FROM calendars WHERE account_id = ?')
    .all<{ id: string }>(accountId)
  const calendarIds = calendars.map((c) => c.id)

  let eventCount = 0

  db.transaction(() => {
    if (calendarIds.length > 0) {
      const placeholders = calendarIds.map(() => '?').join(',')

      eventCount = db
        .prepare(`SELECT COUNT(*) AS c FROM events WHERE calendar_id IN (${placeholders})`)
        .get<{ c: number }>(...calendarIds)!.c

      // Drop per-event sync state. `dirty = 0` matters: these rows would
      // otherwise sit in a push queue for a provider that is gone.
      db.prepare(
        `UPDATE events
         SET etag = NULL, dirty = 0, has_conflict = 0
         WHERE calendar_id IN (${placeholders})`
      ).run(...calendarIds)

      db.prepare(
        `UPDATE event_exceptions
         SET etag = NULL, dirty = 0, provider_instance_id = NULL
         WHERE master_event_id IN (
           SELECT id FROM events WHERE calendar_id IN (${placeholders})
         )`
      ).run(...calendarIds)

      db.prepare(`DELETE FROM sync_state WHERE calendar_id IN (${placeholders})`).run(...calendarIds)

      // Re-home the calendars and make them writable: a calendar that was
      // read-only upstream is just a local calendar now.
      db.prepare(
        `UPDATE calendars
         SET account_id = ?, is_read_only = 0, is_default = 0, updated_at = ?
         WHERE id IN (${placeholders})`
      ).run(LOCAL_ACCOUNT_ID, new Date().toISOString(), ...calendarIds)
    }

    // Safe only now that nothing references it; the cascade has nothing to take.
    db.prepare('DELETE FROM settings WHERE key = ?').run(`token:${accountId}`)
    db.prepare('DELETE FROM accounts WHERE id = ?').run(accountId)
  })()

  return { success: true, calendarCount: calendarIds.length, eventCount }
}
