import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DateTime } from 'luxon'
import { RotateCw, CheckSquare, ChevronDown, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import type { Calendar, ExpandedOccurrence } from '@shared/event-model'
import type { TaskItem } from '@shared/task-model'
import MiniCalendar from '../MiniCalendar'
import HolidayCalendarToggle from '../HolidayCalendarToggle'

interface AppSidebarProps {
  collapsed: boolean
  anchorDate: DateTime
  occurrences: ExpandedOccurrence[]
  calendars: Calendar[]
  tasks?: TaskItem[]
  firstDayOfWeek: number
  onSelectDate: (date: DateTime) => void
  onPrevMonth: () => void
  onNextMonth: () => void
  onToggleCalendar: (cal: Calendar) => void
  onCalendarsChanged: () => void
  onOpenTasks: () => void
  onRefresh: () => void
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  collapsed,
  anchorDate,
  occurrences,
  calendars,
  tasks = [],
  firstDayOfWeek,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  onToggleCalendar,
  onCalendarsChanged,
  onOpenTasks,
  onRefresh
}) => {
  const { t } = useTranslation()
  const [isCalendarsExpanded, setIsCalendarsExpanded] = useState(true)

  if (collapsed) return null

  const pendingTasksCount = tasks.filter((t) => !t.completed).length

  return (
    <aside className="flex w-64 shrink-0 flex-col gap-4 overflow-y-auto border-r border-hairline bg-sidebar p-3.5 select-none">
      {/* Mini Calendar */}
      <MiniCalendar
        anchorDate={anchorDate}
        occurrences={occurrences}
        firstDayOfWeek={firstDayOfWeek}
        onSelectDate={onSelectDate}
        onPrevMonth={onPrevMonth}
        onNextMonth={onNextMonth}
      />

      {/* Tasks Popup Button Card */}
      <button
        type="button"
        onClick={onOpenTasks}
        className="flex w-full items-center justify-between p-2.5 rounded-[4px] border border-hairline bg-surface hover:bg-hover text-primary transition-colors cursor-pointer group"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-[3px] bg-hover text-muted group-hover:text-primary transition-colors shrink-0">
            <CheckSquare className="h-4 w-4" />
          </div>
          <div className="text-left min-w-0">
            <div className="text-xs font-semibold truncate text-primary">Nhiệm vụ & Việc cần làm</div>
            <div className="text-[10px] text-muted truncate">
              {pendingTasksCount > 0
                ? `${pendingTasksCount} việc chưa xong`
                : 'Mọi việc đã hoàn thành'}
            </div>
          </div>
        </div>

        {pendingTasksCount > 0 ? (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-[3px] bg-accent/15 text-accent text-[10px] font-semibold px-1.5 shrink-0">
            {pendingTasksCount}
          </span>
        ) : (
          <ChevronRight className="h-4 w-4 text-muted shrink-0" />
        )}
      </button>

      {/* My Calendars Section */}
      <div className="space-y-1.5">
        <button
          type="button"
          onClick={() => setIsCalendarsExpanded(!isCalendarsExpanded)}
          className="w-full flex items-center justify-between text-[11px] font-medium text-muted hover:text-primary transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <CalendarIcon className="h-3.5 w-3.5 text-muted" />
            {t('sidebar.myCalendars')}
          </span>
          {isCalendarsExpanded ? (
            <ChevronDown className="h-3 w-3 text-muted" />
          ) : (
            <ChevronRight className="h-3 w-3 text-muted" />
          )}
        </button>

        {isCalendarsExpanded && (
          <div className="space-y-0.5 pt-0.5">
            {calendars.length > 0 ? (
              calendars.map((cal) => (
                <label
                  key={cal.id}
                  className="flex cursor-pointer items-center gap-2 rounded-[3px] px-2 py-1.5 text-xs text-primary hover:bg-hover transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={cal.isVisible}
                    onChange={() => onToggleCalendar(cal)}
                    className="h-3.5 w-3.5 rounded-[3px] accent-accent cursor-pointer"
                  />
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: cal.color }}
                  />
                  <span className="flex-1 truncate font-medium">{cal.name}</span>
                  {cal.isReadOnly && (
                    <span className="text-[9px] font-medium text-muted bg-hover px-1.5 py-0.5 rounded-[3px]">
                      RO
                    </span>
                  )}
                </label>
              ))
            ) : (
              <label className="flex items-center gap-2 px-2 py-1.5 text-xs text-primary">
                <input type="checkbox" defaultChecked className="h-3.5 w-3.5 rounded-[3px] accent-accent" />
                <span className="h-2.5 w-2.5 rounded-full bg-accent" />
                <span className="truncate">{t('sidebar.localCalendar')}</span>
              </label>
            )}
          </div>
        )}
      </div>

      {/* Holiday Calendars Section */}
      <HolidayCalendarToggle calendars={calendars} onCalendarsChanged={onCalendarsChanged} />

      {/* Footer Status */}
      <div className="mt-auto flex items-center justify-between border-t border-hairline pt-3 text-[11px] text-muted">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#52b788]" />
          <span>{t('status.ready')}</span>
        </div>
        <button
          type="button"
          className="gc-icon-btn p-1 text-muted hover:text-primary rounded-[3px]"
          onClick={onRefresh}
          title={t('actions.refresh')}
        >
          <RotateCw className="h-3.5 w-3.5" />
        </button>
      </div>
    </aside>
  )
}

export default AppSidebar
