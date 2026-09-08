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
