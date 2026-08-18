import React, { useRef, useEffect } from 'react'
import { DateTime } from 'luxon'
import { MapPin, Repeat } from 'lucide-react'
import type { ExpandedOccurrence } from '@shared/event-model'
import { TODAY_COLOR, DEFAULT_EVENT_COLOR } from '@shared/mini-calendar-grid'
import LunarLabel from '../components/LunarLabel'
import WeekNumber from '../components/WeekNumber'
import EventPill from '../components/EventPill'
import { hourFromPointer, prepareDropEvent, type CalendarDropTarget } from '../dnd/drop-target'

interface WeekViewProps {
  anchorDate: DateTime
  occurrences: ExpandedOccurrence[]
  showLunar: boolean
  showWeekNumbers: boolean
  draggedOccurrenceId?: string
  dropTarget?: CalendarDropTarget | null
  onSelectOccurrence?: (occ: ExpandedOccurrence) => void
  onSelectSlot?: (start: DateTime, end: DateTime) => void
  onDragStart?: (e: React.DragEvent, occ: ExpandedOccurrence) => void
  onDragEnd?: () => void
  onDragOverTarget?: (target: CalendarDropTarget) => void
  onDropOnDate?: (e: React.DragEvent, targetDate: DateTime, hour?: number) => void
}

const HOUR_HEIGHT = 56

const GOOGLE_OVERLAP_PALETTE = [
  '#039BE5', // Peacock Blue
  '#0B8043', // Basil Green
  '#E8710A', // Amber Orange
  '#8E24AA', // Purple Grape
  '#D93025', // Tomato Red
  '#129EAF', // Cyan Teal
  '#E52592', // Pink Flamingo
  '#F4511E', // Tangerine
  '#3F51B5'  // Royal Indigo
]

interface TimedLayout {
  occ: ExpandedOccurrence
  topPos: number
  height: number
  leftPercent: number
  widthPercent: number
  overlapIndex: number
  totalOverlaps: number
  effectiveColor: string
}

function layoutTimedEvents(events: ExpandedOccurrence[], hourHeight: number): TimedLayout[] {
  if (events.length === 0) return []

  const parsed = events.map((occ) => {
    const startDt = DateTime.fromISO(occ.startUtc, { zone: 'utc' }).setZone('local')
    const endDt = DateTime.fromISO(occ.endUtc, { zone: 'utc' }).setZone('local')
    const startMin = startDt.hour * 60 + startDt.minute
    const durationMin = Math.max(25, endDt.diff(startDt, 'minutes').minutes)
    const endMin = startMin + durationMin
    return {
      occ,
      startDt,
      endDt,
      startMin,
      endMin,
      durationMin,
      topPos: (startMin / 60) * hourHeight,
      height: (durationMin / 60) * hourHeight
    }
  })

  parsed.sort((a, b) => a.startMin - b.startMin || b.durationMin - a.durationMin)

  const layouts: TimedLayout[] = []
  let group: typeof parsed = []
  let groupEndMin = 0

  const processGroup = (currentGroup: typeof parsed) => {
    if (currentGroup.length === 0) return
    const columns: (typeof parsed)[] = []

    for (const item of currentGroup) {
      let placed = false
      for (let i = 0; i < columns.length; i++) {
        const lastInCol = columns[i][columns[i].length - 1]
        if (lastInCol.endMin <= item.startMin) {
          columns[i].push(item)
          placed = true
          break
        }
      }
      if (!placed) {
        columns.push([item])
      }
    }

    const colCount = columns.length
    const colorCounts = new Map<string, number>()
    for (const item of currentGroup) {
      const c = item.occ.color || DEFAULT_EVENT_COLOR
      colorCounts.set(c, (colorCounts.get(c) || 0) + 1)
    }

    for (let c = 0; c < colCount; c++) {
      for (const item of columns[c]) {
        const originalColor = item.occ.color || DEFAULT_EVENT_COLOR
        let finalColor = originalColor

        if (colCount > 1 && ((colorCounts.get(originalColor) || 0) > 1 || !item.occ.color)) {
          finalColor = GOOGLE_OVERLAP_PALETTE[c % GOOGLE_OVERLAP_PALETTE.length]
        }

        layouts.push({
          occ: item.occ,
          topPos: item.topPos,
          height: item.height,
          leftPercent: (c / colCount) * 100,
          widthPercent: 100 / colCount,
          overlapIndex: c,
          totalOverlaps: colCount,
          effectiveColor: finalColor
        })
      }
    }
  }

  for (const item of parsed) {
    if (group.length === 0) {
      group.push(item)
      groupEndMin = item.endMin
    } else if (item.startMin < groupEndMin) {
      group.push(item)
      groupEndMin = Math.max(groupEndMin, item.endMin)
    } else {
      processGroup(group)
      group = [item]
      groupEndMin = item.endMin
    }
  }
  processGroup(group)

  return layouts
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
  onDropOnDate
}) => {
  const scrollRef = useRef<HTMLDivElement>(null)

  const today = DateTime.local()
  const weekStart = anchorDate.startOf('week')
  const weekDays = Array.from({ length: 7 }, (_, i) => weekStart.plus({ days: i }))

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 7.5 * HOUR_HEIGHT
    }
  }, [])

  const allDayOccurrences = occurrences.filter((o) => o.allDay)
  const timedOccurrences = occurrences.filter((o) => !o.allDay)
  const hours = Array.from({ length: 24 }, (_, i) => i)

  return (
    <div className="flex h-full w-full flex-col overflow-x-auto overflow-y-hidden bg-surface select-none relative">
      <div className="flex h-full min-w-[1180px] flex-col flex-1">
        {/* Week View Header */}
        <div className="shrink-0 border-b border-hairline overflow-hidden">
          <div className="grid grid-cols-[64px_repeat(7,minmax(160px,1fr))] divide-x divide-hairline">
            <div className="flex items-center justify-center bg-app p-2 min-w-0">
              {showWeekNumbers && <WeekNumber weekNumber={anchorDate.weekNumber} />}
            </div>

            {weekDays.map((day) => {
              const isToday = day.hasSame(today, 'day')
              return (
                <div key={day.toISO()} className="flex flex-col items-center p-2.5 text-center min-w-0 overflow-hidden">
                  <span className={`text-xs font-semibold uppercase truncate ${isToday ? 'text-today' : 'text-muted'}`}>
                    {day.toFormat('ccc')}
                  </span>
                  <div className="mt-1 flex items-center gap-1.5 min-w-0">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold shrink-0 ${
                        isToday ? 'text-white' : 'text-primary'
                      }`}
                      style={isToday ? { backgroundColor: TODAY_COLOR } : undefined}
                    >
                      {day.day}
                    </span>
                    {showLunar && <LunarLabel day={day.day} month={day.month} year={day.year} />}
                  </div>
                </div>
              )
            })}
          </div>

          {allDayOccurrences.length > 0 && (
            <div className="grid min-h-9 grid-cols-[64px_repeat(7,minmax(160px,1fr))] divide-x divide-hairline border-t border-hairline bg-app text-xs">
              <div className="flex items-center justify-center p-2 text-[11px] font-semibold text-muted min-w-0">
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

        {/* Hourly Scrollable Grid with Wide Columns */}
        <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-y-scroll [scrollbar-gutter:stable]">
          <div
            className="relative grid grid-cols-[64px_repeat(7,minmax(160px,1fr))] divide-x divide-hairline"
            style={{ minHeight: `${24 * HOUR_HEIGHT}px` }}
          >
            <div className="bg-app pr-2 text-right select-none min-w-0">
              {hours.map((hour) => (
                <div
                  key={hour}
                  style={{ height: `${HOUR_HEIGHT}px` }}
                  className="-translate-y-2 font-mono text-[11px] text-muted truncate"
                >
                  {hour.toString().padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {weekDays.map((day) => {
              const isToday = day.hasSame(today, 'day')
              const dayKey = day.toFormat('yyyy-MM-dd')
              const dayTimedEvents = timedOccurrences.filter((occ) => {
                const dt = DateTime.fromISO(occ.startUtc, { zone: 'utc' }).setZone('local')
                return dt.toFormat('yyyy-MM-dd') === dayKey
              })
              const timedLayouts = layoutTimedEvents(dayTimedEvents, HOUR_HEIGHT)

              return (
                <div
                  key={dayKey}
                  className={`relative min-w-0 cursor-pointer overflow-visible ${
                    isToday ? 'bg-today/5' : ''
                  }`}
                  onDragOver={(e) => {
                    prepareDropEvent(e)
                    const rect = e.currentTarget.getBoundingClientRect()
                    onDragOverTarget?.({
                      dateKey: dayKey,
                      hour: hourFromPointer(e.clientY, rect.top, HOUR_HEIGHT)
                    })
                  }}
                  onDrop={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    const droppedHour = hourFromPointer(e.clientY, rect.top, HOUR_HEIGHT)
                    onDropOnDate?.(e, day, droppedHour)
                  }}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    const clickedHour = hourFromPointer(e.clientY, rect.top, HOUR_HEIGHT)
                    const startSlot = day.set({ hour: clickedHour, minute: 0, second: 0 })
                    onSelectSlot?.(startSlot, startSlot.plus({ hours: 1 }))
                  }}
                >
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      style={{ height: `${HOUR_HEIGHT}px` }}
                      className={`gc-hour-slot border-b border-hairline/60 ${
                        dropTarget?.dateKey === dayKey && dropTarget.hour === hour ? 'is-drop-target' : ''
                      }`}
                    />
                  ))}

                  {isToday && (
                    <div
                      className="pointer-events-none absolute right-0 left-0 z-20 flex items-center"
                      style={{ top: `${((today.hour * 60 + today.minute) / 60) * HOUR_HEIGHT}px` }}
                    >
                      <div className="-ml-1 h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: TODAY_COLOR }} />
                      <div className="h-0.5 flex-1" style={{ backgroundColor: TODAY_COLOR }} />
                    </div>
                  )}

                  {timedLayouts.map((layout) => {
                    const { occ } = layout
                    const startDt = DateTime.fromISO(occ.startUtc, { zone: 'utc' }).setZone('local')
                    const endDt = DateTime.fromISO(occ.endUtc, { zone: 'utc' }).setZone('local')
                    const durationMin = endDt.diff(startDt, 'minutes').minutes
                    const isDragging = draggedOccurrenceId === occ.id

                    return (
                      <div
                        key={occ.id}
                        draggable
                        onDragStart={(e) => onDragStart?.(e, occ)}
                        onDragEnd={onDragEnd}
                        onClick={(e) => {
                          e.stopPropagation()
                          onSelectOccurrence?.(occ)
                        }}
                        style={{
                          top: `${layout.topPos}px`,
                          height: `${Math.max(24, layout.height - 2)}px`,
                          left: `calc(${layout.leftPercent}% + 2px)`,
                          width: `calc(${layout.widthPercent}% - 4px)`,
                          backgroundColor: layout.effectiveColor,
                          borderRadius: 6
                        }}
                        className={`gc-event absolute z-10 cursor-grab overflow-hidden p-1.5 text-xs text-white active:cursor-grabbing min-w-0 shadow-xs border border-white/20 hover:z-30 hover:shadow-md transition-all ${
                          isDragging ? 'is-dragging' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 min-w-0">
                          <span className="truncate text-xs font-semibold leading-tight">{occ.title}</span>
                          {occ.isRecurring && <Repeat className="h-2.5 w-2.5 opacity-80 shrink-0" />}
                        </div>
                        <div className="font-mono text-[10px] opacity-90 truncate mt-0.5">
                          {startDt.toFormat('HH:mm')} – {endDt.toFormat('HH:mm')}
                        </div>
                        {durationMin >= 40 && occ.location && (
                          <div className="flex items-center gap-1 text-[10px] opacity-85 truncate mt-0.5">
                            <MapPin className="h-2.5 w-2.5 shrink-0" />
                            <span className="truncate">{occ.location}</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default WeekView
