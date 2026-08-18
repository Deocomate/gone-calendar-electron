import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { DateTime } from 'luxon'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Settings as SettingsIcon,
  Globe,
  Sun,
  Moon,
  Folder,
  Layers,
  Sparkles,
  RotateCw,
  X,
  FileUp,
  Users,
  Search,
  Filter,
  Palette,
  CheckSquare,
  Keyboard
} from 'lucide-react'
import type { AppLocale } from '@shared/ipc-contract'
import type {
  Calendar,
  ExpandedOccurrence,
  CreateEventInput,
  UpdateEventInput,
  RecurringEditScope
} from '@shared/event-model'
import type { TaskItem, ThemeConfig } from '@shared/task-model'
import { useVisibleRange } from './hooks/use-visible-range'
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
import TaskPane from './components/TaskPane'
import ThemeSettingsModal from './components/ThemeSettingsModal'
import HolidayCalendarToggle from './components/HolidayCalendarToggle'
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal'
import { useEventDnD } from './dnd/use-event-dnd'

export type CalendarViewType = 'day' | 'week' | 'month' | 'year' | 'list'

export const App: React.FC = () => {
  const { t, i18n } = useTranslation()
  const [currentView, setCurrentView] = useState<CalendarViewType>('month')
  const [anchorDate, setAnchorDate] = useState<DateTime>(() => DateTime.local())
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true)
  const [appVersion, setAppVersion] = useState<string>('0.1.0')
  const [platform, setPlatform] = useState<string>('win32')
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false)
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false)
  const [isSearchPaletteOpen, setIsSearchPaletteOpen] = useState<boolean>(false)
  const [isThemeModalOpen, setIsThemeModalOpen] = useState<boolean>(false)
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState<boolean>(false)
  const [selectedColorFilter, setSelectedColorFilter] = useState<string | null>(null)
  const [showLunar, setShowLunar] = useState<boolean>(true)
  const [showWeekNumbers, setShowWeekNumbers] = useState<boolean>(true)
  const [sidebarTab, setSidebarTab] = useState<'calendar' | 'tasks'>('calendar')

  // Theme Config
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>({
    mode: 'dark',
    accentColor: '#6366f1',
    customBgUrl: '',
    bgOverlayOpacity: 0.8,
    bgBlur: 8
  })

  // Domain state
  const [calendars, setCalendars] = useState<Calendar[]>([])
  const [occurrences, setOccurrences] = useState<ExpandedOccurrence[]>([])
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [importStatus, setImportStatus] = useState<string | null>(null)

  // Full Event Editor Dialog State
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false)
  const [editorData, setEditorData] = useState<EventEditorInitialData | null>(null)

  // Recurring Scope Dialog State
  const [pendingRecurringScope, setPendingRecurringScope] = useState<{
    action: 'edit' | 'delete'
    title: string
    eventId: string
    occurrenceStartUtc: string
    input?: UpdateEventInput
  } | null>(null)

  // Drag and Drop
  const {
    pendingDrop,
    setPendingDrop,
    handleDragStart,
    handleDropOnDate
  } = useEventDnD()

  const visibleRange = useVisibleRange(anchorDate, currentView, i18n.language)

  // Global Keyboard Shortcuts Listener (A11y & Navigation)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)

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
        setEditorData({
          initialStart: anchorDate.set({ hour: 9, minute: 0, second: 0 }),
          initialEnd: anchorDate.set({ hour: 10, minute: 0, second: 0 })
        })
        setIsEditorOpen(true)
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
  }, [anchorDate])

  const loadCalendarsAndEvents = useCallback(async () => {
    if (!window.gone?.calendars || !window.gone?.events) {
      return
    }

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

      // Load persistent settings & theme
      if (window.gone?.settings) {
        try {
          const settings = await window.gone.settings.getAll()
          setShowLunar(settings.showLunar ?? true)
          setShowWeekNumbers(settings.showWeekNumbers ?? true)

          const isDark = settings.theme !== 'light'
          setIsDarkMode(isDark)
          if (isDark) {
            document.documentElement.classList.add('dark')
          } else {
            document.documentElement.classList.remove('dark')
          }

          const theme: ThemeConfig = {
            mode: isDark ? 'dark' : 'light',
            accentColor: settings.themeAccent || '#6366f1',
            customBgUrl: settings.themeCustomBg || '',
            bgOverlayOpacity: settings.themeOverlayOpacity !== undefined ? settings.themeOverlayOpacity : 0.8,
            bgBlur: settings.themeBlur !== undefined ? settings.themeBlur : 8
          }
          setThemeConfig(theme)
        } catch (err) {
          console.warn('Failed to load settings:', err)
        }
      }

      await loadCalendarsAndEvents()
      await loadTasks()
    }
    initApp()
  }, [i18n, loadCalendarsAndEvents, loadTasks])

  // Navigation handlers
  const handleToday = () => {
    setAnchorDate(DateTime.local())
  }

  const handlePrev = () => {
    switch (currentView) {
      case 'day':
        setAnchorDate((d) => d.minus({ days: 1 }))
        break
      case 'week':
        setAnchorDate((d) => d.minus({ weeks: 1 }))
        break
      case 'month':
        setAnchorDate((d) => d.minus({ months: 1 }))
        break
      case 'year':
        setAnchorDate((d) => d.minus({ years: 1 }))
        break
      case 'list':
        setAnchorDate((d) => d.minus({ months: 1 }))
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
        setAnchorDate((d) => d.plus({ months: 1 }))
        break
      case 'year':
        setAnchorDate((d) => d.plus({ years: 1 }))
        break
      case 'list':
        setAnchorDate((d) => d.plus({ months: 1 }))
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

  const toggleTheme = async (): Promise<void> => {
    const next = !isDarkMode
    setIsDarkMode(next)
    if (next) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    setThemeConfig((prev) => ({ ...prev, mode: next ? 'dark' : 'light' }))
    if (window.gone?.settings) {
      await window.gone.settings.set('theme', next ? 'dark' : 'light')
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

  // Handle Event Saving (New vs Update vs Recurring Scope)
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
          // Trigger recurring scope dialog
          setIsEditorOpen(false)
          setPendingRecurringScope({
            action: 'edit',
            title: (payload.input as UpdateEventInput).title || 'Recurring Event',
            eventId: payload.eventId,
            occurrenceStartUtc: payload.occurrenceStartUtc,
            input: payload.input as UpdateEventInput
          })
        } else {
          // Standard single event update
          await window.gone.events.update(payload.eventId, payload.input as UpdateEventInput)
          setIsEditorOpen(false)
          await loadCalendarsAndEvents()
        }
      }
    } catch (err: any) {
      alert(`Save error: ${err.message}`)
    }
  }

  // Handle Event Deletion
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
    } else {
      if (confirm('Bạn có chắc chắn muốn xóa sự kiện này?')) {
        try {
          await window.gone.events.delete(eventId)
          setIsEditorOpen(false)
          await loadCalendarsAndEvents()
        } catch (err: any) {
          alert(`Delete error: ${err.message}`)
        }
      }
    }
  }

  // Handle Recurring Scope Confirmation ('this' | 'future' | 'all')
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

  // Drag and Drop Actions
  const handleDropMove = async (drop: PendingDropAction) => {
    if (!window.gone?.events) return
    try {
      await window.gone.events.move({
        eventId: drop.occurrence.eventId,
        dtStartUtc: drop.targetStart.toUTC().toISO()!,
        dtEndUtc: drop.targetEnd.toUTC().toISO()!,
        targetCalendarId: drop.targetCalendarId
      })
      setPendingDrop(null)
      await loadCalendarsAndEvents()
    } catch (err: any) {
      alert(`Move error: ${err.message}`)
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

  const views: CalendarViewType[] = ['day', 'week', 'month', 'year', 'list']

  return (
    <div
      className={`h-screen w-screen flex flex-col ${isDarkMode ? 'dark' : ''} bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100 font-sans select-none relative overflow-hidden`}
      style={{ '--accent-color': themeConfig.accentColor } as any}
    >
      {/* Dynamic Background Wallpaper */}
      {themeConfig.customBgUrl && (
        <div
          className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center transition-all duration-500 scale-105"
          style={{
            backgroundImage: `url(${themeConfig.customBgUrl})`,
            filter: `blur(${themeConfig.bgBlur}px)`
          }}
        />
      )}
      {themeConfig.customBgUrl && (
        <div
          className="fixed inset-0 pointer-events-none z-0 bg-white/80 dark:bg-slate-950 transition-opacity duration-300"
          style={{ opacity: themeConfig.bgOverlayOpacity }}
        />
      )}

      {/* Top Navigation Bar */}
      <header className="h-14 border-b border-slate-200 bg-white/80 dark:border-slate-800/80 dark:bg-slate-900/60 backdrop-blur-md px-4 flex items-center justify-between shrink-0 z-10">
        {/* Brand & Date Navigation */}
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <CalendarDays className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-800 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-white dark:via-slate-100 dark:to-slate-400">
              {t('appName')}
            </span>
          </div>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-800" />

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleToday}
              className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 dark:text-slate-200 dark:border-slate-700/60 rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              {t('nav.today')}
            </button>
            <div className="flex items-center">
              <button
                onClick={handlePrev}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60 rounded-lg transition-colors cursor-pointer"
                title={t('nav.prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={handleNext}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60 rounded-lg transition-colors cursor-pointer"
                title={t('nav.next')}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 ml-2">
              {visibleRange.label}
            </span>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-950/60 p-1 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-inner">
          {views.map((view) => {
            const isActive = currentView === view
            return (
              <button
                key={view}
                onClick={() => setCurrentView(view)}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/40'
                }`}
              >
                {t(`views.${view}`)}
              </button>
            )
          })}
        </div>

        {/* Quick Action & Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSearchPaletteOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 dark:bg-slate-800/80 dark:hover:bg-slate-700 dark:text-slate-300 dark:border-slate-700/60 rounded-lg transition-colors cursor-pointer"
            title="Tìm kiếm sự kiện (Ctrl+K)"
          >
            <Search className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
            <span>Tìm kiếm (Ctrl+K)</span>
          </button>

          <button
            onClick={() => {
              setEditorData({
                initialStart: anchorDate.set({ hour: 9, minute: 0, second: 0 }),
                initialEnd: anchorDate.set({ hour: 10, minute: 0, second: 0 })
              })
              setIsEditorOpen(true)
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all shadow-md shadow-indigo-600/25 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{t('actions.newEvent')}</span>
          </button>

          <button
            onClick={handleImportSampleIcs}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 dark:bg-slate-800/80 dark:hover:bg-slate-700 dark:text-slate-300 dark:border-slate-700/60 rounded-lg transition-colors cursor-pointer"
            title="Import sample recurring ICS meeting"
          >
            <FileUp className="h-3.5 w-3.5" />
            <span>Import ICS</span>
          </button>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

          <button
            onClick={toggleLanguage}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60 rounded-lg transition-colors flex items-center gap-1 text-xs cursor-pointer"
            title="Toggle Language (VI / EN)"
          >
            <Globe className="h-4 w-4" />
            <span className="font-semibold">{i18n.language.toUpperCase()}</span>
          </button>

          <button
            onClick={toggleTheme}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60 rounded-lg transition-colors cursor-pointer"
            title="Toggle Theme"
          >
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <button
            onClick={() => setIsThemeModalOpen(true)}
            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-indigo-400 dark:hover:bg-slate-800/60 rounded-lg transition-colors cursor-pointer"
            title="Tùy biến Giao diện (Theme)"
          >
            <Palette className="h-4 w-4" />
          </button>

          <button
            onClick={() => setIsShortcutsModalOpen(true)}
            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-indigo-400 dark:hover:bg-slate-800/60 rounded-lg transition-colors cursor-pointer"
            title="Phím tắt (? / F1)"
          >
            <Keyboard className="h-4 w-4" />
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60 rounded-lg transition-colors cursor-pointer"
            title={t('actions.settings')}
          >
            <SettingsIcon className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden z-10">
        {/* Left Sidebar */}
        <aside className="w-64 border-r border-slate-200 bg-white/80 dark:border-slate-800/80 dark:bg-slate-900/40 backdrop-blur-md flex flex-col p-4 gap-4 shrink-0">
          {/* Sidebar Tab Switcher */}
          <div className="flex bg-slate-100 dark:bg-slate-950/60 p-1 rounded-xl border border-slate-200 dark:border-slate-800/80 shrink-0">
            <button
              onClick={() => setSidebarTab('calendar')}
              className={`flex-1 py-1 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                sidebarTab === 'calendar'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              <span>Lịch</span>
            </button>
            <button
              onClick={() => setSidebarTab('tasks')}
              className={`flex-1 py-1 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                sidebarTab === 'tasks'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <CheckSquare className="h-3.5 w-3.5" />
              <span>Nhiệm vụ ({tasks.filter((t) => !t.completed).length})</span>
            </button>
          </div>

          {sidebarTab === 'tasks' ? (
            <div className="flex-1 overflow-hidden">
              <TaskPane onTasksChanged={loadTasks} />
            </div>
          ) : (
            <>
              {/* Mini Calendar Card */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-xs">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3">
                  <span>{anchorDate.toFormat('MMMM yyyy')}</span>
                  <div className="flex gap-1 text-slate-400">
                    <ChevronLeft
                      className="h-3.5 w-3.5 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
                      onClick={() => setAnchorDate((d) => d.minus({ months: 1 }))}
                    />
                    <ChevronRight
                      className="h-3.5 w-3.5 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
                      onClick={() => setAnchorDate((d) => d.plus({ months: 1 }))}
                    />
                  </div>
                </div>
                {/* Weekday headers */}
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-2">
                  <span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span className="text-indigo-500">T7</span><span className="text-rose-500">CN</span>
                </div>
                {/* Mini Grid Days */}
                <div className="grid grid-cols-7 gap-1 text-center text-xs">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                    const isSelected = anchorDate.day === day
                    return (
                      <div
                        key={day}
                        onClick={() => setAnchorDate((d) => d.set({ day }))}
                        className={`h-6 w-6 mx-auto rounded-md flex items-center justify-center transition-colors cursor-pointer text-[11px] ${
                          isSelected
                            ? 'bg-indigo-600 text-white font-bold shadow-xs'
                            : 'text-slate-600 hover:bg-slate-200/80 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-slate-200'
                        }`}
                      >
                        {day}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Calendars Group */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <span>{t('sidebar.myCalendars')}</span>
                  <Folder className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                </div>

                <div className="space-y-1.5">
                  {calendars.length > 0 ? (
                    calendars.map((cal) => (
                      <label
                        key={cal.id}
                        className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/70 border border-slate-200 text-slate-800 dark:bg-slate-800/40 dark:hover:bg-slate-800/70 dark:border-slate-800 text-xs font-medium dark:text-slate-200 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={cal.isVisible}
                          onChange={() => toggleCalendarVisibility(cal)}
                          className="rounded accent-indigo-500 h-3.5 w-3.5 cursor-pointer"
                        />
                        <span
                          className="h-2.5 w-2.5 rounded-full shadow-xs shrink-0"
                          style={{ backgroundColor: cal.color }}
                        />
                        <span className="flex-1 truncate">{cal.name}</span>
                        {cal.isReadOnly && (
                          <span className="text-[10px] text-amber-500 dark:text-amber-400 font-mono px-1 py-0.5 bg-amber-500/10 rounded">
                            RO
                          </span>
                        )}
                      </label>
                    ))
                  ) : (
                    <label className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer">
                      <input type="checkbox" defaultChecked className="rounded accent-indigo-500 h-3.5 w-3.5" />
                      <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 shadow-xs" />
                      <span className="flex-1 truncate">{t('sidebar.localCalendar')}</span>
                    </label>
                  )}

                  {/* Lunar Toggle */}
                  <label className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/70 border border-slate-200 text-slate-800 dark:bg-slate-800/40 dark:hover:bg-slate-800/70 dark:border-slate-800 text-xs font-medium dark:text-slate-200 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={showLunar}
                      onChange={(e) => toggleLunar(e.target.checked)}
                      className="rounded accent-indigo-500 h-3.5 w-3.5 cursor-pointer"
                    />
                    <Sparkles className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
                    <span className="flex-1 truncate">{t('sidebar.lunarEnabled')}</span>
                  </label>

                  {/* Week Numbers Toggle */}
                  <label className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/70 border border-slate-200 text-slate-800 dark:bg-slate-800/40 dark:hover:bg-slate-800/70 dark:border-slate-800 text-xs font-medium dark:text-slate-200 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={showWeekNumbers}
                      onChange={(e) => toggleWeekNumbers(e.target.checked)}
                      className="rounded accent-indigo-500 h-3.5 w-3.5 cursor-pointer"
                    />
                    <Layers className="h-3.5 w-3.5 text-sky-500 dark:text-sky-400" />
                    <span className="flex-1 truncate">{t('sidebar.weekNumbers')}</span>
                  </label>
                </div>
              </div>

              {/* Holiday Calendars Quick Subscription */}
              <HolidayCalendarToggle
                calendars={calendars}
                onCalendarsChanged={loadCalendarsAndEvents}
              />
            </>
          )}

          {/* Sync Status footer */}
          <div className="mt-auto pt-3 border-t border-slate-200 dark:border-slate-800/80 space-y-2">
            <button
              onClick={() => setIsAccountModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800/60 dark:hover:bg-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700/60 transition-colors cursor-pointer"
            >
              <Users className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
              <span>Quản lý Tài khoản (Sync)</span>
            </button>

            <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Local DB ready</span>
              </div>
              <button
                onClick={() => loadCalendarsAndEvents()}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
                title={t('actions.refresh')}
              >
                <RotateCw className="h-3 w-3" />
              </button>
            </div>
          </div>
        </aside>

        {/* Center Main Calendar Surface */}
        <main className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden relative">
          {importStatus && (
            <div className="absolute top-6 left-6 right-6 z-40 p-3 bg-indigo-600/90 backdrop-blur-md border border-indigo-500 rounded-xl text-xs text-white flex items-center justify-between shadow-2xl animate-in fade-in">
              <span>{importStatus}</span>
              <button onClick={() => setImportStatus(null)} className="cursor-pointer">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Color Filter Pill Row */}
          <div className="mb-3 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs shrink-0">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1 mr-1">
              <Filter className="h-3 w-3" />
              Lọc màu:
            </span>
            <button
              onClick={() => setSelectedColorFilter(null)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                selectedColorFilter === null
                  ? 'bg-slate-800 text-white dark:bg-slate-700 font-semibold shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 dark:bg-slate-900/60 dark:text-slate-400 dark:hover:text-slate-200 dark:border-slate-800/80'
              }`}
            >
              Tất cả
            </button>
            {[
              { hex: '#6366f1', label: 'Indigo' },
              { hex: '#8b5cf6', label: 'Violet' },
              { hex: '#0ea5e9', label: 'Sky' },
              { hex: '#10b981', label: 'Emerald' },
              { hex: '#f59e0b', label: 'Amber' },
              { hex: '#f43f5e', label: 'Rose' },
              { hex: '#64748b', label: 'Slate' }
            ].map((c) => (
              <button
                key={c.hex}
                onClick={() => setSelectedColorFilter(selectedColorFilter === c.hex ? null : c.hex)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                  selectedColorFilter === c.hex
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold border border-slate-300 dark:border-slate-600 shadow-xs'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 dark:bg-slate-900/60 dark:text-slate-400 dark:hover:text-slate-200 dark:border-slate-800/80'
                }`}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.hex }} />
                <span>{c.label}</span>
              </button>
            ))}
          </div>

          {currentView === 'month' && (
            <MonthView
              anchorDate={anchorDate}
              occurrences={selectedColorFilter ? occurrences.filter((o) => o.color === selectedColorFilter) : occurrences}
              tasks={tasks}
              showLunar={showLunar}
              showWeekNumbers={showWeekNumbers}
              onSelectDate={(date) => {
                setEditorData({
                  initialStart: date.set({ hour: 9, minute: 0, second: 0 }),
                  initialEnd: date.set({ hour: 10, minute: 0, second: 0 })
                })
                setIsEditorOpen(true)
              }}
              onSelectOccurrence={(occ) => {
                setEditorData({ occurrence: occ })
                setIsEditorOpen(true)
              }}
              onDragStart={handleDragStart}
              onDropOnDate={handleDropOnDate}
            />
          )}

          {currentView === 'week' && (
            <WeekView
              anchorDate={anchorDate}
              occurrences={selectedColorFilter ? occurrences.filter((o) => o.color === selectedColorFilter) : occurrences}
              showLunar={showLunar}
              showWeekNumbers={showWeekNumbers}
              onSelectSlot={(start, end) => {
                setEditorData({ initialStart: start, initialEnd: end })
                setIsEditorOpen(true)
              }}
              onSelectOccurrence={(occ) => {
                setEditorData({ occurrence: occ })
                setIsEditorOpen(true)
              }}
              onDragStart={handleDragStart}
              onDropOnDate={handleDropOnDate}
            />
          )}

          {currentView === 'day' && (
            <DayView
              anchorDate={anchorDate}
              occurrences={selectedColorFilter ? occurrences.filter((o) => o.color === selectedColorFilter) : occurrences}
              showLunar={showLunar}
              onSelectSlot={(start, end) => {
                setEditorData({ initialStart: start, initialEnd: end })
                setIsEditorOpen(true)
              }}
              onSelectOccurrence={(occ) => {
                setEditorData({ occurrence: occ })
                setIsEditorOpen(true)
              }}
              onDragStart={handleDragStart}
              onDropOnDate={handleDropOnDate}
            />
          )}

          {currentView === 'year' && (
            <YearView
              anchorDate={anchorDate}
              occurrences={selectedColorFilter ? occurrences.filter((o) => o.color === selectedColorFilter) : occurrences}
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
              occurrences={selectedColorFilter ? occurrences.filter((o) => o.color === selectedColorFilter) : occurrences}
              tasks={tasks}
              showLunar={showLunar}
              onSelectOccurrence={(occ) => {
                setEditorData({ occurrence: occ })
                setIsEditorOpen(true)
              }}
              onAddEvent={() => {
                setEditorData({
                  initialStart: anchorDate.set({ hour: 9, minute: 0 }),
                  initialEnd: anchorDate.set({ hour: 10, minute: 0 })
                })
                setIsEditorOpen(true)
              }}
            />
          )}
        </main>
      </div>

      {/* Search Palette (Ctrl+K) */}
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

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />

      {/* Theme Settings Modal */}
      <ThemeSettingsModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
        onThemeChanged={(theme) => setThemeConfig(theme)}
      />

      {/* Full Event Editor Dialog */}
      <EventEditorDialog
        isOpen={isEditorOpen}
        calendars={calendars}
        data={editorData}
        onSave={handleSaveEditorEvent}
        onDelete={handleDeleteEvent}
        onClose={() => setIsEditorOpen(false)}
      />

      {/* Recurring Scope Selection Dialog */}
      <RecurringScopeDialog
        isOpen={Boolean(pendingRecurringScope)}
        title={pendingRecurringScope?.title || ''}
        action={pendingRecurringScope?.action || 'edit'}
        onConfirm={handleConfirmRecurringScope}
        onCancel={() => setPendingRecurringScope(null)}
      />

      {/* Drag and Drop Move/Copy/Cancel Popover */}
      <DropActionPopover
        pendingDrop={pendingDrop}
        onMove={handleDropMove}
        onCopy={handleDropCopy}
        onCancel={() => setPendingDrop(null)}
      />

      {/* Account Manager Modal */}
      <AccountManagerModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        onAccountsChanged={() => loadCalendarsAndEvents()}
      />

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 relative">
            <button
              onClick={() => setIsSettingsOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-5 flex items-center gap-2">
              <SettingsIcon className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
              {t('settings.title')}
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('settings.language')}</span>
                <button
                  onClick={toggleLanguage}
                  className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700 rounded-lg transition-colors cursor-pointer"
                >
                  {i18n.language === 'vi' ? 'Tiếng Việt (VI)' : 'English (EN)'}
                </button>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('settings.theme')}</span>
                <button
                  onClick={toggleTheme}
                  className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700 rounded-lg transition-colors cursor-pointer"
                >
                  {isDarkMode ? t('settings.themeDark') : t('settings.themeLight')}
                </button>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('sidebar.lunarEnabled')}</span>
                <button
                  onClick={() => toggleLunar(!showLunar)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                    showLunar
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-slate-100 border-slate-300 text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                  }`}
                >
                  {showLunar ? 'ON' : 'OFF'}
                </button>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('sidebar.weekNumbers')}</span>
                <button
                  onClick={() => toggleWeekNumbers(!showWeekNumbers)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                    showWeekNumbers
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-slate-100 border-slate-300 text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                  }`}
                >
                  {showWeekNumbers ? 'ON' : 'OFF'}
                </button>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('settings.version')}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">v{appVersion} ({platform})</span>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors cursor-pointer"
              >
                {t('actions.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
