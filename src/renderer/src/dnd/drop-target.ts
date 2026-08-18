import type { DragEvent } from 'react'

export type CalendarDropTarget = {
  dateKey: string
  hour?: number
}

export function sameDropTarget(
  a: CalendarDropTarget | null,
  b: CalendarDropTarget | null
): boolean {
  if (a === b) return true
  if (!a || !b) return false
  return a.dateKey === b.dateKey && a.hour === b.hour
}

export function clampHour(hour: number): number {
  if (!Number.isFinite(hour)) return 0
  return Math.max(0, Math.min(23, Math.floor(hour)))
}

export function hourFromPointer(clientY: number, top: number, hourHeight: number): number {
  return clampHour((clientY - top) / hourHeight)
}

export function prepareDropEvent(e: DragEvent): void {
  e.preventDefault()
  e.dataTransfer.dropEffect = e.altKey ? 'copy' : 'move'
}
