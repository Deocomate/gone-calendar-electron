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

/**
 * The calendar date an occurrence should be filed under, as `yyyy-MM-dd`.
 *
 * All-day occurrences are floating dates stored at UTC midnight, so their date
 * is read straight off the stored string; converting them to local time shifts
 * them by the zone offset (a day east of GMT, a day back west of it). Timed
 * occurrences are real instants and do convert to the viewer's zone.
 */
export function occurrenceDateKey(allDay: boolean, isoUtc: string): string {
  if (allDay) return isoUtc.slice(0, 10)
  return DateTime.fromISO(isoUtc, { zone: 'utc' }).toLocal().toISODate()!
}

/**
 * Whether an all-day occurrence covers a given calendar date (`yyyy-MM-dd`).
 *
 * All-day spans are floating dates with an inclusive end, so this is a plain
 * string comparison against the stored dates. Filtering them by instant overlap
 * instead - which is what a UTC range query does - pulls in the neighbouring
 * day: a local day window east of GMT starts on the previous UTC date, so
 * yesterday's all-day events fall inside it.
 */
export function allDayCoversDate(startUtc: string, endUtc: string, dayKey: string): boolean {
  return startUtc.slice(0, 10) <= dayKey && dayKey <= endUtc.slice(0, 10)
}

/**
 * Cap on how many days one occurrence may be walked across. A corrupt or absurd
 * end date should not spin a render loop for years.
 */
const MAX_SPAN_DAYS = 366

/**
 * Every calendar date (`yyyy-MM-dd`) an occurrence appears on.
 *
 * A multi-day event belongs to each day it covers, not just the one it starts
 * on. All-day spans are floating dates walked directly; timed ones are real
 * instants, so their local dates are used and an event running past midnight
 * lands on both days.
 */
export function occurrenceDateKeys(
  allDay: boolean,
  startUtc: string,
  endUtc: string
): string[] {
  const first = occurrenceDateKey(allDay, startUtc)
  const last = occurrenceDateKey(allDay, endUtc)
  if (last <= first) return [first]

  const keys: string[] = []
  let cursor = DateTime.fromISO(first, { zone: 'utc' })
  const end = DateTime.fromISO(last, { zone: 'utc' })
  while (cursor <= end && keys.length < MAX_SPAN_DAYS) {
    keys.push(cursor.toFormat('yyyy-MM-dd'))
    cursor = cursor.plus({ days: 1 })
  }
  return keys
}
