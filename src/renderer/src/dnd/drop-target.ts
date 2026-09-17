import type { DragEvent } from 'react'
import { DateTime } from 'luxon'
import { RESIZE_SNAP_MINUTES, snapMinutes } from './resize-math'

/**
 * Put a time on a day by its clock face, not by elapsed minutes.
 *
 * `startOf('day').plus({ minutes })` adds real time, so on the day a zone
 * springs forward it skips an hour: dropping on the 10:00 row of 4 Oct in Sydney
 * produced an event at 11:00. Setting the fields asks for that clock time, and
 * Luxon resolves the offset.
 *
 * 1440 means the end of the day, which is midnight on the next one.
 */
function atMinutesOfDay(day: DateTime, minutes: number): DateTime {
  const base = day.startOf('day')
  if (minutes >= 24 * 60) return base.plus({ days: 1 }).startOf('day')
  return base.set({
    hour: Math.floor(minutes / 60),
    minute: minutes % 60,
    second: 0,
    millisecond: 0
  })
}

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
  snapStepMinutes: number = RESIZE_SNAP_MINUTES,
  /**
   * Let the reading reach midnight (1440).
   *
   * The default stops one step short, which is right for a *start* - nothing can
   * begin at the end of the day. It is wrong for the moving edge of a drag,
   * where it meant the last block of the day could never be filled: dragging to
   * the bottom of the grid gave 23:30, so 23:30-00:00 was unreachable.
   */
  allowEndOfDay = false
): number {
  if (hourHeight <= 0) return 0
  const raw = ((clientY - top) / hourHeight) * 60
  const snapped = snapMinutes(raw, snapStepMinutes)
  const max = allowEndOfDay ? 24 * 60 : 24 * 60 - snapStepMinutes
  return Math.max(0, Math.min(max, snapped))
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
  // Snapped, not raw. An arbitrary offset subtracted from an already-snapped
  // pointer gives the drop a phase that depends on where inside the block you
  // happened to grab, so the preview and the drop can disagree about the grid.
  return snapMinutes(ratio * Math.max(snapStepMinutes, durationMinutes), snapStepMinutes)
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
  const start = atMinutesOfDay(args.targetDate, snappedStart)
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
  const rawStart = args.origStart.plus({ milliseconds: deltaMs })

  // Land the start on the grid, then carry the end by the same correction so the
  // span is untouched.
  //
  // The delta alone is not enough. It is measured from the slice being dragged,
  // which for a multi-day event is midnight rather than the event's own start -
  // so an event beginning at 09:07 kept its :07 through every drop and could
  // never reach a round time. Events pulled from a provider start at arbitrary
  // minutes, so this was not an edge case.
  const step = args.snapStepMinutes ?? RESIZE_SNAP_MINUTES
  const minutesOfDay = rawStart.hour * 60 + rawStart.minute + rawStart.second / 60
  const start = atMinutesOfDay(rawStart, snapMinutes(minutesOfDay, step))

  // Carry the end by however much the start actually moved. Taking the snap as
  // a minute count would be wrong across a DST boundary, where the correction
  // in clock terms and in elapsed time are different numbers.
  const correctionMs = start.toMillis() - rawStart.startOf('minute').toMillis()
  return {
    start,
    end: args.origEnd
      .plus({ milliseconds: deltaMs })
      .startOf('minute')
      .plus({ milliseconds: correctionMs })
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
  /** The drop landed on the all-day lane rather than a plain day cell. */
  toAllDayLane?: boolean
}): { start: DateTime; end: DateTime } {
  const step = args.snapStepMinutes ?? RESIZE_SNAP_MINUTES

  if (args.toAllDayLane) {
    return allDayRangeForDrop(args.targetDate, args.origStart, args.origEnd)
  }

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

/**
 * What a timed occurrence becomes when it is dropped on the all-day lane.
 *
 * The mirror of `timedRangeForAllDayDrop`. All-day events are floating dates, so
 * this deliberately builds the range in UTC from the target's calendar date
 * rather than converting a local midnight - the stored convention is midnight
 * UTC to 23:59:59.999 UTC, and converting a local midnight lands a day out west
 * of GMT.
 *
 * An event that covered several days keeps that many days; a normal one-day
 * event becomes a single all-day event.
 */
export function allDayRangeForDrop(
  targetDate: DateTime,
  origStart: DateTime,
  origEnd: DateTime
): { start: DateTime; end: DateTime } {
  const dayCount = Math.max(
    1,
    Math.round(origEnd.startOf('day').diff(origStart.startOf('day'), 'days').days) + 1
  )
  const start = DateTime.fromISO(`${targetDate.toISODate()}T00:00:00.000`, { zone: 'utc' })
  return { start, end: start.plus({ days: dayCount - 1 }).endOf('day') }
}

/**
 * Confine a dropped range to the day it starts on.
 *
 * Drag-copy makes a fresh single event, so a source that ran across several days
 * must not hand its span to the copy - dropping a three-day event at 14:00
 * should give you one event at 14:00, not another three-day block. The length is
 * kept where it fits and trimmed back to the day's last grid slot where it does
 * not. A drop so late that even one step does not fit still gets one step rather
 * than a zero-length event, so it may cross midnight by a few minutes - the
 * point is not inheriting a multi-day span, not avoiding midnight at all costs.
 */
export function singleDayRange(
  start: DateTime,
  end: DateTime,
  snapStepMinutes: number = RESIZE_SNAP_MINUTES
): { start: DateTime; end: DateTime } {
  const endOfDay = start.endOf('day')
  if (end <= endOfDay) return { start, end }

  // Snap *down* onto the grid: rounding could push the end past midnight, and a
  // copy ending at 23:59:59.999 is not a time anyone meant to pick.
  const remaining = endOfDay.diff(start, 'minutes').minutes
  const minutes = Math.max(snapStepMinutes, Math.floor(remaining / snapStepMinutes) * snapStepMinutes)
  return { start, end: start.plus({ minutes }) }
}

/**
 * Should this drop stop and ask whether to move or copy?
 *
 * Only a timed occurrence that stays timed is genuinely ambiguous. Everything
 * else is a decision the gesture already made: dragging across the lanes is a
 * conversion between all-day and timed, and an all-day event landing on another
 * day is an unambiguous move. Prompting for those is noise.
 */
export function dropNeedsMoveOrCopyChoice(args: {
  sourceAllDay: boolean
  /** What the drop makes it: true all-day, false timed, undefined unchanged. */
  targetAllDay?: boolean
}): boolean {
  if (args.sourceAllDay) return false
  return args.targetAllDay !== true
}
