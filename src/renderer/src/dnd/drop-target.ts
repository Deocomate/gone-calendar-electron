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

export function minutesFromPointer(
  clientY: number,
  top: number,
  hourHeight: number,
  snapStepMinutes: number = RESIZE_SNAP_MINUTES
): number {
  if (hourHeight <= 0) return 0
  const raw = ((clientY - top) / hourHeight) * 60
  const snapped = snapMinutes(raw, snapStepMinutes)
  return Math.max(0, Math.min(24 * 60 - snapStepMinutes, snapped))
}

export function grabOffsetMinutes(
  clientY: number,
  eventTop: number,
  eventHeight: number,
  durationMinutes: number,
  snapStepMinutes: number = RESIZE_SNAP_MINUTES
): number {
  if (eventHeight <= 0) return 0
  const ratio = Math.max(0, Math.min(1, (clientY - eventTop) / eventHeight))
  return ratio * Math.max(snapStepMinutes, durationMinutes)
}

export function dropRangeFromPointer(args: {
  targetDate: DateTime
  pointerMinutes: number
  durationMinutes: number
  grabOffsetMinutes?: number
  snapStepMinutes?: number
}): { start: DateTime; end: DateTime } {
  const step = args.snapStepMinutes ?? RESIZE_SNAP_MINUTES
  const duration = Math.max(step, args.durationMinutes)
  const snappedStart = Math.max(
    0,
    snapMinutes(args.pointerMinutes - (args.grabOffsetMinutes ?? 0), step)
  )
  const start = args.targetDate.startOf('day').plus({ minutes: snappedStart })
  return { start, end: start.plus({ minutes: duration }) }
}

/**
 * Move a timed occurrence by the delta between the dragged slice and the drop point.
 * Keeps overnight / multi-day span instead of rebuilding end from full duration.
 */
/**
 * Length an all-day event becomes when it is dropped onto the hourly grid.
 * Google uses an hour for the same gesture and it is the least surprising
 * default: the point of the drag is "give this a time", not "keep its span".
 */
export const ALL_DAY_TO_TIMED_MINUTES = 60

/**
 * Where an all-day occurrence lands when it is dropped on the time grid.
 *
 * Deliberately not `shiftOccurrenceByDrop`. That one moves an event by the delta
 * between the slice you grabbed and where you let go, which needs the dragged
 * thing to occupy real vertical space on the same scale as the drop target. An
 * all-day pill does not: it is a ~20px bar whose stored span is a full 24 hours,
 * so the shift maths read a mid-pill grab as a 12-hour grab offset and dropped
 * the event at 02:00 when you aimed at 14:00 - then gave it a 24-hour block.
 *
 * Placing it outright from the pointer is both correct and what the gesture
 * means. `grabOffsetMinutes` is intentionally absent; there is nothing sensible
 * to subtract.
 */
export function timedRangeForAllDayDrop(args: {
  targetDate: DateTime
  pointerMinutes: number
  durationMinutes?: number
  snapStepMinutes?: number
}): { start: DateTime; end: DateTime } {
  return dropRangeFromPointer({
    targetDate: args.targetDate,
    pointerMinutes: args.pointerMinutes,
    durationMinutes: args.durationMinutes ?? ALL_DAY_TO_TIMED_MINUTES,
    grabOffsetMinutes: 0,
    snapStepMinutes: args.snapStepMinutes
  })
}

export function shiftOccurrenceByDrop(args: {
  origStart: DateTime
  origEnd: DateTime
  segmentStart: DateTime
  targetDate: DateTime
  pointerMinutes: number
  grabOffsetMinutes?: number
  snapStepMinutes?: number
}): { start: DateTime; end: DateTime } {
  const dropped = dropRangeFromPointer({
    targetDate: args.targetDate,
    pointerMinutes: args.pointerMinutes,
    durationMinutes: args.snapStepMinutes ?? RESIZE_SNAP_MINUTES,
    grabOffsetMinutes: args.grabOffsetMinutes,
    snapStepMinutes: args.snapStepMinutes
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

/**
 * The one decision a drop has to make: which range does this gesture produce?
 *
 * Three cases, and picking the wrong one is what broke all-day drops:
 *
 * - all-day onto the hourly grid -> place it at the pointer, an hour long
 * - anything else onto the hourly grid -> shift by the drag delta, keeping span
 * - onto a day cell with no time -> keep the time of day, change the date
 *
 * Kept here rather than inside the hook so the choice is testable without a
 * DragEvent.
 */
export function resolveDropRange(args: {
  allDay: boolean
  origStart: DateTime
  origEnd: DateTime
  segmentStart: DateTime
  targetDate: DateTime
  /** Minutes from midnight when the drop landed on the hourly grid. */
  targetMinutes?: number
  grabOffsetMinutes?: number
  snapStepMinutes?: number
}): { start: DateTime; end: DateTime } {
  const step = args.snapStepMinutes ?? RESIZE_SNAP_MINUTES
  if (args.targetMinutes === undefined) {
    const durationMinutes = Math.max(
      step,
      args.origEnd.diff(args.origStart, 'minutes').minutes
    )
    const start = args.targetDate.set({
      hour: args.origStart.hour,
      minute: args.origStart.minute,
      second: 0,
      millisecond: 0
    })
    return { start, end: start.plus({ minutes: durationMinutes }) }
  }

  if (args.allDay) {
    return timedRangeForAllDayDrop({
      targetDate: args.targetDate,
      pointerMinutes: args.targetMinutes,
      snapStepMinutes: step
    })
  }

  return shiftOccurrenceByDrop({
    origStart: args.origStart,
    origEnd: args.origEnd,
    segmentStart: args.segmentStart,
    targetDate: args.targetDate,
    pointerMinutes: args.targetMinutes,
    grabOffsetMinutes: args.grabOffsetMinutes,
    snapStepMinutes: step
  })
}
