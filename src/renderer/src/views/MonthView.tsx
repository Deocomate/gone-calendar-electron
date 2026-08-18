import React from 'react'
import { DateTime } from 'luxon'
import type { ExpandedOccurrence } from '@shared/event-model'
import type { TaskItem } from '@shared/task-model'
import LunarLabel from '../components/LunarLabel'
import WeekNumber from '../components/WeekNumber'

interface MonthViewProps {
  anchorDate: DateTime
  occurrences: ExpandedOccurrence[]
  tasks?: TaskItem[]
  showLunar: boolean
  showWeekNumbers: boolean
  onSelectDate?: (date: DateTime) => void
  onSelectOccurrence?: (occ: ExpandedOccurrence) => void
  onDragStart?: (e: React.DragEvent, occ: ExpandedOccurrence) => void
  onDropOnDate?: (e: React.DragEvent, targetDate: DateTime) => void
}

export const MonthView: React.FC<MonthViewProps> = ({
  anchorDate,
  occurrences,
  tasks = [],
  showLunar,
  showWeekNumbers,
  onSelectDate,
  onSelectOccurrence,
  onDragStart,
  onDropOnDate
}) => {
  const today = DateTime.local()
  const monthStart = anchorDate.startOf('month')
  const startDayOfWeek = monthStart.weekday // 1=Mon..7=Sun
  const gridStart = monthStart.minus({ days: startDayOfWeek - 1 }).startOf('day')

  // Generate 42 calendar cell days (6 weeks x 7 days)
  const days: DateTime[] = []
  for (let i = 0; i < 42; i++) {
    days.push(gridStart.plus({ days: i }))
  }

  // Group occurrences by YYYY-MM-DD
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

  // Group tasks by YYYY-MM-DD
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

  const weekdayHeaders = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

  return (
    <div className="h-full w-full flex flex-col bg-slate-950/60 rounded-2xl border border-slate-800/80 overflow-hidden shadow-xl select-none">
      {/* Weekday Header Row */}
      <div className={`grid ${showWeekNumbers ? 'grid-cols-[40px_repeat(7,1fr)]' : 'grid-cols-7'} border-b border-slate-800 bg-slate-900/70 text-xs font-semibold py-2.5 text-center`}>
        {showWeekNumbers && <div className="text-[10px] text-slate-500 flex items-center justify-center">#</div>}
        {weekdayHeaders.map((h, idx) => (
          <div
            key={h}
            className={`${idx === 5 ? 'text-indigo-400' : idx === 6 ? 'text-rose-400' : 'text-slate-300'}`}
          >
            {h}
          </div>
        ))}
      </div>

      {/* 6-Week Calendar Grid */}
      <div className="flex-1 grid grid-rows-6 divide-y divide-slate-800/60 overflow-hidden">
        {Array.from({ length: 6 }).map((_, weekIdx) => {
          const weekDays = days.slice(weekIdx * 7, weekIdx * 7 + 7)
          const firstDayOfWeek = weekDays[0]

          return (
            <div
              key={weekIdx}
              className={`grid ${showWeekNumbers ? 'grid-cols-[40px_repeat(7,1fr)]' : 'grid-cols-7'} divide-x divide-slate-800/60 min-h-0`}
            >
              {/* Week Number Column */}
              {showWeekNumbers && (
                <div className="bg-slate-950/40 flex items-center justify-center border-r border-slate-800/60">
                  <WeekNumber weekNumber={firstDayOfWeek.weekNumber} />
                </div>
              )}

              {/* 7 Days in Week */}
              {weekDays.map((day) => {
                const dayKey = day.toFormat('yyyy-MM-dd')
                const isCurrentMonth = day.month === anchorDate.month
                const isToday = day.hasSame(today, 'day')
                const dayOccurrences = occurrencesByDay.get(dayKey) || []
                const dayTasks = tasksByDay.get(dayKey) || []

                return (
                  <div
                    key={dayKey}
                    onClick={() => onSelectDate?.(day)}
                    onDragOver={(e) => {
                      e.preventDefault()
                      e.currentTarget.classList.add('bg-indigo-900/20')
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.classList.remove('bg-indigo-900/20')
                    }}
                    onDrop={(e) => {
                      e.currentTarget.classList.remove('bg-indigo-900/20')
                      onDropOnDate?.(e, day)
                    }}
                    className={`flex flex-col p-1.5 min-h-0 transition-colors cursor-pointer hover:bg-slate-800/30 ${
                      !isCurrentMonth ? 'bg-slate-950/40 opacity-40' : 'bg-transparent'
                    }`}
                  >
                    {/* Date Number + Lunar Label */}
                    <div className="flex items-center justify-between mb-1 px-1">
                      <span
                        className={`text-xs font-semibold rounded-full h-6 w-6 flex items-center justify-center ${
                          isToday
                            ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/40'
                            : isCurrentMonth
                              ? 'text-slate-200'
                              : 'text-slate-500'
                        }`}
                      >
                        {day.day}
                      </span>

                      {showLunar && (
                        <LunarLabel day={day.day} month={day.month} year={day.year} />
                      )}
                    </div>

                    {/* Event Chips & Task Badges */}
                    <div className="flex-1 space-y-1 overflow-hidden">
                      {dayOccurrences.slice(0, 2).map((occ) => {
                        const occTime = DateTime.fromISO(occ.startUtc, { zone: 'utc' }).setZone('local')
                        return (
                          <div
                            key={occ.id}
                            draggable
                            onDragStart={(e) => onDragStart?.(e, occ)}
                            onClick={(e) => {
                              e.stopPropagation()
                              onSelectOccurrence?.(occ)
                            }}
                            className="group px-1.5 py-0.5 rounded text-[11px] font-medium truncate flex items-center gap-1 cursor-grab active:cursor-grabbing transition-all hover:scale-[1.02] shadow-xs"
                            style={{
                              backgroundColor: occ.color ? `${occ.color}22` : '#6366f122',
                              borderLeft: `3px solid ${occ.color || '#6366f1'}`
                            }}
                            title={`${occ.title} (${occ.allDay ? 'All day' : occTime.toFormat('HH:mm')})`}
                          >
                            {!occ.allDay && (
                              <span className="text-[9px] text-slate-400 font-mono">
                                {occTime.toFormat('HH:mm')}
                              </span>
                            )}
                            <span className="truncate text-slate-200">{occ.title}</span>
                          </div>
                        )
                      })}

                      {/* Due Tasks */}
                      {dayTasks.slice(0, 2).map((task) => (
                        <div
                          key={task.id}
                          className="px-1.5 py-0.5 rounded text-[10px] font-medium truncate flex items-center gap-1 bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
                          title={`Nhiệm vụ: ${task.title}`}
                        >
                          <span className="text-[9px]">✓</span>
                          <span className={`truncate ${task.completed ? 'line-through opacity-60' : ''}`}>
                            {task.title}
                          </span>
                        </div>
                      ))}

                      {dayOccurrences.length + dayTasks.length > 3 && (
                        <div className="text-[10px] font-semibold text-indigo-400 px-1 hover:underline">
                          +{dayOccurrences.length + dayTasks.length - 3} {showLunar ? 'khác' : 'more'}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default MonthView
