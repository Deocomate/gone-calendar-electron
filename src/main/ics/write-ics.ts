import { DateTime } from 'luxon'
import type { Calendar, CalendarEvent, EventException } from '@shared/event-model'

function formatIcsDateTime(isoUtc: string, isAllDay: boolean): string {
  const dt = DateTime.fromISO(isoUtc, { zone: 'utc' })
  if (isAllDay) {
    return dt.toFormat('yyyyMMdd')
  }
  return dt.toFormat("yyyyMMdd'T'HHmmss'Z'")
}

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

/**
 * Generate RFC 5545 iCalendar (.ics) string for a calendar and its events
 */
export function generateIcs(
  calendar: Calendar,
  events: CalendarEvent[],
  exceptions: EventException[] = []
): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Gone Calendar//Gone Calendar Desktop//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(calendar.name)}`
  ]

  const exceptionsByMaster = new Map<string, EventException[]>()
  for (const ex of exceptions) {
    const list = exceptionsByMaster.get(ex.masterEventId) || []
    list.push(ex)
    exceptionsByMaster.set(ex.masterEventId, list)
  }

  for (const event of events) {
    if (event.isDeleted) continue

    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${event.uid}`)
    lines.push(`DTSTAMP:${DateTime.utc().toFormat("yyyyMMdd'T'HHmmss'Z'")}`)

    if (event.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${formatIcsDateTime(event.dtStartUtc, true)}`)
      lines.push(`DTEND;VALUE=DATE:${formatIcsDateTime(event.dtEndUtc, true)}`)
    } else {
      lines.push(`DTSTART:${formatIcsDateTime(event.dtStartUtc, false)}`)
      lines.push(`DTEND:${formatIcsDateTime(event.dtEndUtc, false)}`)
    }

    lines.push(`SUMMARY:${escapeIcsText(event.title)}`)
    if (event.notes) {
      lines.push(`DESCRIPTION:${escapeIcsText(event.notes)}`)
    }
    if (event.location) {
      lines.push(`LOCATION:${escapeIcsText(event.location)}`)
    }
    if (event.rrule) {
      lines.push(`RRULE:${event.rrule}`)
    }
    if (event.exdate) {
      const formattedExdates = event.exdate
        .split(',')
        .map((d) => formatIcsDateTime(d.trim(), event.allDay))
        .join(',')
      lines.push(
        event.allDay ? `EXDATE;VALUE=DATE:${formattedExdates}` : `EXDATE:${formattedExdates}`
      )
    }

    lines.push('END:VEVENT')

    // Append recurrence exceptions (RECURRENCE-ID)
    const eventExceptions = exceptionsByMaster.get(event.id) || []
    for (const ex of eventExceptions) {
      lines.push('BEGIN:VEVENT')
      lines.push(`UID:${event.uid}`)
      lines.push(`DTSTAMP:${DateTime.utc().toFormat("yyyyMMdd'T'HHmmss'Z'")}`)

      const recIdFormatted = formatIcsDateTime(ex.originalStartUtc, event.allDay)
      lines.push(
        event.allDay ? `RECURRENCE-ID;VALUE=DATE:${recIdFormatted}` : `RECURRENCE-ID:${recIdFormatted}`
      )

      if (ex.isCancelled) {
        lines.push('STATUS:CANCELLED')
      } else {
        const startIso = ex.dtStartUtc || ex.originalStartUtc
        const endIso = ex.dtEndUtc || startIso
        if (event.allDay) {
          lines.push(`DTSTART;VALUE=DATE:${formatIcsDateTime(startIso, true)}`)
          lines.push(`DTEND;VALUE=DATE:${formatIcsDateTime(endIso, true)}`)
        } else {
          lines.push(`DTSTART:${formatIcsDateTime(startIso, false)}`)
          lines.push(`DTEND:${formatIcsDateTime(endIso, false)}`)
        }

        lines.push(`SUMMARY:${escapeIcsText(ex.title || event.title)}`)
        if (ex.notes || event.notes) {
          lines.push(`DESCRIPTION:${escapeIcsText(ex.notes || event.notes || '')}`)
        }
        if (ex.location || event.location) {
          lines.push(`LOCATION:${escapeIcsText(ex.location || event.location || '')}`)
        }
      }

      lines.push('END:VEVENT')
    }
  }

  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}
