import { DateTime } from 'luxon'
import { formatClockTime, type TimeFormatPref } from '@shared/time-format'

export type ResizeEdge = 'n' | 's' | 'e' | 'w'

export const RESIZE_SNAP_MINUTES = 15
export const RESIZE_MIN_DURATION_MINUTES = 15

export function snapMinutes(totalMinutes: number, step = RESIZE_SNAP_MINUTES): number {
  if (!Number.isFinite(totalMinutes)) return 0
  return Math.round(totalMinutes / step) * step
}

export function minutesFromGridY(clientY: number, gridTop: number, hourHeight: number): number {
  if (hourHeight <= 0) return 0
  return ((clientY - gridTop) / hourHeight) * 60
}

export function dayFromClientX(
  clientX: number,
  columns: Array<{ left: number; right: number; day: DateTime }>
): DateTime | null {
  if (columns.length === 0) return null
  for (const col of columns) {
    if (clientX >= col.left && clientX < col.right) return col.day
  }
  if (clientX < columns[0].left) return columns[0].day
  return columns[columns.length - 1].day
}

export function averageColumnWidth(columns: Array<{ left: number; right: number }>): number {
  const widths = columns.map((col) => col.right - col.left).filter((width) => width > 8)
  if (widths.length === 0) return 0
  return widths.reduce((sum, width) => sum + width, 0) / widths.length
}

export function daysDeltaFromPointer(originX: number, clientX: number, columnWidth: number): number {
  if (columnWidth <= 0) return 0
  return Math.round((clientX - originX) / columnWidth)
}

export function applyResizeEdge(args: {
  edge: ResizeEdge
  originStart: DateTime
  originEnd: DateTime
  clientX: number
  clientY: number
  gridTop: number
  hourHeight: number
  daysDelta?: number
}): { start: DateTime; end: DateTime } {
  let start = args.originStart
  let end = args.originEnd
  const { edge } = args

  if (edge === 'n' || edge === 's') {
    const snapped = snapMinutes(minutesFromGridY(args.clientY, args.gridTop, args.hourHeight))
    const baseDay = (edge === 'n' ? args.originStart : args.originEnd).startOf('day')
    const next = baseDay.plus({ minutes: snapped })
    if (edge === 'n') start = next
    else end = next
  } else {
    const delta = args.daysDelta ?? 0
    if (edge === 'w') start = args.originStart.plus({ days: delta })
    else end = args.originEnd.plus({ days: delta })
  }

  const minMs = RESIZE_MIN_DURATION_MINUTES * 60 * 1000
  if (end.toMillis() - start.toMillis() < minMs) {
    if (edge === 'n' || edge === 'w') {
      start = end.minus({ minutes: RESIZE_MIN_DURATION_MINUTES })
    } else {
      end = start.plus({ minutes: RESIZE_MIN_DURATION_MINUTES })
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
  const moving = edge === 'n' || edge === 'w' ? start : end
  const mins = Math.max(0, Math.round(end.diff(start, 'minutes').minutes))
  const hours = Math.floor(mins / 60)
  const rest = mins % 60
  const duration = hours > 0 && rest > 0 ? `${hours}h ${rest}m` : hours > 0 ? `${hours}h` : `${rest}m`
  if (edge === 'e' || edge === 'w') {
    const startClock = start.hour * 60 + start.minute
    const endClock = end.hour * 60 + end.minute
    const dayCount = Math.round(end.startOf('day').diff(start.startOf('day'), 'days').days) + 1
    if (dayCount > 1 && startClock < endClock) {
      return `${start.toFormat('dd/MM')}–${end.toFormat('dd/MM')} · ${formatClockTime(start, timeFormat)}–${formatClockTime(end, timeFormat)}`
    }
    return `${moving.toFormat('dd/MM')} ${formatClockTime(moving, timeFormat)} · ${duration}`
  }
  return `${formatClockTime(moving, timeFormat)} · ${duration}`
}
