import type { ISqliteDatabase } from '../db/sqlite-driver'
import { MicrosoftOAuthManager } from '../oauth/microsoft-oauth'
import {
  mapGraphEventToDomain,
  mapDomainEventToGraph,
  type MicrosoftGraphApiEvent
} from './microsoft-event-mapper'
import type { SyncResult } from '@shared/event-model'

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0'

export class MicrosoftSyncEngine {
  private oauthManager: MicrosoftOAuthManager

  constructor(private db: ISqliteDatabase) {
    this.oauthManager = new MicrosoftOAuthManager(db)
  }

  /**
   * Sync calendars list from Microsoft Graph
   */
  async syncCalendarList(accountId: string, accessToken: string): Promise<string[]> {
    const res = await fetch(`${GRAPH_BASE}/me/calendars`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })

    if (!res.ok) {
      throw new Error(`Failed to fetch Microsoft calendars: ${await res.text()}`)
    }

    const data = await res.json()
    const items = data.value || []
    const now = new Date().toISOString()
    const syncedCalIds: string[] = []

    for (const item of items) {
      const isReadOnly = item.canEdit === false
      const isDefault = item.isDefaultCalendar === true
      const color = item.hexColor || '#0078d4'
      const name = item.name || 'Outlook Calendar'

      const existing = this.db
        .prepare('SELECT id FROM calendars WHERE id = ?')
        .get<{ id: string }>(item.id)

      if (!existing) {
        this.db
          .prepare(
            `INSERT INTO calendars (id, account_id, name, color, is_visible, is_read_only, is_default, created_at, updated_at)
             VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?)`
          )
          .run(item.id, accountId, name, color, isReadOnly ? 1 : 0, isDefault ? 1 : 0, now, now)
      } else {
        this.db
          .prepare(
            `UPDATE calendars SET name = ?, color = ?, is_read_only = ?, updated_at = ? WHERE id = ?`
          )
          .run(name, color, isReadOnly ? 1 : 0, now, item.id)
      }

      syncedCalIds.push(item.id)
    }

    return syncedCalIds
  }

  /**
   * Pull events for a Microsoft calendar
   */
  async pullCalendarEvents(
    calendarId: string,
    accessToken: string
  ): Promise<{ pulledCount: number }> {
    const url = `${GRAPH_BASE}/me/calendars/${encodeURIComponent(calendarId)}/events?$top=250`

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}`, Prefer: 'outlook.timezone="UTC"' }
    })

    if (!res.ok) {
      throw new Error(`Microsoft event pull failed for ${calendarId}: ${await res.text()}`)
    }

    const data = await res.json()
    const items: MicrosoftGraphApiEvent[] = data.value || []
    let pulledCount = 0

    this.db.transaction(() => {
      for (const gEvent of items) {
        const mapped = mapGraphEventToDomain(gEvent, calendarId)

        if (mapped.isException && mapped.exception) {
          const exc = mapped.exception
          const now = new Date().toISOString()
          const excId = `exc_${exc.masterEventId}_${exc.originalStartUtc.replace(/[:.]/g, '')}`

          this.db
            .prepare(
              `INSERT INTO event_exceptions (
                id, master_event_id, original_start_utc, is_cancelled,
                title, notes, location, dtstart_utc, dtend_utc, tzid, color,
                created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(master_event_id, original_start_utc) DO UPDATE SET
                is_cancelled = excluded.is_cancelled,
                title = excluded.title,
                notes = excluded.notes,
                location = excluded.location,
                dtstart_utc = excluded.dtstart_utc,
                dtend_utc = excluded.dtend_utc,
                tzid = excluded.tzid,
                color = excluded.color,
                updated_at = excluded.updated_at`
            )
            .run(
              excId,
              exc.masterEventId,
              exc.originalStartUtc,
              exc.isCancelled ? 1 : 0,
              exc.title || null,
              exc.notes || null,
              exc.location || null,
              exc.dtStartUtc || null,
              exc.dtEndUtc || null,
              exc.tzid || null,
              exc.color || null,
              now,
              now
            )
          pulledCount++
        } else if (mapped.event) {
          const evt = mapped.event
          const now = new Date().toISOString()

          this.db
            .prepare(
              `INSERT INTO events (
                id, calendar_id, uid, title, notes, location,
                dtstart_utc, dtend_utc, tzid, all_day, rrule, color,
                meeting_url, etag, dirty, is_deleted, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
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
                is_deleted = excluded.is_deleted,
                updated_at = excluded.updated_at`
            )
            .run(
              evt.id,
              evt.calendarId,
              evt.uid || `${evt.id}@outlook.com`,
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
              evt.etag || null,
              evt.isDeleted ? 1 : 0,
              now,
              now
            )
          pulledCount++
        }
      }
    })()

    return { pulledCount }
  }

  /**
   * Push local dirty events to Microsoft Graph
   */
  async pushDirtyEvents(
    calendarId: string,
    accessToken: string
  ): Promise<{ pushedCount: number; errorCount: number }> {
    const dirtyRows = this.db
      .prepare('SELECT * FROM events WHERE calendar_id = ? AND dirty = 1')
      .all<any>(calendarId)

    let pushedCount = 0
    let errorCount = 0

    for (const row of dirtyRows) {
      try {
        const isDeleted = row.is_deleted === 1
        const eventId = row.id

        if (isDeleted) {
          const delRes = await fetch(`${GRAPH_BASE}/me/events/${encodeURIComponent(eventId)}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${accessToken}` }
          })
          if (delRes.ok || delRes.status === 404) {
            this.db.prepare('DELETE FROM events WHERE id = ?').run(row.id)
            pushedCount++
          } else {
            errorCount++
          }
        } else {
          const payload = mapDomainEventToGraph({
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
            rrule: row.rrule
          } as any)

          let res: Response
          if (row.etag) {
            // PATCH existing
            res = await fetch(`${GRAPH_BASE}/me/events/${encodeURIComponent(eventId)}`, {
              method: 'PATCH',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(payload)
            })
          } else {
            // POST new event to calendar
            res = await fetch(`${GRAPH_BASE}/me/calendars/${encodeURIComponent(calendarId)}/events`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(payload)
            })
          }

          if (res.ok) {
            const resJson = await res.json()
            const now = new Date().toISOString()
            if (resJson.id && resJson.id !== row.id) {
              this.db
                .prepare('UPDATE event_exceptions SET master_event_id = ? WHERE master_event_id = ?')
                .run(resJson.id, row.id)
              this.db
                .prepare(
                  'UPDATE events SET id = ?, etag = ?, dirty = 0, updated_at = ? WHERE id = ?'
                )
                .run(resJson.id, resJson['@odata.etag'], now, row.id)
            } else {
              this.db
                .prepare('UPDATE events SET etag = ?, dirty = 0, updated_at = ? WHERE id = ?')
                .run(resJson['@odata.etag'] || row.etag, now, row.id)
            }
            pushedCount++
          } else if (res.status === 412) {
            console.warn(`ETag conflict on Microsoft event ${row.id}`)
            errorCount++
          } else {
            errorCount++
          }
        }
      } catch (err) {
        console.error(`Failed to push Microsoft event ${row.id}:`, err)
        errorCount++
      }
    }

    return { pushedCount, errorCount }
  }

  /**
   * Sync all Microsoft Graph accounts
   */
  async syncAll(clientId?: string, clientSecret?: string): Promise<SyncResult> {
    const activeAccounts = this.db
      .prepare("SELECT * FROM accounts WHERE type = 'graph' AND is_active = 1")
      .all<any>()

    if (activeAccounts.length === 0) {
      return { success: true, pulledCount: 0, pushedCount: 0, errorCount: 0, message: 'No Microsoft accounts connected' }
    }

    let totalPulled = 0
    let totalPushed = 0
    let totalErrors = 0

    for (const acc of activeAccounts) {
      try {
        const token = await this.oauthManager.getValidAccessToken(acc.id, clientId || '', clientSecret)
        const calendarIds = await this.syncCalendarList(acc.id, token)

        for (const calId of calendarIds) {
          const pushRes = await this.pushDirtyEvents(calId, token)
          totalPushed += pushRes.pushedCount
          totalErrors += pushRes.errorCount

          const pullRes = await this.pullCalendarEvents(calId, token)
          totalPulled += pullRes.pulledCount
        }
      } catch (err: any) {
        console.error(`Microsoft sync failed for account ${acc.id}:`, err)
        totalErrors++
      }
    }

    return {
      success: totalErrors === 0,
      pulledCount: totalPulled,
      pushedCount: totalPushed,
      errorCount: totalErrors,
      message: `Microsoft sync finished: pulled ${totalPulled}, pushed ${totalPushed}`
    }
  }
}
