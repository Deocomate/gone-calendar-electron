import React from 'react'
import { DateTime } from 'luxon'

interface WeekNumberProps {
  weekNumber: number
  /** When given (with `year`), renders the larger week-corner badge with an MM/YYYY caption. */
  month?: number
  year?: number
  className?: string
}

export const WeekNumber: React.FC<WeekNumberProps> = ({ weekNumber, month, year, className = '' }) => {
  const showCaption = month !== undefined && year !== undefined

  return (
    <div
      className={`flex select-none flex-col items-center justify-center leading-none text-primary ${className}`}
      title={showCaption ? `ISO Week ${weekNumber} — ${month}/${year}` : `ISO Week ${weekNumber}`}
    >
      <span className={showCaption ? 'text-sm font-bold' : 'text-xs font-bold'}>{weekNumber}</span>
      {showCaption && (
        <span className="mt-0.5 text-[10px] font-semibold text-muted">
          {DateTime.fromObject({ month, year }).toFormat('MM/yyyy')}
        </span>
      )}
    </div>
  )
}

export default WeekNumber
