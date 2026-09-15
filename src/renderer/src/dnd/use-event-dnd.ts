import { useCallback, useState, useRef, type DragEvent } from 'react'
import { DateTime } from 'luxon'
import type { ExpandedOccurrence } from '@shared/event-model'
import type { TimedSegment } from '@shared/timed-event-segments'
import type { PendingDropAction } from './DropActionPopover'
import {
  grabOffsetMinutes,
  resolveDropRange,
  sameDropTarget,
  type CalendarDropTarget
} from './drop-target'
import { snapMinutes } from './resize-math'

/**
 * `snapStepMinutes` is a required argument rather than a read of
 * DisplayPreferencesContext, which is what this hook used to do. App calls it
 * from its own body, above the provider it renders in its JSX, so the context
 * read silently returned the default 15 no matter what the setting said -
 * dragging snapped to quarter hours while resizing, done from inside the views,
 * correctly used the configured step. Taking it as an argument makes the
 * mismatch impossible: there is no default to fall back to.
 */
export function useEventDnD(
  snapStepMinutes: number,
  onDirectMove?: (
    occ: ExpandedOccurrence,
    targetStart: DateTime,
    targetEnd: DateTime,
    isCopy: boolean,
    /** true when the drop landed on the hourly time grid, so the occurrence
     *  should become timed; undefined leaves its all-day-ness unchanged. */
    droppedOnTimeGrid?: boolean
  ) => void
) {
  const dragSnapMinutes = snapStepMinutes
  const [draggedOccurrence, setDraggedOccurrence] = useState<ExpandedOccurrence | null>(null)
  const [dropTarget, setDropTarget] = useState<CalendarDropTarget | null>(null)
  const [pendingDrop, setPendingDrop] = useState<PendingDropAction | null>(null)
  const isDraggingRef = useRef<boolean>(false)
  const lastDragEndRef = useRef<number>(0)
  const grabOffsetRef = useRef(0)
  const segmentStartRef = useRef<DateTime | null>(null)

  const handleDragStart = useCallback(
    (e: DragEvent, occ: ExpandedOccurrence, segment?: TimedSegment) => {
      isDraggingRef.current = true
      setDraggedOccurrence(occ)
      document.body.classList.add('is-dnd-active')
      e.dataTransfer.setData('application/json', JSON.stringify(occ))
      e.dataTransfer.effectAllowed = 'copyMove'

      const origStart = DateTime.fromISO(occ.startUtc, { zone: 'utc' }).setZone('local')
      const origEnd = DateTime.fromISO(occ.endUtc, { zone: 'utc' }).setZone('local')
      const visualDuration = segment
        ? Math.max(dragSnapMinutes, segment.endLocal.diff(segment.startLocal, 'minutes').minutes)
        : Math.max(dragSnapMinutes, origEnd.diff(origStart, 'minutes').minutes)
      segmentStartRef.current = segment?.startLocal ?? origStart
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      // An all-day pill is a short bar with a 24-hour span, so where you grabbed
      // it says nothing about a time of day. Measuring an offset from it put the
      // drop preview - and the drop - hours away from the cursor.
      grabOffsetRef.current = occ.allDay
        ? 0
        : grabOffsetMinutes(e.clientY, rect.top, rect.height, visualDuration, dragSnapMinutes)
    },
    [dragSnapMinutes]
  )

  const handleDragOverTarget = useCallback(
    (target: CalendarDropTarget) => {
      let next = target
      if (target.minutes !== undefined) {
        const startMinutes = Math.max(
          0,
          snapMinutes(target.minutes - grabOffsetRef.current, dragSnapMinutes)
        )
        next = {
          ...target,
          minutes: startMinutes,
          hour: Math.floor(startMinutes / 60)
        }
      }
      setDropTarget((current) => (sameDropTarget(current, next) ? current : next))
    },
    [dragSnapMinutes]
  )

  const clearDragState = useCallback(() => {
    document.body.classList.remove('is-dnd-active')
    setDraggedOccurrence(null)
    setDropTarget(null)
    isDraggingRef.current = false
    lastDragEndRef.current = Date.now()
  }, [])

  const handleDragEnd = useCallback(() => {
    clearDragState()
  }, [clearDragState])

  const markPointerBusyEnd = useCallback(() => {
    lastDragEndRef.current = Date.now()
    isDraggingRef.current = false
  }, [])

  const wasJustDragging = useCallback(() => {
    return isDraggingRef.current || Date.now() - lastDragEndRef.current < 300
  }, [])

  const handleDropOnDate = useCallback(
    (e: DragEvent, targetDate: DateTime, targetMinutes?: number, forceCopy = false) => {
      e.preventDefault()
      e.stopPropagation()

      let occ: ExpandedOccurrence | null = draggedOccurrence
      if (!occ) {
        try {
          const raw = e.dataTransfer.getData('application/json')
          if (raw) occ = JSON.parse(raw)
        } catch {
          // Ignore parse error
        }
      }

      const grabOffsetMinutesValue = grabOffsetRef.current
      const segmentStart = segmentStartRef.current
      grabOffsetRef.current = 0
      segmentStartRef.current = null
      clearDragState()
      if (!occ) return

      const origStart = DateTime.fromISO(occ.startUtc, { zone: 'utc' }).setZone('local')
      const origEnd = DateTime.fromISO(occ.endUtc, { zone: 'utc' }).setZone('local')

      const { start: newStart, end: newEnd } = resolveDropRange({
        allDay: Boolean(occ.allDay),
        origStart,
        origEnd,
        segmentStart: segmentStart ?? origStart,
        targetDate,
        targetMinutes,
        grabOffsetMinutes: grabOffsetMinutesValue,
        snapStepMinutes: dragSnapMinutes
      })

      if (newStart.toMillis() === origStart.toMillis() && newEnd.toMillis() === origEnd.toMillis()) {
        return
      }

      const isCopy = forceCopy || e.altKey

      // Execute direct move/copy immediately without modal interruption
      if (onDirectMove) {
        onDirectMove(occ, newStart, newEnd, isCopy, targetMinutes !== undefined)
        return
      }

      setPendingDrop({
        occurrence: occ,
        targetStart: newStart,
        targetEnd: newEnd,
        position: { x: e.clientX, y: e.clientY }
      })
    },
    [clearDragState, draggedOccurrence, dragSnapMinutes, onDirectMove]
  )

  return {
    draggedOccurrence,
    dropTarget,
    pendingDrop,
    setPendingDrop,
    wasJustDragging,
    handleDragStart,
    handleDragEnd,
    handleDragOverTarget,
    handleDropOnDate,
    markPointerBusyEnd
  }
}

export default useEventDnD
