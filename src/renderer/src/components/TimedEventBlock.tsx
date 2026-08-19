import React from 'react'
import { DateTime } from 'luxon'
import { MapPin, Repeat } from 'lucide-react'
import type { ExpandedOccurrence } from '@shared/event-model'
import type { TimedSegment } from '@shared/timed-event-segments'
import type { ResizeEdge } from '../dnd/resize-math'
import type { TimedLayout } from '../dnd/layout-timed-events'

interface TimedEventBlockProps {
  layout: TimedLayout
  segment: TimedSegment
  minHeight: number
  allowHorizontal: boolean
  isDragging: boolean
  isResizing: boolean
  onSelect: (occ: ExpandedOccurrence) => void
  onDragStart?: (e: React.DragEvent, occ: ExpandedOccurrence, segment: TimedSegment) => void
  onDragEnd?: () => void
  onResizeStart: (e: React.PointerEvent, occ: ExpandedOccurrence, edge: ResizeEdge) => void
}

function timeCaption(segment: TimedSegment, start: DateTime, end: DateTime): string {
  if (segment.isFirst && segment.isLast) {
    return `${start.toFormat('HH:mm')} – ${end.toFormat('HH:mm')}`
  }
  const sameClockWindow =
    segment.startLocal.hasSame(segment.endLocal, 'day') &&
    segment.startLocal.hour === start.hour &&
    segment.startLocal.minute === start.minute &&
    segment.endLocal.hour === end.hour &&
    segment.endLocal.minute === end.minute
  if (sameClockWindow) {
    return `${start.toFormat('HH:mm')} – ${end.toFormat('HH:mm')}`
  }
  if (segment.isFirst) return `${start.toFormat('HH:mm')} →`
  if (segment.isLast) return `→ ${end.toFormat('HH:mm')}`
  return '⋯'
}

export const TimedEventBlock: React.FC<TimedEventBlockProps> = ({
  layout,
  segment,
  minHeight,
  allowHorizontal,
  isDragging,
  isResizing,
  onSelect,
  onDragStart,
  onDragEnd,
  onResizeStart
}) => {
  const { occ } = layout
  const startDt = DateTime.fromISO(occ.startUtc, { zone: 'utc' }).setZone('local')
  const endDt = DateTime.fromISO(occ.endUtc, { zone: 'utc' }).setZone('local')
  const durationMin = endDt.diff(startDt, 'minutes').minutes
  const showNorth = segment.isFirst
  const showSouth = segment.isLast
  const showWest = allowHorizontal && segment.isFirst
  const showEast = allowHorizontal && segment.isLast

  return (
    <div
      draggable={!isResizing}
      onDragStart={(e) => {
        if (document.body.classList.contains('is-event-resizing')) {
          e.preventDefault()
          return
        }
        onDragStart?.(e, occ, segment)
      }}
      onDragEnd={onDragEnd}
      onClick={(e) => {
        e.stopPropagation()
        if (isResizing) return
        onSelect(occ)
      }}
      style={{
        top: `${layout.topPos}px`,
        height: `${Math.max(minHeight, layout.height - 2)}px`,
        left: `calc(${layout.leftPercent}% + 2px)`,
        width: `calc(${layout.widthPercent}% - 4px)`,
        backgroundColor: layout.effectiveColor,
        borderRadius: 6
      }}
      className={`gc-event absolute z-10 cursor-grab overflow-hidden p-1.5 text-xs text-white active:cursor-grabbing min-w-0 shadow-xs border border-white/20 hover:z-30 hover:shadow-md ${
        isDragging ? 'is-dragging' : ''
      } ${isResizing ? 'z-40' : ''}`}
    >
      <div className="flex items-center justify-between gap-1 min-w-0">
        <span className="truncate text-xs font-semibold leading-tight">{occ.title}</span>
        {occ.isRecurring && <Repeat className="h-2.5 w-2.5 opacity-80 shrink-0" />}
      </div>
      <div className="font-mono text-[10px] opacity-90 truncate mt-0.5">
        {timeCaption(segment, startDt, endDt)}
      </div>
      {durationMin >= 40 && occ.location && segment.isFirst && (
        <div className="flex items-center gap-1 text-[10px] opacity-85 truncate mt-0.5">
          <MapPin className="h-2.5 w-2.5 shrink-0" />
          <span className="truncate">{occ.location}</span>
        </div>
      )}

      {showNorth && (
        <div
          className="absolute inset-x-0 top-0 z-20 h-2 cursor-ns-resize"
          onMouseDown={(e) => e.preventDefault()}
          onPointerDown={(e) => onResizeStart(e, occ, 'n')}
        />
      )}
      {showSouth && (
        <div
          className="absolute inset-x-0 bottom-0 z-20 h-2 cursor-ns-resize"
          onMouseDown={(e) => e.preventDefault()}
          onPointerDown={(e) => onResizeStart(e, occ, 's')}
        />
      )}
      {showWest && (
        <div
          className="absolute inset-y-0 left-0 z-20 w-2 cursor-ew-resize"
          onMouseDown={(e) => e.preventDefault()}
          onPointerDown={(e) => onResizeStart(e, occ, 'w')}
        />
      )}
      {showEast && (
        <div
          className="absolute inset-y-0 right-0 z-20 w-2 cursor-ew-resize"
          onMouseDown={(e) => e.preventDefault()}
          onPointerDown={(e) => onResizeStart(e, occ, 'e')}
        />
      )}
    </div>
  )
}

export default TimedEventBlock
