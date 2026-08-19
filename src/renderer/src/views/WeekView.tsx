import React, { useRef, useEffect, useMemo, useCallback } from 'react'
import { DateTime } from 'luxon'
import type { ExpandedOccurrence } from '@shared/event-model'
import { TODAY_COLOR } from '@shared/mini-calendar-grid'
import { segmentTimedOccurrence, type TimedSegment } from '@shared/timed-event-segments'
import LunarLabel from '../components/LunarLabel'
import WeekNumber from '../components/WeekNumber'
import EventPill from '../components/EventPill'
import TimedEventBlock from '../components/TimedEventBlock'
import ResizeTimeTooltip from '../components/ResizeTimeTooltip'
import { minutesFromPointer, prepareDropEvent, type CalendarDropTarget } from '../dnd/drop-target'
import { layoutTimedSegments } from '../dnd/layout-timed-events'
import { useEventResize } from '../dnd/use-event-resize'

interface WeekViewProps {
  anchorDate: DateTime
  occurrences: ExpandedOccurrence[]
  showLunar: boolean
  showWeekNumbers: boolean
  draggedOccurrenceId?: string
  dropTarget?: CalendarDropTarget | null
  onSelectOccurrence?: (occ: ExpandedOccurrence) => void
  onSelectSlot?: (start: DateTime, end: DateTime) => void
  onDragStart?: (e: React.DragEvent, occ: ExpandedOccurrence, segment?: TimedSegment) => void
  onDragEnd?: () => void
  onDragOverTarget?: (target: CalendarDropTarget) => void
  onDropOnDate?: (e: React.DragEvent, targetDate: DateTime, minutes?: number) => void
  onResizeCommit?: (occ: ExpandedOccurrence, start: DateTime, end: DateTime) => void
  onResizeBusyEnd?: () => void
}

const HOUR_HEIGHT = 56
const WEEK_GRID_COLS = 'grid-cols-[64px_repeat(7,minmax(0,1fr))]'

function withResizePreview(
  occurrences: ExpandedOccurrence[],
  preview: { occId: string; start: DateTime; end: DateTime } | null
): ExpandedOccurrence[] {
  if (!preview) return occurrences
  const startUtc = preview.start.toUTC().toISO()
  const endUtc = preview.end.toUTC().toISO()
  if (!startUtc || !endUtc) return occurrences
  return occurrences.map((occ) => (occ.id === preview.occId ? { ...occ, startUtc, endUtc } : occ))
}

export const WeekView: React.FC<WeekViewProps> = ({
  anchorDate,
  occurrences,
  showLunar,
  showWeekNumbers,
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
  const gridRef = useRef<HTMLDivElement>(null)
  const columnRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  const today = DateTime.local()
  const weekStartKey = anchorDate.startOf('week').toISODate()
  const weekDays = useMemo(() => {
    const start = DateTime.fromFormat(weekStartKey ?? '', 'yyyy-MM-dd').startOf('day')
    return Array.from({ length: 7 }, (_, i) => start.plus({ days: i }))
  }, [weekStartKey])

  const getGeometry = useCallback(() => {
    const columns = weekDays.map((day) => {
      const el = columnRefs.current.get(day.toFormat('yyyy-MM-dd'))
      const rect = el?.getBoundingClientRect()
      return { left: rect?.left ?? 0, right: rect?.right ?? 0, day }
    })
    return {
      gridTop: gridRef.current?.getBoundingClientRect().top ?? 0,
      hourHeight: HOUR_HEIGHT,
      columns
    }
  }, [weekDays])

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
  }, [])

  const displayOccurrences = withResizePreview(occurrences, preview)
  const allDayOccurrences = displayOccurrences.filter((o) => o.allDay)
  const timedOccurrences = displayOccurrences.filter((o) => !o.allDay)
  const hours = Array.from({ length: 24 }, (_, i) => i)
  const timedSegments = timedOccurrences.flatMap(segmentTimedOccurrence)

  return (
    <div className="relative flex h-full w-full min-w-0 flex-col overflow-hidden bg-surface select-none">
      <div className="gc-week-header shrink-0 overflow-x-hidden overflow-y-scroll border-b border-hairline [scrollbar-gutter:stable]">
          <div className={`grid ${WEEK_GRID_COLS} divide-x divide-hairline`}>
            <div className="flex min-w-0 items-center justify-center bg-app p-2">
              {showWeekNumbers && <WeekNumber weekNumber={anchorDate.weekNumber} />}
            </div>

            {weekDays.map((day) => {
              const isToday = day.hasSame(today, 'day')
              return (
                <div
                  key={day.toISO()}
                  className="flex min-w-0 flex-col items-center overflow-hidden px-1 py-2 text-center"
                >
                  <span
                    className={`truncate text-[11px] font-semibold uppercase tracking-wide ${
                      isToday ? 'text-today' : 'text-muted'
                    }`}
                  >
                    {day.toFormat('ccc')}
                  </span>
                  <span
                    className={`mt-1 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold tabular-nums ${
                      isToday ? 'text-white' : 'text-primary'
                    }`}
                    style={isToday ? { backgroundColor: TODAY_COLOR } : undefined}
                  >
                    {day.day}
                  </span>
                  {showLunar && (
                    <LunarLabel
                      day={day.day}
                      month={day.month}
                      year={day.year}
                      className="mt-1 leading-none"
                    />
                  )}
                </div>
              )
            })}
          </div>

          {allDayOccurrences.length > 0 && (
            <div className={`grid min-h-9 ${WEEK_GRID_COLS} divide-x divide-hairline border-t border-hairline bg-app text-xs`}>
              <div className="flex min-w-0 items-center justify-center p-2 text-[11px] font-semibold text-muted">
                All day
              </div>
              {weekDays.map((day) => {
                const dayStr = day.toFormat('yyyy-MM-dd')
                const dayAllDay = allDayOccurrences.filter((occ) => {
                  const occDate = DateTime.fromISO(occ.startUtc, { zone: 'utc' }).toFormat('yyyy-MM-dd')
                  return occDate === dayStr
                })
                const isDropTarget = dropTarget?.dateKey === dayStr && dropTarget.hour === undefined

                return (
                  <div
                    key={dayStr}
                    onDragOver={(e) => {
                      prepareDropEvent(e)
                      onDragOverTarget?.({ dateKey: dayStr })
                    }}
                    onDrop={(e) => onDropOnDate?.(e, day)}
                    className={`gc-cell space-y-1 p-1.5 min-w-0 overflow-hidden ${isDropTarget ? 'is-drop-target' : ''}`}
                  >
                    {dayAllDay.map((occ) => (
                      <EventPill
                        key={occ.id}
                        dense
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
                )
              })}
            </div>
          )}
        </div>

        <div
          ref={scrollRef}
          className="relative min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-scroll [scrollbar-gutter:stable]"
        >
          <div
            ref={gridRef}
            className={`relative grid min-w-0 ${WEEK_GRID_COLS} divide-x divide-hairline`}
            style={{ minHeight: `${24 * HOUR_HEIGHT}px` }}
          >
            <div className="bg-app pr-2 text-right select-none min-w-0">
              {hours.map((hour) => (
                <div
                  key={hour}
                  style={{ height: `${HOUR_HEIGHT}px` }}
                  className={`font-mono text-[11px] text-muted truncate ${
                    hour === 0 ? 'pt-0.5' : '-translate-y-2'
                  }`}
                >
                  {hour.toString().padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {weekDays.map((day) => {
              const isToday = day.hasSame(today, 'day')
              const dayKey = day.toFormat('yyyy-MM-dd')
              const daySegments = timedSegments.filter((segment) => segment.dateKey === dayKey)
              const timedLayouts = layoutTimedSegments(daySegments, HOUR_HEIGHT)

              return (
                <div
                  key={dayKey}
                  ref={(el) => {
                    if (el) columnRefs.current.set(dayKey, el)
                    else columnRefs.current.delete(dayKey)
                  }}
                  className={`relative min-w-0 cursor-pointer overflow-visible ${
                    isToday ? 'bg-today/5' : ''
                  }`}
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
                    onDropOnDate?.(e, day, minutes)
                  }}
                  onClick={(e) => {
                    if (isResizing) return
                    const rect = e.currentTarget.getBoundingClientRect()
                    const minutes = minutesFromPointer(e.clientY, rect.top, HOUR_HEIGHT)
                    const startSlot = day.startOf('day').plus({ minutes })
                    onSelectSlot?.(startSlot, startSlot.plus({ hours: 1 }))
                  }}
                >
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      style={{ height: `${HOUR_HEIGHT}px` }}
                      className="gc-hour-slot border-b border-hairline/60"
                    />
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
                      <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: TODAY_COLOR }} />
                      <div className="h-0.5 flex-1" style={{ backgroundColor: TODAY_COLOR }} />
                    </div>
                  )}

                  {timedLayouts.map((layout) => (
                    <TimedEventBlock
                      key={`${layout.occ.id}_${layout.segment.dateKey}`}
                      layout={layout}
                      segment={layout.segment}
                      minHeight={24}
                      allowHorizontal
                      isDragging={draggedOccurrenceId === layout.occ.id}
                      isResizing={preview?.occId === layout.occ.id}
                      onSelect={(occ) => onSelectOccurrence?.(occ)}
                      onDragStart={onDragStart}
                      onDragEnd={onDragEnd}
                      onResizeStart={startResize}
                    />
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      {preview && <ResizeTimeTooltip label={preview.label} x={preview.clientX} y={preview.clientY} />}
    </div>
  )
}

export default WeekView
