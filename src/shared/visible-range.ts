import { DateTime } from 'luxon'

export type CalendarViewType = 'day' | 'week' | 'month' | 'year' | 'list'

export interface VisibleRange {
  startUtc: string
  endUtc: string
  label: string
}

/**
 * Calculate the exact query date range and human label for the current view and anchor date
 */
export function getVisibleRange(
  anchorDate: DateTime,
  view: CalendarViewType,
  locale: string = 'vi'
): VisibleRange {
  let start: DateTime = anchorDate
  let end: DateTime = anchorDate
  let label: string = ''

  const isVi = locale === 'vi'

  switch (view) {
    case 'month': {
      const monthStart = anchorDate.startOf('month')
      // Monday of the first week of the month (ISO standard 1=Mon)
      const weekDay = monthStart.weekday // 1=Mon..7=Sun
      start = monthStart.minus({ days: weekDay - 1 }).startOf('day')
      // 42 days total (6 weeks x 7 days)
      end = start.plus({ days: 41 }).endOf('day')
      label = isVi
        ? `Tháng ${anchorDate.month}, ${anchorDate.year}`
        : `${anchorDate.toFormat('MMMM yyyy')}`
      break
    }
    case 'week': {
      const weekDay = anchorDate.weekday
      start = anchorDate.minus({ days: weekDay - 1 }).startOf('day')
      end = start.plus({ days: 6 }).endOf('day')
      const startFmt = start.toFormat('dd/MM')
      const endFmt = end.toFormat('dd/MM/yyyy')
      label = isVi
        ? `Tuần ${anchorDate.weekNumber} (${startFmt} – ${endFmt})`
        : `Week ${anchorDate.weekNumber} (${start.toFormat('MMM d')} – ${end.toFormat('MMM d, yyyy')})`
      break
    }
    case 'day': {
      start = anchorDate.startOf('day')
      end = anchorDate.endOf('day')
      label = isVi
        ? `${anchorDate.toFormat('cccc, dd/MM/yyyy')}`
        : `${anchorDate.toFormat('cccc, MMMM d, yyyy')}`
      break
    }
    case 'year': {
      start = anchorDate.startOf('year')
      end = anchorDate.endOf('year')
      label = String(anchorDate.year)
      break
    }
    case 'list': {
      // Generous window either side of anchor - list view is meant to be freely
      // scrollable, not just a narrow slice around "today".
      start = anchorDate.minus({ days: 90 }).startOf('day')
      end = anchorDate.plus({ days: 180 }).endOf('day')
      // No header title for list view - each group's own sticky date heading already
      // says what date it is, so a static "Schedule (Month)" label above it is redundant.
      label = ''
      break
    }
  }

  return {
    startUtc: start.toUTC().toISO() || start.toISO()!,
    endUtc: end.toUTC().toISO() || end.toISO()!,
    label
  }
}
