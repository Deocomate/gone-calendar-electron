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
        className="flex w-full items-center justify-between p-2.5 rounded-xl border border-indigo-500/30 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 hover:bg-indigo-100/70 dark:hover:bg-indigo-900/50 transition-all cursor-pointer shadow-2xs group"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform shrink-0">
            <CheckSquare className="h-4 w-4" />
          </div>
          <div className="text-left min-w-0">
            <div className="text-xs font-bold truncate">Nhiệm vụ & Việc cần làm</div>
            <div className="text-[10px] text-indigo-600/80 dark:text-indigo-400/80 truncate">
              {pendingTasksCount > 0
                ? `${pendingTasksCount} việc chưa xong`
                : 'Mọi việc đã hoàn thành'}
            </div>
          </div>
        </div>

        {pendingTasksCount > 0 ? (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white shrink-0">
            {pendingTasksCount}
          </span>
        ) : (
          <ChevronRight className="h-4 w-4 text-indigo-400 shrink-0" />
        )}
      </button>

      {/* My Calendars Section */}
      <div className="space-y-1.5">
        <button
          type="button"
          onClick={() => setIsCalendarsExpanded(!isCalendarsExpanded)}
          className="w-full flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <CalendarIcon className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
            {t('sidebar.myCalendars')}
          </span>
          {isCalendarsExpanded ? (
            <ChevronDown className="h-3 w-3 text-slate-400" />
          ) : (
            <ChevronRight className="h-3 w-3 text-slate-400" />
          )}
        </button>

        {isCalendarsExpanded && (
          <div className="space-y-0.5 pt-0.5">
            {calendars.length > 0 ? (
              calendars.map((cal) => (
                <label
                  key={cal.id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-primary hover:bg-hover transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={cal.isVisible}
                    onChange={() => onToggleCalendar(cal)}
                    className="h-3.5 w-3.5 rounded accent-accent cursor-pointer"
                  />
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: cal.color }}
                  />
                  <span className="flex-1 truncate font-medium">{cal.name}</span>
                  {cal.isReadOnly && (
                    <span className="text-[9px] font-semibold text-muted bg-hover px-1.5 py-0.5 rounded">
                      RO
                    </span>
                  )}
                </label>
              ))
            ) : (
              <label className="flex items-center gap-2 px-2 py-1.5 text-xs text-primary">
                <input type="checkbox" defaultChecked className="h-3.5 w-3.5 rounded accent-accent" />
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
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span>{t('status.ready')}</span>
        </div>
        <button
          type="button"
          className="gc-icon-btn p-1 text-muted hover:text-primary"
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
