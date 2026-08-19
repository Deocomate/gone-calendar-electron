import React, { useRef, useEffect, useCallback } from 'react'
import { DateTime } from 'luxon'
import type { ExpandedOccurrence } from '@shared/event-model'
import { TODAY_COLOR } from '@shared/mini-calendar-grid'
import { segmentTimedOccurrence, type TimedSegment } from '@shared/timed-event-segments'
import LunarLabel from '../components/LunarLabel'
import EventPill from '../components/EventPill'
import TimedEventBlock from '../components/TimedEventBlock'
import ResizeTimeTooltip from '../components/ResizeTimeTooltip'
import { minutesFromPointer, prepareDropEvent, type CalendarDropTarget } from '../dnd/drop-target'
import { layoutTimedSegments } from '../dnd/layout-timed-events'
import { useEventResize } from '../dnd/use-event-resize'

interface DayViewProps {
  anchorDate: DateTime
  occurrences: ExpandedOccurrence[]
  showLunar: boolean
  draggedOccurrenceId?: string
  dropTarget?: CalendarDropTarget | null
  onSelectOccurrence?: (occ: ExpandedOccurrence) => void
  onSelectSlot?: (start: DateTime, end: DateTime) => void
  onDragStart?: (e: React.DragEvent, occ: ExpandedOccurrence, segment?: TimedSegment) => void
  onDragEnd?: () => void
  onDragOverTarget?: (target: CalendarDropTarget) => void
  onDropOnDate?: (e: React.DragEvent, targetDate: DateTime, targetMinutes?: number) => void
  onResizeCommit?: (occ: ExpandedOccurrence, start: DateTime, end: DateTime) => void
  onResizeBusyEnd?: () => void
}

const HOUR_HEIGHT = 60

export const DayView: React.FC<DayViewProps> = ({
  anchorDate,
  occurrences,
  showLunar,
  draggedOccurrenceId,
  dropTarget,
  onSelectOccurrence,
  onSelectSlot,
  onDragStart,
  onDragEnd,
  onDragOverTarget,
  onDropOnDate,
  onResizeCommit,
  onResizeBusyEnd
}) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const columnRef = useRef<HTMLDivElement>(null)

  const today = DateTime.local()
  const isToday = anchorDate.hasSame(today, 'day')
  const dayKey = anchorDate.toFormat('yyyy-MM-dd')

  const getGeometry = useCallback(() => {
    const rect = columnRef.current?.getBoundingClientRect()
    return {
      gridTop: rect?.top ?? 0,
      hourHeight: HOUR_HEIGHT,
      columns: rect ? [{ left: rect.left, right: rect.right, day: anchorDate }] : []
    }
  }, [anchorDate])

  const { preview, startResize, isResizing } = useEventResize({
    getGeometry,
    onCommit: (occ, start, end) => onResizeCommit?.(occ, start, end),
    onBusyEnd: onResizeBusyEnd,
    scrollerRef: scrollRef
  })

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 7.5 * HOUR_HEIGHT
    }
  }, [anchorDate])

  const displayOccurrences = preview
    ? occurrences.map((occ) => {
        if (occ.id !== preview.occId) return occ
        const startUtc = preview.start.toUTC().toISO()
        const endUtc = preview.end.toUTC().toISO()
        return startUtc && endUtc ? { ...occ, startUtc, endUtc } : occ
      })
    : occurrences
  const allDayOccurrences = displayOccurrences.filter((o) => o.allDay)
  const timedOccurrences = displayOccurrences.filter((o) => !o.allDay)
  const daySegments = timedOccurrences
    .flatMap(segmentTimedOccurrence)
    .filter((segment) => segment.dateKey === dayKey)
  const timedLayouts = layoutTimedSegments(daySegments, HOUR_HEIGHT)
  const hours = Array.from({ length: 24 }, (_, i) => i)

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-surface select-none relative">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-hairline px-6 py-3.5 bg-app/40">
        <div className="flex items-center gap-3.5 min-w-0">
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-full text-xl font-bold shrink-0 ${
              isToday ? 'text-white' : 'bg-hover text-primary'
            }`}
            style={isToday ? { backgroundColor: TODAY_COLOR } : undefined}
          >
            {anchorDate.day}
          </span>
          <div className="min-w-0">
            <h3 className="text-base font-bold capitalize text-primary truncate">
              {anchorDate.toFormat('cccc, dd MMMM yyyy')}
            </h3>
            {showLunar && (
              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                <LunarLabel
                  day={anchorDate.day}
                  month={anchorDate.month}
                  year={anchorDate.year}
                  className="text-xs"
                />
              </div>
            )}
          </div>
        </div>

        {allDayOccurrences.length > 0 && (
          <div
            onDragOver={(e) => {
              prepareDropEvent(e)
              onDragOverTarget?.({ dateKey: dayKey })
            }}
            onDrop={(e) => onDropOnDate?.(e, anchorDate)}
            className={`gc-cell flex max-w-md items-center gap-2 overflow-x-auto rounded-lg p-1 min-w-0 ${
              dropTarget?.dateKey === dayKey && dropTarget.hour === undefined ? 'is-drop-target' : ''
            }`}
          >
            {allDayOccurrences.map((occ) => (
              <EventPill
                key={occ.id}
                draggable
                isDragging={draggedOccurrenceId === occ.id}
                title={occ.title}
                color={occ.color}
                onDragStart={(e) => onDragStart?.(e, occ)}
                onDragEnd={onDragEnd}
                onClick={() => onSelectOccurrence?.(occ)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Hourly Scrollable Grid */}
      <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-y-scroll [scrollbar-gutter:stable]">
        <div
          className="relative grid grid-cols-[68px_minmax(0,1fr)] divide-x divide-hairline"
          style={{ minHeight: `${24 * HOUR_HEIGHT}px` }}
        >
          <div className="bg-app pr-3 text-right select-none min-w-0">
              {hours.map((hour) => (
                <div
                  key={hour}
                  style={{ height: `${HOUR_HEIGHT}px` }}
                  className={`font-mono text-xs text-muted truncate ${
                    hour === 0 ? 'pt-1' : '-translate-y-2.5 pt-1'
                  }`}
                >
                  {hour.toString().padStart(2, '0')}:00
                </div>
              ))}
          </div>

          <div
            ref={columnRef}
            className={`relative min-w-0 cursor-pointer overflow-visible ${isToday ? 'bg-today/5' : ''}`}
            onDragOver={(e) => {
              prepareDropEvent(e)
              const rect = e.currentTarget.getBoundingClientRect()
              const minutes = minutesFromPointer(e.clientY, rect.top, HOUR_HEIGHT)
              onDragOverTarget?.({
                dateKey: dayKey,
                hour: Math.floor(minutes / 60),
                minutes
              })
            }}
            onDrop={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              const minutes = minutesFromPointer(e.clientY, rect.top, HOUR_HEIGHT)
              onDropOnDate?.(e, anchorDate, minutes)
            }}
            onClick={(e) => {
              if (isResizing) return
              const rect = e.currentTarget.getBoundingClientRect()
              const minutes = minutesFromPointer(e.clientY, rect.top, HOUR_HEIGHT)
              const startSlot = anchorDate.startOf('day').plus({ minutes })
              onSelectSlot?.(startSlot, startSlot.plus({ hours: 1 }))
            }}
          >
            {hours.map((hour) => (
              <div key={hour} style={{ height: `${HOUR_HEIGHT}px` }} className="gc-hour-slot border-b border-hairline/60" />
            ))}

            {dropTarget?.dateKey === dayKey && dropTarget.minutes !== undefined && (
              <div
                className="pointer-events-none absolute right-0 left-0 z-30 h-0.5 bg-accent"
                style={{ top: `${(dropTarget.minutes / 60) * HOUR_HEIGHT}px` }}
              />
            )}

            {isToday && (
              <div
                className="pointer-events-none absolute right-0 left-0 z-20 flex items-center"
                style={{ top: `${((today.hour * 60 + today.minute) / 60) * HOUR_HEIGHT}px` }}
              >
                <div className="-ml-1.5 h-3.5 w-3.5 rounded-full shrink-0" style={{ backgroundColor: TODAY_COLOR }} />
                <div className="h-0.5 flex-1" style={{ backgroundColor: TODAY_COLOR }} />
              </div>
            )}

            {timedLayouts.map((layout) => (
              <TimedEventBlock
                key={`${layout.occ.id}_${layout.segment.dateKey}`}
                layout={layout}
                segment={layout.segment}
                minHeight={26}
                allowHorizontal={false}
                isDragging={draggedOccurrenceId === layout.occ.id}
                isResizing={preview?.occId === layout.occ.id}
                onSelect={(occ) => onSelectOccurrence?.(occ)}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onResizeStart={startResize}
              />
            ))}
          </div>
        </div>
      </div>
      {preview && <ResizeTimeTooltip label={preview.label} x={preview.clientX} y={preview.clientY} />}
    </div>
  )
}

export default DayView
