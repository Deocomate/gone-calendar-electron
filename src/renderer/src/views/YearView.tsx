import React from 'react'
import { DateTime } from 'luxon'
import type { ExpandedOccurrence } from '@shared/event-model'
import { weekdayHeaders, TODAY_COLOR, DEFAULT_EVENT_COLOR } from '@shared/mini-calendar-grid'

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
  const headers = weekdayHeaders(1)

  const colorsByDay = React.useMemo(() => {
    const map = new Map<string, string[]>()
    for (const occ of occurrences) {
      const dt = DateTime.fromISO(occ.startUtc, { zone: 'utc' }).setZone('local')
      const key = dt.toFormat('yyyy-MM-dd')
      const list = map.get(key) || []
      const color = occ.color || DEFAULT_EVENT_COLOR
      if (!list.includes(color)) list.push(color)
      map.set(key, list.slice(0, 3))
    }
    return map
  }, [occurrences])

  return (
    <div className="h-full w-full overflow-y-auto bg-surface p-6 select-none">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((monthNum) => {
          const firstDayOfMonth = DateTime.local(year, monthNum, 1)
          const daysInMonth = firstDayOfMonth.daysInMonth || 31
          const startWeekday = firstDayOfMonth.weekday
          const cells: (DateTime | null)[] = []
          for (let pad = 1; pad < startWeekday; pad++) cells.push(null)
          for (let d = 1; d <= daysInMonth; d++) {
            cells.push(DateTime.local(year, monthNum, d))
          }

          return (
            <div
              key={monthNum}
              onClick={() => onSelectMonth(monthNum)}
              className="cursor-pointer rounded-lg p-3 transition-colors duration-150 hover:bg-hover"
            >
              <h4 className="mb-2 text-sm font-semibold text-primary">
                {firstDayOfMonth.toFormat('MMMM')}
              </h4>

              <div className="mb-1 grid grid-cols-7 text-center text-[10px] font-medium text-muted">
                {headers.map((h, idx) => (
                  <span key={h} className={idx >= 5 ? 'text-today' : ''}>
                    {h}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-0.5 text-center text-xs">
                {cells.map((day, cellIdx) => {
                  if (!day) return <div key={`empty-${cellIdx}`} className="h-6 w-6" />

                  const isToday = day.hasSame(today, 'day')
                  const colors = colorsByDay.get(day.toFormat('yyyy-MM-dd')) || []
                  const blockColor = colors[0]

                  return (
                    <button
                      type="button"
                      key={day.toISO()}
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectDate(day)
                      }}
                      className={`relative mx-auto flex h-6 w-6 items-center justify-center rounded text-[11px] text-primary transition-all duration-150 hover:bg-hover ${
                        colors.length > 0 ? 'gc-stack-card-3d font-semibold' : ''
                      }`}
                      style={
                        isToday
                          ? { color: '#fff', backgroundColor: TODAY_COLOR, fontWeight: 600 }
                          : blockColor
                            ? { backgroundColor: `${blockColor}33`, borderRadius: 4 }
                            : undefined
                      }
                    >
                      {day.day}
                    </button>
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
