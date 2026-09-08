import { DateTime } from 'luxon'
import { rrulestr } from 'rrule'
import type { CalendarEvent, EventException, ExpandedOccurrence } from './event-model'
import { resolveLunarOccurrence } from './lunar-vietnam'

/**
 * Expand a master calendar event and its exceptions into concrete occurrences
 * within a requested UTC date-time window [rangeStartUtc, rangeEndUtc].
 *
 * `coveredYears` lists Gregorian years for which a lunar master already has a
 * materialized standalone instance; those years are skipped so nothing draws twice.
 */
export function expandOccurrences(
  event: CalendarEvent,
  exceptions: EventException[] = [],
  rangeStartUtc: string,
  rangeEndUtc: string,
  coveredYears?: Set<number>
): ExpandedOccurrence[] {
  if (event.isDeleted) {
    return []
  }

  const rangeStart = DateTime.fromISO(rangeStartUtc, { zone: 'utc' })
  const rangeEnd = DateTime.fromISO(rangeEndUtc, { zone: 'utc' })

  if (!rangeStart.isValid || !rangeEnd.isValid) {
    throw new Error(`Invalid range parameters: ${rangeStartUtc}, ${rangeEndUtc}`)
  }

  // Yearly lunar-date recurrence (âm lịch anniversaries / giỗ)
  if (event.lunarRule) {
    return expandLunarOccurrences(event, exceptions, rangeStart, rangeEnd, coveredYears)
  }

  // Non-recurring event
  if (!event.rrule) {
    const eventStart = DateTime.fromISO(event.dtStartUtc, { zone: 'utc' })
    const eventEnd = DateTime.fromISO(event.dtEndUtc, { zone: 'utc' })

    // Check overlap with requested window
    if (eventStart <= rangeEnd && eventEnd >= rangeStart) {
      return [
        {
          id: `${event.id}_${event.dtStartUtc}`,
          eventId: event.id,
          calendarId: event.calendarId,
          title: event.title,
          notes: event.notes,
          location: event.location,
          startUtc: event.dtStartUtc,
          endUtc: event.dtEndUtc,
          tzid: event.tzid,
          allDay: event.allDay,
          color: event.color,
          meetingUrl: event.meetingUrl,
          isRecurring: false,
          isException: false,
          originalStartUtc: event.dtStartUtc
        }
      ]
    }
    return []
  }

  return expandRruleOccurrences(event, exceptions, rangeStart, rangeEnd)
}

/**
 * Expand a lunar-recurring master into one all-day occurrence per Gregorian year
 * within the range. Honors EXDATE cancellations and per-year exception overrides,
 * both keyed on the occurrence's ISO date.
 */
function expandLunarOccurrences(
  event: CalendarEvent,
  exceptions: EventException[],
  rangeStart: DateTime,
  rangeEnd: DateTime,
  coveredYears?: Set<number>
): ExpandedOccurrence[] {
  const spec = event.lunarRule!
  const results: ExpandedOccurrence[] = []

  const exdateSet = new Set<string>()
  if (event.exdate) {
    event.exdate
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean)
      .forEach((d) => {
        const dt = DateTime.fromISO(d, { zone: 'utc' })
        if (dt.isValid) exdateSet.add(dt.toISODate() || d.slice(0, 10))
      })
  }

  const exceptionsByDate = new Map<string, EventException>()
  for (const ex of exceptions) {
    const dt = DateTime.fromISO(ex.originalStartUtc, { zone: 'utc' })
    if (dt.isValid) exceptionsByDate.set(dt.toISODate() || ex.originalStartUtc.slice(0, 10), ex)
  }

  for (let year = rangeStart.year - 1; year <= rangeEnd.year + 1; year++) {
    if (coveredYears?.has(year)) continue

    const isoDate = resolveLunarOccurrence(spec, year)
    if (!isoDate) continue

    const occStart = DateTime.fromISO(`${isoDate}T00:00:00.000Z`, { zone: 'utc' })
    const occEnd = DateTime.fromISO(`${isoDate}T23:59:59.999Z`, { zone: 'utc' })
    if (occStart > rangeEnd || occEnd < rangeStart) continue
    if (exdateSet.has(isoDate)) continue

    const originalIso = occStart.toISO() || `${isoDate}T00:00:00.000Z`
    const ex = exceptionsByDate.get(isoDate)
    if (ex?.isCancelled) continue

    results.push({
      id: `${event.id}_${originalIso}`,
      eventId: event.id,
      calendarId: event.calendarId,
      title: ex?.title !== undefined ? ex.title : event.title,
      notes: ex?.notes !== undefined ? ex.notes : event.notes,
      location: ex?.location !== undefined ? ex.location : event.location,
      startUtc: ex?.dtStartUtc || originalIso,
      endUtc: ex?.dtEndUtc || occEnd.toISO() || `${isoDate}T23:59:59.999Z`,
      tzid: ex?.tzid || event.tzid,
      allDay: true,
      color: ex?.color || event.color,
      meetingUrl: event.meetingUrl,
      isRecurring: true,
      isException: Boolean(ex),
      isLunar: true,
      originalStartUtc: originalIso
    })
  }

  return results
}

function expandRruleOccurrences(
  event: CalendarEvent,
  exceptions: EventException[],
  rangeStart: DateTime,
  rangeEnd: DateTime
): ExpandedOccurrence[] {
  const rrule = event.rrule
  if (!rrule) return []

  // Recurring Event: Parse master start/end and duration
  const masterStart = DateTime.fromISO(event.dtStartUtc, { zone: 'utc' })
  const masterEnd = DateTime.fromISO(event.dtEndUtc, { zone: 'utc' })
  const durationMillis = masterEnd.diff(masterStart).milliseconds

  // Parse EXDATE set
  const exdateSet = new Set<string>()
  if (event.exdate) {
    event.exdate
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean)
      .forEach((d) => {
        const dt = DateTime.fromISO(d, { zone: 'utc' })
        if (dt.isValid) {
          exdateSet.add(dt.toISO() || d)
          exdateSet.add(dt.toMillis().toString())
        }
      })
  }

  // Map exceptions by originalStartUtc ISO / timestamp
  const exceptionsByOriginal = new Map<string, EventException>()
  for (const ex of exceptions) {
    const dt = DateTime.fromISO(ex.originalStartUtc, { zone: 'utc' })
    if (dt.isValid) {
      exceptionsByOriginal.set(dt.toISO() || ex.originalStartUtc, ex)
      exceptionsByOriginal.set(dt.toMillis().toString(), ex)
    }
  }

  const results: ExpandedOccurrence[] = []

  // Construct RRULE
  try {
    // Format DTSTART for RRULE string if needed
    const dtstartUtcStr = masterStart.toUTC().toFormat("yyyyMMdd'T'HHmmss'Z'")
    const ruleString = rrule.includes('DTSTART')
      ? rrule
      : `DTSTART:${dtstartUtcStr}\nRRULE:${rrule}`

    const rule = rrulestr(ruleString, { dtstart: masterStart.toJSDate() })

    // Expand between rangeStart and rangeEnd (convert to JS Dates)
    // Expand a bit earlier/later to account for duration overlap
    const searchStart = rangeStart.minus({ milliseconds: Math.max(0, durationMillis) }).toJSDate()
    const searchEnd = rangeEnd.toJSDate()

    const dates = rule.between(searchStart, searchEnd, true)

    for (const d of dates) {
      const occurrenceStart = DateTime.fromJSDate(d, { zone: 'utc' })
      const originalIso = occurrenceStart.toISO() || d.toISOString()
      const originalTimestamp = occurrenceStart.toMillis().toString()

      // 1. Check EXDATE
      if (exdateSet.has(originalIso) || exdateSet.has(originalTimestamp)) {
        continue
      }

      // 2. Check Event Exceptions
      const exception = exceptionsByOriginal.get(originalIso) || exceptionsByOriginal.get(originalTimestamp)
      if (exception) {
        if (exception.isCancelled) {
          // Cancelled occurrence
          continue
        }

        // Modified occurrence
        const effectiveStartIso = exception.dtStartUtc || originalIso
        const effectiveStart = DateTime.fromISO(effectiveStartIso, { zone: 'utc' })
        const effectiveEndIso = exception.dtEndUtc || effectiveStart.plus({ milliseconds: durationMillis }).toISO() || ''
        const effectiveEnd = DateTime.fromISO(effectiveEndIso, { zone: 'utc' })

        if (effectiveStart <= rangeEnd && effectiveEnd >= rangeStart) {
          results.push({
            id: `${event.id}_${originalIso}`,
            eventId: event.id,
            calendarId: event.calendarId,
            title: exception.title !== undefined ? exception.title : event.title,
            notes: exception.notes !== undefined ? exception.notes : event.notes,
            location: exception.location !== undefined ? exception.location : event.location,
            startUtc: effectiveStartIso,
            endUtc: effectiveEndIso,
            tzid: exception.tzid || event.tzid,
            allDay: event.allDay,
            color: exception.color || event.color,
            meetingUrl: event.meetingUrl,
            isRecurring: true,
            isException: true,
            originalStartUtc: originalIso
          })
        }
      } else {
        // Standard recurrence occurrence
        const occurrenceEnd = occurrenceStart.plus({ milliseconds: durationMillis })
        const endIso = occurrenceEnd.toISO() || ''

        if (occurrenceStart <= rangeEnd && occurrenceEnd >= rangeStart) {
          results.push({
            id: `${event.id}_${originalIso}`,
            eventId: event.id,
            calendarId: event.calendarId,
            title: event.title,
            notes: event.notes,
            location: event.location,
            startUtc: originalIso,
            endUtc: endIso,
            tzid: event.tzid,
            allDay: event.allDay,
            color: event.color,
            meetingUrl: event.meetingUrl,
            isRecurring: true,
            isException: false,
            originalStartUtc: originalIso
          })
        }
      }
    }
  } catch (err) {
    console.error(`Failed to expand RRULE for event ${event.id}:`, err)
    // Fallback: return master instance if it overlaps
    if (masterStart <= rangeEnd && masterEnd >= rangeStart) {
      results.push({
        id: `${event.id}_${event.dtStartUtc}`,
        eventId: event.id,
        calendarId: event.calendarId,
        title: event.title,
        notes: event.notes,
        location: event.location,
        startUtc: event.dtStartUtc,
        endUtc: event.dtEndUtc,
        tzid: event.tzid,
        allDay: event.allDay,
        color: event.color,
        meetingUrl: event.meetingUrl,
        isRecurring: true,
        isException: false,
        originalStartUtc: event.dtStartUtc
      })
    }
  }

  return results
}
