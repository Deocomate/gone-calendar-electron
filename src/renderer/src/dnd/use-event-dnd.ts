import { useState } from 'react'
import { DateTime } from 'luxon'
import type { ExpandedOccurrence } from '@shared/event-model'
import type { PendingDropAction } from './DropActionPopover'

export function useEventDnD() {
  const [draggedOccurrence, setDraggedOccurrence] = useState<ExpandedOccurrence | null>(null)
  const [pendingDrop, setPendingDrop] = useState<PendingDropAction | null>(null)

  const handleDragStart = (e: React.DragEvent, occ: ExpandedOccurrence) => {
    setDraggedOccurrence(occ)
    e.dataTransfer.setData('application/json', JSON.stringify(occ))
    e.dataTransfer.effectAllowed = 'copyMove'
  }

  const handleDragEnd = () => {
    setDraggedOccurrence(null)
  }

  const handleDropOnDate = (
    e: React.DragEvent,
    targetDate: DateTime,
    targetHour?: number
  ) => {
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

    if (!occ) return

    const origStart = DateTime.fromISO(occ.startUtc, { zone: 'utc' }).setZone('local')
    const origEnd = DateTime.fromISO(occ.endUtc, { zone: 'utc' }).setZone('local')
    const durationMinutes = origEnd.diff(origStart, 'minutes').minutes

    let newStart: DateTime
    let newEnd: DateTime

    if (targetHour !== undefined) {
      newStart = targetDate.set({ hour: targetHour, minute: 0, second: 0, millisecond: 0 })
      newEnd = newStart.plus({ minutes: durationMinutes })
    } else {
      // Month cell drop (preserve original time of day or all-day)
      newStart = targetDate.set({
        hour: origStart.hour,
        minute: origStart.minute,
        second: 0,
        millisecond: 0
      })
      newEnd = newStart.plus({ minutes: durationMinutes })
    }

    // If same slot/time, do nothing
    if (newStart.toMillis() === origStart.toMillis() && newEnd.toMillis() === origEnd.toMillis()) {
      setDraggedOccurrence(null)
      return
    }

    setPendingDrop({
      occurrence: occ,
      targetStart: newStart,
      targetEnd: newEnd,
      position: { x: e.clientX, y: e.clientY }
    })

    setDraggedOccurrence(null)
  }

  return {
    draggedOccurrence,
    pendingDrop,
    setPendingDrop,
    handleDragStart,
    handleDragEnd,
    handleDropOnDate
  }
}

export default useEventDnD
