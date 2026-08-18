import { useCallback, useState, useRef, type DragEvent } from 'react'
import { DateTime } from 'luxon'
import type { ExpandedOccurrence } from '@shared/event-model'
import type { PendingDropAction } from './DropActionPopover'
import { clampHour, sameDropTarget, type CalendarDropTarget } from './drop-target'

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

  const handleDragStart = useCallback((e: DragEvent, occ: ExpandedOccurrence) => {
    isDraggingRef.current = true
    setDraggedOccurrence(occ)
    document.body.classList.add('is-dnd-active')
    e.dataTransfer.setData('application/json', JSON.stringify(occ))
    e.dataTransfer.effectAllowed = 'copyMove'
  }, [])

  const handleDragOverTarget = useCallback((target: CalendarDropTarget) => {
    setDropTarget((current) => (sameDropTarget(current, target) ? current : target))
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

  const wasJustDragging = useCallback(() => {
    return isDraggingRef.current || Date.now() - lastDragEndRef.current < 300
  }, [])

  const handleDropOnDate = useCallback(
    (e: DragEvent, targetDate: DateTime, targetHour?: number) => {
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

      clearDragState()
      if (!occ) return

      const origStart = DateTime.fromISO(occ.startUtc, { zone: 'utc' }).setZone('local')
      const origEnd = DateTime.fromISO(occ.endUtc, { zone: 'utc' }).setZone('local')
      const durationMinutes = Math.max(15, origEnd.diff(origStart, 'minutes').minutes)

      let newStart: DateTime
      let newEnd: DateTime

      if (targetHour !== undefined) {
        const hour = clampHour(targetHour)
        newStart = targetDate.set({ hour, minute: 0, second: 0, millisecond: 0 })
        newEnd = newStart.plus({ minutes: durationMinutes })
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

      const isCopy = e.altKey

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
    handleDropOnDate
  }
}

export default useEventDnD
