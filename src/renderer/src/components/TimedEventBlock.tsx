import React from 'react'
import { DateTime } from 'luxon'
import { MapPin, Repeat } from 'lucide-react'
import type { ExpandedOccurrence } from '@shared/event-model'
import type { TimedSegment } from '@shared/timed-event-segments'
import type { ResizeEdge } from '../dnd/resize-math'
import type { TimedLayout } from '../dnd/layout-timed-events'
import { formatClockTime, type TimeFormatPref } from '@shared/time-format'
import { useDisplayPreferences } from '../context/DisplayPreferencesContext'

interface TimedEventBlockProps {
  layout: TimedLayout
  segment: TimedSegment
  minHeight: number
  allowHorizontal: boolean
  isDragging: boolean
  isResizing: boolean
  onSelect: (occ: ExpandedOccurrence) => void
  /** Middle-click gesture: delete this occurrence. */
  onDelete?: (occ: ExpandedOccurrence) => void
  onDragStart?: (e: React.DragEvent, occ: ExpandedOccurrence, segment: TimedSegment) => void
  onDragEnd?: () => void
  onResizeStart: (e: React.PointerEvent, occ: ExpandedOccurrence, edge: ResizeEdge) => void
}

function timeCaption(
  segment: TimedSegment,
  start: DateTime,
  end: DateTime,
  timeFormat: TimeFormatPref
): string {
  const fmt = (dt: DateTime) => formatClockTime(dt, timeFormat)
  if (segment.isFirst && segment.isLast) {
    return `${fmt(start)} – ${fmt(end)}`
  }
  const sameClockWindow =
    segment.startLocal.hasSame(segment.endLocal, 'day') &&
    segment.startLocal.hour === start.hour &&
    segment.startLocal.minute === start.minute &&
    segment.endLocal.hour === end.hour &&
    segment.endLocal.minute === end.minute
  if (sameClockWindow) {
    return `${fmt(start)} – ${fmt(end)}`
  }
  if (segment.isFirst) return `${fmt(start)} →`
  if (segment.isLast) return `→ ${fmt(end)}`
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
  onDelete,
  onDragStart,
  onDragEnd,
  onResizeStart
}) => {
  const { timeFormat } = useDisplayPreferences()
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
      onMouseDown={(e) => {
        // Suppress middle-click autoscroll so it can act as a delete gesture.
        if (e.button === 1) e.preventDefault()
      }}
      onAuxClick={(e) => {
        if (e.button !== 1) return
        e.preventDefault()
        e.stopPropagation()
        onDelete?.(occ)
      }}
      style={{
        top: `${layout.topPos}px`,
        height: `${Math.max(minHeight, layout.height - 2)}px`,
        // Side-by-side (non-nested) columns inset a touch less than a nested card
        // does against its host, so two plain overlapping events sit 1px closer
        // together than before while the nested look is untouched.
        left: `calc(${layout.leftPercent}% + ${layout.isNested ? 2 : 1.5}px)`,
        width: `calc(${layout.widthPercent}% - ${layout.isNested ? 4 : 3}px)`,
        backgroundColor: layout.effectiveColor,
        borderRadius: 6
      }}
      className={`gc-event absolute cursor-grab overflow-hidden p-1.5 text-xs text-white active:cursor-grabbing min-w-0 hover:shadow-md ${
        layout.isNested
          ? 'z-30 shadow-md border-2 border-white/70 hover:z-40'
          : 'z-10 shadow-xs border border-white/20 hover:z-20'
      } ${isDragging ? 'is-dragging' : ''} ${isResizing ? 'z-50' : ''}`}
    >
      <div
        className="min-w-0"
        style={layout.contentWidthPercent < 100 ? { maxWidth: `${layout.contentWidthPercent}%` } : undefined}
      >
        <div className="flex items-start justify-between gap-1 min-w-0">
          <span className="min-w-0 flex-1 whitespace-normal break-words text-xs font-semibold leading-tight">
            {occ.title}
          </span>
          {occ.isRecurring && <Repeat className="h-2.5 w-2.5 opacity-80 shrink-0" />}
        </div>
        <div className="font-mono text-[10px] whitespace-normal break-words opacity-90 mt-0.5">
          {timeCaption(segment, startDt, endDt, timeFormat)}
        </div>
        {durationMin >= 40 && occ.location && segment.isFirst && (
          <div className="flex items-center gap-1 text-[10px] opacity-85 truncate mt-0.5">
            <MapPin className="h-2.5 w-2.5 shrink-0" />
            <span className="truncate">{occ.location}</span>
          </div>
        )}
      </div>

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
