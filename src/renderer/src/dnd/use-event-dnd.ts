import { useCallback, useState, useRef, type DragEvent } from 'react'
import { DateTime } from 'luxon'
import type { ExpandedOccurrence } from '@shared/event-model'
import type { TimedSegment } from '@shared/timed-event-segments'
import type { PendingDropAction } from './DropActionPopover'
import {
  grabOffsetMinutes,
  sameDropTarget,
  shiftOccurrenceByDrop,
  type CalendarDropTarget
} from './drop-target'
import { RESIZE_SNAP_MINUTES, snapMinutes } from './resize-math'

export function useEventDnD(
  onDirectMove?: (
    occ: ExpandedOccurrence,
    targetStart: DateTime,
    targetEnd: DateTime,
    isCopy: boolean
  ) => void
) {
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
        ? Math.max(RESIZE_SNAP_MINUTES, segment.endLocal.diff(segment.startLocal, 'minutes').minutes)
        : Math.max(RESIZE_SNAP_MINUTES, origEnd.diff(origStart, 'minutes').minutes)
      segmentStartRef.current = segment?.startLocal ?? origStart
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      grabOffsetRef.current = grabOffsetMinutes(e.clientY, rect.top, rect.height, visualDuration)
    },
    []
  )

  const handleDragOverTarget = useCallback((target: CalendarDropTarget) => {
    let next = target
    if (target.minutes !== undefined) {
      const startMinutes = Math.max(
        0,
        snapMinutes(target.minutes - grabOffsetRef.current, RESIZE_SNAP_MINUTES)
      )
      next = {
        ...target,
        minutes: startMinutes,
        hour: Math.floor(startMinutes / 60)
      }
    }
    setDropTarget((current) => (sameDropTarget(current, next) ? current : next))
  }, [])

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
      const durationMinutes = Math.max(
        RESIZE_SNAP_MINUTES,
        origEnd.diff(origStart, 'minutes').minutes
      )

      let newStart: DateTime
      let newEnd: DateTime

      if (targetMinutes !== undefined) {
        const shifted = shiftOccurrenceByDrop({
          origStart,
          origEnd,
          segmentStart: segmentStart ?? origStart,
          targetDate,
          pointerMinutes: targetMinutes,
          grabOffsetMinutes: grabOffsetMinutesValue
        })
        newStart = shifted.start
        newEnd = shifted.end
      } else {
        newStart = targetDate.set({
          hour: origStart.hour,
          minute: origStart.minute,
          second: 0,
          millisecond: 0
        })
        newEnd = newStart.plus({ minutes: durationMinutes })
      }

      if (newStart.toMillis() === origStart.toMillis() && newEnd.toMillis() === origEnd.toMillis()) {
        return
      }

      const isCopy = forceCopy || e.altKey

      // Execute direct move/copy immediately without modal interruption
      if (onDirectMove) {
        onDirectMove(occ, newStart, newEnd, isCopy)
        return
      }

      setPendingDrop({
        occurrence: occ,
        targetStart: newStart,
        targetEnd: newEnd,
        position: { x: e.clientX, y: e.clientY }
      })
    },
    [clearDragState, draggedOccurrence, onDirectMove]
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
