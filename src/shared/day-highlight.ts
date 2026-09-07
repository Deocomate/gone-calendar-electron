import { DateTime } from 'luxon'
import { convertSolarToLunar } from './lunar-vietnam'

export type DayHighlightKind = 'today' | 'solarMonthStart' | 'lunarMonthStart' | 'lunarMidMonth'

export const DAY_HIGHLIGHT_COLORS: Record<DayHighlightKind, string> = {
  today: '#eb5757',
  solarMonthStart: '#5b8fd6',
  lunarMonthStart: '#e8934a',
  lunarMidMonth: '#c9a227'
}

/**
 * Which "notable day" markers apply to this date - today, the 1st of the solar
 * month, and the 1st/15th of the lunar month. A day can carry more than one
 * (e.g. Tết landing on a solar month's 1st) - the caller decides how to render that.
 */
export function getDayHighlights(day: DateTime, today: DateTime): DayHighlightKind[] {
  const kinds: DayHighlightKind[] = []
  if (day.hasSame(today, 'day')) kinds.push('today')
  if (day.day === 1) kinds.push('solarMonthStart')

  const lunar = convertSolarToLunar(day.day, day.month, day.year)
  if (lunar.day === 1) kinds.push('lunarMonthStart')
  else if (lunar.day === 15) kinds.push('lunarMidMonth')

  return kinds
}
