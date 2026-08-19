import React from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, Menu, Plus, Search, CheckSquare } from 'lucide-react'
import type { CalendarViewType } from '@shared/visible-range'
import type { ThemeMode } from '@shared/theme-mode'
import ViewSwitcher from './ViewSwitcher'
import OverflowMenu from './OverflowMenu'

interface AppHeaderProps {
  title: string
  currentView: CalendarViewType
  language: string
  themeMode: ThemeMode
  selectedColorFilter: string | null
  pendingTasksCount?: number
  onToggleSidebar: () => void
  onToday: () => void
  onPrev: () => void
  onNext: () => void
  onChangeView: (view: CalendarViewType) => void
  onSearch: () => void
  onCreate: () => void
  onOpenTasks?: () => void
  onOpenSettings: () => void
  onOpenTheme: () => void
  onOpenShortcuts: () => void
  onOpenAccounts: () => void
  onImportIcs: () => void
  onToggleLanguage: () => void
  onSetThemeMode: (mode: ThemeMode) => void
  onSelectColorFilter: (hex: string | null) => void
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  currentView,
  language,
  themeMode,
  selectedColorFilter,
  pendingTasksCount = 0,
  onToggleSidebar,
  onToday,
  onPrev,
  onNext,
  onChangeView,
  onSearch,
  onCreate,
  onOpenTasks,
  onOpenSettings,
  onOpenTheme,
  onOpenShortcuts,
  onOpenAccounts,
  onImportIcs,
  onToggleLanguage,
  onSetThemeMode,
  onSelectColorFilter
}) => {
  const { t } = useTranslation()

  return (
    <header className="z-20 flex h-12 shrink-0 items-center justify-between border-b border-hairline bg-surface px-3 select-none">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          className="gc-icon-btn"
          onClick={onToggleSidebar}
          title={t('actions.toggleSidebar')}
        >
          <Menu className="h-5 w-5" />
        </button>
        <button type="button" className="gc-btn" onClick={onToday}>
          {t('nav.today')}
        </button>
        <div className="flex items-center">
          <button type="button" className="gc-icon-btn" onClick={onPrev} title={t('nav.prev')}>
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button type="button" className="gc-icon-btn" onClick={onNext} title={t('nav.next')}>
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <h1 className="truncate text-[28px] font-normal leading-snug tracking-tight text-primary py-0.5">
          {title}
        </h1>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          className="gc-icon-btn"
          onClick={onSearch}
          title={`${t('actions.search')} (Ctrl+K)`}
        >
          <Search className="h-4 w-4" />
        </button>

        {onOpenTasks && (
          <button
            type="button"
            className="gc-icon-btn relative"
            onClick={onOpenTasks}
            title="Nhiệm vụ & Việc cần làm"
          >
            <CheckSquare className="h-4 w-4" />
            {pendingTasksCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-[3px] bg-accent px-1 text-[8px] font-bold text-white shadow-2xs">
                {pendingTasksCount}
              </span>
            )}
          </button>
        )}

        <ViewSwitcher currentView={currentView} onChange={onChangeView} />
        <button type="button" className="gc-btn-primary ml-1" onClick={onCreate}>
          <Plus className="h-4 w-4" />
          <span>{t('actions.newEvent')}</span>
        </button>
        <OverflowMenu
          language={language}
          themeMode={themeMode}
          selectedColorFilter={selectedColorFilter}
          onOpenSettings={onOpenSettings}
          onOpenTheme={onOpenTheme}
          onOpenShortcuts={onOpenShortcuts}
          onOpenAccounts={onOpenAccounts}
          onImportIcs={onImportIcs}
          onToggleLanguage={onToggleLanguage}
          onSetThemeMode={onSetThemeMode}
          onSelectColorFilter={onSelectColorFilter}
        />
      </div>
    </header>
  )
}

export default AppHeader
