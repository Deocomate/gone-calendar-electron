import type { ISqliteDatabase } from '../sqlite-driver'
import type {
  CalendarEvent,
  EventException,
  ExpandedOccurrence,
  CreateEventInput,
  UpdateEventInput
} from '@shared/event-model'
import { expandOccurrences } from '@shared/expand-occurrences'

export class ReadOnlyCalendarError extends Error {
  constructor(calendarId: string) {
    super(`Cannot modify events in read-only calendar: ${calendarId}`)
    this.name = 'ReadOnlyCalendarError'
  }
}

interface EventRow {
  id: string
  calendar_id: string
  uid: string
  title: string
  notes: string | null
  location: string | null
  dtstart_utc: string
  dtend_utc: string
  tzid: string
  all_day: number
  rrule: string | null
  rdate: string | null
  exdate: string | null
  color: string | null
  meeting_url: string | null
  etag: string | null
  dirty: number
  is_deleted: number
  created_at: string
  updated_at: string
}

interface ExceptionRow {
  id: string
  master_event_id: string
  original_start_utc: string
  is_cancelled: number
  title: string | null
  notes: string | null
  location: string | null
  dtstart_utc: string | null
  dtend_utc: string | null
  tzid: string | null
  color: string | null
  created_at: string
  updated_at: string
}

function mapRowToEvent(row: EventRow): CalendarEvent {
  return {
    id: row.id,
    calendarId: row.calendar_id,
    uid: row.uid,
    title: row.title,
    notes: row.notes || undefined,
    location: row.location || undefined,
    dtStartUtc: row.dtstart_utc,
    dtEndUtc: row.dtend_utc,
    tzid: row.tzid,
    allDay: row.all_day === 1,
    rrule: row.rrule || undefined,
    rdate: row.rdate || undefined,
    exdate: row.exdate || undefined,
    color: row.color || undefined,
    meetingUrl: row.meeting_url || undefined,
    etag: row.etag || undefined,
    dirty: row.dirty === 1,
    isDeleted: row.is_deleted === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function mapRowToException(row: ExceptionRow): EventException {
  return {
    id: row.id,
    masterEventId: row.master_event_id,
    originalStartUtc: row.original_start_utc,
    isCancelled: row.is_cancelled === 1,
    title: row.title || undefined,
    notes: row.notes || undefined,
    location: row.location || undefined,
    dtStartUtc: row.dtstart_utc || undefined,
    dtEndUtc: row.dtend_utc || undefined,
    tzid: row.tzid || undefined,
    color: row.color || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export class EventsRepo {
  constructor(private db: ISqliteDatabase) {}

  private checkReadOnlyCalendar(calendarId: string): void {
    const row = this.db
      .prepare('SELECT is_read_only FROM calendars WHERE id = ?')
      .get<{ is_read_only: number }>(calendarId)
    if (row && row.is_read_only === 1) {
      throw new ReadOnlyCalendarError(calendarId)
    }
  }

  getEventById(id: string): { event: CalendarEvent; exceptions: EventException[] } | null {
    const row = this.db
      .prepare('SELECT * FROM events WHERE id = ? AND is_deleted = 0')
      .get<EventRow>(id)
    if (!row) {
      return null
    }

    const event = mapRowToEvent(row)
    const exceptions = this.getExceptionsForEvent(id)
    return { event, exceptions }
  }

  getExceptionsForEvent(masterEventId: string): EventException[] {
    const rows = this.db
      .prepare('SELECT * FROM event_exceptions WHERE master_event_id = ? ORDER BY original_start_utc ASC')
      .all<ExceptionRow>(masterEventId)
    return rows.map(mapRowToException)
  }

  createEvent(input: CreateEventInput): CalendarEvent {
    this.checkReadOnlyCalendar(input.calendarId)

    const now = new Date().toISOString()
    const id = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const uid = input.uid || `${id}@gone.calendar`
    const tzid = input.tzid || 'UTC'
    const allDay = input.allDay ? 1 : 0
    const dirty = 1
    const isDeleted = 0

    this.db
      .prepare(
        `INSERT INTO events (
          id, calendar_id, uid, title, notes, location,
          dtstart_utc, dtend_utc, tzid, all_day, rrule, exdate,
          color, meeting_url, dirty, is_deleted, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        input.calendarId,
        uid,
        input.title,
        input.notes || null,
        input.location || null,
        input.dtStartUtc,
        input.dtEndUtc,
        tzid,
        allDay,
        input.rrule || null,
        input.exdate || null,
        input.color || null,
        input.meetingUrl || null,
        dirty,
        isDeleted,
        now,
        now
      )

    const created = this.getEventById(id)
    if (!created) {
      throw new Error(`Failed to create event ${id}`)
    }
    return created.event
  }

  updateEvent(id: string, input: UpdateEventInput): CalendarEvent {
    const existingResult = this.getEventById(id)
    if (!existingResult) {
      throw new Error(`Event not found: ${id}`)
    }
    const existing = existingResult.event
    this.checkReadOnlyCalendar(existing.calendarId)

    const now = new Date().toISOString()
    const title = input.title ?? existing.title
    const notes = input.notes !== undefined ? input.notes : (existing.notes || null)
    const location = input.location !== undefined ? input.location : (existing.location || null)
    const dtStartUtc = input.dtStartUtc ?? existing.dtStartUtc
    const dtEndUtc = input.dtEndUtc ?? existing.dtEndUtc
    const tzid = input.tzid ?? existing.tzid
    const allDay = (input.allDay !== undefined ? input.allDay : existing.allDay) ? 1 : 0
    const rrule = input.rrule !== undefined ? input.rrule : (existing.rrule || null)
    const exdate = input.exdate !== undefined ? input.exdate : (existing.exdate || null)
    const color = input.color !== undefined ? input.color : (existing.color || null)
    const meetingUrl = input.meetingUrl !== undefined ? input.meetingUrl : (existing.meetingUrl || null)
    const isDeleted = (input.isDeleted !== undefined ? input.isDeleted : existing.isDeleted) ? 1 : 0

    this.db
      .prepare(
        `UPDATE events SET
          title = ?, notes = ?, location = ?, dtstart_utc = ?, dtend_utc = ?,
          tzid = ?, all_day = ?, rrule = ?, exdate = ?, color = ?,
          meeting_url = ?, dirty = 1, is_deleted = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(
        title,
        notes,
        location,
        dtStartUtc,
        dtEndUtc,
        tzid,
        allDay,
        rrule,
        exdate,
        color,
        meetingUrl,
        isDeleted,
        now,
        id
      )

    const updated = this.getEventById(id)
    return updated!.event
  }

  deleteEvent(id: string): boolean {
    const existing = this.getEventById(id)
    if (!existing) {
      return false
    }
    this.checkReadOnlyCalendar(existing.event.calendarId)

    const now = new Date().toISOString()
    // Soft delete with dirty flag set for cloud synchronization
    const result = this.db
      .prepare('UPDATE events SET is_deleted = 1, dirty = 1, updated_at = ? WHERE id = ?')
      .run(now, id)
    return result.changes > 0
  }

  upsertException(
    exception: Omit<EventException, 'id' | 'createdAt' | 'updatedAt'>
  ): EventException {
    const master = this.getEventById(exception.masterEventId)
    if (!master) {
      throw new Error(`Master event not found: ${exception.masterEventId}`)
    }
    this.checkReadOnlyCalendar(master.event.calendarId)

    const now = new Date().toISOString()
    const existing = this.db
      .prepare(
        'SELECT id FROM event_exceptions WHERE master_event_id = ? AND original_start_utc = ?'
      )
      .get<{ id: string }>(exception.masterEventId, exception.originalStartUtc)

    const id = existing?.id || `ex_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const isCancelled = exception.isCancelled ? 1 : 0

    if (existing) {
      this.db
        .prepare(
          `UPDATE event_exceptions SET
            is_cancelled = ?, title = ?, notes = ?, location = ?,
            dtstart_utc = ?, dtend_utc = ?, tzid = ?, color = ?, updated_at = ?
           WHERE id = ?`
        )
        .run(
          isCancelled,
          exception.title || null,
          exception.notes || null,
          exception.location || null,
          exception.dtStartUtc || null,
          exception.dtEndUtc || null,
          exception.tzid || null,
          exception.color || null,
          now,
          id
        )
    } else {
      this.db
        .prepare(
          `INSERT INTO event_exceptions (
            id, master_event_id, original_start_utc, is_cancelled,
            title, notes, location, dtstart_utc, dtend_utc, tzid, color, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          id,
          exception.masterEventId,
          exception.originalStartUtc,
          isCancelled,
          exception.title || null,
          exception.notes || null,
          exception.location || null,
          exception.dtStartUtc || null,
          exception.dtEndUtc || null,
          exception.tzid || null,
          exception.color || null,
          now,
          now
        )
    }

    const row = this.db.prepare('SELECT * FROM event_exceptions WHERE id = ?').get<ExceptionRow>(id)
    return mapRowToException(row!)
  }

  queryEventsByRange(
    calendarIds: string[],
    startUtc: string,
    endUtc: string
  ): ExpandedOccurrence[] {
    if (calendarIds.length === 0) {
      return []
    }

    const placeholders = calendarIds.map(() => '?').join(',')

    // 1. Fetch non-recurring events in range
    // 2. Fetch all recurring events for the specified calendars (rrule is not null)
    const sql = `
      SELECT * FROM events
      WHERE calendar_id IN (${placeholders})
        AND is_deleted = 0
        AND (
          (rrule IS NULL AND dtstart_utc <= ? AND dtend_utc >= ?)
          OR (rrule IS NOT NULL)
        )
    `

    const rows = this.db
      .prepare(sql)
      .all<EventRow>(...calendarIds, endUtc, startUtc)

    const occurrences: ExpandedOccurrence[] = []

    for (const row of rows) {
      const event = mapRowToEvent(row)
      const exceptions = event.rrule ? this.getExceptionsForEvent(event.id) : []
      const expanded = expandOccurrences(event, exceptions, startUtc, endUtc)
      occurrences.push(...expanded)
    }

    // Sort chronologically by startUtc
    return occurrences.sort((a, b) => a.startUtc.localeCompare(b.startUtc))
  }
}
