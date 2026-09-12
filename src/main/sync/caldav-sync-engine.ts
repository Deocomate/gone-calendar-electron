import type { ISqliteDatabase } from '../db/sqlite-driver'
import { SecureStore } from '../secure-store'
import { CalDavAdapter, type CalDavCredentials } from './caldav-adapter'
import { parseIcsContent } from '../ics/parse-ics'
import { EventsRepo } from '../db/repos/events-repo'
import type { Calendar, SyncResult } from '@shared/event-model'

export class CalDavSyncEngine {
  private secureStore: SecureStore
  private eventsRepo: EventsRepo

  constructor(private db: ISqliteDatabase) {
    this.secureStore = new SecureStore(db)
    this.eventsRepo = new EventsRepo(db)
  }

  /**
   * Sync calendar list from CalDAV server
   */
  async syncCalendarList(accountId: string, creds: CalDavCredentials): Promise<string[]> {
    const adapter = new CalDavAdapter(creds)
    const descriptors = await adapter.discoverCalendars()
    const now = new Date().toISOString()
    const syncedCalIds: string[] = []

    for (const desc of descriptors) {
      const calId = desc.href
      const name = desc.displayName || 'CalDAV Calendar'
      const color = desc.color || '#10b981'
      const isReadOnly = desc.isReadOnly === true

      const existing = this.db
        .prepare('SELECT id FROM calendars WHERE id = ?')
        .get<{ id: string }>(calId)

      if (!existing) {
        this.db
          .prepare(
            `INSERT INTO calendars (id, account_id, name, color, is_visible, is_read_only, is_default, created_at, updated_at)
             VALUES (?, ?, ?, ?, 1, ?, 0, ?, ?)`
          )
          .run(calId, accountId, name, color, isReadOnly ? 1 : 0, now, now)
      } else {
        this.db
          .prepare(
            `UPDATE calendars SET name = ?, color = ?, is_read_only = ?, updated_at = ? WHERE id = ?`
          )
          .run(name, color, isReadOnly ? 1 : 0, now, calId)
      }

      syncedCalIds.push(calId)
    }

    return syncedCalIds
  }

  /**
   * Pull events from a CalDAV calendar collection
   */
  async pullCalendarEvents(
    calendarId: string,
    creds: CalDavCredentials
  ): Promise<{ pulledCount: number }> {
    const adapter = new CalDavAdapter(creds)
    const { rawIcsList } = await adapter.pullCalendarEvents(calendarId)
    let pulledCount = 0

    this.db.transaction(() => {
      for (const item of rawIcsList) {
        try {
          const parsed = parseIcsContent(item.ics, calendarId)
          const now = new Date().toISOString()

          for (const evt of parsed.events) {
            const eventId = evt.uid || `evt_${Math.random().toString(36).slice(2, 10)}`
            this.db
              .prepare(
                `INSERT INTO events (
                  id, calendar_id, uid, title, notes, location,
                  dtstart_utc, dtend_utc, tzid, all_day, rrule, color,
                  meeting_url, etag, dirty, is_deleted, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                  title = excluded.title,
                  notes = excluded.notes,
                  location = excluded.location,
                  dtstart_utc = excluded.dtstart_utc,
                  dtend_utc = excluded.dtend_utc,
                  tzid = excluded.tzid,
                  all_day = excluded.all_day,
                  rrule = excluded.rrule,
                  color = excluded.color,
                  meeting_url = excluded.meeting_url,
                  etag = excluded.etag,
                  dirty = 0,
                  is_deleted = 0,
                  updated_at = excluded.updated_at
                WHERE events.dirty = 0 AND events.has_conflict = 0`
              )
              .run(
                eventId,
                calendarId,
                evt.uid || eventId,
                evt.title,
                evt.notes || null,
                evt.location || null,
                evt.dtStartUtc,
                evt.dtEndUtc,
                evt.tzid || 'UTC',
                evt.allDay ? 1 : 0,
                evt.rrule || null,
                evt.color || null,
                evt.meetingUrl || null,
                item.etag || null,
                now,
                now
              )
            pulledCount++
          }
        } catch (err) {
          console.warn(`Failed to parse CalDAV item at ${item.href}:`, err)
        }
      }
    })()

    return { pulledCount }
  }

  /**
   * Push local dirty modifications to CalDAV server
   */
  async pushDirtyEvents(
    calendarId: string,
    creds: CalDavCredentials
  ): Promise<{ pushedCount: number; errorCount: number }> {
    const adapter = new CalDavAdapter(creds)
    const calRow = this.db
      .prepare('SELECT * FROM calendars WHERE id = ?')
      .get<any>(calendarId)

    if (!calRow) return { pushedCount: 0, errorCount: 0 }

    const calendar: Calendar = {
      id: calRow.id,
      accountId: calRow.account_id,
      name: calRow.name,
      color: calRow.color,
      isVisible: calRow.is_visible === 1,
      isReadOnly: calRow.is_read_only === 1,
      isDefault: calRow.is_default === 1,
      createdAt: calRow.created_at,
      updatedAt: calRow.updated_at
    }

    const dirtyRows = this.db
      .prepare('SELECT * FROM events WHERE calendar_id = ? AND dirty = 1 AND has_conflict = 0')
      .all<any>(calendarId)

    // A series whose master is clean but which has a pending occurrence override
    // or cancellation still needs re-PUTting: CalDAV keeps the whole series in
    // one resource, so the exception rides along with the master.
    const dirtyIds = new Set(dirtyRows.map((r) => r.id))
    for (const master of this.eventsRepo.listMastersWithDirtyExceptions(calendarId)) {
      if (dirtyIds.has(master.id)) continue
      const row = this.db.prepare('SELECT * FROM events WHERE id = ?').get<any>(master.id)
      if (row) dirtyRows.push(row)
    }

    let pushedCount = 0
    let errorCount = 0

    for (const row of dirtyRows) {
      try {
        const isDeleted = row.is_deleted === 1

        if (isDeleted) {
          const ok = await adapter.deleteEvent(calendarId, row.uid || row.id)
          if (ok) {
            this.db.prepare('DELETE FROM events WHERE id = ?').run(row.id)
            pushedCount++
          } else {
            errorCount++
          }
        } else {
          const pushRes = await adapter.pushEvent(
            calendar,
            {
              id: row.id,
              calendarId: row.calendar_id,
              uid: row.uid,
              title: row.title,
              notes: row.notes,
              location: row.location,
              dtStartUtc: row.dtstart_utc,
              dtEndUtc: row.dtend_utc,
              tzid: row.tzid,
              allDay: row.all_day === 1,
              rrule: row.rrule,
              exdate: row.exdate,
              color: row.color,
              meetingUrl: row.meeting_url,
              etag: row.etag,
              dirty: false,
              isDeleted: false,
              createdAt: row.created_at,
              updatedAt: row.updated_at
            },
            this.eventsRepo.getExceptionsForEvent(row.id)
          )

          if (pushRes.success) {
            const now = new Date().toISOString()
            this.db
              .prepare('UPDATE events SET etag = ?, dirty = 0, has_conflict = 0, updated_at = ? WHERE id = ?')
              .run(pushRes.etag || row.etag, now, row.id)
            this.eventsRepo.markExceptionsSyncedForMaster(row.id)
            pushedCount++
          } else if (pushRes.conflict) {
            console.warn(`ETag conflict on CalDAV event ${row.id}`)
            this.db.prepare('UPDATE events SET has_conflict = 1 WHERE id = ?').run(row.id)
            errorCount++
          } else {
            errorCount++
          }
        }
      } catch (err) {
        console.error(`Failed to push CalDAV event ${row.id}:`, err)
        errorCount++
      }
    }

    return { pushedCount, errorCount }
  }

  /**
   * Sync all connected CalDAV accounts
   */
  async syncAll(): Promise<SyncResult> {
    const activeAccounts = this.db
      .prepare("SELECT * FROM accounts WHERE type = 'caldav' AND is_active = 1")
      .all<any>()

    if (activeAccounts.length === 0) {
      return { success: true, pulledCount: 0, pushedCount: 0, errorCount: 0, message: 'No CalDAV accounts connected' }
    }

    let totalPulled = 0
    let totalPushed = 0
    let totalErrors = 0

    for (const acc of activeAccounts) {
      try {
        const creds = this.secureStore.getToken<CalDavCredentials>(acc.id)
        if (!creds) continue

        const calendarIds = await this.syncCalendarList(acc.id, creds)
        for (const calId of calendarIds) {
          const pushRes = await this.pushDirtyEvents(calId, creds)
          totalPushed += pushRes.pushedCount
          totalErrors += pushRes.errorCount

          const pullRes = await this.pullCalendarEvents(calId, creds)
          totalPulled += pullRes.pulledCount
        }
      } catch (err: any) {
        console.error(`CalDAV sync failed for account ${acc.id}:`, err)
        totalErrors++
      }
    }

    return {
      success: totalErrors === 0,
      pulledCount: totalPulled,
      pushedCount: totalPushed,
      errorCount: totalErrors,
      message: `CalDAV sync finished: pulled ${totalPulled}, pushed ${totalPushed}`
    }
  }
}
