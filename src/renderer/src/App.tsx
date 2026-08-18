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
  FileUp
} from 'lucide-react'
import type { AppLocale } from '@shared/ipc-contract'
import type { Calendar, ExpandedOccurrence } from '@shared/event-model'
import { useVisibleRange } from './hooks/use-visible-range'
import MonthView from './views/MonthView'
import WeekView from './views/WeekView'
import DayView from './views/DayView'
import YearView from './views/YearView'
import ListView from './views/ListView'

export type CalendarViewType = 'day' | 'week' | 'month' | 'year' | 'list'

export const App: React.FC = () => {
  const { t, i18n } = useTranslation()
  const [currentView, setCurrentView] = useState<CalendarViewType>('month')
  const [anchorDate, setAnchorDate] = useState<DateTime>(() => DateTime.local())
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true)
  const [appVersion, setAppVersion] = useState<string>('0.1.0')
  const [platform, setPlatform] = useState<string>('win32')
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false)
  const [showLunar, setShowLunar] = useState<boolean>(true)
  const [showWeekNumbers, setShowWeekNumbers] = useState<boolean>(true)

  // Domain state
  const [calendars, setCalendars] = useState<Calendar[]>([])
  const [occurrences, setOccurrences] = useState<ExpandedOccurrence[]>([])
  const [quickEventTitle, setQuickEventTitle] = useState<string>('')
  const [isQuickAddOpen, setIsQuickAddOpen] = useState<boolean>(false)
  const [selectedSlot, setSelectedSlot] = useState<{ start: DateTime; end: DateTime } | null>(null)
  const [importStatus, setImportStatus] = useState<string | null>(null)

  const visibleRange = useVisibleRange(anchorDate, currentView, i18n.language)

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

      // Load persistent settings
      if (window.gone?.settings) {
        try {
          const settings = await window.gone.settings.getAll()
          setShowLunar(settings.showLunar ?? true)
          setShowWeekNumbers(settings.showWeekNumbers ?? true)
        } catch (err) {
          console.warn('Failed to load settings:', err)
        }
      }

      await loadCalendarsAndEvents()
    }
    initApp()
  }, [i18n, loadCalendarsAndEvents])

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

  const toggleTheme = (): void => {
    setIsDarkMode((prev) => {
      const next = !prev
      if (next) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
      return next
    })
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

  const handleCreateQuickEvent = async () => {
    if (!quickEventTitle.trim() || calendars.length === 0 || !window.gone?.events) {
      return
    }

    const targetCal = calendars.find((c) => !c.isReadOnly) || calendars[0]
    if (!targetCal || targetCal.isReadOnly) {
      alert('Calendar is read-only!')
      return
    }

    const startDt = selectedSlot ? selectedSlot.start : anchorDate.set({ hour: 10, minute: 0 })
    const endDt = selectedSlot ? selectedSlot.end : startDt.plus({ hours: 1 })

    try {
      await window.gone.events.create({
        calendarId: targetCal.id,
        title: quickEventTitle.trim(),
        dtStartUtc: startDt.toUTC().toISO()!,
        dtEndUtc: endDt.toUTC().toISO()!,
        tzid: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Ho_Chi_Minh',
        allDay: false
      })
      setQuickEventTitle('')
      setSelectedSlot(null)
      setIsQuickAddOpen(false)
      await loadCalendarsAndEvents()
    } catch (err: any) {
      alert(`Create event error: ${err.message}`)
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
    <div className={`h-screen w-screen flex flex-col ${isDarkMode ? 'dark' : ''} bg-slate-950 text-slate-100 font-sans select-none`}>
      {/* Top Navigation Bar */}
      <header className="h-14 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-4 flex items-center justify-between shrink-0 z-10">
        {/* Brand & Date Navigation */}
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <CalendarDays className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              {t('appName')}
            </span>
          </div>

          <div className="h-5 w-px bg-slate-800" />

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleToday}
              className="px-3 py-1.5 text-xs font-medium bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 rounded-lg border border-slate-700/60 transition-colors shadow-xs"
            >
              {t('nav.today')}
            </button>
            <div className="flex items-center">
              <button
                onClick={handlePrev}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-lg transition-colors"
                title={t('nav.prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={handleNext}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-lg transition-colors"
                title={t('nav.next')}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <span className="text-sm font-semibold text-slate-200 ml-2">
              {visibleRange.label}
            </span>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center bg-slate-950/60 p-1 rounded-xl border border-slate-800/80 shadow-inner">
          {views.map((view) => {
            const isActive = currentView === view
            return (
              <button
                key={view}
                onClick={() => setCurrentView(view)}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
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
            onClick={() => {
              setSelectedSlot(null)
              setIsQuickAddOpen(true)
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all shadow-md shadow-indigo-600/25"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{t('actions.newEvent')}</span>
          </button>

          <button
            onClick={handleImportSampleIcs}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700/60 transition-colors"
            title="Import sample recurring ICS meeting"
          >
            <FileUp className="h-3.5 w-3.5" />
            <span>Import ICS</span>
          </button>

          <div className="h-5 w-px bg-slate-800 mx-1" />

          <button
            onClick={toggleLanguage}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-lg transition-colors flex items-center gap-1 text-xs"
            title="Toggle Language (VI / EN)"
          >
            <Globe className="h-4 w-4" />
            <span className="font-semibold">{i18n.language.toUpperCase()}</span>
          </button>

          <button
            onClick={toggleTheme}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-lg transition-colors"
            title="Toggle Theme"
          >
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-lg transition-colors"
            title={t('actions.settings')}
          >
            <SettingsIcon className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-64 border-r border-slate-800/80 bg-slate-900/30 flex flex-col p-4 gap-6 shrink-0">
          {/* Mini Calendar Card Placeholder */}
          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-3">
              <span>{anchorDate.toFormat('MMMM yyyy')}</span>
              <div className="flex gap-1 text-slate-400">
                <ChevronLeft
                  className="h-3.5 w-3.5 cursor-pointer hover:text-slate-200"
                  onClick={() => setAnchorDate((d) => d.minus({ months: 1 }))}
                />
                <ChevronRight
                  className="h-3.5 w-3.5 cursor-pointer hover:text-slate-200"
                  onClick={() => setAnchorDate((d) => d.plus({ months: 1 }))}
                />
              </div>
            </div>
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-slate-500 mb-2">
              <span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span className="text-indigo-400">T7</span><span className="text-rose-400">CN</span>
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
                        : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
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
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>{t('sidebar.myCalendars')}</span>
              <Folder className="h-3.5 w-3.5 text-slate-500" />
            </div>

            <div className="space-y-1.5">
              {calendars.length > 0 ? (
                calendars.map((cal) => (
                  <label
                    key={cal.id}
                    className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg bg-slate-800/40 hover:bg-slate-800/70 border border-slate-800 text-xs font-medium text-slate-200 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={cal.isVisible}
                      onChange={() => toggleCalendarVisibility(cal)}
                      className="rounded accent-indigo-500 h-3.5 w-3.5"
                    />
                    <span
                      className="h-2.5 w-2.5 rounded-full shadow-xs shrink-0"
                      style={{ backgroundColor: cal.color }}
                    />
                    <span className="flex-1 truncate">{cal.name}</span>
                    {cal.isReadOnly && (
                      <span className="text-[10px] text-amber-400 font-mono px-1 py-0.5 bg-amber-500/10 rounded">
                        RO
                      </span>
                    )}
                  </label>
                ))
              ) : (
                <label className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg bg-slate-800/40 border border-slate-800 text-xs font-medium text-slate-200 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded accent-indigo-500 h-3.5 w-3.5" />
                  <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 shadow-xs" />
                  <span className="flex-1 truncate">{t('sidebar.localCalendar')}</span>
                </label>
              )}

              {/* Lunar Toggle */}
              <label className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg bg-slate-800/40 hover:bg-slate-800/70 border border-slate-800 text-xs font-medium text-slate-200 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={showLunar}
                  onChange={(e) => toggleLunar(e.target.checked)}
                  className="rounded accent-indigo-500 h-3.5 w-3.5"
                />
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span className="flex-1 truncate">{t('sidebar.lunarEnabled')}</span>
              </label>

              {/* Week Numbers Toggle */}
              <label className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg bg-slate-800/40 hover:bg-slate-800/70 border border-slate-800 text-xs font-medium text-slate-200 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={showWeekNumbers}
                  onChange={(e) => toggleWeekNumbers(e.target.checked)}
                  className="rounded accent-indigo-500 h-3.5 w-3.5"
                />
                <Layers className="h-3.5 w-3.5 text-sky-400" />
                <span className="flex-1 truncate">{t('sidebar.weekNumbers')}</span>
              </label>
            </div>
          </div>

          {/* Sync Status / Offline footer */}
          <div className="mt-auto pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{occurrences.length} {i18n.language === 'vi' ? 'sự kiện' : 'events'}</span>
            </div>
            <button
              onClick={() => loadCalendarsAndEvents()}
              className="text-slate-400 hover:text-slate-200 p-1"
              title={t('actions.refresh')}
            >
              <RotateCw className="h-3 w-3" />
            </button>
          </div>
        </aside>

        {/* Center Main Calendar Surface */}
        <main className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden relative">
          {importStatus && (
            <div className="absolute top-6 left-6 right-6 z-40 p-3 bg-indigo-600/90 backdrop-blur-md border border-indigo-500 rounded-xl text-xs text-white flex items-center justify-between shadow-2xl animate-in fade-in">
              <span>{importStatus}</span>
              <button onClick={() => setImportStatus(null)}>
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {currentView === 'month' && (
            <MonthView
              anchorDate={anchorDate}
              occurrences={occurrences}
              showLunar={showLunar}
              showWeekNumbers={showWeekNumbers}
              onSelectDate={(date) => {
                setAnchorDate(date)
                setCurrentView('day')
              }}
            />
          )}

          {currentView === 'week' && (
            <WeekView
              anchorDate={anchorDate}
              occurrences={occurrences}
              showLunar={showLunar}
              showWeekNumbers={showWeekNumbers}
              onSelectSlot={(start, end) => {
                setSelectedSlot({ start, end })
                setIsQuickAddOpen(true)
              }}
            />
          )}

          {currentView === 'day' && (
            <DayView
              anchorDate={anchorDate}
              occurrences={occurrences}
              showLunar={showLunar}
              onSelectSlot={(start, end) => {
                setSelectedSlot({ start, end })
                setIsQuickAddOpen(true)
              }}
            />
          )}

          {currentView === 'year' && (
            <YearView
              anchorDate={anchorDate}
              occurrences={occurrences}
              onSelectMonth={(month) => {
                setAnchorDate((d) => d.set({ month }))
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
              occurrences={occurrences}
              showLunar={showLunar}
              onAddEvent={() => setIsQuickAddOpen(true)}
            />
          )}
        </main>
      </div>

      {/* Quick Add Event Dialog */}
      {isQuickAddOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative">
            <button
              onClick={() => setIsQuickAddOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
              <Plus className="h-4 w-4 text-indigo-400" />
              {t('actions.newEvent')}
            </h3>

            {selectedSlot && (
              <div className="text-xs text-slate-400 mb-3 bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                {selectedSlot.start.toFormat('dd/MM/yyyy HH:mm')} – {selectedSlot.end.toFormat('HH:mm')}
              </div>
            )}

            <input
              type="text"
              placeholder="Event title (e.g. Design review)"
              value={quickEventTitle}
              onChange={(e) => setQuickEventTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateQuickEvent()
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-hidden focus:border-indigo-500 mb-4"
              autoFocus
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsQuickAddOpen(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateQuickEvent}
                className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors shadow-md shadow-indigo-600/30"
              >
                Create Event
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative">
            <button
              onClick={() => setIsSettingsOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-lg font-bold text-slate-100 mb-5 flex items-center gap-2">
              <SettingsIcon className="h-5 w-5 text-indigo-400" />
              {t('settings.title')}
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <span className="text-sm font-medium text-slate-300">{t('settings.language')}</span>
                <button
                  onClick={toggleLanguage}
                  className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors"
                >
                  {i18n.language === 'vi' ? 'Tiếng Việt (VI)' : 'English (EN)'}
                </button>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <span className="text-sm font-medium text-slate-300">{t('settings.theme')}</span>
                <button
                  onClick={toggleTheme}
                  className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors"
                >
                  {isDarkMode ? t('settings.themeDark') : t('settings.themeLight')}
                </button>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <span className="text-sm font-medium text-slate-300">{t('sidebar.lunarEnabled')}</span>
                <button
                  onClick={() => toggleLunar(!showLunar)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                    showLunar
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  {showLunar ? 'ON' : 'OFF'}
                </button>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <span className="text-sm font-medium text-slate-300">{t('sidebar.weekNumbers')}</span>
                <button
                  onClick={() => toggleWeekNumbers(!showWeekNumbers)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                    showWeekNumbers
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  {showWeekNumbers ? 'ON' : 'OFF'}
                </button>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <span className="text-sm font-medium text-slate-300">{t('settings.version')}</span>
                <span className="text-xs text-slate-400 font-mono">v{appVersion} ({platform})</span>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
              >
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
