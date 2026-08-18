import React from 'react'

interface WeekNumberProps {
  weekNumber: number
  className?: string
}

export const WeekNumber: React.FC<WeekNumberProps> = ({ weekNumber, className = '' }) => {
  return (
    <div
      className={`flex select-none items-center justify-center text-[10px] font-medium text-muted ${className}`}
      title={`ISO Week ${weekNumber}`}
    >
      {weekNumber}
    </div>
  )
}

export default WeekNumber
