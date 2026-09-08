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
import { useSlotDragSelect } from '../dnd/use-slot-drag-select'
import { useDisplayPreferences, HOUR_HEIGHT_BY_SIZE } from '../context/DisplayPreferencesContext'
import type { EventEditorDraftPreview } from '../editor/EventEditorDialog'

interface DayViewProps {
  anchorDate: DateTime
  occurrences: ExpandedOccurrence[]
  showLunar: boolean
  draggedOccurrenceId?: string
  dropTarget?: CalendarDropTarget | null
  /** Live slot/color for a new event still being drafted in the open editor - painted
   *  as an outline on the grid so the dialog isn't the only place the event is visible. */
  previewSlot?: EventEditorDraftPreview | null
  onSelectOccurrence?: (occ: ExpandedOccurrence) => void
  onSelectSlot?: (start: DateTime, end: DateTime, meta?: { clientX?: number; allDay?: boolean }) => void
  onDragStart?: (e: React.DragEvent, occ: ExpandedOccurrence, segment?: TimedSegment) => void
  onDragEnd?: () => void
  onDragOverTarget?: (target: CalendarDropTarget) => void
  onDropOnDate?: (e: React.DragEvent, targetDate: DateTime, targetMinutes?: number) => void
  onResizeCommit?: (occ: ExpandedOccurrence, start: DateTime, end: DateTime) => void
  onResizeBusyEnd?: () => void
}

export const DayView: React.FC<DayViewProps> = ({
  anchorDate,
  occurrences,
  showLunar,
  draggedOccurrenceId,
  dropTarget,
  previewSlot,
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

  const { hourBlockSize, dayStartHour, secondaryTimezone } = useDisplayPreferences()
  const HOUR_HEIGHT = HOUR_HEIGHT_BY_SIZE[hourBlockSize]
  const gridColsClass = secondaryTimezone
    ? 'grid-cols-[56px_68px_minmax(0,1fr)]'
    : 'grid-cols-[68px_minmax(0,1fr)]'

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
  }, [anchorDate, HOUR_HEIGHT])

  const { preview, startResize, isResizing } = useEventResize({
    getGeometry,
    onCommit: (occ, start, end) => onResizeCommit?.(occ, start, end),
    onBusyEnd: onResizeBusyEnd,
    scrollerRef: scrollRef
  })

  const { preview: slotPreview, startDrag: startSlotDrag } = useSlotDragSelect({
    hourHeight: HOUR_HEIGHT,
    onComplete: (start, end, meta) => onSelectSlot?.(start, end, meta)
  })

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = dayStartHour * HOUR_HEIGHT
    }
  }, [anchorDate, dayStartHour, HOUR_HEIGHT])

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

  // Draft preview of a new event while its editor is open - outlined in the color
  // the form currently holds, updating live as it changes.
  const timedPreviewBox = (() => {
    if (!previewSlot || previewSlot.allDay) return null
    const dayStart = anchorDate.startOf('day')
    const dayEnd = anchorDate.endOf('day')
    if (previewSlot.end <= dayStart || previewSlot.start >= dayEnd) return null
    const clampedStart = previewSlot.start < dayStart ? dayStart : previewSlot.start
    const clampedEnd = previewSlot.end > dayEnd ? dayEnd : previewSlot.end
    const startMin = clampedStart.diff(dayStart, 'minutes').minutes
    const endMin = clampedEnd.diff(dayStart, 'minutes').minutes
    if (endMin <= startMin) return null
    return { topPos: (startMin / 60) * HOUR_HEIGHT, height: ((endMin - startMin) / 60) * HOUR_HEIGHT }
  })()

  const showAllDayPreview = Boolean(
    previewSlot?.allDay &&
      previewSlot.start.startOf('day') <= anchorDate.startOf('day') &&
      previewSlot.end.startOf('day') >= anchorDate.startOf('day')
  )

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-surface select-none relative">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-hairline px-6 py-3.5 bg-app/40">
        <div className="flex items-center gap-3.5 min-w-0">
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-full text-xl font-bold shrink-0 ${
              isToday ? 'text-white' : 'bg-hover text-primary'
            }`}
            style={
              isToday
                ? { backgroundColor: TODAY_COLOR }
                : // A new all-day event being drafted highlights this date instead of a
                  // fake pill down in the all-day row - simpler, and it can't be mistaken
                  // for an already-saved event.
                  showAllDayPreview
                  ? { boxShadow: `inset 0 0 0 2px ${previewSlot!.color}` }
                  : undefined
            }
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

        <div
          onDragOver={(e) => {
            prepareDropEvent(e)
            onDragOverTarget?.({ dateKey: dayKey })
          }}
          onDrop={(e) => onDropOnDate?.(e, anchorDate)}
          onClick={(e) => {
            const dayStart = anchorDate.startOf('day')
            onSelectSlot?.(dayStart, dayStart, { clientX: e.clientX, allDay: true })
          }}
          className={`gc-cell flex min-h-[2rem] max-w-md cursor-pointer items-center gap-2 overflow-x-auto rounded-lg p-1 min-w-0 ${
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
              onClick={(e) => {
                e.stopPropagation()
                onSelectOccurrence?.(occ)
              }}
            />
          ))}
        </div>
      </div>

      {/* Hourly Scrollable Grid */}
      <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-y-scroll [scrollbar-gutter:stable]">
        <div
          className={`relative grid ${gridColsClass} divide-x divide-hairline`}
          style={{ minHeight: `${24 * HOUR_HEIGHT}px` }}
        >
          {secondaryTimezone && (
            <div className="bg-app pr-1.5 text-right select-none min-w-0">
              {hours.map((hour) => {
                const secondaryLabel = anchorDate
                  .startOf('day')
                  .plus({ hours: hour })
                  .setZone(secondaryTimezone)
                  .toFormat('HH:mm')
                return (
                  <div
                    key={hour}
                    style={{ height: `${HOUR_HEIGHT}px` }}
                    className={`font-mono text-[10px] text-muted/70 truncate ${
                      hour === 0 ? 'pt-1' : '-translate-y-2.5 pt-1'
                    }`}
                  >
                    {secondaryLabel}
                  </div>
                )
              })}
            </div>
          )}
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
            onMouseDown={(e) => {
              if (isResizing) return
              startSlotDrag(e, anchorDate, dayKey)
            }}
          >
            {hours.map((hour) => (
              <div key={hour} style={{ height: `${HOUR_HEIGHT}px` }} className="gc-hour-slot border-b border-hairline/60" />
            ))}

            {slotPreview && (
              <div
                className="pointer-events-none absolute right-1 left-1 z-20 rounded-md border-2 border-accent bg-accent/25"
                style={{ top: `${slotPreview.topPos}px`, height: `${slotPreview.height}px` }}
              />
            )}

            {timedPreviewBox && (
              <div
                className="pointer-events-none absolute right-1 left-1 z-20 rounded-[6px] border-2 border-dashed"
                style={{
                  top: `${timedPreviewBox.topPos}px`,
                  height: `${timedPreviewBox.height}px`,
                  borderColor: previewSlot!.color,
                  backgroundColor: `${previewSlot!.color}33`
                }}
              />
            )}

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
      {slotPreview && (
        <ResizeTimeTooltip label={slotPreview.label} x={slotPreview.clientX} y={slotPreview.clientY} />
      )}
    </div>
  )
}

export default DayView
