import React, { useRef, useEffect } from 'react'
import { DateTime } from 'luxon'
import { MapPin, Repeat, Clock } from 'lucide-react'
import type { ExpandedOccurrence } from '@shared/event-model'
import { TODAY_COLOR, DEFAULT_EVENT_COLOR } from '@shared/mini-calendar-grid'
import LunarLabel from '../components/LunarLabel'
import EventPill from '../components/EventPill'
import { hourFromPointer, prepareDropEvent, type CalendarDropTarget } from '../dnd/drop-target'

interface DayViewProps {
  anchorDate: DateTime
  occurrences: ExpandedOccurrence[]
  showLunar: boolean
  draggedOccurrenceId?: string
  dropTarget?: CalendarDropTarget | null
  onSelectOccurrence?: (occ: ExpandedOccurrence) => void
  onSelectSlot?: (start: DateTime, end: DateTime) => void
  onDragStart?: (e: React.DragEvent, occ: ExpandedOccurrence) => void
  onDragEnd?: () => void
  onDragOverTarget?: (target: CalendarDropTarget) => void
  onDropOnDate?: (e: React.DragEvent, targetDate: DateTime, targetHour?: number) => void
}

const HOUR_HEIGHT = 60

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
  onDropOnDate
}) => {
  const scrollRef = useRef<HTMLDivElement>(null)

  const today = DateTime.local()
  const isToday = anchorDate.hasSame(today, 'day')
  const dayKey = anchorDate.toFormat('yyyy-MM-dd')

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 7.5 * HOUR_HEIGHT
    }
  }, [anchorDate])

  const allDayOccurrences = occurrences.filter((o) => o.allDay)
  const timedOccurrences = occurrences.filter((o) => !o.allDay)
  const timedLayouts = layoutTimedEvents(timedOccurrences, HOUR_HEIGHT)
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
                className="-translate-y-2.5 font-mono text-xs text-muted truncate pt-1"
              >
                {hour.toString().padStart(2, '0')}:00
              </div>
            ))}
          </div>

          <div
            className={`relative min-w-0 cursor-pointer overflow-visible ${isToday ? 'bg-today/5' : ''}`}
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
              onDropOnDate?.(e, anchorDate, droppedHour)
            }}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              const clickedHour = hourFromPointer(e.clientY, rect.top, HOUR_HEIGHT)
              const startSlot = anchorDate.set({ hour: clickedHour, minute: 0, second: 0 })
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
                <div className="-ml-1.5 h-3.5 w-3.5 rounded-full shrink-0" style={{ backgroundColor: TODAY_COLOR }} />
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
                    height: `${Math.max(26, layout.height - 2)}px`,
                    left: `calc(${layout.leftPercent}% + 3px)`,
                    width: `calc(${layout.widthPercent}% - 6px)`,
                    backgroundColor: layout.effectiveColor,
                    borderRadius: 6
                  }}
                  className={`gc-event absolute z-10 cursor-grab overflow-hidden p-2 text-xs text-white active:cursor-grabbing min-w-0 shadow-sm border border-white/20 hover:z-30 hover:shadow-lg transition-all ${
                    isDragging ? 'is-dragging' : ''
                  }`}
                >
                  <div className="flex items-center justify-between min-w-0">
                    <span className="text-xs font-bold truncate leading-tight">{occ.title}</span>
                    {occ.isRecurring && <Repeat className="h-3 w-3 opacity-80 shrink-0 ml-1" />}
                  </div>
                  <div className="flex items-center gap-1 font-mono text-[10px] opacity-90 truncate mt-0.5">
                    <Clock className="h-2.5 w-2.5 shrink-0" />
                    <span>{startDt.toFormat('HH:mm')} – {endDt.toFormat('HH:mm')}</span>
                  </div>
                  {durationMin >= 45 && occ.location && (
                    <div className="flex items-center gap-1 text-[10px] opacity-90 truncate mt-1">
                      <MapPin className="h-2.5 w-2.5 shrink-0" />
                      <span className="truncate">{occ.location}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DayView
