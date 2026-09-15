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

  // An all-day occurrence is a floating calendar date stored at UTC midnight,
  // while weekDays are local. Comparing the two as instants drifted by the zone
  // offset: east of GMT the UTC day start fell past the local week end, so the
  // final column's bars were clamped into nothing and dropped. Reduce both sides
  // to a plain ISO date and do integer day arithmetic in one zone instead.
  const lastCol = weekDays.length - 1
  const base = DateTime.fromISO(weekDays[0].toISODate()!, { zone: 'utc' })

  const dateOf = (occ: ExpandedOccurrence, iso: string): string =>
    occ.allDay
      ? iso.slice(0, 10)
      : DateTime.fromISO(iso, { zone: 'utc' }).toLocal().toISODate()!

  const colOf = (isoDate: string): number =>
    Math.round(DateTime.fromISO(isoDate, { zone: 'utc' }).diff(base, 'days').days)

  const items = occs
    .map((occ) => {
      const rawStart = colOf(dateOf(occ, occ.startUtc))
      const rawEnd = colOf(dateOf(occ, occ.endUtc))
      // Entirely before or after the visible week.
      if (rawEnd < 0 || rawStart > lastCol) return null
      const startCol = Math.max(0, rawStart)
      const endCol = Math.min(lastCol, rawEnd)
      if (endCol < startCol) return null
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
