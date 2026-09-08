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
import type { EventEditorDraftPreview } from '../editor/EventEditorDialog'

interface WeekViewProps {
  anchorDate: DateTime
  occurrences: ExpandedOccurrence[]
  showLunar: boolean
  showWeekNumbers?: boolean
  draggedOccurrenceId?: string
  dropTarget?: CalendarDropTarget | null
  /** Live slot/color for a new event still being drafted in the open editor - painted
   *  as an outline on the grid so the dialog isn't the only place the event is visible. */
  previewSlot?: EventEditorDraftPreview | null
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
  previewSlot,
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
  const ALL_DAY_LANE_HEIGHT = 24
  // Headroom to click and add another all-day event.
  const ADD_LANE_HEIGHT = 16
  // Vertical gap between stacked lanes (two overlapping multi-day bars) - without
  // this, lanes sit flush top-to-bottom with no seam between them at all, unlike the
  // horizontal gap between same-lane bars.
  const LANE_ROW_GAP = 4

  // A new all-day event being drafted highlights its date(s) in the header row above
  // instead of a fake bar in the lanes below - simpler, and it can't be mistaken for
  // an already-saved event.
  const isDraftAllDayOn = (day: DateTime): boolean =>
    Boolean(
      previewSlot?.allDay &&
        day.startOf('day') >= previewSlot.start.startOf('day') &&
        day.startOf('day') <= previewSlot.end.startOf('day')
    )

  // Draft preview of a new TIMED event, clamped to a single day column - a span past
  // midnight just gets cut off at that day's edge rather than segmented like a real
  // multi-day event (this is a still-being-typed draft, not a saved occurrence yet).
  const timedPreviewForDay = (day: DateTime) => {
    if (!previewSlot || previewSlot.allDay) return null
    const dayStart = day.startOf('day')
    const dayEnd = day.endOf('day')
    if (previewSlot.end <= dayStart || previewSlot.start >= dayEnd) return null
    const clampedStart = previewSlot.start < dayStart ? dayStart : previewSlot.start
    const clampedEnd = previewSlot.end > dayEnd ? dayEnd : previewSlot.end
    const startMin = clampedStart.diff(dayStart, 'minutes').minutes
    const endMin = clampedEnd.diff(dayStart, 'minutes').minutes
    if (endMin <= startMin) return null
    return { topPos: (startMin / 60) * HOUR_HEIGHT, height: ((endMin - startMin) / 60) * HOUR_HEIGHT }
  }
  // Gaps only exist BETWEEN rows, so there are exactly as many as (total rows - 1) -
  // total rows is allDayLaneCount + 1 (the reserved add-lane), so that's allDayLaneCount
  // gaps once any real lane exists, and none when the row is just the add-lane alone.
  const allDayAreaHeight =
    allDayLaneCount > 0
      ? allDayLaneCount * ALL_DAY_LANE_HEIGHT + ADD_LANE_HEIGHT + allDayLaneCount * LANE_ROW_GAP
      : ADD_LANE_HEIGHT

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
              const isDraftAllDay = isDraftAllDayOn(day)
              return (
                <div
                  key={day.toISO()}
                  className="flex min-w-0 flex-col items-center overflow-hidden rounded-lg px-1 py-2 text-center transition-colors"
                  style={isDraftAllDay ? { backgroundColor: `${previewSlot!.color}1f` } : undefined}
                >
                  <span
                    className={`truncate rounded-full text-lg font-bold tracking-wide ${
                      isToday
                        ? 'bg-today px-2 py-0.5 text-white'
                        : isDraftAllDay
                          ? 'px-2 py-0.5 text-primary'
                          : 'text-primary'
                    }`}
                    style={isDraftAllDay && !isToday ? { boxShadow: `inset 0 0 0 2px ${previewSlot!.color}` } : undefined}
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
                // The reserved "click to add another" lane is its own explicit row
                // (ADD_LANE_HEIGHT), separate from the repeat() sizing real lanes.
                gridTemplateRows:
                  allDayLaneCount > 0
                    ? `repeat(${allDayLaneCount}, ${ALL_DAY_LANE_HEIGHT}px) ${ADD_LANE_HEIGHT}px`
                    : `${ADD_LANE_HEIGHT}px`,
                rowGap: `${LANE_ROW_GAP}px`,
                paddingTop: 2
              }}
            >
              {allDayLayouts.map((l) => (
                <div
                  key={l.occ.id}
                  // Gap on one side only (not both) - two adjacent bars then get a single
                  // ~4px seam between them instead of each contributing its own padding
                  // and doubling it, so the visible block reads bigger for the same gap.
                  className="pointer-events-auto min-w-0 h-full pr-1"
                  style={{
                    gridColumn: `${l.startCol + dayColOffset} / span ${l.span}`,
                    gridRow: l.lane + 1
                  }}
                >
                  <EventPill
                    dense
                    draggable
                    // Fill the full lane row instead of shrinking to its own text
                    // height - otherwise the bar reads much thinner than the lane
                    // height reserved for it, on top of whatever the side gaps are.
                    className="h-full"
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

                  {/* Draft preview of a new event while its editor is open - outlined in
                      the color the form currently holds, updating live as it changes. */}
                  {(() => {
                    const box = timedPreviewForDay(day)
                    if (!box) return null
                    return (
                      <div
                        className="pointer-events-none absolute right-1 left-1 z-20 rounded-[6px] border-2 border-dashed"
                        style={{
                          top: `${box.topPos}px`,
                          height: `${box.height}px`,
                          borderColor: previewSlot!.color,
                          backgroundColor: `${previewSlot!.color}33`
                        }}
                      />
                    )
                  })()}

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
