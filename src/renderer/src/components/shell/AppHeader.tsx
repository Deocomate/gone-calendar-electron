import React from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, Menu, Search } from 'lucide-react'
import type { CalendarViewType } from '@shared/visible-range'
import type { ThemeMode } from '@shared/theme-mode'
import ViewSwitcher from './ViewSwitcher'
import OverflowMenu from './OverflowMenu'

interface AppHeaderProps {
  title: string
  currentView: CalendarViewType
  language: string
  themeMode: ThemeMode
  showSidebarToggle?: boolean
  onToggleSidebar: () => void
  onPrev: () => void
  onNext: () => void
  onChangeView: (view: CalendarViewType) => void
  onSearch: () => void
  onOpenSettings: () => void
  onOpenTheme: () => void
  onOpenShortcuts: () => void
  onToggleLanguage: () => void
  onSetThemeMode: (mode: ThemeMode) => void
  conflictCount?: number
  onOpenConflicts?: () => void
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  currentView,
  language,
  themeMode,
  showSidebarToggle = true,
  onToggleSidebar,
  onPrev,
  onNext,
  onChangeView,
  onSearch,
  onOpenSettings,
  onOpenTheme,
  onOpenShortcuts,
  onToggleLanguage,
  onSetThemeMode,
  conflictCount,
  onOpenConflicts
}) => {
  const { t } = useTranslation()

  const isYearView = currentView === 'year'

  return (
    <header className="relative z-20 flex h-12 shrink-0 items-center justify-between border-b border-hairline bg-surface px-3 select-none">
      <div className="flex min-w-0 items-center gap-2">
        {showSidebarToggle && (
          <button
            type="button"
            className="gc-icon-btn"
            onClick={onToggleSidebar}
            title={t('actions.toggleSidebar')}
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <div className="flex items-center">
          <button type="button" className="gc-icon-btn" onClick={onPrev} title={t('nav.prev')}>
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button type="button" className="gc-icon-btn" onClick={onNext} title={t('nav.next')}>
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        {title && !isYearView && (
          <h1 className="truncate text-[28px] font-normal leading-snug tracking-tight text-primary py-0.5">
            {title}
          </h1>
        )}
      </div>

      {title && isYearView && (
        <h1 className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[28px] font-normal leading-snug tracking-tight text-primary">
          {title}
        </h1>
      )}

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          className="gc-icon-btn"
          onClick={onSearch}
          title={`${t('actions.search')} (Ctrl+K)`}
        >
          <Search className="h-4 w-4" />
        </button>

        <ViewSwitcher currentView={currentView} onChange={onChangeView} />
        <OverflowMenu
          language={language}
          themeMode={themeMode}
          conflictCount={conflictCount}
          onOpenSettings={onOpenSettings}
          onOpenTheme={onOpenTheme}
          onOpenShortcuts={onOpenShortcuts}
          onOpenConflicts={onOpenConflicts}
          onToggleLanguage={onToggleLanguage}
          onSetThemeMode={onSetThemeMode}
        />
      </div>
    </header>
  )
}

export default AppHeader
