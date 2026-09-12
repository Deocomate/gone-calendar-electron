import { DateTime } from 'luxon'
import type {
  CalendarEvent,
  EventException,
  CreateEventInput
} from '@shared/event-model'

export const GOOGLE_COLOR_MAP: Record<string, string> = {
  '1': '#7986cb', // Lavender
  '2': '#33b679', // Sage
  '3': '#8e24aa', // Grape
  '4': '#e67c73', // Flamingo
  '5': '#f6bf26', // Banana
  '6': '#f4511e', // Tangerine
  '7': '#039be5', // Peacock
  '8': '#616161', // Graphite
  '9': '#3f51b5', // Blueberry
  '10': '#0b8043', // Basil
  '11': '#d50000'  // Tomato
}

export interface GoogleEventDateTime {
  dateTime?: string
  date?: string
  timeZone?: string
}

export interface GoogleCalendarApiEvent {
  id: string
  status?: string
  summary?: string
  description?: string
  location?: string
  start?: GoogleEventDateTime
  end?: GoogleEventDateTime
  recurrence?: string[]
  recurringEventId?: string
  originalStartTime?: GoogleEventDateTime
  colorId?: string
  etag?: string
  hangoutLink?: string
  conferenceData?: {
    entryPoints?: { entryPointType: string; uri: string }[]
  }
  extendedProperties?: {
    private?: Record<string, string>
  }
}

/** Reverse of GOOGLE_COLOR_MAP, for pushing a local hex colour back as a colorId. */
export const GOOGLE_COLOR_ID_BY_HEX: Record<string, string> = Object.fromEntries(
  Object.entries(GOOGLE_COLOR_MAP).map(([id, hex]) => [hex.toLowerCase(), id])
)

/**
 * Google exposes no writable field for an arbitrary meeting link - `hangoutLink`
 * and `conferenceData` are server-owned (conferenceData only accepts a Meet
 * create-request, not a URL). Private extended properties are the documented
 * per-client escape hatch and round-trip losslessly, so the link survives a
 * push/pull cycle instead of being dropped on the way out.
 */
export const GONE_MEETING_URL_PROP = 'goneMeetingUrl'

/**
 * Format Google Event DateTime to ISO UTC and determine all-day status
 */
export function parseGoogleDateTime(dt?: GoogleEventDateTime): {
  iso: string
  allDay: boolean
  tzid: string
} {
  if (!dt) {
    const now = DateTime.utc().toISO()!
    return { iso: now, allDay: false, tzid: 'UTC' }
  }

  if (dt.date) {
    // All-day event: YYYY-MM-DD
    const iso = `${dt.date}T00:00:00.000Z`
    return { iso, allDay: true, tzid: dt.timeZone || 'UTC' }
  }

  if (dt.dateTime) {
    const parsed = DateTime.fromISO(dt.dateTime, { setZone: true })
    const iso = parsed.toUTC().toISO() || dt.dateTime
    return { iso, allDay: false, tzid: dt.timeZone || parsed.zoneName || 'UTC' }
  }

  const now = DateTime.utc().toISO()!
  return { iso: now, allDay: false, tzid: 'UTC' }
}

/**
 * Map Google API event to Canonical CalendarEvent / EventException
 */
export function mapGoogleEventToDomain(
  gEvent: GoogleCalendarApiEvent,
  calendarId: string
): {
  isException: boolean
  event?: CreateEventInput & { id: string; etag?: string; isDeleted?: boolean }
  exception?: Omit<EventException, 'id' | 'createdAt' | 'updatedAt'> & { etag?: string }
} {
  const startInfo = parseGoogleDateTime(gEvent.start)
  const endInfo = parseGoogleDateTime(gEvent.end)

  const color = gEvent.colorId ? GOOGLE_COLOR_MAP[gEvent.colorId] : undefined

  let meetingUrl = gEvent.hangoutLink
  if (!meetingUrl && gEvent.conferenceData?.entryPoints) {
    const videoEntry = gEvent.conferenceData.entryPoints.find(
      (ep) => ep.entryPointType === 'video' || ep.entryPointType === 'web'
    )
    if (videoEntry) meetingUrl = videoEntry.uri
  }
  // A link we pushed ourselves comes back here rather than as a real conference.
  if (!meetingUrl) meetingUrl = gEvent.extendedProperties?.private?.[GONE_MEETING_URL_PROP]

  const isCancelled = gEvent.status === 'cancelled'

  // If recurringEventId is present, this item is an exception / occurrence override
  if (gEvent.recurringEventId && gEvent.originalStartTime) {
    const origStartInfo = parseGoogleDateTime(gEvent.originalStartTime)

    return {
      isException: true,
      exception: {
        masterEventId: gEvent.recurringEventId,
        originalStartUtc: origStartInfo.iso,
        isCancelled,
        title: gEvent.summary || 'Untitled Event',
        notes: gEvent.description || undefined,
        location: gEvent.location || undefined,
        dtStartUtc: startInfo.iso,
        dtEndUtc: endInfo.iso,
        tzid: startInfo.tzid,
        color
      }
    }
  }

  // Master event
  let rruleString: string | undefined
  if (gEvent.recurrence && gEvent.recurrence.length > 0) {
    for (const rule of gEvent.recurrence) {
      if (rule.startsWith('RRULE:')) {
        rruleString = rule.substring(6)
      } else if (!rule.startsWith('EXDATE:') && !rule.startsWith('RDATE:')) {
        rruleString = rule
      }
    }
  }

  return {
    isException: false,
    event: {
      id: gEvent.id,
      calendarId,
      uid: `${gEvent.id}@google.com`,
      title: gEvent.summary || 'Untitled Event',
      notes: gEvent.description || undefined,
      location: gEvent.location || undefined,
      dtStartUtc: startInfo.iso,
      dtEndUtc: endInfo.iso,
      tzid: startInfo.tzid,
      allDay: startInfo.allDay,
      rrule: rruleString,
      color,
      meetingUrl,
      etag: gEvent.etag,
      isDeleted: isCancelled
    }
  }
}

/**
 * Map Canonical Domain Event to Google Calendar API v3 format for push
 */
export function mapDomainEventToGoogle(
  event: CalendarEvent | (CreateEventInput & { id?: string })
): GoogleCalendarApiEvent {
  const isAllDay = Boolean(event.allDay)
  let start: GoogleEventDateTime
  let end: GoogleEventDateTime

  if (isAllDay) {
    const startDateStr = event.dtStartUtc.split('T')[0]
    const endDateStr = event.dtEndUtc.split('T')[0]
    start = { date: startDateStr }
    end = { date: endDateStr }
  } else {
    start = {
      dateTime: event.dtStartUtc,
      timeZone: event.tzid || 'UTC'
    }
    end = {
      dateTime: event.dtEndUtc,
      timeZone: event.tzid || 'UTC'
    }
  }

  const gEvent: GoogleCalendarApiEvent = {
    id: (event as any).id || undefined,
    summary: event.title,
    description: event.notes || undefined,
    location: event.location || undefined,
    start,
    end
  }

  if (event.rrule) {
    gEvent.recurrence = [`RRULE:${event.rrule}`]
  }

  const hex = event.color?.toLowerCase()
  if (hex && GOOGLE_COLOR_ID_BY_HEX[hex]) {
    gEvent.colorId = GOOGLE_COLOR_ID_BY_HEX[hex]
  }
  if (event.meetingUrl) {
    gEvent.extendedProperties = {
      private: { [GONE_MEETING_URL_PROP]: event.meetingUrl }
    }
  }

  if ((event as CalendarEvent).etag) {
    gEvent.etag = (event as CalendarEvent).etag
  }

  return gEvent
}
