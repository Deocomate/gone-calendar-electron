import React from 'react'
import { DateTime } from 'luxon'
import { CalendarDays, Clock, MapPin, Repeat, CheckCircle2, Layers } from 'lucide-react'
import type { ExpandedOccurrence } from '@shared/event-model'
import type { TaskItem } from '@shared/task-model'
import { TODAY_COLOR, DEFAULT_EVENT_COLOR } from '@shared/mini-calendar-grid'
import LunarLabel from '../components/LunarLabel'

interface ListViewProps {
  anchorDate: DateTime
  occurrences: ExpandedOccurrence[]
  tasks?: TaskItem[]
  showLunar: boolean
  onSelectOccurrence?: (occ: ExpandedOccurrence) => void
  onAddEvent?: () => void
}

export const ListView: React.FC<ListViewProps> = ({
  anchorDate,
  occurrences,
  tasks = [],
  showLunar,
  onSelectOccurrence,
  onAddEvent
}) => {
  const today = DateTime.local()

  const groupedOccurrences = React.useMemo(() => {
    const groups: { date: DateTime; items: ExpandedOccurrence[] }[] = []
    const map = new Map<string, ExpandedOccurrence[]>()

    for (const occ of occurrences) {
      const dt = DateTime.fromISO(occ.startUtc, { zone: 'utc' }).setZone('local')
      const key = dt.toFormat('yyyy-MM-dd')
      const list = map.get(key) || []
      list.push(occ)
      map.set(key, list)
    }

    const sortedKeys = Array.from(map.keys()).sort()
    for (const key of sortedKeys) {
      groups.push({
        date: DateTime.fromFormat(key, 'yyyy-MM-dd'),
        items: map.get(key)!
      })
    }

    return groups
  }, [occurrences])

  if (occurrences.length === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-surface p-8 text-center select-none">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-hover">
          <CalendarDays className="h-8 w-8 text-accent" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-primary">
          {anchorDate.toFormat('MMMM yyyy')}
        </h3>
        <p className="mb-5 max-w-sm text-sm text-muted">Không có sự kiện nào trong khoảng thời gian này.</p>
        <button type="button" onClick={onAddEvent} className="gc-btn-primary">
          + Tạo sự kiện
        </button>
      </div>
    )
  }

  return (
    <div className="h-full w-full space-y-6 overflow-y-auto bg-surface p-5 select-none">
      {groupedOccurrences.map(({ date, items }) => {
        const isToday = date.hasSame(today, 'day')
        const isWeekend = date.weekday >= 6
        const dayTasks = tasks.filter(
          (t) => t.dueDate === date.toFormat('yyyy-MM-dd') && t.showOnCalendar !== false
        )
        const totalDayCount = items.length + dayTasks.length

        return (
          <div key={date.toISO()} className="gc-stack-container space-y-2.5">
            <div className="sticky top-0 z-10 flex items-center justify-between bg-surface/90 backdrop-blur-md py-1.5 border-b border-hairline">
              <div className="flex items-center gap-2">
                <span
                  className="rounded-full px-3 py-1 text-sm font-semibold"
                  style={
                    isToday
                      ? { color: TODAY_COLOR, backgroundColor: `${TODAY_COLOR}14` }
                      : isWeekend
                        ? { color: TODAY_COLOR, backgroundColor: 'var(--color-hover-fill)' }
                        : undefined
                  }
                >
                  {date.toFormat('d cccc')}
                </span>
                {totalDayCount >= 2 && (
                  <span className="flex items-center gap-1 text-[10px] font-medium text-muted bg-hover px-1.5 py-0.5 rounded-[3px] border border-hairline font-mono">
                    <Layers className="w-3 h-3 text-muted" />
                    {totalDayCount}
                  </span>
                )}
              </div>
              {showLunar && (
                <LunarLabel day={date.day} month={date.month} year={date.year} />
              )}
            </div>

            <div className="grid gap-2 pl-1">
              {dayTasks.map((task) => (
                <div
                  key={task.id}
                  className="gc-stack-card-3d flex items-center justify-between gap-3 rounded-[3px] px-3 py-2.5 text-sm text-white shadow-xs"
                  style={{ backgroundColor: DEFAULT_EVENT_COLOR }}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span className={task.completed ? 'line-through opacity-70' : ''}>{task.title}</span>
                  </div>
                </div>
              ))}

              {items.map((occ, idx) => {
                const startDt = DateTime.fromISO(occ.startUtc, { zone: 'utc' }).setZone('local')
                const endDt = DateTime.fromISO(occ.endUtc, { zone: 'utc' }).setZone('local')
                const bg = occ.color || DEFAULT_EVENT_COLOR

                return (
                  <button
                    type="button"
                    key={occ.id}
                    onClick={() => onSelectOccurrence?.(occ)}
                    className="gc-event gc-stack-card-3d flex w-full cursor-pointer flex-col gap-1 rounded-[3px] px-3.5 py-3 text-left text-white shadow-xs sm:flex-row sm:items-center sm:justify-between"
                    style={{
                      backgroundColor: bg,
                      animationDelay: `${idx * 20}ms`
                    }}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold">{occ.title}</h4>
                        {occ.isRecurring && <Repeat className="h-3.5 w-3.5 opacity-80" />}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs opacity-90">
                      <span className="inline-flex items-center gap-1 font-mono">
                        <Clock className="h-3.5 w-3.5" />
                        {occ.allDay ? 'Cả ngày' : `${startDt.toFormat('HH:mm')} - ${endDt.toFormat('HH:mm')}`}
                      </span>
                      {occ.location && (
                        <span className="inline-flex max-w-[150px] items-center gap-1 truncate">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          {occ.location}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default ListView
