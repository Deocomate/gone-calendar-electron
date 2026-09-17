import { DateTime } from 'luxon'
import { exclusiveEndToInclusive, inclusiveEndToExclusiveDate } from '@shared/all-day'
import type {
  CalendarEvent,
  EventException,
  CreateEventInput
} from '@shared/event-model'
import {
  graphRecurrenceToRrule,
  rruleToGraphRecurrence,
  type GraphRecurrence
} from './graph-recurrence-map'

export interface GraphDateTimeTimeZone {
  dateTime: string // e.g. "2026-08-18T10:00:00.0000000"
  timeZone: string // e.g. "UTC", "SE Asia Standard Time", "Asia/Ho_Chi_Minh"
}

/** What we send to Graph - see GoogleEventWritePayload for why the id is absent. */
export type GraphEventWritePayload = Omit<MicrosoftGraphApiEvent, 'id'>

export interface MicrosoftGraphApiEvent {
  id: string
  subject?: string
  body?: { contentType?: string; content?: string }
  bodyPreview?: string
  start?: GraphDateTimeTimeZone
  end?: GraphDateTimeTimeZone
  isAllDay?: boolean
  location?: { displayName?: string }
  recurrence?: GraphRecurrence
  type?: 'singleInstance' | 'occurrence' | 'exception' | 'seriesMaster'
  seriesMasterId?: string
  isCancelled?: boolean
  webLink?: string
  onlineMeeting?: { joinUrl?: string }
  '@odata.etag'?: string
  categories?: string[]
}

/**
 * Parse Graph DateTimeTimeZone to ISO UTC string
 */
export function parseGraphDateTime(
  dt?: GraphDateTimeTimeZone,
  isAllDay?: boolean
): { iso: string; tzid: string } {
  if (!dt || !dt.dateTime) {
    const now = DateTime.utc().toISO()!
    return { iso: now, tzid: 'UTC' }
  }

  const raw = dt.dateTime.split('.')[0] // strip microsecond decimals
  const tzid = dt.timeZone || 'UTC'

  if (isAllDay) {
    const datePart = raw.split('T')[0]
    return { iso: `${datePart}T00:00:00.000Z`, tzid }
  }

  // If timeZone is specified and luxon can parse it
  let parsed = DateTime.fromISO(raw, { zone: tzid })
  if (!parsed.isValid) {
    parsed = DateTime.fromISO(raw, { zone: 'utc' })
  }

  const iso = parsed.toUTC().toISO() || `${raw}Z`
  return { iso, tzid: parsed.zoneName || tzid }
}

/**
 * Map Microsoft Graph API event to Canonical CalendarEvent / EventException
 */
/**
 * All-day ends arrive exclusive from Graph; the app stores them inclusive.
 */
function normaliseEnd(
  isAllDay: boolean,
  startInfo: { iso: string },
  endInfo: { iso: string }
): string {
  return isAllDay ? exclusiveEndToInclusive(startInfo.iso, endInfo.iso) : endInfo.iso
}

export function mapGraphEventToDomain(
  gEvent: MicrosoftGraphApiEvent,
  calendarId: string
): {
  isException: boolean
  event?: CreateEventInput & { id: string; etag?: string; isDeleted?: boolean }
  exception?: Omit<EventException, 'id' | 'createdAt' | 'updatedAt'> & { etag?: string }
} {
  const isAllDay = Boolean(gEvent.isAllDay)
  const startInfo = parseGraphDateTime(gEvent.start, isAllDay)
  const endInfo = parseGraphDateTime(gEvent.end, isAllDay)

  const isCancelled = Boolean(gEvent.isCancelled)
  const meetingUrl = gEvent.onlineMeeting?.joinUrl || gEvent.webLink

  // Exception / Occurrence Override
  if (gEvent.type === 'exception' && gEvent.seriesMasterId) {
    return {
      isException: true,
      exception: {
        masterEventId: gEvent.seriesMasterId,
        originalStartUtc: startInfo.iso,
        isCancelled,
        title: gEvent.subject || 'Untitled Event',
        notes: gEvent.bodyPreview || gEvent.body?.content || undefined,
        location: gEvent.location?.displayName || undefined,
        dtStartUtc: startInfo.iso,
        dtEndUtc: normaliseEnd(isAllDay, startInfo, endInfo),
        tzid: startInfo.tzid,
        // An occurrence can be timed while its series is all-day (and back).
        allDay: isAllDay
      }
    }
  }

  // Master Series or Single Instance
  let rruleString: string | undefined
  if (gEvent.recurrence) {
    rruleString = graphRecurrenceToRrule(gEvent.recurrence)
  }

  return {
    isException: false,
    event: {
      id: gEvent.id,
      calendarId,
      uid: `${gEvent.id}@outlook.com`,
      title: gEvent.subject || 'Untitled Event',
      notes: gEvent.bodyPreview || gEvent.body?.content || undefined,
      location: gEvent.location?.displayName || undefined,
      dtStartUtc: startInfo.iso,
      dtEndUtc: normaliseEnd(isAllDay, startInfo, endInfo),
      tzid: startInfo.tzid,
      allDay: isAllDay,
      rrule: rruleString,
      meetingUrl,
      etag: gEvent['@odata.etag'],
      isDeleted: isCancelled
    }
  }
}

/**
 * Map Canonical Domain Event to Microsoft Graph API format for push
 */
export function mapDomainEventToGraph(
  event: CalendarEvent | (CreateEventInput & { id?: string })
): GraphEventWritePayload {
  const isAllDay = Boolean(event.allDay)
  const tzid = event.tzid || 'UTC'

  const startDateStr = event.dtStartUtc.split('T')[0]
  // Graph, like Google and RFC 5545, wants the exclusive end date for all-day.
  const endDateStr = inclusiveEndToExclusiveDate(event.dtStartUtc, event.dtEndUtc)

  const gEvent: GraphEventWritePayload = {
    // No `id`, for the same reason as the Google mapper: it is in the URL on a
    // PATCH, and on a POST it is a server-assigned, read-only property.
    subject: event.title,
    body: event.notes ? { contentType: 'text', content: event.notes } : undefined,
    location: event.location ? { displayName: event.location } : undefined,
    isAllDay,
    start: {
      dateTime: isAllDay ? `${startDateStr}T00:00:00` : event.dtStartUtc,
      timeZone: tzid
    },
    end: {
      dateTime: isAllDay ? `${endDateStr}T00:00:00` : event.dtEndUtc,
      timeZone: tzid
    }
  }

  if (event.rrule) {
    gEvent.recurrence = rruleToGraphRecurrence(event.rrule, startDateStr)
  }

  // Deliberately not pushed: Graph has no writable counterpart for either field.
  // `meetingUrl` is read back from `onlineMeeting.joinUrl`/`webLink`, both
  // server-owned, and per-event colour does not exist on Graph at all (Outlook
  // colours come from named categories, which are an account-level concept the
  // app does not model). Both are preserved locally; they just do not round-trip
  // through Microsoft.

  return gEvent
}
