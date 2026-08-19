import React from 'react'
import { DateTime } from 'luxon'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { ExpandedOccurrence } from '@shared/event-model'
import {
  buildMiniCalendarDays,
  weekdayHeaders,
  DEFAULT_EVENT_COLOR,
  TODAY_COLOR
} from '@shared/mini-calendar-grid'

interface MiniCalendarProps {
  anchorDate: DateTime
  occurrences?: ExpandedOccurrence[]
  firstDayOfWeek?: number
  onSelectDate: (date: DateTime) => void
  onPrevMonth: () => void
  onNextMonth: () => void
}

export const MiniCalendar: React.FC<MiniCalendarProps> = ({
  anchorDate,
  occurrences = [],
  firstDayOfWeek = 1,
  onSelectDate,
  onPrevMonth,
  onNextMonth
}) => {
  const today = DateTime.local()
  const days = React.useMemo(
    () => buildMiniCalendarDays(anchorDate, firstDayOfWeek),
    [anchorDate, firstDayOfWeek]
  )
  const headers = weekdayHeaders(firstDayOfWeek)

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
    <div className="select-none">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-primary">
          {anchorDate.toFormat('MMMM yyyy')}
        </span>
        <div className="flex text-muted">
          <button type="button" className="gc-icon-btn p-1" onClick={onPrevMonth} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" className="gc-icon-btn p-1" onClick={onNextMonth} aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mb-1 grid grid-cols-7 text-center text-[10px] font-medium text-muted">
        {headers.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = day.toFormat('yyyy-MM-dd')
          const isCurrentMonth = day.month === anchorDate.month
          const isToday = day.hasSame(today, 'day')
          const isSelected = day.hasSame(anchorDate, 'day')
          const bars = colorsByDay.get(key) || []

          return (
            <button
              type="button"
              key={key}
              onClick={() => onSelectDate(day)}
              className={`flex h-8 flex-col items-center justify-center rounded-[3px] text-[11px] transition-colors duration-150 ${
                isSelected && !isToday ? 'bg-hover' : 'hover:bg-hover'
              } ${isCurrentMonth ? 'text-primary' : 'text-muted/60'}`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-[3px] ${
                  isToday ? 'font-semibold text-white' : ''
                }`}
                style={isToday ? { backgroundColor: TODAY_COLOR } : undefined}
              >
                {day.day}
              </span>
              <span className="mt-0.5 flex h-1 gap-0.5">
                {bars.map((color) => (
                  <span
                    key={color}
                    className="h-0.5 w-2 rounded-[1px]"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default MiniCalendar
