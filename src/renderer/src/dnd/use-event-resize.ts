import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react'
import { DateTime } from 'luxon'
import type { ExpandedOccurrence } from '@shared/event-model'
import {
  applyResizeEdge,
  averageColumnWidth,
  daysDeltaFromPointer,
  formatResizeTooltip,
  type ResizeEdge
} from './resize-math'

export interface ResizeGeometry {
  gridTop: number
  hourHeight: number
  columns: Array<{ left: number; right: number; day: DateTime }>
}

export interface ResizePreview {
  occId: string
  occ: ExpandedOccurrence
  start: DateTime
  end: DateTime
  edge: ResizeEdge
  clientX: number
  clientY: number
  label: string
}

export function useEventResize(options: {
  getGeometry: () => ResizeGeometry
  onCommit: (occ: ExpandedOccurrence, start: DateTime, end: DateTime) => void
  onBusyEnd?: () => void
  scrollerRef?: RefObject<HTMLElement | null>
}) {
  const { getGeometry, onCommit, onBusyEnd, scrollerRef } = options
  const [preview, setPreview] = useState<ResizePreview | null>(null)
  const sessionRef = useRef<{
    occ: ExpandedOccurrence
    edge: ResizeEdge
    originStart: DateTime
    originEnd: DateTime
    originX: number
    columnWidth: number
  } | null>(null)
  const previewRef = useRef<ResizePreview | null>(null)
  const getGeometryRef = useRef(getGeometry)
  const onCommitRef = useRef(onCommit)
  const onBusyEndRef = useRef(onBusyEnd)

  getGeometryRef.current = getGeometry
  onCommitRef.current = onCommit
  onBusyEndRef.current = onBusyEnd

  const clearSession = useCallback((commit: boolean) => {
    const session = sessionRef.current
    const current = previewRef.current
    sessionRef.current = null
    previewRef.current = null
    setPreview(null)
    document.body.classList.remove('is-dnd-active')
    document.body.classList.remove('is-event-resizing')
    onBusyEndRef.current?.()
    if (commit && session && current) {
      const sameStart = current.start.toMillis() === session.originStart.toMillis()
      const sameEnd = current.end.toMillis() === session.originEnd.toMillis()
      if (!sameStart || !sameEnd) {
        onCommitRef.current(session.occ, current.start, current.end)
      }
    }
  }, [])

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const session = sessionRef.current
      if (!session) return
      const geometry = getGeometryRef.current()
      const next = applyResizeEdge({
        edge: session.edge,
        originStart: session.originStart,
        originEnd: session.originEnd,
        clientX: e.clientX,
        clientY: e.clientY,
        gridTop: geometry.gridTop,
        hourHeight: geometry.hourHeight,
        daysDelta: daysDeltaFromPointer(session.originX, e.clientX, session.columnWidth)
      })
      const nextPreview: ResizePreview = {
        occId: session.occ.id,
        occ: session.occ,
        start: next.start,
        end: next.end,
        edge: session.edge,
        clientX: e.clientX,
        clientY: e.clientY,
        label: formatResizeTooltip(session.edge, next.start, next.end)
      }
      previewRef.current = nextPreview
      setPreview(nextPreview)

      const scroller = scrollerRef?.current
      if (scroller) {
        const rect = scroller.getBoundingClientRect()
        if (e.clientY < rect.top + 36) scroller.scrollTop -= 14
        else if (e.clientY > rect.bottom - 36) scroller.scrollTop += 14
      }
    }

    const onUp = () => {
      if (!sessionRef.current) return
      clearSession(true)
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sessionRef.current) {
        e.preventDefault()
        clearSession(false)
      }
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      window.removeEventListener('keydown', onKey)
    }
  }, [clearSession, scrollerRef])

  const startResize = useCallback((e: ReactPointerEvent, occ: ExpandedOccurrence, edge: ResizeEdge) => {
    e.preventDefault()
    e.stopPropagation()
    const originStart = DateTime.fromISO(occ.startUtc, { zone: 'utc' }).setZone('local')
    const originEnd = DateTime.fromISO(occ.endUtc, { zone: 'utc' }).setZone('local')
    if (!originStart.isValid || !originEnd.isValid) return

    const geometry = getGeometryRef.current()
    sessionRef.current = {
      occ,
      edge,
      originStart,
      originEnd,
      originX: e.clientX,
      columnWidth: averageColumnWidth(geometry.columns)
    }
    const next = applyResizeEdge({
      edge,
      originStart,
      originEnd,
      clientX: e.clientX,
      clientY: e.clientY,
      gridTop: geometry.gridTop,
      hourHeight: geometry.hourHeight,
      daysDelta: 0
    })
    const nextPreview: ResizePreview = {
      occId: occ.id,
      occ,
      start: next.start,
      end: next.end,
      edge,
      clientX: e.clientX,
      clientY: e.clientY,
      label: formatResizeTooltip(edge, next.start, next.end)
    }
    previewRef.current = nextPreview
    setPreview(nextPreview)
    document.body.classList.add('is-dnd-active')
    document.body.classList.add('is-event-resizing')
  }, [])

  return { preview, startResize, isResizing: Boolean(preview) }
}

export default useEventResize
