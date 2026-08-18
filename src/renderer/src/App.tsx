import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { DateTime } from 'luxon'
import { Settings as SettingsIcon, X } from 'lucide-react'
import type { AppLocale } from '@shared/ipc-contract'
import type {
  Calendar,
  ExpandedOccurrence,
  CreateEventInput,
  UpdateEventInput,
  RecurringEditScope
} from '@shared/event-model'
import type { TaskItem } from '@shared/task-model'
import type { CalendarViewType } from '@shared/visible-range'
import { useVisibleRange } from './hooks/use-visible-range'
import { useTheme } from './hooks/use-theme'
import MonthView from './views/MonthView'
import WeekView from './views/WeekView'
import DayView from './views/DayView'
import YearView from './views/YearView'
import ListView from './views/ListView'
import EventEditorDialog, { type EventEditorInitialData } from './editor/EventEditorDialog'
import RecurringScopeDialog from './editor/RecurringScopeDialog'
import DropActionPopover, { type PendingDropAction } from './dnd/DropActionPopover'
import AccountManagerModal from './components/AccountManagerModal'
import SearchPaletteModal from './components/SearchPaletteModal'
import ThemeSettingsModal from './components/ThemeSettingsModal'
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal'
import TaskModal from './components/TaskModal'
import AppHeader from './components/shell/AppHeader'
import AppSidebar from './components/shell/AppSidebar'
import { useEventDnD } from './dnd/use-event-dnd'

export type { CalendarViewType }

export const App: React.FC = () => {
  const { t, i18n } = useTranslation()
  const { mode, isDark, themeConfig, setThemeConfig, persistMode, loadFromSettings } = useTheme()
  const [currentView, setCurrentView] = useState<CalendarViewType>('month')
  const [anchorDate, setAnchorDate] = useState<DateTime>(() => DateTime.local())
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [appVersion, setAppVersion] = useState<string>('0.1.0')
  const [platform, setPlatform] = useState<string>('win32')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false)
  const [isSearchPaletteOpen, setIsSearchPaletteOpen] = useState(false)
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false)
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [selectedColorFilter, setSelectedColorFilter] = useState<string | null>(null)
  const [showLunar, setShowLunar] = useState(true)
  const [showWeekNumbers, setShowWeekNumbers] = useState(true)
  const [firstDayOfWeek, setFirstDayOfWeek] = useState(1)

  const [calendars, setCalendars] = useState<Calendar[]>([])
  const [occurrences, setOccurrences] = useState<ExpandedOccurrence[]>([])
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [importStatus, setImportStatus] = useState<string | null>(null)

  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editorData, setEditorData] = useState<EventEditorInitialData | null>(null)
  const [pendingRecurringScope, setPendingRecurringScope] = useState<{
    action: 'edit' | 'delete'
    title: string
    eventId: string
    occurrenceStartUtc: string
    input?: UpdateEventInput
  } | null>(null)

  const visibleRange = useVisibleRange(anchorDate, currentView, i18n.language)

  const loadCalendarsAndEvents = useCallback(async () => {
    if (!window.gone?.calendars || !window.gone?.events) return

    try {
      const cals = await window.gone.calendars.list()
      setCalendars(cals)

      const activeCalIds = cals.filter((c) => c.isVisible).map((c) => c.id)
      if (activeCalIds.length > 0) {
        const occs = await window.gone.events.queryRange(
          activeCalIds,
          visibleRange.startUtc,
          visibleRange.endUtc
        )
        setOccurrences(occs)
      } else {
        setOccurrences([])
      }
    } catch (err) {
      console.error('Failed to load calendars or events:', err)
    }
  }, [visibleRange.startUtc, visibleRange.endUtc])

  const handleDirectMove = useCallback(
    async (
      occ: ExpandedOccurrence,
      targetStart: DateTime,
      targetEnd: DateTime,
      isCopy: boolean
    ) => {
      if (!window.gone?.events) return
      try {
        if (isCopy) {
          await window.gone.events.copy({
            sourceEventId: occ.eventId,
            dtStartUtc: targetStart.toUTC().toISO()!,
            dtEndUtc: targetEnd.toUTC().toISO()!,
            targetCalendarId: occ.calendarId,
            copyInstanceOnly: true
          })
        } else if (occ.isRecurring) {
          // Move this specific occurrence directly as an exception
          await window.gone.events.updateScope({
            masterEventId: occ.eventId,
            originalStartUtc: occ.originalStartUtc || occ.startUtc,
            scope: 'this',
            updateInput: {
              title: occ.title,
              dtStartUtc: targetStart.toUTC().toISO()!,
              dtEndUtc: targetEnd.toUTC().toISO()!,
              tzid: occ.tzid,
              color: occ.color,
              notes: occ.notes,
              location: occ.location,
              meetingUrl: occ.meetingUrl
            }
          })
        } else {
          await window.gone.events.move({
            eventId: occ.eventId,
            dtStartUtc: targetStart.toUTC().toISO()!,
            dtEndUtc: targetEnd.toUTC().toISO()!,
            targetCalendarId: occ.calendarId
          })
        }
        await loadCalendarsAndEvents()
      } catch (err: any) {
        alert(`Lỗi di chuyển: ${err.message}`)
      }
    },
    [loadCalendarsAndEvents]
  )

  const {
    pendingDrop,
    setPendingDrop,
    draggedOccurrence,
    dropTarget,
    wasJustDragging,
    handleDragStart,
    handleDragEnd,
    handleDragOverTarget,
    handleDropOnDate
  } = useEventDnD(handleDirectMove)

  const openEditorForDate = useCallback(
    (date: DateTime) => {
      if (wasJustDragging()) return
      setEditorData({
        initialStart: date.set({ hour: 9, minute: 0, second: 0 }),
        initialEnd: date.set({ hour: 10, minute: 0, second: 0 })
      })
      setIsEditorOpen(true)
    },
    [wasJustDragging]
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsSearchPaletteOpen((prev) => !prev)
        return
      }

      if (isInput) return

      if (e.key === 't' || e.key === 'T') {
        e.preventDefault()
        setAnchorDate(DateTime.local())
      } else if (e.key === '1') {
        e.preventDefault()
        setCurrentView('day')
      } else if (e.key === '2') {
        e.preventDefault()
        setCurrentView('week')
      } else if (e.key === '3') {
        e.preventDefault()
        setCurrentView('month')
      } else if (e.key === '4') {
        e.preventDefault()
        setCurrentView('year')
      } else if (e.key === '5') {
        e.preventDefault()
        setCurrentView('list')
      } else if (e.key === 'n' || e.key === 'N' || e.key === 'c' || e.key === 'C') {
        e.preventDefault()
        openEditorForDate(anchorDate)
      } else if (e.key === '?' || e.key === 'F1') {
        e.preventDefault()
        setIsShortcutsModalOpen((prev) => !prev)
      } else if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        setIsSearchPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [anchorDate, openEditorForDate])

  const loadTasks = useCallback(async () => {
    if (!window.gone?.tasks?.list) return
    try {
      const list = await window.gone.tasks.list(true)
      setTasks(list)
    } catch (err) {
      console.warn('Failed to load tasks:', err)
    }
  }, [])

  useEffect(() => {
    const initApp = async (): Promise<void> => {
      if (window.gone?.app) {
        try {
          const version = await window.gone.app.getVersion()
          const locale = await window.gone.app.getLocale()
          const plat = await window.gone.app.getPlatform()
          setAppVersion(version || '0.1.0')
          setPlatform(plat || 'win32')
          if (locale && (locale === 'vi' || locale === 'en')) {
            i18n.changeLanguage(locale)
          }
        } catch (err) {
          console.warn('IPC init failed, using fallbacks:', err)
        }
      }

      if (window.gone?.settings) {
        try {
          const settings = await window.gone.settings.getAll()
          setShowLunar(settings.showLunar ?? true)
          setShowWeekNumbers(settings.showWeekNumbers ?? true)
          setFirstDayOfWeek(settings.firstDayOfWeek ?? 1)
        } catch (err) {
          console.warn('Failed to load settings:', err)
        }
      }

      await loadFromSettings()
      await loadCalendarsAndEvents()
      await loadTasks()
    }
    initApp()
  }, [i18n, loadCalendarsAndEvents, loadTasks, loadFromSettings])

  const handleToday = () => setAnchorDate(DateTime.local())

  const handlePrev = () => {
    switch (currentView) {
      case 'day':
        setAnchorDate((d) => d.minus({ days: 1 }))
        break
      case 'week':
        setAnchorDate((d) => d.minus({ weeks: 1 }))
        break
      case 'month':
      case 'list':
        setAnchorDate((d) => d.minus({ months: 1 }))
        break
      case 'year':
        setAnchorDate((d) => d.minus({ years: 1 }))
        break
    }
  }

  const handleNext = () => {
    switch (currentView) {
      case 'day':
        setAnchorDate((d) => d.plus({ days: 1 }))
        break
      case 'week':
        setAnchorDate((d) => d.plus({ weeks: 1 }))
        break
      case 'month':
      case 'list':
        setAnchorDate((d) => d.plus({ months: 1 }))
        break
      case 'year':
        setAnchorDate((d) => d.plus({ years: 1 }))
        break
    }
  }

  const toggleLanguage = async (): Promise<void> => {
    const nextLocale: AppLocale = i18n.language === 'vi' ? 'en' : 'vi'
    await i18n.changeLanguage(nextLocale)
    if (window.gone?.app?.setLocale) {
      await window.gone.app.setLocale(nextLocale)
    }
  }

  const toggleLunar = async (enabled: boolean) => {
    setShowLunar(enabled)
    if (window.gone?.settings) {
      await window.gone.settings.set('showLunar', enabled)
    }
  }

  const toggleWeekNumbers = async (enabled: boolean) => {
    setShowWeekNumbers(enabled)
    if (window.gone?.settings) {
      await window.gone.settings.set('showWeekNumbers', enabled)
    }
  }

  const toggleCalendarVisibility = async (cal: Calendar) => {
    if (window.gone?.calendars) {
      const updated = await window.gone.calendars.update(cal.id, { isVisible: !cal.isVisible })
      setCalendars((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
      await loadCalendarsAndEvents()
    }
  }

  const handleSaveEditorEvent = async (payload: {
    isNew: boolean
    eventId?: string
    occurrenceStartUtc?: string
    isRecurringOccurrence?: boolean
    input: CreateEventInput | UpdateEventInput
  }) => {
    if (!window.gone?.events) return

    try {
      if (payload.isNew) {
        await window.gone.events.create(payload.input as CreateEventInput)
        setIsEditorOpen(false)
        await loadCalendarsAndEvents()
      } else if (payload.eventId) {
        if (payload.isRecurringOccurrence && payload.occurrenceStartUtc) {
          setIsEditorOpen(false)
          setPendingRecurringScope({
            action: 'edit',
            title: (payload.input as UpdateEventInput).title || 'Recurring Event',
            eventId: payload.eventId,
            occurrenceStartUtc: payload.occurrenceStartUtc,
            input: payload.input as UpdateEventInput
          })
        } else {
          await window.gone.events.update(payload.eventId, payload.input as UpdateEventInput)
          setIsEditorOpen(false)
          await loadCalendarsAndEvents()
        }
      }
    } catch (err: any) {
      alert(`Save error: ${err.message}`)
    }
  }

  const handleDeleteEvent = async (
    eventId: string,
    occurrenceStartUtc?: string,
    isRecurring?: boolean
  ) => {
    if (!window.gone?.events) return

    if (isRecurring && occurrenceStartUtc) {
      setIsEditorOpen(false)
      setPendingRecurringScope({
        action: 'delete',
        title: 'Recurring Event',
        eventId,
        occurrenceStartUtc
      })
    } else if (confirm('Bạn có chắc chắn muốn xóa sự kiện này?')) {
      try {
        await window.gone.events.delete(eventId)
        setIsEditorOpen(false)
        await loadCalendarsAndEvents()
      } catch (err: any) {
        alert(`Delete error: ${err.message}`)
      }
    }
  }

  const handleConfirmRecurringScope = async (scope: RecurringEditScope) => {
    if (!pendingRecurringScope || !window.gone?.events) return

    try {
      if (pendingRecurringScope.action === 'edit' && pendingRecurringScope.input) {
        await window.gone.events.updateScope({
          masterEventId: pendingRecurringScope.eventId,
          originalStartUtc: pendingRecurringScope.occurrenceStartUtc,
          scope,
          updateInput: pendingRecurringScope.input
        })
      } else if (pendingRecurringScope.action === 'delete') {
        await window.gone.events.deleteScope({
          masterEventId: pendingRecurringScope.eventId,
          originalStartUtc: pendingRecurringScope.occurrenceStartUtc,
          scope
        })
      }
      setPendingRecurringScope(null)
      await loadCalendarsAndEvents()
    } catch (err: any) {
      alert(`Scope update error: ${err.message}`)
    }
  }

  const handleSelectOccurrence = useCallback(
    (occ: ExpandedOccurrence) => {
      if (wasJustDragging()) return
      setEditorData({ occurrence: occ })
      setIsEditorOpen(true)
    },
    [wasJustDragging]
  )

  const handleDropMove = async (drop: PendingDropAction) => {
    if (!window.gone?.events) return
    try {
      if (drop.occurrence.isRecurring) {
        setPendingDrop(null)
        setPendingRecurringScope({
          action: 'edit',
          title: drop.occurrence.title,
          eventId: drop.occurrence.eventId,
          occurrenceStartUtc: drop.occurrence.originalStartUtc || drop.occurrence.startUtc,
          input: {
            dtStartUtc: drop.targetStart.toUTC().toISO()!,
            dtEndUtc: drop.targetEnd.toUTC().toISO()!,
            title: drop.occurrence.title
          }
        })
        return
      }

      await window.gone.events.move({
        eventId: drop.occurrence.eventId,
        dtStartUtc: drop.targetStart.toUTC().toISO()!,
        dtEndUtc: drop.targetEnd.toUTC().toISO()!,
        targetCalendarId: drop.targetCalendarId || drop.occurrence.calendarId
      })
      setPendingDrop(null)
      await loadCalendarsAndEvents()
    } catch (err: any) {
      alert(`Lỗi di chuyển: ${err.message}`)
    }
  }

  const handleDropCopy = async (drop: PendingDropAction, copyInstanceOnly?: boolean) => {
    if (!window.gone?.events) return
    try {
      await window.gone.events.copy({
        sourceEventId: drop.occurrence.eventId,
        dtStartUtc: drop.targetStart.toUTC().toISO()!,
        dtEndUtc: drop.targetEnd.toUTC().toISO()!,
        targetCalendarId: drop.targetCalendarId,
        copyInstanceOnly
      })
      setPendingDrop(null)
      await loadCalendarsAndEvents()
    } catch (err: any) {
      alert(`Copy error: ${err.message}`)
    }
  }

  const handleImportSampleIcs = async () => {
    if (calendars.length === 0 || !window.gone?.ics) return

    const targetCal = calendars.find((c) => !c.isReadOnly) || calendars[0]
    const currentYear = anchorDate.year
    const currentMonth = anchorDate.month.toString().padStart(2, '0')

    const sampleIcs = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Gone Calendar//EN',
      'BEGIN:VEVENT',
      `UID:sample-weekly-meeting-${Date.now()}@gone.calendar`,
      `DTSTART:${currentYear}${currentMonth}18T090000Z`,
      `DTEND:${currentYear}${currentMonth}18T100000Z`,
      'SUMMARY:Weekly Team Sync',
      'DESCRIPTION:Sprint planning & review meeting',
      'LOCATION:Main Conference Room',
      'RRULE:FREQ=WEEKLY;BYDAY=TU,TH',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n')

    try {
      const result = await window.gone.ics.importIcs(targetCal.id, sampleIcs)
      setImportStatus(result.message || 'ICS Imported')
      await loadCalendarsAndEvents()
      setTimeout(() => setImportStatus(null), 4000)
    } catch (err: any) {
      setImportStatus(`Import failed: ${err.message}`)
    }
  }

  const filteredOccurrences = selectedColorFilter
    ? occurrences.filter((o) => o.color === selectedColorFilter)
    : occurrences

  return (
    <div
      className="relative flex h-screen w-screen flex-col overflow-hidden bg-app font-sans text-primary select-none"
      style={
        {
          '--accent-color': themeConfig.accentColor,
          '--color-accent-mark': themeConfig.accentColor
        } as React.CSSProperties
      }
    >
      {themeConfig.customBgUrl && (
        <>
          <div
            className="pointer-events-none fixed inset-0 z-0 scale-105 bg-cover bg-center"
            style={{
              backgroundImage: `url(${themeConfig.customBgUrl})`,
              filter: `blur(${themeConfig.bgBlur}px)`
            }}
          />
          <div
            className="pointer-events-none fixed inset-0 z-0 bg-app"
            style={{ opacity: themeConfig.bgOverlayOpacity }}
          />
        </>
      )}

      <AppHeader
        title={visibleRange.label}
        currentView={currentView}
        language={i18n.language}
        themeMode={mode}
        selectedColorFilter={selectedColorFilter}
        pendingTasksCount={tasks.filter((t) => !t.completed).length}
        onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
        onToday={handleToday}
        onPrev={handlePrev}
        onNext={handleNext}
        onChangeView={setCurrentView}
        onSearch={() => setIsSearchPaletteOpen(true)}
        onCreate={() => openEditorForDate(anchorDate)}
        onOpenTasks={() => setIsTaskModalOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenTheme={() => setIsThemeModalOpen(true)}
        onOpenShortcuts={() => setIsShortcutsModalOpen(true)}
        onOpenAccounts={() => setIsAccountModalOpen(true)}
        onImportIcs={handleImportSampleIcs}
        onToggleLanguage={toggleLanguage}
        onSetThemeMode={persistMode}
        onSelectColorFilter={setSelectedColorFilter}
      />

      <div className="z-10 flex min-h-0 flex-1 overflow-hidden">
        <AppSidebar
          collapsed={sidebarCollapsed}
          anchorDate={anchorDate}
          occurrences={occurrences}
          calendars={calendars}
          tasks={tasks}
          firstDayOfWeek={firstDayOfWeek}
          onSelectDate={setAnchorDate}
          onPrevMonth={() => setAnchorDate((d) => d.minus({ months: 1 }))}
          onNextMonth={() => setAnchorDate((d) => d.plus({ months: 1 }))}
          onToggleCalendar={toggleCalendarVisibility}
          onCalendarsChanged={loadCalendarsAndEvents}
          onOpenTasks={() => setIsTaskModalOpen(true)}
          onRefresh={loadCalendarsAndEvents}
        />

        <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-surface">
          {importStatus && (
            <div className="absolute top-3 right-3 left-3 z-40 flex items-center justify-between rounded-lg bg-accent px-3 py-2 text-xs text-white">
              <span>{importStatus}</span>
              <button type="button" onClick={() => setImportStatus(null)}>
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {currentView === 'month' && (
            <MonthView
              anchorDate={anchorDate}
              occurrences={filteredOccurrences}
              tasks={tasks}
              showLunar={showLunar}
              showWeekNumbers={showWeekNumbers}
              onSelectDate={openEditorForDate}
              onSelectOccurrence={handleSelectOccurrence}
              draggedOccurrenceId={draggedOccurrence?.id}
              dropTarget={dropTarget}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOverTarget={handleDragOverTarget}
              onDropOnDate={handleDropOnDate}
            />
          )}

          {currentView === 'week' && (
            <WeekView
              anchorDate={anchorDate}
              occurrences={filteredOccurrences}
              showLunar={showLunar}
              showWeekNumbers={showWeekNumbers}
              onSelectSlot={(start, end) => {
                if (wasJustDragging()) return
                setEditorData({ initialStart: start, initialEnd: end })
                setIsEditorOpen(true)
              }}
              onSelectOccurrence={handleSelectOccurrence}
              draggedOccurrenceId={draggedOccurrence?.id}
              dropTarget={dropTarget}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOverTarget={handleDragOverTarget}
              onDropOnDate={handleDropOnDate}
            />
          )}

          {currentView === 'day' && (
            <DayView
              anchorDate={anchorDate}
              occurrences={filteredOccurrences}
              showLunar={showLunar}
              onSelectSlot={(start, end) => {
                if (wasJustDragging()) return
                setEditorData({ initialStart: start, initialEnd: end })
                setIsEditorOpen(true)
              }}
              onSelectOccurrence={handleSelectOccurrence}
              draggedOccurrenceId={draggedOccurrence?.id}
              dropTarget={dropTarget}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOverTarget={handleDragOverTarget}
              onDropOnDate={handleDropOnDate}
            />
          )}

          {currentView === 'year' && (
            <YearView
              anchorDate={anchorDate}
              occurrences={filteredOccurrences}
              onSelectMonth={(month) => {
                setAnchorDate((d) => d.set({ month, day: 1 }))
                setCurrentView('month')
              }}
              onSelectDate={(date) => {
                setAnchorDate(date)
                setCurrentView('day')
              }}
            />
          )}

          {currentView === 'list' && (
            <ListView
              anchorDate={anchorDate}
              occurrences={filteredOccurrences}
              tasks={tasks}
              showLunar={showLunar}
              onSelectOccurrence={handleSelectOccurrence}
              onAddEvent={() => openEditorForDate(anchorDate)}
            />
          )}
        </main>
      </div>

      <SearchPaletteModal
        isOpen={isSearchPaletteOpen}
        onClose={() => setIsSearchPaletteOpen(false)}
        calendars={calendars}
        onSelectEvent={(event, targetDate) => {
          setAnchorDate(DateTime.fromISO(targetDate))
          setEditorData({ event })
          setIsEditorOpen(true)
        }}
      />

      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />

      <ThemeSettingsModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
        onThemeChanged={(theme) => setThemeConfig(theme)}
      />

      <EventEditorDialog
        isOpen={isEditorOpen}
        calendars={calendars}
        data={editorData}
        onSave={handleSaveEditorEvent}
        onDelete={handleDeleteEvent}
        onClose={() => setIsEditorOpen(false)}
      />

      <RecurringScopeDialog
        isOpen={Boolean(pendingRecurringScope)}
        title={pendingRecurringScope?.title || ''}
        action={pendingRecurringScope?.action || 'edit'}
        onConfirm={handleConfirmRecurringScope}
        onCancel={() => setPendingRecurringScope(null)}
      />

      <DropActionPopover
        pendingDrop={pendingDrop}
        onMove={handleDropMove}
        onCopy={handleDropCopy}
        onCancel={() => setPendingDrop(null)}
      />

      <AccountManagerModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        onAccountsChanged={() => loadCalendarsAndEvents()}
      />

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onTasksChanged={loadTasks}
      />

      {isSettingsOpen && (
        <div className="gc-overlay">
          <div className="gc-dialog w-full max-w-md p-6">
            <button
              type="button"
              onClick={() => setIsSettingsOpen(false)}
              className="gc-icon-btn absolute top-3 right-3"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="mb-5 flex items-center gap-2 text-lg font-semibold">
              <SettingsIcon className="h-5 w-5 text-accent" />
              {t('settings.title')}
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-hairline py-2">
                <span className="text-sm">{t('settings.language')}</span>
                <button type="button" className="gc-btn" onClick={toggleLanguage}>
                  {i18n.language === 'vi' ? 'Tiếng Việt (VI)' : 'English (EN)'}
                </button>
              </div>
              <div className="flex items-center justify-between border-b border-hairline py-2">
                <span className="text-sm">{t('settings.theme')}</span>
                <span className="text-xs text-muted">
                  {isDark ? t('settings.themeDark') : t('settings.themeLight')}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-hairline py-2">
                <span className="text-sm">{t('sidebar.lunarEnabled')}</span>
                <button
                  type="button"
                  className={showLunar ? 'gc-btn-primary' : 'gc-btn'}
                  onClick={() => toggleLunar(!showLunar)}
                >
                  {showLunar ? 'ON' : 'OFF'}
                </button>
              </div>
              <div className="flex items-center justify-between border-b border-hairline py-2">
                <span className="text-sm">{t('sidebar.weekNumbers')}</span>
                <button
                  type="button"
                  className={showWeekNumbers ? 'gc-btn-primary' : 'gc-btn'}
                  onClick={() => toggleWeekNumbers(!showWeekNumbers)}
                >
                  {showWeekNumbers ? 'ON' : 'OFF'}
                </button>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm">{t('settings.version')}</span>
                <span className="font-mono text-xs text-muted">
                  v{appVersion} ({platform})
                </span>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button type="button" className="gc-btn-primary" onClick={() => setIsSettingsOpen(false)}>
                {t('settings.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
