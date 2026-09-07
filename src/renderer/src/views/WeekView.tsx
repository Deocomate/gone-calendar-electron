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
import { layoutAllDayEvents } from '../dnd/layout-allday-events'
import { useEventResize } from '../dnd/use-event-resize'
import { useSlotDragSelect } from '../dnd/use-slot-drag-select'
import { useDisplayPreferences, HOUR_HEIGHT_BY_SIZE } from '../context/DisplayPreferencesContext'

interface WeekViewProps {
  anchorDate: DateTime
  occurrences: ExpandedOccurrence[]
  showLunar: boolean
  showWeekNumbers?: boolean
  draggedOccurrenceId?: string
  dropTarget?: CalendarDropTarget | null
  onSelectOccurrence?: (occ: ExpandedOccurrence) => void
  onDeleteOccurrence?: (occ: ExpandedOccurrence) => void
  onSelectSlot?: (start: DateTime, end: DateTime, meta?: { clientX?: number; allDay?: boolean }) => void
  onGoToday?: () => void
  onPrevWeek?: () => void
  onNextWeek?: () => void
  onDragStart?: (e: React.DragEvent, occ: ExpandedOccurrence, segment?: TimedSegment) => void
  onDragEnd?: () => void
  onDragOverTarget?: (target: CalendarDropTarget) => void
  onDropOnDate?: (e: React.DragEvent, targetDate: DateTime, minutes?: number) => void
  onResizeCommit?: (occ: ExpandedOccurrence, start: DateTime, end: DateTime) => void
  onResizeBusyEnd?: () => void
}

const WEEK_GRID_COLS = 'grid-cols-[76px_repeat(7,minmax(0,1fr))]'
const WEEK_GRID_COLS_WITH_TZ = 'grid-cols-[56px_76px_repeat(7,minmax(0,1fr))]'

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
  showWeekNumbers = false,
  draggedOccurrenceId,
  dropTarget,
  onSelectOccurrence,
  onDeleteOccurrence,
  onSelectSlot,
  onGoToday,
  onPrevWeek,
  onNextWeek,
  onDragStart,
  onDragEnd,
  onDragOverTarget,
  onDropOnDate,
  onResizeCommit,
  onResizeBusyEnd
}) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const lastWheelNavRef = useRef(0)
  const gridRef = useRef<HTMLDivElement>(null)
  const columnRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  const { hourBlockSize, dayStartHour, secondaryTimezone } = useDisplayPreferences()
  const HOUR_HEIGHT = HOUR_HEIGHT_BY_SIZE[hourBlockSize]
  const gridColsClass = secondaryTimezone ? WEEK_GRID_COLS_WITH_TZ : WEEK_GRID_COLS
  const dayColOffset = secondaryTimezone ? 3 : 2

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
  }, [weekDays, HOUR_HEIGHT])

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleHeaderWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaY) < 2) return
    const now = Date.now()
    if (now - lastWheelNavRef.current < 60) return
    lastWheelNavRef.current = now
    if (e.deltaY > 0) onNextWeek?.()
    else onPrevWeek?.()
  }

  const displayOccurrences = withResizePreview(occurrences, preview)
  const allDayOccurrences = displayOccurrences.filter((o) => o.allDay)
  const timedOccurrences = displayOccurrences.filter((o) => !o.allDay)
  const hours = Array.from({ length: 24 }, (_, i) => i)
  const timedSegments = timedOccurrences.flatMap(segmentTimedOccurrence)

  const allDayLayouts = useMemo(
    () => layoutAllDayEvents(allDayOccurrences, weekDays),
    [allDayOccurrences, weekDays]
  )
  const allDayLaneCount =
    allDayLayouts.length === 0 ? 0 : Math.max(...allDayLayouts.map((l) => l.lane + 1))
  // One extra lane's worth of headroom beyond the busiest row, always clickable to add more.
  const ALL_DAY_LANE_HEIGHT = 24
  const allDayAreaHeight = (allDayLaneCount + 1) * ALL_DAY_LANE_HEIGHT

  return (
    <div className="relative flex h-full w-full min-w-0 flex-col overflow-hidden bg-surface select-none">
      <div className="gc-week-header shrink-0 overflow-x-hidden border-b border-hairline [scrollbar-gutter:stable]">
          <div className={`grid ${gridColsClass} divide-x divide-hairline`} onWheel={handleHeaderWheel}>
            {secondaryTimezone && <div className="bg-app" />}
            <div className="flex items-center justify-center bg-app">
              {showWeekNumbers && (
                <button
                  type="button"
                  onClick={() => onGoToday?.()}
                  title="Go to today"
                  className="cursor-pointer rounded-md p-1 transition-colors hover:bg-hover"
                >
                  <WeekNumber
                    weekNumber={weekDays[0]?.weekNumber ?? anchorDate.weekNumber}
                    month={weekDays[0]?.month ?? anchorDate.month}
                    year={weekDays[0]?.year ?? anchorDate.year}
                  />
                </button>
              )}
            </div>

            {weekDays.map((day) => {
              const isToday = day.hasSame(today, 'day')
              const monthChanged = day.day === 1
              return (
                <div
                  key={day.toISO()}
                  className="flex min-w-0 flex-col items-center overflow-hidden px-1 py-2 text-center"
                >
                  <span
                    className={`truncate text-lg font-bold tracking-wide ${
                      isToday ? 'rounded-full bg-today px-2 py-0.5 text-white' : 'text-primary'
                    }`}
                  >
                    {monthChanged ? day.toFormat('dd/MM') : day.toFormat('dd')}
                  </span>
                  {showLunar && (
                    <LunarLabel
                      day={day.day}
                      month={day.month}
                      year={day.year}
                      forceMonth={day.weekday === 1}
                      className="mt-1 leading-none"
                    />
                  )}
                </div>
              )
            })}
          </div>

          <div
            className="relative border-t border-hairline"
            style={{ height: `${allDayAreaHeight}px` }}
          >
            {/* Background: per-day click/drag targets - always full height, so there's
                room below the busiest lane to click and add another all-day event. */}
            <div className={`absolute inset-0 grid ${gridColsClass} divide-x divide-hairline bg-app`} onWheel={handleHeaderWheel}>
              {secondaryTimezone && <div />}
              <div />
              {weekDays.map((day) => {
                const dayStr = day.toFormat('yyyy-MM-dd')
                const isDropTarget = dropTarget?.dateKey === dayStr && dropTarget.hour === undefined
                return (
                  <div
                    key={dayStr}
                    onDragOver={(e) => {
                      prepareDropEvent(e)
                      onDragOverTarget?.({ dateKey: dayStr })
                    }}
                    onDrop={(e) => onDropOnDate?.(e, day)}
                    onClick={(e) => {
                      const dayStart = day.startOf('day')
                      onSelectSlot?.(dayStart, dayStart, { clientX: e.clientX, allDay: true })
                    }}
                    className={`gc-cell cursor-pointer min-w-0 ${isDropTarget ? 'is-drop-target' : ''}`}
                  />
                )
              })}
            </div>

            {/* Overlay: one continuous bar per all-day event, spanning every day it
                covers (clamped to this week) instead of a separate pill per day. */}
            <div
              className={`pointer-events-none absolute inset-0 grid ${gridColsClass} content-start`}
              style={{
                gridTemplateRows: `repeat(${Math.max(1, allDayLaneCount)}, ${ALL_DAY_LANE_HEIGHT}px)`,
                paddingTop: 2
              }}
            >
              {allDayLayouts.map((l) => (
                <div
                  key={l.occ.id}
                  className="pointer-events-auto min-w-0 px-0.5"
                  style={{
                    gridColumn: `${l.startCol + dayColOffset} / span ${l.span}`,
                    gridRow: l.lane + 1
                  }}
                >
                  <EventPill
                    dense
                    draggable
                    isDragging={draggedOccurrenceId === l.occ.id}
                    title={l.occ.title}
                    color={l.occ.color}
                    onDragStart={(e) => onDragStart?.(e, l.occ)}
                    onDragEnd={onDragEnd}
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectOccurrence?.(l.occ)
                    }}
                    onAuxClick={(e) => {
                      e.stopPropagation()
                      onDeleteOccurrence?.(l.occ)
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="relative min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-scroll [scrollbar-gutter:stable]"
        >
          <div
            ref={gridRef}
            className={`relative grid min-w-0 ${gridColsClass} divide-x divide-hairline`}
            style={{ minHeight: `${24 * HOUR_HEIGHT}px` }}
          >
            {secondaryTimezone && (
              <div className="bg-app pr-1.5 text-right select-none min-w-0">
                {hours.map((hour) => {
                  const secondaryLabel = weekDays[0]
                    .startOf('day')
                    .plus({ hours: hour })
                    .setZone(secondaryTimezone)
                    .toFormat('HH:mm')
                  return (
                    <div
                      key={hour}
                      style={{ height: `${HOUR_HEIGHT}px` }}
                      className={`font-mono text-[10px] text-muted/70 truncate ${
                        hour === 0 ? 'pt-0.5' : '-translate-y-2'
                      }`}
                    >
                      {secondaryLabel}
                    </div>
                  )
                })}
              </div>
            )}
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
                  onMouseDown={(e) => {
                    if (isResizing) return
                    startSlotDrag(e, day, dayKey)
                  }}
                >
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      style={{ height: `${HOUR_HEIGHT}px` }}
                      className="gc-hour-slot border-b border-hairline/60"
                    />
                  ))}

                  {slotPreview && slotPreview.dayKey === dayKey && (
                    <div
                      className="pointer-events-none absolute right-1 left-1 z-20 rounded-md border-2 border-accent bg-accent/25"
                      style={{ top: `${slotPreview.topPos}px`, height: `${slotPreview.height}px` }}
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
                      onDelete={(occ) => onDeleteOccurrence?.(occ)}
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
      {slotPreview && (
        <ResizeTimeTooltip label={slotPreview.label} x={slotPreview.clientX} y={slotPreview.clientY} />
      )}
    </div>
  )
}

export default WeekView
