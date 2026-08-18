import { DateTime } from 'luxon'

export interface GraphRecurrencePattern {
  type: 'daily' | 'weekly' | 'absoluteMonthly' | 'relativeMonthly' | 'absoluteYearly' | 'relativeYearly'
  interval: number
  month?: number
  dayOfMonth?: number
  daysOfWeek?: ('sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday')[]
  firstDayOfWeek?: 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday'
  index?: 'first' | 'second' | 'third' | 'fourth' | 'last'
}

export interface GraphRecurrenceRange {
  type: 'endDate' | 'noEnd' | 'numbered'
  startDate: string // YYYY-MM-DD
  endDate?: string  // YYYY-MM-DD
  numberOfOccurrences?: number
  recurrenceTimeZone?: string
}

export interface GraphRecurrence {
  pattern: GraphRecurrencePattern
  range: GraphRecurrenceRange
}

const DAY_MAP_TO_RRULE: Record<string, string> = {
  monday: 'MO',
  tuesday: 'TU',
  wednesday: 'WE',
  thursday: 'TH',
  friday: 'FR',
  saturday: 'SA',
  sunday: 'SU'
}

const DAY_MAP_FROM_RRULE: Record<string, 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday'> = {
  MO: 'monday',
  TU: 'tuesday',
  WE: 'wednesday',
  TH: 'thursday',
  FR: 'friday',
  SA: 'saturday',
  SU: 'sunday'
}

const INDEX_MAP_TO_RRULE: Record<string, string> = {
  first: '1',
  second: '2',
  third: '3',
  fourth: '4',
  last: '-1'
}

const INDEX_MAP_FROM_RRULE: Record<string, 'first' | 'second' | 'third' | 'fourth' | 'last'> = {
  '1': 'first',
  '+1': 'first',
  '2': 'second',
  '+2': 'second',
  '3': 'third',
  '+3': 'third',
  '4': 'fourth',
  '+4': 'fourth',
  '-1': 'last'
}

/**
 * Convert Microsoft Graph Recurrence object to standard RFC 5545 RRULE string
 */
export function graphRecurrenceToRrule(graphRecurrence: GraphRecurrence): string {
  const { pattern, range } = graphRecurrence
  const parts: string[] = []

  // Frequency
  switch (pattern.type) {
    case 'daily':
      parts.push('FREQ=DAILY')
      break
    case 'weekly':
      parts.push('FREQ=WEEKLY')
      break
    case 'absoluteMonthly':
    case 'relativeMonthly':
      parts.push('FREQ=MONTHLY')
      break
    case 'absoluteYearly':
    case 'relativeYearly':
      parts.push('FREQ=YEARLY')
      break
    default:
      parts.push('FREQ=DAILY')
  }

  // Interval
  if (pattern.interval && pattern.interval > 1) {
    parts.push(`INTERVAL=${pattern.interval}`)
  }

  // Days of Week / Month Day / Relative Day
  if (pattern.type === 'weekly' && pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
    const byDay = pattern.daysOfWeek.map((d) => DAY_MAP_TO_RRULE[d.toLowerCase()]).filter(Boolean).join(',')
    if (byDay) parts.push(`BYDAY=${byDay}`)
  } else if (pattern.type === 'absoluteMonthly' && pattern.dayOfMonth) {
    parts.push(`BYMONTHDAY=${pattern.dayOfMonth}`)
  } else if (pattern.type === 'relativeMonthly' && pattern.daysOfWeek && pattern.daysOfWeek.length > 0 && pattern.index) {
    const day = DAY_MAP_TO_RRULE[pattern.daysOfWeek[0].toLowerCase()]
    const idx = INDEX_MAP_TO_RRULE[pattern.index] || '1'
    if (day) parts.push(`BYDAY=${idx}${day}`)
  } else if (pattern.type === 'absoluteYearly') {
    if (pattern.month) parts.push(`BYMONTH=${pattern.month}`)
    if (pattern.dayOfMonth) parts.push(`BYMONTHDAY=${pattern.dayOfMonth}`)
  } else if (pattern.type === 'relativeYearly' && pattern.daysOfWeek && pattern.daysOfWeek.length > 0 && pattern.index) {
    if (pattern.month) parts.push(`BYMONTH=${pattern.month}`)
    const day = DAY_MAP_TO_RRULE[pattern.daysOfWeek[0].toLowerCase()]
    const idx = INDEX_MAP_TO_RRULE[pattern.index] || '1'
    if (day) parts.push(`BYDAY=${idx}${day}`)
  }

  // Range (End condition)
  if (range.type === 'numbered' && range.numberOfOccurrences) {
    parts.push(`COUNT=${range.numberOfOccurrences}`)
  } else if (range.type === 'endDate' && range.endDate) {
    const untilStr = range.endDate.replace(/-/g, '') + 'T235959Z'
    parts.push(`UNTIL=${untilStr}`)
  }

  return parts.join(';')
}

/**
 * Convert standard RFC 5545 RRULE string to Microsoft Graph Recurrence object
 */
export function rruleToGraphRecurrence(
  rruleStr: string,
  startDateStr: string // YYYY-MM-DD
): GraphRecurrence {
  const parts = rruleStr.split(';').reduce<Record<string, string>>((acc, curr) => {
    const [k, v] = curr.split('=')
    if (k && v) acc[k.toUpperCase()] = v
    return acc
  }, {})

  const freq = parts['FREQ'] || 'DAILY'
  const interval = parts['INTERVAL'] ? parseInt(parts['INTERVAL'], 10) : 1
  const count = parts['COUNT'] ? parseInt(parts['COUNT'], 10) : undefined
  const until = parts['UNTIL']
  const byDay = parts['BYDAY']
  const byMonthDay = parts['BYMONTHDAY'] ? parseInt(parts['BYMONTHDAY'], 10) : undefined
  const byMonth = parts['BYMONTH'] ? parseInt(parts['BYMONTH'], 10) : undefined

  let pattern: GraphRecurrencePattern = {
    type: 'daily',
    interval
  }

  if (freq === 'DAILY') {
    pattern = { type: 'daily', interval }
  } else if (freq === 'WEEKLY') {
    const days = byDay
      ? byDay.split(',').map((d) => DAY_MAP_FROM_RRULE[d.toUpperCase()]).filter(Boolean) as any[]
      : ['monday']
    pattern = {
      type: 'weekly',
      interval,
      daysOfWeek: days
    }
  } else if (freq === 'MONTHLY') {
    if (byMonthDay) {
      pattern = {
        type: 'absoluteMonthly',
        interval,
        dayOfMonth: byMonthDay
      }
    } else if (byDay) {
      const match = byDay.match(/^([+-]?\d+)?([A-Z]{2})$/)
      if (match) {
        const idxKey = match[1] || '1'
        const dayCode = match[2]
        pattern = {
          type: 'relativeMonthly',
          interval,
          index: INDEX_MAP_FROM_RRULE[idxKey] || 'first',
          daysOfWeek: [DAY_MAP_FROM_RRULE[dayCode] || 'monday']
        }
      } else {
        pattern = { type: 'absoluteMonthly', interval, dayOfMonth: 1 }
      }
    } else {
      pattern = { type: 'absoluteMonthly', interval, dayOfMonth: 1 }
    }
  } else if (freq === 'YEARLY') {
    if (byMonth && byMonthDay) {
      pattern = {
        type: 'absoluteYearly',
        interval,
        month: byMonth,
        dayOfMonth: byMonthDay
      }
    } else {
      pattern = {
        type: 'absoluteYearly',
        interval,
        month: byMonth || 1,
        dayOfMonth: byMonthDay || 1
      }
    }
  }

  // Range
  let range: GraphRecurrenceRange = {
    type: 'noEnd',
    startDate: startDateStr
  }

  if (count) {
    range = {
      type: 'numbered',
      startDate: startDateStr,
      numberOfOccurrences: count
    }
  } else if (until) {
    const dt = DateTime.fromFormat(until.substring(0, 8), 'yyyyMMdd')
    const endDateFormatted = dt.isValid ? dt.toFormat('yyyy-MM-dd') : startDateStr
    range = {
      type: 'endDate',
      startDate: startDateStr,
      endDate: endDateFormatted
    }
  }

  return { pattern, range }
}
