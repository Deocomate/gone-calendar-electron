import { DateTime } from 'luxon'

/**
 * All-day end-date conventions.
 *
 * Every calendar interchange format - RFC 5545 (`DTEND;VALUE=DATE`), Google
 * Calendar (`end.date`) and Microsoft Graph (`end` with `isAllDay`) - uses an
 * EXCLUSIVE end for all-day events: a single-day event on the 14th is stored as
 * start 2026-09-14, end 2026-09-15.
 *
 * This app stores an INCLUSIVE end instead - the last millisecond of the final
 * day - because that is what the editor writes (`endOf('day')`) and what the
 * views render. Importing a provider's exclusive end verbatim therefore made
 * every all-day event one day too long.
 *
 * Convert at the provider boundary, in both directions, so the rest of the
 * codebase only ever sees the inclusive form.
 */

/** Last instant of the day containing `iso`, in UTC. */
function endOfUtcDay(iso: string): string {
  const dt = DateTime.fromISO(iso, { zone: 'utc' })
  return dt.endOf('day').toUTC().toISO()!
}

/**
 * Provider -> app. Turns an exclusive all-day end into the inclusive end of the
 * previous day.
 *
 * `2026-09-15T00:00:00.000Z` -> `2026-09-14T23:59:59.999Z`
 *
 * Providers are not always well-behaved: an end equal to (or before) the start
 * means a zero-length all-day event, which is really a single day, so it falls
 * back to the end of the start day.
 */
export function exclusiveEndToInclusive(startIsoUtc: string, endIsoUtc: string): string {
  const start = DateTime.fromISO(startIsoUtc, { zone: 'utc' })
  const end = DateTime.fromISO(endIsoUtc, { zone: 'utc' })

  if (!start.isValid || !end.isValid || end <= start) {
    return endOfUtcDay(start.isValid ? startIsoUtc : endIsoUtc)
  }

  return end.minus({ milliseconds: 1 }).endOf('day').toUTC().toISO()!
}

/**
 * App -> provider. Turns an inclusive all-day end into the exclusive calendar
 * date the provider expects.
 *
 * `2026-09-14T23:59:59.999Z` -> `2026-09-15`
 *
 * Also accepts an end already sitting at midnight (data written before this
 * conversion existed, or a provider value round-tripping straight back out), in
 * which case that date is already exclusive and is returned unchanged.
 */
export function inclusiveEndToExclusiveDate(startIsoUtc: string, endIsoUtc: string): string {
  const start = DateTime.fromISO(startIsoUtc, { zone: 'utc' })
  const end = DateTime.fromISO(endIsoUtc, { zone: 'utc' })

  if (!end.isValid) {
    const fallback = start.isValid ? start : DateTime.utc()
    return fallback.plus({ days: 1 }).toUTC().toISODate()!
  }

  // Midnight exactly: already an exclusive boundary, keep the date as-is.
  const isMidnight =
    end.hour === 0 && end.minute === 0 && end.second === 0 && end.millisecond === 0
  const exclusive = isMidnight ? end : end.plus({ milliseconds: 1 })

  // Never emit an end that is not after the start; providers reject it.
  if (start.isValid && exclusive <= start) {
    return start.plus({ days: 1 }).toUTC().toISODate()!
  }

  return exclusive.toUTC().toISODate()!
}
