import type { DateTime } from 'luxon'

export type TimeFormatPref = '12h' | '24h'

/** Renders a DateTime's clock time per the user's 12h/24h preference. */
export function formatClockTime(dt: DateTime, pref: TimeFormatPref): string {
  return pref === '12h' ? dt.toFormat('h:mm a') : dt.toFormat('HH:mm')
}

/** Same, but for a raw "HH:mm" string (TimePicker's wire format, which always stays 24h). */
export function formatClockTimeStr(hhmm: string, pref: TimeFormatPref): string {
  if (pref === '24h') return hhmm
  const [h, m] = hhmm.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${m.toString().padStart(2, '0')} ${period}`
}

/**
 * Which date an event's end belongs on, given both clock times.
 *
 * An end earlier in the day than the start does not mean the user made a
 * mistake - it means the event runs past midnight. Rolling the date says so
 * immediately, instead of leaving an invalid range to be rejected on save.
 *
 * The roll reverses itself, but only when the end sits exactly one day after
 * the start: that is the roll this function makes, so undoing it is safe.
 * A deliberately multi-day event is left alone.
 */
export function endDateForTimes(args: {
  startDate: string
  startClock: string
  endClock: string
  currentEndDate: string
}): string {
  const toMinutes = (clock: string): number | null => {
    const [h, m] = clock.split(':').map(Number)
    return Number.isNaN(h) || Number.isNaN(m) ? null : h * 60 + m
  }

  const start = toMinutes(args.startClock)
  const end = toMinutes(args.endClock)
  if (start === null || end === null || !args.startDate) return args.currentEndDate

  const nextDay = addDays(args.startDate, 1)

  if (end <= start) return nextDay
  if (args.currentEndDate === nextDay) return args.startDate
  return args.currentEndDate
}

/** `2026-09-17` + 1 -> `2026-09-18`, without pulling in a timezone. */
function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + days)
  return dt.toISOString().slice(0, 10)
}
