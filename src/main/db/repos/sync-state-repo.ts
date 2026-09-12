import type { ISqliteDatabase } from '../sqlite-driver'

export interface CalendarSyncState {
  calendarId: string
  syncToken: string | null
  syncStatus: string
  errorMessage: string | null
  lastSyncedAt: string | null
  updatedAt: string | null
}

/**
 * Per-calendar sync bookkeeping.
 *
 * `sync_state` has carried `sync_status`, `error_message` and `last_synced_at`
 * since migration 001, but nothing ever wrote them: a calendar that failed to
 * pull did so through a `console.error` that goes nowhere once the app is
 * launched from a desktop entry, so "sync silently does nothing" was
 * undiagnosable from outside. Recording the outcome here makes the last failure
 * for each calendar readable from the database and surfaceable in the UI.
 */
export class SyncStateRepo {
  constructor(private db: ISqliteDatabase) {}

  getSyncToken(calendarId: string): string | null {
    const row = this.db
      .prepare('SELECT sync_token FROM sync_state WHERE calendar_id = ?')
      .get<{ sync_token: string | null }>(calendarId)
    return row?.sync_token ?? null
  }

  clearSyncToken(calendarId: string): void {
    this.db
      .prepare('UPDATE sync_state SET sync_token = NULL WHERE calendar_id = ?')
      .run(calendarId)
  }

  saveSyncToken(calendarId: string, token: string): void {
    this.db
      .prepare(
        `INSERT INTO sync_state (calendar_id, sync_token, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(calendar_id) DO UPDATE SET
           sync_token = excluded.sync_token,
           updated_at = excluded.updated_at`
      )
      .run(calendarId, token, new Date().toISOString())
  }

  /** Record a completed pull. `pulled` is included in the status for triage. */
  recordSuccess(calendarId: string, pulled: number): void {
    const now = new Date().toISOString()
    this.db
      .prepare(
        `INSERT INTO sync_state (calendar_id, sync_status, error_message, last_synced_at, updated_at)
         VALUES (?, ?, NULL, ?, ?)
         ON CONFLICT(calendar_id) DO UPDATE SET
           sync_status = excluded.sync_status,
           error_message = NULL,
           last_synced_at = excluded.last_synced_at,
           updated_at = excluded.updated_at`
      )
      .run(calendarId, `ok:${pulled}`, now, now)
  }

  /**
   * Record a failed pull. The message is truncated: provider error bodies can be
   * whole HTML pages, and this column is read back into the UI.
   */
  recordFailure(calendarId: string, err: unknown): void {
    const now = new Date().toISOString()
    const raw = err instanceof Error ? err.message : String(err)
    const message = raw.length > 500 ? `${raw.slice(0, 500)}…` : raw
    this.db
      .prepare(
        `INSERT INTO sync_state (calendar_id, sync_status, error_message, updated_at)
         VALUES (?, 'error', ?, ?)
         ON CONFLICT(calendar_id) DO UPDATE SET
           sync_status = 'error',
           error_message = excluded.error_message,
           updated_at = excluded.updated_at`
      )
      .run(calendarId, message, now)
  }

  list(): CalendarSyncState[] {
    return this.db
      .prepare(
        `SELECT calendar_id, sync_token, sync_status, error_message, last_synced_at, updated_at
         FROM sync_state`
      )
      .all<{
        calendar_id: string
        sync_token: string | null
        sync_status: string
        error_message: string | null
        last_synced_at: string | null
        updated_at: string | null
      }>()
      .map((r) => ({
        calendarId: r.calendar_id,
        syncToken: r.sync_token,
        syncStatus: r.sync_status,
        errorMessage: r.error_message,
        lastSyncedAt: r.last_synced_at,
        updatedAt: r.updated_at
      }))
  }
}
