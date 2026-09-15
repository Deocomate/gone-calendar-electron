import { DateTime } from 'luxon'
import { formatClockTime, type TimeFormatPref } from '@shared/time-format'

/**
 * Only vertical. East/west used to stretch an event across whole days, which
 * turned a one-hour event into a 25-hour one and was far too easy to trigger
 * while aiming to drag the block somewhere - it corrupted real events. Changing
 * which days an event spans is the editor's job, not a drag gesture's.
 */
export type ResizeEdge = 'n' | 's'

/** Default grid step, used when no setting is threaded through. */
export const RESIZE_SNAP_MINUTES = 15
export const RESIZE_MIN_DURATION_MINUTES = 15

/** The steps offered in settings. */
export const SNAP_STEP_OPTIONS = [15, 30, 60] as const

export function snapMinutes(totalMinutes: number, step = RESIZE_SNAP_MINUTES): number {
  if (!Number.isFinite(totalMinutes)) return 0
  return Math.round(totalMinutes / step) * step
}

export function minutesFromGridY(clientY: number, gridTop: number, hourHeight: number): number {
  if (hourHeight <= 0) return 0
  return ((clientY - gridTop) / hourHeight) * 60
}




export function applyResizeEdge(args: {
  edge: ResizeEdge
  originStart: DateTime
  originEnd: DateTime
  clientX: number
  clientY: number
  gridTop: number
  hourHeight: number
  /** Grid step to snap to; also the shortest result a resize may produce. */
  snapStepMinutes?: number
}): { start: DateTime; end: DateTime } {
  const step = args.snapStepMinutes ?? RESIZE_SNAP_MINUTES
  let start = args.originStart
  let end = args.originEnd
  const { edge } = args

  const snapped = snapMinutes(minutesFromGridY(args.clientY, args.gridTop, args.hourHeight), step)
  const baseDay = (edge === 'n' ? args.originStart : args.originEnd).startOf('day')
  const next = baseDay.plus({ minutes: snapped })
  if (edge === 'n') start = next
  else end = next

  // The floor follows the step. Clamping to a fixed 15 under a one-hour tick
  // would hand back a duration that does not sit on the grid the drag snapped to.
  const minDuration = Math.max(RESIZE_MIN_DURATION_MINUTES, step)
  if (end.toMillis() - start.toMillis() < minDuration * 60 * 1000) {
    if (edge === 'n') {
      start = end.minus({ minutes: minDuration })
    } else {
      end = start.plus({ minutes: minDuration })
    }
  }

  return { start, end }
}

export function formatResizeTooltip(
  edge: ResizeEdge,
  start: DateTime,
  end: DateTime,
  timeFormat: TimeFormatPref
): string {
  const moving = edge === 'n' ? start : end
  const mins = Math.max(0, Math.round(end.diff(start, 'minutes').minutes))
  const hours = Math.floor(mins / 60)
  const rest = mins % 60
  const duration = hours > 0 && rest > 0 ? `${hours}h ${rest}m` : hours > 0 ? `${hours}h` : `${rest}m`
  return `${formatClockTime(moving, timeFormat)} · ${duration}`
}
