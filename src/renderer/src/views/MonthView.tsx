import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { DateTime } from 'luxon'
import { Layers } from 'lucide-react'
import type { ExpandedOccurrence } from '@shared/event-model'
import { getDayHighlights, DAY_HIGHLIGHT_COLORS, type DayHighlightKind } from '@shared/day-highlight'
import { formatClockTime } from '@shared/time-format'
import { useDisplayPreferences } from '../context/DisplayPreferencesContext'
import LunarLabel from '../components/LunarLabel'
import WeekNumber from '../components/WeekNumber'
import EventPill from '../components/EventPill'
import EventHoverFlyout, { type HoverFlyoutData } from '../components/EventHoverFlyout'
import { prepareDropEvent, type CalendarDropTarget } from '../dnd/drop-target'
import { weekdayShortLabels } from '../i18n/weekday-labels'

interface MonthViewProps {
  anchorDate: DateTime
  occurrences: ExpandedOccurrence[]
  showLunar: boolean
  showWeekNumbers: boolean
  draggedOccurrenceId?: string
  dropTarget?: CalendarDropTarget | null
  onSelectDate?: (date: DateTime) => void
  onSelectOccurrence?: (occ: ExpandedOccurrence) => void
  onDragStart?: (e: React.DragEvent, occ: ExpandedOccurrence) => void
  onDragEnd?: () => void
  onDragOverTarget?: (target: CalendarDropTarget) => void
  onDropOnDate?: (e: React.DragEvent, targetDate: DateTime) => void
}

/** ~10% tint of the whole cell for one marker, diagonal split when a day carries more than one -
 *  same subtlety as "today"'s bg-today/5 column tint in Week view, just for a whole day cell. */
function highlightBackground(kinds: DayHighlightKind[]): string | undefined {
  if (kinds.length === 0) return undefined
  const colors = kinds.map((k) => `${DAY_HIGHLIGHT_COLORS[k]}1a`)
  if (colors.length === 1) return colors[0]
  const stops = colors.map((c, i) => `${c} ${(i / colors.length) * 100}% ${((i + 1) / colors.length) * 100}%`)
  return `linear-gradient(135deg, ${stops.join(', ')})`
}

interface MonthDayCellProps {
  day: DateTime
  anchorDate: DateTime
  dayOccurrences: ExpandedOccurrence[]
  showLunar: boolean
  maxVisible: number
  isDropTarget: boolean
  draggedOccurrenceId?: string
  onSelectDate?: (date: DateTime) => void
  onSelectOccurrence?: (occ: ExpandedOccurrence) => void
  onDragStart?: (e: React.DragEvent, occ: ExpandedOccurrence) => void
  onDragEnd?: () => void
  onDragOverTarget?: (target: CalendarDropTarget) => void
  onDropOnDate?: (e: React.DragEvent, targetDate: DateTime) => void
  onShowFlyout: (data: HoverFlyoutData) => void
  onHideFlyout: () => void
}

const MonthDayCell: React.FC<MonthDayCellProps> = ({
  day,
  anchorDate,
  dayOccurrences,
  showLunar,
  maxVisible,
  isDropTarget,
  draggedOccurrenceId,
  onSelectDate,
  onSelectOccurrence,
  onDragStart,
  onDragEnd,
  onDragOverTarget,
  onDropOnDate,
  onShowFlyout,
  onHideFlyout
}) => {
  const { timeFormat } = useDisplayPreferences()
  const today = DateTime.local()
  const dayKey = day.toFormat('yyyy-MM-dd')
  const isCurrentMonth = day.month === anchorDate.month
  const totalItems = dayOccurrences.length
  const fitsAll = totalItems <= maxVisible
  const visibleCount = fitsAll ? totalItems : Math.max(0, maxVisible - 1)
  const overflow = totalItems - visibleCount

  const highlights = React.useMemo(() => getDayHighlights(day, today), [day, today])
  const highlightBg = highlightBackground(highlights)

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    if (totalItems > 0) {
      const rect = e.currentTarget.getBoundingClientRect()
      onShowFlyout({
        title: day.toFormat('cccc, dd/MM/yyyy'),
        subtitle: String(totalItems),
        occurrences: dayOccurrences,
        anchorRect: rect
      })
    }
  }

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={onHideFlyout}
      onClick={() => onSelectDate?.(day)}
      onDragOver={(e) => {
        prepareDropEvent(e)
        onDragOverTarget?.({ dateKey: dayKey })
      }}
      onDrop={(e) => onDropOnDate?.(e, day)}
      className={`gc-cell relative flex min-h-0 min-w-0 cursor-pointer flex-col p-1 overflow-hidden transition-all ${
        isCurrentMonth ? 'bg-surface' : 'bg-app'
      } ${isDropTarget ? 'is-drop-target' : ''}`}
      style={highlightBg ? { background: highlightBg } : undefined}
    >
      {/* Day number & lunar */}
      <div className="mb-0.5 flex items-center justify-between px-0.5 min-w-0">
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full text-sm shrink-0 ${
            isCurrentMonth ? 'text-primary font-medium' : 'text-muted'
          }`}
        >
          {day.day}
        </span>
        <div className="flex items-center gap-1">
          {totalItems >= 2 && (
            <span
              className="flex items-center gap-0.5 px-1 py-0.5 rounded-[3px] bg-hover text-muted border border-hairline font-mono text-[9px] font-medium"
              title={String(totalItems)}
            >
              <Layers className="w-2.5 h-2.5" />
              {totalItems}
            </span>
          )}
          {showLunar && <LunarLabel day={day.day} month={day.month} year={day.year} />}
        </div>
      </div>

      {/* Events preview - shows as many as fit, "+N" only for whatever's left over */}
      <div className="min-h-0 flex-1 space-y-0.5 overflow-hidden">
        {dayOccurrences.slice(0, visibleCount).map((occ) => {
          const occTime = DateTime.fromISO(occ.startUtc, { zone: 'utc' }).setZone('local')
          return (
            <EventPill
              key={occ.id}
              dense
              draggable
              isDragging={draggedOccurrenceId === occ.id}
              title={occ.title}
              color={occ.color}
              time={occ.allDay ? undefined : formatClockTime(occTime, timeFormat)}
              onDragStart={(e) => onDragStart?.(e, occ)}
              onDragEnd={onDragEnd}
              onClick={(e) => {
                e.stopPropagation()
                onSelectOccurrence?.(occ)
              }}
            />
          )
        })}

        {overflow > 0 && (
          <div className="px-1 text-[10px] font-medium text-muted truncate">
            +{overflow}
          </div>
        )}
      </div>
    </div>
  )
}

/** Pixel budget per cell used to derive maxVisible: day-number row + cell padding + per-pill row. */
const HEADER_ROW_PX = 28
const CELL_PADDING_PX = 8
const PILL_ROW_PX = 20

export const MonthView: React.FC<MonthViewProps> = ({
  anchorDate,
  occurrences,
  showLunar,
  showWeekNumbers,
  draggedOccurrenceId,
  dropTarget,
  onSelectDate,
  onSelectOccurrence,
  onDragStart,
  onDragEnd,
  onDragOverTarget,
  onDropOnDate
}) => {
  const { t } = useTranslation()
  const [hoverData, setHoverData] = useState<HoverFlyoutData | null>(null)
  const hoverTimerRef = useRef<any>(null)
  const weeksGridRef = useRef<HTMLDivElement>(null)
  const [maxVisible, setMaxVisible] = useState(2)

  useEffect(() => {
    if (draggedOccurrenceId) {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
      setHoverData(null)
    }
  }, [draggedOccurrenceId])

  // Fit as many events as the row's actual height allows instead of a hardcoded cap.
  useEffect(() => {
    const el = weeksGridRef.current
    if (!el) return

    const recompute = () => {
      const rowHeight = el.clientHeight / 6
      const available = rowHeight - HEADER_ROW_PX - CELL_PADDING_PX
      setMaxVisible(Math.max(1, Math.floor(available / PILL_ROW_PX)))
    }

    recompute()
    const ro = new ResizeObserver(recompute)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const handleShowFlyout = useCallback(
    (data: HoverFlyoutData) => {
      if (draggedOccurrenceId) return
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = setTimeout(() => {
        if (!draggedOccurrenceId) {
          setHoverData(data)
        }
      }, 120)
    },
    [draggedOccurrenceId]
  )

  const handleHideFlyout = useCallback(() => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    hoverTimerRef.current = setTimeout(() => {
      setHoverData(null)
    }, 180)
  }, [])

  const handleDragStartWithDismiss = (e: React.DragEvent, occ: ExpandedOccurrence) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    setHoverData(null)
    onDragStart?.(e, occ)
  }

  const monthStart = anchorDate.startOf('month')
  const startDayOfWeek = monthStart.weekday
  const gridStart = monthStart.minus({ days: startDayOfWeek - 1 }).startOf('day')

  const days: DateTime[] = []
  for (let i = 0; i < 42; i++) {
    days.push(gridStart.plus({ days: i }))
  }

  const occurrencesByDay = React.useMemo(() => {
    const map = new Map<string, ExpandedOccurrence[]>()
    const addTo = (dayKey: string, occ: ExpandedOccurrence) => {
      const list = map.get(dayKey) || []
      list.push(occ)
      map.set(dayKey, list)
    }
    for (const occ of occurrences) {
      const startDt = DateTime.fromISO(occ.startUtc, { zone: 'utc' }).setZone('local')
      if (occ.allDay) {
        // All-day end is inclusive - a multi-day event must land in every day it
        // spans, not just its start day. Capped so a malformed/corrupt event with an
        // absurd end date can't spin this loop for years and stall rendering.
        const MAX_SPAN_DAYS = 366
        const lastDay = DateTime.fromISO(occ.endUtc, { zone: 'utc' }).setZone('local').startOf('day')
        let cursor = startDt.startOf('day')
        let daysWalked = 0
        while (cursor <= lastDay && daysWalked < MAX_SPAN_DAYS) {
          addTo(cursor.toFormat('yyyy-MM-dd'), occ)
          cursor = cursor.plus({ days: 1 })
          daysWalked++
        }
      } else {
        addTo(startDt.toFormat('yyyy-MM-dd'), occ)
      }
    }
    return map
  }, [occurrences])

  const headers = weekdayShortLabels(t, 1)
  const gridColumnsClass = showWeekNumbers
    ? 'grid-cols-[28px_repeat(7,minmax(0,1fr))]'
    : 'grid-cols-[repeat(7,minmax(0,1fr))]'

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-surface select-none relative">
      {/* Header Row */}
      <div
        className={`grid border-b border-hairline py-2 text-center text-xs font-semibold text-muted ${gridColumnsClass}`}
      >
        {showWeekNumbers && <div />}
        {headers.map((h, idx) => (
          <div key={h} className={`min-w-0 truncate ${idx >= 5 ? 'text-today' : ''}`}>
            {h}
          </div>
        ))}
      </div>

      {/* 6 Weeks Grid */}
      <div ref={weeksGridRef} className="grid min-h-0 flex-1 grid-rows-6 divide-y divide-hairline">
        {Array.from({ length: 6 }).map((_, weekIdx) => {
          const weekDays = days.slice(weekIdx * 7, weekIdx * 7 + 7)
          const firstDayOfWeek = weekDays[0]

          return (
            <div
              key={weekIdx}
              className={`grid min-h-0 divide-x divide-hairline ${gridColumnsClass}`}
            >
              {showWeekNumbers && (
                <div className="flex items-center justify-center bg-app min-w-0">
                  <WeekNumber weekNumber={firstDayOfWeek.weekNumber} />
                </div>
              )}

              {weekDays.map((day) => {
                const dayKey = day.toFormat('yyyy-MM-dd')
                const dayOccurrences = occurrencesByDay.get(dayKey) || []
                const isDropTarget = dropTarget?.dateKey === dayKey && dropTarget.hour === undefined

                return (
                  <MonthDayCell
                    key={dayKey}
                    day={day}
                    anchorDate={anchorDate}
                    dayOccurrences={dayOccurrences}
                    showLunar={showLunar}
                    maxVisible={maxVisible}
                    isDropTarget={isDropTarget}
                    draggedOccurrenceId={draggedOccurrenceId}
                    onSelectDate={onSelectDate}
                    onSelectOccurrence={onSelectOccurrence}
                    onDragStart={handleDragStartWithDismiss}
                    onDragEnd={onDragEnd}
                    onDragOverTarget={onDragOverTarget}
                    onDropOnDate={onDropOnDate}
                    onShowFlyout={handleShowFlyout}
                    onHideFlyout={handleHideFlyout}
                  />
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Floating Side Popover */}
      <EventHoverFlyout
        data={hoverData}
        onMouseEnter={() => {
          if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
        }}
        onMouseLeave={handleHideFlyout}
        onSelectOccurrence={(occ) => {
          setHoverData(null)
          onSelectOccurrence?.(occ)
        }}
        onDragStart={handleDragStartWithDismiss}
        onDragEnd={onDragEnd}
        draggedOccurrenceId={draggedOccurrenceId}
      />
    </div>
  )
}

export default MonthView
