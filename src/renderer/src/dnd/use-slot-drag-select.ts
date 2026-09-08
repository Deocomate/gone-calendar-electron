import { useCallback, useRef, useState } from 'react'
import { DateTime } from 'luxon'
import { minutesFromPointer } from './drop-target'
import { formatClockTimeStr, type TimeFormatPref } from '@shared/time-format'
import { useDisplayPreferences } from '../context/DisplayPreferencesContext'

export interface SlotDragPreview {
  dayKey: string
  topPos: number
  height: number
  clientX: number
  clientY: number
  label: string
}

interface DragState {
  day: DateTime
  dayKey: string
  columnTop: number
  anchorMinutes: number
  currentMinutes: number
  clientX: number
  clientY: number
}

/** Below this span, a drag reads as a plain click - falls back to a 1h default. */
const CLICK_THRESHOLD_MINUTES = 15

function formatRangeLabel(startMin: number, endMin: number, timeFormat: TimeFormatPref): string {
  const fmt = (m: number) =>
    formatClockTimeStr(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`, timeFormat)
  const durMin = endMin - startMin
  const hours = Math.floor(durMin / 60)
  const rest = durMin % 60
  const duration = hours > 0 && rest > 0 ? `${hours}h ${rest}m` : hours > 0 ? `${hours}h` : `${rest}m`
  return `${fmt(startMin)}–${fmt(endMin)} · ${duration}`
}

/**
 * Click-and-drag slot selection for the timed grid: mouse down + drag sets both the
 * start and the duration of a new event in one gesture (a plain click with no drag
 * still falls back to the old 1-hour default via CLICK_THRESHOLD_MINUTES).
 */
export function useSlotDragSelect(options: {
  hourHeight: number
  onComplete: (start: DateTime, end: DateTime, meta: { clientX: number }) => void
}) {
  const { hourHeight, onComplete } = options
  const { timeFormat } = useDisplayPreferences()
  const [preview, setPreview] = useState<SlotDragPreview | null>(null)
  const dragRef = useRef<DragState | null>(null)

  const buildPreview = useCallback(
    (drag: DragState): SlotDragPreview => {
      const lo = Math.min(drag.anchorMinutes, drag.currentMinutes)
      const hi = Math.max(drag.anchorMinutes, drag.currentMinutes)
      const shownHi = hi === lo ? lo + 60 : hi
      return {
        dayKey: drag.dayKey,
        topPos: (lo / 60) * hourHeight,
        height: ((shownHi - lo) / 60) * hourHeight,
        clientX: drag.clientX,
        clientY: drag.clientY,
        label: formatRangeLabel(lo, shownHi, timeFormat)
      }
    },
    [hourHeight, timeFormat]
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const drag = dragRef.current
      if (!drag) return
      drag.currentMinutes = minutesFromPointer(e.clientY, drag.columnTop, hourHeight)
      drag.clientX = e.clientX
      drag.clientY = e.clientY
      setPreview(buildPreview(drag))
    },
    [hourHeight, buildPreview]
  )

  const handleMouseUp = useCallback(() => {
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', handleMouseUp)

    const drag = dragRef.current
    dragRef.current = null
    setPreview(null)
    if (!drag) return

    const lo = Math.min(drag.anchorMinutes, drag.currentMinutes)
    const hi = Math.max(drag.anchorMinutes, drag.currentMinutes)
    const start = drag.day.startOf('day').plus({ minutes: lo })
    const end =
      hi - lo < CLICK_THRESHOLD_MINUTES
        ? start.plus({ hours: 1 })
        : drag.day.startOf('day').plus({ minutes: hi })
    onComplete(start, end, { clientX: drag.clientX })
  }, [handleMouseMove, onComplete])

  const startDrag = useCallback(
    (e: React.MouseEvent, day: DateTime, dayKey: string) => {
      if (e.button !== 0) return
      // Don't hijack drags/clicks that started on an existing event card.
      if ((e.target as HTMLElement).closest('.gc-event')) return

      const rect = e.currentTarget.getBoundingClientRect()
      const minutes = minutesFromPointer(e.clientY, rect.top, hourHeight)
      const drag: DragState = {
        day,
        dayKey,
        columnTop: rect.top,
        anchorMinutes: minutes,
        currentMinutes: minutes,
        clientX: e.clientX,
        clientY: e.clientY
      }
      dragRef.current = drag
      setPreview(buildPreview(drag))
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    },
    [hourHeight, buildPreview, handleMouseMove, handleMouseUp]
  )

  return { preview, startDrag }
}
