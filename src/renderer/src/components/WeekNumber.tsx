import React from 'react'

interface WeekNumberProps {
  weekNumber: number
  className?: string
}

export const WeekNumber: React.FC<WeekNumberProps> = ({ weekNumber, className = '' }) => {
  return (
    <div
      className={`flex items-center justify-center text-[10px] font-mono font-semibold text-slate-400 dark:text-slate-500 select-none ${className}`}
      title={`ISO Week ${weekNumber}`}
    >
      <span className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800">
        W{weekNumber}
      </span>
    </div>
  )
}

export default WeekNumber
