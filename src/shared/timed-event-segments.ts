import { DateTime } from 'luxon'
import type { ExpandedOccurrence } from './event-model'

export interface TimedSegment {
  occ: ExpandedOccurrence
  dateKey: string
  startLocal: DateTime
  endLocal: DateTime
  isFirst: boolean
  isLast: boolean
}

/**
 * Split a timed occurrence into local calendar-day slices.
 * Exclusive midnight end stays on the previous day (22:00–24:00 is one segment).
 */
export function segmentTimedOccurrence(occ: ExpandedOccurrence): TimedSegment[] {
  if (occ.allDay) return []

  const start = DateTime.fromISO(occ.startUtc, { zone: 'utc' }).setZone('local')
  const end = DateTime.fromISO(occ.endUtc, { zone: 'utc' }).setZone('local')
  if (!start.isValid || !end.isValid || end <= start) return []

  const lastDay = isExclusiveMidnight(end) ? end.minus({ milliseconds: 1 }).startOf('day') : end.startOf('day')
  const spansDays = lastDay > start.startOf('day')
  const startClock = start.hour * 60 + start.minute
  const endClock = end.hour * 60 + end.minute
  const useClockWindow = spansDays && startClock < endClock

  const segments: TimedSegment[] = []
  let cursor = start.startOf('day')

  while (cursor <= lastDay) {
    let segStart: DateTime
    let segEnd: DateTime
    if (useClockWindow) {
      segStart = cursor.set({ hour: start.hour, minute: start.minute, second: 0, millisecond: 0 })
      segEnd = cursor.set({ hour: end.hour, minute: end.minute, second: 0, millisecond: 0 })
    } else {
      const dayEnd = cursor.plus({ days: 1 })
      segStart = start > cursor ? start : cursor
      segEnd = end < dayEnd ? end : dayEnd
    }
    if (segEnd > segStart) {
      segments.push({
        occ,
        dateKey: cursor.toFormat('yyyy-MM-dd'),
        startLocal: segStart,
        endLocal: segEnd,
        isFirst: cursor.hasSame(start, 'day'),
        isLast: cursor.hasSame(lastDay, 'day')
      })
    }
    cursor = cursor.plus({ days: 1 })
  }

  return segments
}

export function segmentDayMinutes(segment: TimedSegment): { startMin: number; endMin: number } {
  const dayStart = DateTime.fromFormat(segment.dateKey, 'yyyy-MM-dd').startOf('day')
  const startMin = Math.max(0, Math.round(segment.startLocal.diff(dayStart, 'minutes').minutes))
  const endMin = Math.max(startMin + 1, Math.round(segment.endLocal.diff(dayStart, 'minutes').minutes))
  return { startMin, endMin }
}

function isExclusiveMidnight(dt: DateTime): boolean {
  return dt.hour === 0 && dt.minute === 0 && dt.second === 0 && dt.millisecond === 0
}
