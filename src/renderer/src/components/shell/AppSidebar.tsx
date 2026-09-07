import React from 'react'
import { DateTime } from 'luxon'
import type { ExpandedOccurrence } from '@shared/event-model'
import MiniCalendar from '../MiniCalendar'

interface AppSidebarProps {
  collapsed: boolean
  anchorDate: DateTime
  occurrences: ExpandedOccurrence[]
  firstDayOfWeek: number
  onSelectDate: (date: DateTime) => void
  onPrevMonth: () => void
  onNextMonth: () => void
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  collapsed,
  anchorDate,
  occurrences,
  firstDayOfWeek,
  onSelectDate,
  onPrevMonth,
  onNextMonth
}) => {
  if (collapsed) return null

  return (
    <aside className="flex w-64 shrink-0 flex-col gap-4 overflow-y-auto border-r border-hairline bg-sidebar p-3.5 select-none">
      <MiniCalendar
        anchorDate={anchorDate}
        occurrences={occurrences}
        firstDayOfWeek={firstDayOfWeek}
        onSelectDate={onSelectDate}
        onPrevMonth={onPrevMonth}
        onNextMonth={onNextMonth}
      />
    </aside>
  )
}

export default AppSidebar
