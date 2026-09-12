import { fetchWithTimeout } from './http'
import type { ISqliteDatabase } from '../db/sqlite-driver'
import { GoogleOAuthManager } from '../oauth/google-oauth'
import {
  mapGoogleEventToDomain,
  mapDomainEventToGoogle,
  type GoogleCalendarApiEvent
} from './google-event-mapper'
import { EventsRepo } from '../db/repos/events-repo'
import { SyncStateRepo } from '../db/repos/sync-state-repo'
import type { CalendarEvent, EventException, SyncResult } from '@shared/event-model'

/**
 * Start/end payload for an occurrence override, falling back to the master's
 * shape when the override only changes text.
 */
function buildInstanceTimes(
  exception: EventException,
  master: CalendarEvent
): Record<string, unknown> {
  const startIso = exception.dtStartUtc || exception.originalStartUtc
  const endIso = exception.dtEndUtc || master.dtEndUtc
  if (master.allDay) {
    return {
      start: { date: startIso.split('T')[0] },
      end: { date: endIso.split('T')[0] }
    }
  }
  const tz = exception.tzid || master.tzid || 'UTC'
  return {
    start: { dateTime: startIso, timeZone: tz },
    end: { dateTime: endIso, timeZone: tz }
  }
}

const GOOGLE_API_BASE = 'https://www.googleapis.com/calendar/v3'
/** Events requested per page; Google's own maximum for events.list. */
const PAGE_SIZE = 250
/** Safety stop so a pathological calendar cannot spin forever. */
const MAX_SYNC_PAGES = 200

export class GoogleSyncEngine {
  private oauthManager: GoogleOAuthManager
  private eventsRepo: EventsRepo
  private syncStateRepo: SyncStateRepo

  constructor(private db: ISqliteDatabase) {
    this.oauthManager = new GoogleOAuthManager(db)
    this.eventsRepo = new EventsRepo(db)
    this.syncStateRepo = new SyncStateRepo(db)
  }

  /**
   * Sync calendar list from Google
   */
  async syncCalendarList(accountId: string, accessToken: string): Promise<string[]> {
    const res = await fetchWithTimeout(`${GOOGLE_API_BASE}/users/me/calendarList`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })

    if (!res.ok) {
      throw new Error(`Failed to fetch Google calendars: ${await res.text()}`)
    }

    const data = await res.json()
    const items = data.items || []
    const now = new Date().toISOString()
    const syncedCalIds: string[] = []

    for (const item of items) {
      const isReadOnly = item.accessRole === 'reader' || item.accessRole === 'freeBusyReader'
      const isPrimary = item.primary === true
      const color = item.backgroundColor || '#4285f4'
      const name = item.summary || 'Google Calendar'

      const existingCal = this.db
        .prepare('SELECT id FROM calendars WHERE id = ?')
        .get<{ id: string }>(item.id)

      if (!existingCal) {
        this.db
          .prepare(
            `INSERT INTO calendars (id, account_id, name, color, is_visible, is_read_only, is_default, created_at, updated_at)
             VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?)`
          )
          .run(item.id, accountId, name, color, isReadOnly ? 1 : 0, isPrimary ? 1 : 0, now, now)
      } else {
        this.db
          .prepare(
            `UPDATE calendars SET name = ?, color = ?, is_read_only = ?, updated_at = ?
             WHERE id = ?`
          )
          .run(name, color, isReadOnly ? 1 : 0, now, item.id)
      }

      syncedCalIds.push(item.id)
    }

    return syncedCalIds
  }

  /**
   * Pull incremental events for a calendar using syncToken
   */
  async pullCalendarEvents(
    calendarId: string,
    accessToken: string
  ): Promise<{ pulledCount: number }> {
    const storedToken = this.syncStateRepo.getSyncToken(calendarId)

    const baseUrl = `${GOOGLE_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events?singleEvents=false&maxResults=${PAGE_SIZE}`
    let queryUrl = storedToken ? `${baseUrl}&syncToken=${encodeURIComponent(storedToken)}` : baseUrl

    let pageToken: string | undefined
    let pulledCount = 0
    let pages = 0
    let resyncedAfterGone = false

    // Walk every page. Google caps a response at maxResults and hands back a
    // nextPageToken; it only emits nextSyncToken on the FINAL page. Reading one
    // page and stopping therefore capped a calendar at maxResults events AND
    // never stored a sync token, so each poll refetched the same first page
    // forever and the rest of the calendar never arrived.
    for (;;) {
      const pageUrl = pageToken
        ? `${queryUrl}&pageToken=${encodeURIComponent(pageToken)}`
        : queryUrl

      const res = await fetchWithTimeout(pageUrl, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })

      // 410 Gone: the stored syncToken is no longer valid. Drop it and restart
      // from the first page of a full listing (once - a second 410 is a real error).
      if (res.status === 410 && !resyncedAfterGone) {
        resyncedAfterGone = true
        this.syncStateRepo.clearSyncToken(calendarId)
        queryUrl = baseUrl
        pageToken = undefined
        pulledCount = 0
        continue
      }

      if (!res.ok) {
        throw new Error(`Google event pull failed for ${calendarId}: ${await res.text()}`)
      }

      const data = await res.json()
      pulledCount += this.applyPulledPage(calendarId, data)

      pageToken = data.nextPageToken
      if (!pageToken) break
      if (++pages >= MAX_SYNC_PAGES) {
        console.warn(
          `Google pull for ${calendarId} stopped at ${MAX_SYNC_PAGES} pages; remaining events follow next sync`
        )
        break
      }
    }

    return { pulledCount }
  }

  /** Apply one page of listing results. Returns how many rows it touched. */
  private applyPulledPage(calendarId: string, data: any): number {
    const items: GoogleCalendarApiEvent[] = data.items || []
    let pulledCount = 0

    // Database transaction to apply batch updates
    this.db.transaction(() => {
      for (const gEvent of items) {
        const mapped = mapGoogleEventToDomain(gEvent, calendarId)

        if (mapped.isException && mapped.exception) {
          // Occurrence exception
          const now = new Date().toISOString()
          const exc = mapped.exception
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
                updated_at = excluded.updated_at
              WHERE event_exceptions.dirty = 0`
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
          // Master event
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
                updated_at = excluded.updated_at
              WHERE events.dirty = 0 AND events.has_conflict = 0`
            )
            .run(
              evt.id,
              evt.calendarId,
              evt.uid || `${evt.id}@google.com`,
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

    // Only the final page carries a sync token; store it outside the row loop.
    if (data.nextSyncToken) {
      this.syncStateRepo.saveSyncToken(calendarId, data.nextSyncToken)
    }

    return pulledCount
  }

  /**
   * Push local dirty modifications to Google Calendar
   */
  async pushDirtyEvents(
    calendarId: string,
    accessToken: string
  ): Promise<{ pushedCount: number; errorCount: number }> {
    const dirtyRows = this.db
      .prepare('SELECT * FROM events WHERE calendar_id = ? AND dirty = 1 AND has_conflict = 0')
      .all<any>(calendarId)

    let pushedCount = 0
    let errorCount = 0

    for (const row of dirtyRows) {
      try {
        const isDeleted = row.is_deleted === 1
        const googleEventId = row.id

        if (isDeleted) {
          // DELETE
          const delRes = await fetchWithTimeout(
            `${GOOGLE_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`,
            {
              method: 'DELETE',
              headers: row.etag
                ? { Authorization: `Bearer ${accessToken}`, 'If-Match': row.etag }
                : { Authorization: `Bearer ${accessToken}` }
            }
          )

          if (delRes.ok || delRes.status === 404 || delRes.status === 410) {
            this.db.prepare('DELETE FROM events WHERE id = ?').run(row.id)
            pushedCount++
          } else if (delRes.status === 412) {
            // Someone edited the event remotely after our last pull. Surface it
            // rather than deleting their change; the row stays out of the push
            // set until the user resolves.
            console.warn(`Conflict deleting event ${row.id}: ETag precondition failed (412)`)
            this.db.prepare('UPDATE events SET has_conflict = 1 WHERE id = ?').run(row.id)
            errorCount++
          } else {
            errorCount++
          }
        } else {
          // INSERT or UPDATE
          const payload = mapDomainEventToGoogle({
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
            color: row.color,
            meetingUrl: row.meeting_url,
            etag: row.etag
          } as any)

          let putRes: Response
          if (row.etag) {
            // Existing event update
            putRes = await fetchWithTimeout(
              `${GOOGLE_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`,
              {
                method: 'PUT',
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                  // Optimistic concurrency. Google honours the precondition
                  // only as a header - an etag in the request body is ignored,
                  // so without this the 412 branch below is unreachable.
                  'If-Match': row.etag
                },
                body: JSON.stringify(payload)
              }
            )
          } else {
            // New event insertion
            putRes = await fetchWithTimeout(
              `${GOOGLE_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
              }
            )
          }

          if (putRes.ok) {
            const resJson = await putRes.json()
            const now = new Date().toISOString()
            if (resJson.id && resJson.id !== row.id) {
              this.db
                .prepare('UPDATE event_exceptions SET master_event_id = ? WHERE master_event_id = ?')
                .run(resJson.id, row.id)
              this.db
                .prepare(
                  `UPDATE events SET id = ?, etag = ?, dirty = 0, has_conflict = 0, updated_at = ? WHERE id = ?`
                )
                .run(resJson.id, resJson.etag, now, row.id)
            } else {
              this.db
                .prepare(`UPDATE events SET etag = ?, dirty = 0, has_conflict = 0, updated_at = ? WHERE id = ?`)
                .run(resJson.etag || row.etag, now, row.id)
            }
            pushedCount++
          } else if (putRes.status === 412) {
            // Precondition failed (ETag conflict): preserve local dirty row, surface it
            // as a resolvable conflict instead of retrying (and failing) forever.
            console.warn(`Conflict on event ${row.id}: ETag precondition failed (412)`)
            this.db.prepare('UPDATE events SET has_conflict = 1 WHERE id = ?').run(row.id)
            errorCount++
          } else {
            errorCount++
          }
        }
      } catch (err) {
        console.error(`Failed to push dirty event ${row.id}:`, err)
        errorCount++
      }
    }

    const excRes = await this.pushDirtyExceptions(calendarId, accessToken)
    return {
      pushedCount: pushedCount + excRes.pushedCount,
      errorCount: errorCount + excRes.errorCount
    }
  }

  /**
   * Push per-occurrence overrides and cancellations.
   *
   * Google models these as separate event resources reachable through the
   * master's /instances collection, so each one has to be resolved to its own
   * instance id and PATCHed there - a PUT of the master carries no occurrence
   * information at all. The resolved id is cached on the row so later edits
   * skip the lookup.
   */
  private async pushDirtyExceptions(
    calendarId: string,
    accessToken: string
  ): Promise<{ pushedCount: number; errorCount: number }> {
    const pending = this.eventsRepo.listDirtyExceptions(calendarId)
    let pushedCount = 0
    let errorCount = 0

    for (const { exception, master, providerInstanceId } of pending) {
      try {
        let instanceId = providerInstanceId
        if (!instanceId) {
          instanceId = await this.findInstanceId(
            calendarId,
            master.id,
            exception.originalStartUtc,
            accessToken
          )
        }
        if (!instanceId) {
          // The series may not have propagated yet; leave it dirty and retry.
          errorCount++
          continue
        }

        const body: Record<string, unknown> = exception.isCancelled
          ? { status: 'cancelled' }
          : {
              summary: exception.title || master.title,
              description: exception.notes ?? master.notes ?? undefined,
              location: exception.location ?? master.location ?? undefined,
              ...buildInstanceTimes(exception, master)
            }

        const res = await fetchWithTimeout(
          `${GOOGLE_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(instanceId)}`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
          }
        )

        if (res.ok) {
          const json = await res.json().catch(() => ({}))
          this.eventsRepo.markExceptionSynced(exception.id, instanceId, json?.etag ?? null)
          pushedCount++
        } else {
          console.warn(
            `Failed to push occurrence override ${exception.id}: HTTP ${res.status}`
          )
          errorCount++
        }
      } catch (err) {
        console.error(`Failed to push occurrence override ${exception.id}:`, err)
        errorCount++
      }
    }

    return { pushedCount, errorCount }
  }

  /** Resolve a master + original start time to Google's own id for that instance. */
  private async findInstanceId(
    calendarId: string,
    masterEventId: string,
    originalStartUtc: string,
    accessToken: string
  ): Promise<string | null> {
    // A one-second window either side is enough to isolate the occurrence while
    // tolerating sub-second representation differences.
    const origin = new Date(originalStartUtc)
    const timeMin = new Date(origin.getTime() - 1000).toISOString()
    const timeMax = new Date(origin.getTime() + 1000).toISOString()

    const res = await fetchWithTimeout(
      `${GOOGLE_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(masterEventId)}/instances` +
        `?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&showDeleted=true&maxResults=10`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    if (!res.ok) return null

    const data = await res.json()
    const items: GoogleCalendarApiEvent[] = data.items || []
    const targetMs = origin.getTime()

    for (const item of items) {
      const raw = item.originalStartTime?.dateTime || item.originalStartTime?.date
      if (!raw) continue
      if (Math.abs(new Date(raw).getTime() - targetMs) < 1000) return item.id
    }
    return items[0]?.id ?? null
  }

  /**
   * Sync all Google accounts
   */
  async syncAll(clientId?: string, clientSecret?: string): Promise<SyncResult> {
    const activeGoogleAccounts = this.db
      .prepare("SELECT * FROM accounts WHERE type = 'google' AND is_active = 1")
      .all<any>()

    if (activeGoogleAccounts.length === 0) {
      return { success: true, pulledCount: 0, pushedCount: 0, errorCount: 0, message: 'No Google accounts connected' }
    }

    let totalPulled = 0
    let totalPushed = 0
    let totalErrors = 0

    for (const acc of activeGoogleAccounts) {
      try {
        const token = await this.oauthManager.getValidAccessToken(acc.id, clientId || '', clientSecret)
        const calendarIds = await this.syncCalendarList(acc.id, token)

        for (const calId of calendarIds) {
          // Isolate each calendar. Some entries the calendar list returns are not
          // real event collections (Google's "Tasks" pseudo-calendar, for one) and
          // reject the events endpoint; without this, the first such calendar threw
          // and every remaining calendar on the account was silently skipped.
          try {
            const pushRes = await this.pushDirtyEvents(calId, token)
            totalPushed += pushRes.pushedCount
            totalErrors += pushRes.errorCount

            const pullRes = await this.pullCalendarEvents(calId, token)
            totalPulled += pullRes.pulledCount
            this.syncStateRepo.recordSuccess(calId, pullRes.pulledCount)
          } catch (calErr: any) {
            console.error(`Google sync failed for calendar ${calId}:`, calErr)
            this.syncStateRepo.recordFailure(calId, calErr)
            totalErrors++
          }
        }
      } catch (err: any) {
        console.error(`Sync failed for account ${acc.id}:`, err)
        totalErrors++
      }
    }

    return {
      success: totalErrors === 0,
      pulledCount: totalPulled,
      pushedCount: totalPushed,
      errorCount: totalErrors,
      message: `Sync finished: pulled ${totalPulled}, pushed ${totalPushed}`
    }
  }
}
