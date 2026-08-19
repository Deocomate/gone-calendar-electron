import type { DragEvent } from 'react'
import { DateTime } from 'luxon'
import { RESIZE_SNAP_MINUTES, snapMinutes } from './resize-math'

export type CalendarDropTarget = {
  dateKey: string
  hour?: number
  minutes?: number
}

export function sameDropTarget(
  a: CalendarDropTarget | null,
  b: CalendarDropTarget | null
): boolean {
  if (a === b) return true
  if (!a || !b) return false
  return a.dateKey === b.dateKey && a.hour === b.hour && a.minutes === b.minutes
}

export function clampHour(hour: number): number {
  if (!Number.isFinite(hour)) return 0
  return Math.max(0, Math.min(23, Math.floor(hour)))
}

export function hourFromPointer(clientY: number, top: number, hourHeight: number): number {
  return clampHour((clientY - top) / hourHeight)
}

export function minutesFromPointer(clientY: number, top: number, hourHeight: number): number {
  if (hourHeight <= 0) return 0
  const raw = ((clientY - top) / hourHeight) * 60
  const snapped = snapMinutes(raw, RESIZE_SNAP_MINUTES)
  return Math.max(0, Math.min(24 * 60 - RESIZE_SNAP_MINUTES, snapped))
}

export function grabOffsetMinutes(
  clientY: number,
  eventTop: number,
  eventHeight: number,
  durationMinutes: number
): number {
  if (eventHeight <= 0) return 0
  const ratio = Math.max(0, Math.min(1, (clientY - eventTop) / eventHeight))
  return ratio * Math.max(RESIZE_SNAP_MINUTES, durationMinutes)
}

export function dropRangeFromPointer(args: {
  targetDate: DateTime
  pointerMinutes: number
  durationMinutes: number
  grabOffsetMinutes?: number
}): { start: DateTime; end: DateTime } {
  const duration = Math.max(RESIZE_SNAP_MINUTES, args.durationMinutes)
  const snappedStart = Math.max(
    0,
    snapMinutes(args.pointerMinutes - (args.grabOffsetMinutes ?? 0), RESIZE_SNAP_MINUTES)
  )
  const start = args.targetDate.startOf('day').plus({ minutes: snappedStart })
  return { start, end: start.plus({ minutes: duration }) }
}

/**
 * Move a timed occurrence by the delta between the dragged slice and the drop point.
 * Keeps overnight / multi-day span instead of rebuilding end from full duration.
 */
export function shiftOccurrenceByDrop(args: {
  origStart: DateTime
  origEnd: DateTime
  segmentStart: DateTime
  targetDate: DateTime
  pointerMinutes: number
  grabOffsetMinutes?: number
}): { start: DateTime; end: DateTime } {
  const dropped = dropRangeFromPointer({
    targetDate: args.targetDate,
    pointerMinutes: args.pointerMinutes,
    durationMinutes: RESIZE_SNAP_MINUTES,
    grabOffsetMinutes: args.grabOffsetMinutes
  })
  const deltaMs = dropped.start.toMillis() - args.segmentStart.toMillis()
  return {
    start: args.origStart.plus({ milliseconds: deltaMs }),
    end: args.origEnd.plus({ milliseconds: deltaMs })
  }
}

export function prepareDropEvent(e: DragEvent): void {
  e.preventDefault()
  e.dataTransfer.dropEffect = e.altKey ? 'copy' : 'move'
}
