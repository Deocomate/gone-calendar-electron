import React, { useState, useRef, useCallback, useEffect } from 'react'
import { DateTime } from 'luxon'
import { Layers } from 'lucide-react'
import type { ExpandedOccurrence } from '@shared/event-model'
import type { TaskItem } from '@shared/task-model'
import { weekdayHeaders, TODAY_COLOR, DEFAULT_EVENT_COLOR } from '@shared/mini-calendar-grid'
import LunarLabel from '../components/LunarLabel'
import WeekNumber from '../components/WeekNumber'
import EventPill from '../components/EventPill'
import EventHoverFlyout, { type HoverFlyoutData } from '../components/EventHoverFlyout'
import { prepareDropEvent, type CalendarDropTarget } from '../dnd/drop-target'

interface MonthViewProps {
  anchorDate: DateTime
  occurrences: ExpandedOccurrence[]
  tasks?: TaskItem[]
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

interface MonthDayCellProps {
  day: DateTime
  anchorDate: DateTime
  dayOccurrences: ExpandedOccurrence[]
  dayTasks: TaskItem[]
  showLunar: boolean
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
  dayTasks,
  showLunar,
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
  const today = DateTime.local()
  const dayKey = day.toFormat('yyyy-MM-dd')
  const isCurrentMonth = day.month === anchorDate.month
  const isToday = day.hasSame(today, 'day')
  const totalItems = dayOccurrences.length + dayTasks.length
  const overflow = totalItems - 2

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    if (totalItems > 0) {
      const rect = e.currentTarget.getBoundingClientRect()
      onShowFlyout({
        title: day.toFormat('cccc, dd/MM/yyyy'),
        subtitle: `${totalItems} sự kiện & nhiệm vụ`,
        occurrences: dayOccurrences,
        tasks: dayTasks,
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
    >
      {/* Day number & lunar */}
      <div className="mb-0.5 flex items-center justify-between px-0.5 min-w-0">
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-full text-xs shrink-0 ${
            isToday
              ? 'font-semibold text-white'
              : isCurrentMonth
                ? 'text-primary font-medium'
                : 'text-muted'
          }`}
          style={isToday ? { backgroundColor: TODAY_COLOR } : undefined}
        >
          {day.day}
        </span>
        <div className="flex items-center gap-1">
          {totalItems >= 2 && (
            <span
              className="flex items-center gap-0.5 px-1 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-mono text-[9px] font-bold border border-indigo-200/50 dark:border-indigo-800/50"
              title={`${totalItems} sự kiện`}
            >
              <Layers className="w-2.5 h-2.5" />
              {totalItems}
            </span>
          )}
          {showLunar && <LunarLabel day={day.day} month={day.month} year={day.year} />}
        </div>
      </div>

      {/* Events preview */}
      <div className="min-h-0 flex-1 space-y-0.5 overflow-hidden">
        {dayOccurrences.slice(0, 2).map((occ) => {
          const occTime = DateTime.fromISO(occ.startUtc, { zone: 'utc' }).setZone('local')
          return (
            <EventPill
              key={occ.id}
              dense
              draggable
              isDragging={draggedOccurrenceId === occ.id}
              title={occ.title}
              color={occ.color}
              time={occ.allDay ? undefined : occTime.toFormat('HH:mm')}
              onDragStart={(e) => onDragStart?.(e, occ)}
              onDragEnd={onDragEnd}
              onClick={(e) => {
                e.stopPropagation()
                onSelectOccurrence?.(occ)
              }}
            />
          )
        })}

        {dayTasks.slice(0, Math.max(0, 2 - dayOccurrences.length)).map((task) => (
          <div
            key={task.id}
            className="gc-event gc-event-dense truncate rounded-none px-1.5 py-0.5 text-[10px] font-medium text-white min-w-0"
            style={{ backgroundColor: DEFAULT_EVENT_COLOR }}
            title={`Nhiệm vụ: ${task.title}`}
          >
            ✓ {task.title}
          </div>
        ))}

        {overflow > 0 && (
          <div className="px-1 text-[10px] font-medium text-muted truncate">
            +{overflow} thêm
          </div>
        )}
      </div>
    </div>
  )
}

export const MonthView: React.FC<MonthViewProps> = ({
  anchorDate,
  occurrences,
  tasks = [],
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
  const [hoverData, setHoverData] = useState<HoverFlyoutData | null>(null)
  const hoverTimerRef = useRef<any>(null)

  useEffect(() => {
    if (draggedOccurrenceId) {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
      setHoverData(null)
    }
  }, [draggedOccurrenceId])

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
    for (const occ of occurrences) {
      const dt = DateTime.fromISO(occ.startUtc, { zone: 'utc' }).setZone('local')
      const dayKey = dt.toFormat('yyyy-MM-dd')
      const list = map.get(dayKey) || []
      list.push(occ)
      map.set(dayKey, list)
    }
    return map
  }, [occurrences])

  const tasksByDay = React.useMemo(() => {
    const map = new Map<string, TaskItem[]>()
    for (const t of tasks) {
      if (t.dueDate && t.showOnCalendar !== false) {
        const list = map.get(t.dueDate) || []
        list.push(t)
        map.set(t.dueDate, list)
      }
    }
    return map
  }, [tasks])

  const headers = weekdayHeaders(1)
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
      <div className="grid min-h-0 flex-1 grid-rows-6 divide-y divide-hairline">
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
                const dayTasks = tasksByDay.get(dayKey) || []
                const isDropTarget = dropTarget?.dateKey === dayKey && dropTarget.hour === undefined

                return (
                  <MonthDayCell
                    key={dayKey}
                    day={day}
                    anchorDate={anchorDate}
                    dayOccurrences={dayOccurrences}
                    dayTasks={dayTasks}
                    showLunar={showLunar}
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
