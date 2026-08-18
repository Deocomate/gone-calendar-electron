import React from 'react'
import { DateTime } from 'luxon'
import { CalendarDays, Clock, MapPin, Sparkles, Repeat, CheckCircle2 } from 'lucide-react'
import type { ExpandedOccurrence } from '@shared/event-model'
import type { TaskItem } from '@shared/task-model'
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

  // Group occurrences by YYYY-MM-DD
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

    // Sort keys chronologically
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
      <div className="h-full w-full bg-slate-950/60 rounded-2xl border border-slate-800/80 p-8 flex flex-col items-center justify-center text-center shadow-xl select-none">
        <div className="h-16 w-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
          <CalendarDays className="h-8 w-8 text-indigo-400" />
        </div>
        <h3 className="text-lg font-bold text-slate-200 mb-2">
          {anchorDate.toFormat('MMMM yyyy')} — Không có sự kiện
        </h3>
        <p className="text-sm text-slate-400 max-w-sm mb-5">
          Không tìm thấy sự kiện nào trong khoảng thời gian này.
        </p>
        <button
          onClick={onAddEvent}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all"
        >
          + Tạo sự kiện mới
        </button>
      </div>
    )
  }

  return (
    <div className="h-full w-full bg-slate-950/60 rounded-2xl border border-slate-800/80 p-4 md:p-6 overflow-y-auto shadow-xl select-none space-y-6">
      {groupedOccurrences.map(({ date, items }) => {
        const isToday = date.hasSame(today, 'day')

        return (
          <div key={date.toISO()} className="space-y-3">
            {/* Sticky Date Header */}
            <div className="sticky top-0 z-10 bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-800/80 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2.5">
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                    isToday
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {date.toFormat('dd/MM')}
                </span>
                <span className="text-sm font-semibold text-slate-200 capitalize">
                  {date.toFormat('cccc')}
                </span>
              </div>

              {showLunar && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Sparkles className="h-3 w-3 text-amber-400" />
                  <span>Âm lịch:</span>
                  <LunarLabel day={date.day} month={date.month} year={date.year} />
                </div>
              )}
            </div>

            {/* Event & Task List for this Date */}
            <div className="grid gap-2 pl-2">
              {tasks
                .filter((t) => t.dueDate === date.toFormat('yyyy-MM-dd') && t.showOnCalendar !== false)
                .map((task) => (
                  <div
                    key={task.id}
                    className="p-2.5 rounded-xl bg-slate-900/50 border border-emerald-500/20 flex items-center justify-between gap-3 text-xs text-slate-300 shadow-xs"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span className={`font-medium ${task.completed ? 'line-through text-slate-500' : 'text-emerald-200'}`}>
                        {task.title}
                      </span>
                    </div>
                    <span className="text-[10px] text-emerald-400/80 bg-emerald-500/10 px-2 py-0.5 rounded-md font-medium">
                      Nhiệm vụ
                    </span>
                  </div>
                ))}

              {items.map((occ) => {
                const startDt = DateTime.fromISO(occ.startUtc, { zone: 'utc' }).setZone('local')
                const endDt = DateTime.fromISO(occ.endUtc, { zone: 'utc' }).setZone('local')

                return (
                  <div
                    key={occ.id}
                    onClick={() => onSelectOccurrence?.(occ)}
                    className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700 hover:bg-slate-900 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs group"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className="h-3 w-3 rounded-full mt-1 shrink-0"
                        style={{ backgroundColor: occ.color || '#6366f1' }}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">
                            {occ.title}
                          </h4>
                          {occ.isRecurring && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-mono text-sky-400 bg-sky-500/10 border border-sky-500/20">
                              <Repeat className="h-2.5 w-2.5" />
                              Lặp lại
                            </span>
                          )}
                        </div>

                        {occ.notes && (
                          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                            {occ.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-400 shrink-0">
                      <div className="flex items-center gap-1.5 font-mono">
                        <Clock className="h-3.5 w-3.5 text-slate-500" />
                        <span>
                          {occ.allDay
                            ? 'Cả ngày'
                            : `${startDt.toFormat('HH:mm')} - ${endDt.toFormat('HH:mm')}`}
                        </span>
                      </div>

                      {occ.location && (
                        <div className="flex items-center gap-1 text-slate-400 max-w-[150px] truncate">
                          <MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                          <span className="truncate">{occ.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
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
