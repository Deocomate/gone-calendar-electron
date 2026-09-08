import { DateTime } from 'luxon'
import type { ExpandedOccurrence } from '@shared/event-model'

export interface AllDayBarLayout {
  occ: ExpandedOccurrence
  /** 0-6 index into the week, clamped to the visible week. */
  startCol: number
  /** How many day columns this bar covers, clamped to the visible week. */
  span: number
  /** Vertical stack row (0-based) - overlapping multi-day bars land in different lanes. */
  lane: number
}

/**
 * Lays out all-day events as horizontal bars spanning every day they cover within
 * this week (clamped at the week's edges), stacked into lanes so overlapping
 * multi-day events don't collide - same idea as Google Calendar's all-day row.
 */
export function layoutAllDayEvents(
  occs: ExpandedOccurrence[],
  weekDays: DateTime[]
): AllDayBarLayout[] {
  if (weekDays.length === 0 || occs.length === 0) return []
  const weekStart = weekDays[0].startOf('day')
  const weekEnd = weekDays[weekDays.length - 1].startOf('day')

  const items = occs
    .map((occ) => {
      const occStart = DateTime.fromISO(occ.startUtc, { zone: 'utc' }).startOf('day')
      const occEnd = DateTime.fromISO(occ.endUtc, { zone: 'utc' }).startOf('day')
      const clampedStart = occStart < weekStart ? weekStart : occStart
      const clampedEnd = occEnd > weekEnd ? weekEnd : occEnd
      if (clampedEnd < clampedStart) return null
      const startCol = Math.round(clampedStart.diff(weekStart, 'days').days)
      const endCol = Math.round(clampedEnd.diff(weekStart, 'days').days)
      return { occ, startCol, endCol, span: endCol - startCol + 1 }
    })
    .filter((x): x is { occ: ExpandedOccurrence; startCol: number; endCol: number; span: number } => x !== null)
    // Earlier and longer bars get first pick of a lane, like Google Calendar.
    .sort((a, b) => a.startCol - b.startCol || b.span - a.span)

  const laneEndCol: number[] = []
  const layouts: AllDayBarLayout[] = []

  for (const item of items) {
    let lane = laneEndCol.findIndex((endCol) => endCol < item.startCol)
    if (lane === -1) {
      lane = laneEndCol.length
      laneEndCol.push(item.endCol)
    } else {
      laneEndCol[lane] = item.endCol
    }
    layouts.push({ occ: item.occ, startCol: item.startCol, span: item.span, lane })
  }

  return layouts
}
