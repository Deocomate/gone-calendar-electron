import React from 'react'
import { DateTime } from 'luxon'
import type { ExpandedOccurrence } from '@shared/event-model'

interface YearViewProps {
  anchorDate: DateTime
  occurrences: ExpandedOccurrence[]
  onSelectMonth: (month: number) => void
  onSelectDate: (date: DateTime) => void
}

export const YearView: React.FC<YearViewProps> = ({
  anchorDate,
  occurrences,
  onSelectMonth,
  onSelectDate
}) => {
  const today = DateTime.local()
  const year = anchorDate.year

  // Map occurrences by 'yyyy-MM-dd' for quick lookup
  const occurrencesByDay = React.useMemo(() => {
    const set = new Set<string>()
    for (const occ of occurrences) {
      const dt = DateTime.fromISO(occ.startUtc, { zone: 'utc' }).setZone('local')
      set.add(dt.toFormat('yyyy-MM-dd'))
    }
    return set
  }, [occurrences])

  const weekdayHeaders = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

  return (
    <div className="h-full w-full bg-slate-950/60 rounded-2xl border border-slate-800/80 p-6 overflow-y-auto shadow-xl select-none">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((monthNum) => {
          const firstDayOfMonth = DateTime.local(year, monthNum, 1)
          const daysInMonth = firstDayOfMonth.daysInMonth || 31
          const startWeekday = firstDayOfMonth.weekday // 1=Mon..7=Sun

          // Generate grid cells
          const cells: (DateTime | null)[] = []
          for (let pad = 1; pad < startWeekday; pad++) {
            cells.push(null)
          }
          for (let d = 1; d <= daysInMonth; d++) {
            cells.push(DateTime.local(year, monthNum, d))
          }

          return (
            <div
              key={monthNum}
              onClick={() => onSelectMonth(monthNum)}
              className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-indigo-500/50 hover:bg-slate-900/90 transition-all cursor-pointer shadow-sm group"
            >
              {/* Month Title */}
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-slate-200 group-hover:text-indigo-400 transition-colors">
                  {firstDayOfMonth.toFormat('MMMM')}
                </h4>
                <span className="text-[11px] font-mono text-slate-500">
                  {monthNum.toString().padStart(2, '0')}
                </span>
              </div>

              {/* Mini Weekday Headers */}
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-slate-500 mb-1.5">
                {weekdayHeaders.map((h, idx) => (
                  <span
                    key={h}
                    className={`${idx === 5 ? 'text-indigo-400' : idx === 6 ? 'text-rose-400' : ''}`}
                  >
                    {h}
                  </span>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {cells.map((day, cellIdx) => {
                  if (!day) {
                    return <div key={`empty-${cellIdx}`} className="h-6 w-6" />
                  }

                  const isToday = day.hasSame(today, 'day')
                  const hasEvents = occurrencesByDay.has(day.toFormat('yyyy-MM-dd'))

                  return (
                    <div
                      key={day.toISO()}
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectDate(day)
                      }}
                      className={`h-6 w-6 mx-auto rounded-md flex flex-col items-center justify-center relative transition-colors ${
                        isToday
                          ? 'bg-indigo-600 text-white font-bold shadow-xs'
                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                      }`}
                    >
                      <span className="text-[11px]">{day.day}</span>
                      {hasEvents && !isToday && (
                        <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-indigo-400" />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default YearView
