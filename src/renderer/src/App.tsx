import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { DateTime } from 'luxon'
import { Settings as SettingsIcon, X, Users } from 'lucide-react'
import type { AppLocale } from '@shared/ipc-contract'
import type {
  Calendar,
  ExpandedOccurrence,
  CreateEventInput,
  UpdateEventInput,
  RecurringEditScope,
  SyncConflict
} from '@shared/event-model'
import type { CalendarViewType } from '@shared/visible-range'
import { formatClockTime } from '@shared/time-format'
import { useVisibleRange } from './hooks/use-visible-range'
import { useTheme } from './hooks/use-theme'
import MonthView from './views/MonthView'
import WeekView from './views/WeekView'
import DayView from './views/DayView'
import YearView from './views/YearView'
import ListView from './views/ListView'
import EventEditorDialog, {
  type EventEditorInitialData,
  type EventEditorDraftPreview
} from './editor/EventEditorDialog'
import RecurringScopeDialog from './editor/RecurringScopeDialog'
import DropActionPopover, { type PendingDropAction } from './dnd/DropActionPopover'
import AccountManagerModal from './components/AccountManagerModal'
import SearchPaletteModal from './components/SearchPaletteModal'
import ThemeSettingsModal from './components/ThemeSettingsModal'
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal'
import SyncConflictsModal from './components/SyncConflictsModal'
import HolidayCalendarToggle from './components/HolidayCalendarToggle'
import AppHeader from './components/shell/AppHeader'
import AppSidebar from './components/shell/AppSidebar'
import { useEventDnD } from './dnd/use-event-dnd'
import { NotionToaster, NumberInput, CustomSelect, toast, showFriendlyError } from './components/ui'
import { CALENDAR_COLOR_PALETTE } from './lib/calendar-colors'
import { DisplayPreferencesProvider, type DisplayPreferences } from './context/DisplayPreferencesContext'

export type { CalendarViewType }

const TIMEZONE_NAMES: string[] = (() => {
  try {
    return (Intl as any).supportedValuesOf ? (Intl as any).supportedValuesOf('timeZone') : []
  } catch {
    return []
  }
})()

export const App: React.FC = () => {
  const { t, i18n } = useTranslation()
  const { mode, isDark, themeConfig, setThemeConfig, persistMode, loadFromSettings } = useTheme()
  const [currentView, setCurrentView] = useState<CalendarViewType>('week')
  const [anchorDate, setAnchorDate] = useState<DateTime>(() => DateTime.local())
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [appVersion, setAppVersion] = useState<string>('0.1.0')
  const [platform, setPlatform] = useState<string>('win32')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState<'general' | 'calendars'>('general')
  const [colorPickerCalId, setColorPickerCalId] = useState<string | null>(null)
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false)
  const [isSearchPaletteOpen, setIsSearchPaletteOpen] = useState(false)
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false)
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false)
  const [isConflictsModalOpen, setIsConflictsModalOpen] = useState(false)
  const [conflicts, setConflicts] = useState<SyncConflict[]>([])
  const [showLunar, setShowLunar] = useState(true)
  const [showWeekNumbers, setShowWeekNumbers] = useState(true)
  const [showMiniCalendar, setShowMiniCalendar] = useState(false)
  const [autoHideHeader, setAutoHideHeader] = useState(true)
  const [timeFormat, setTimeFormat] = useState<DisplayPreferences['timeFormat']>('24h')
  const [dayStartHour, setDayStartHour] = useState(7)
  const [hourBlockSize, setHourBlockSize] = useState<DisplayPreferences['hourBlockSize']>('medium')
  const [secondaryTimezone, setSecondaryTimezone] = useState<string>('')
  const [headerVisible, setHeaderVisible] = useState(true)
  const headerHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [firstDayOfWeek, setFirstDayOfWeek] = useState(1)

  const [calendars, setCalendars] = useState<Calendar[]>([])
  const [occurrences, setOccurrences] = useState<ExpandedOccurrence[]>([])

  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editorData, setEditorData] = useState<EventEditorInitialData | null>(null)
  // Live slot/color preview for a NEW event while its editor is open - null the rest
  // of the time. A plain useCallback identity so the dialog's effect can depend on
  // it safely without re-firing on every parent render.
  const [draftPreview, setDraftPreview] = useState<EventEditorDraftPreview | null>(null)
  const handleDraftChange = useCallback((draft: EventEditorDraftPreview | null) => {
    setDraftPreview(draft)
  }, [])
  const [pendingRecurringScope, setPendingRecurringScope] = useState<{
    action: 'edit' | 'delete'
    title: string
    eventId: string
    occurrenceStartUtc: string
    input?: UpdateEventInput
  } | null>(null)

  const visibleRange = useVisibleRange(anchorDate, currentView, i18n.language)

  // List view starts with a modest window and grows incrementally as the user
  // scrolls near an edge, instead of always fetching/expanding a huge fixed range.
  const LIST_BASE_DAYS_BEFORE = 14
  const LIST_BASE_DAYS_AFTER = 30
  const LIST_EXPAND_STEP_DAYS = 60
  const [listExpand, setListExpand] = useState({ before: 0, after: 0 })

  useEffect(() => {
    setListExpand({ before: 0, after: 0 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView, anchorDate])

  const handleListNearEdge = useCallback((direction: 'past' | 'future') => {
    setListExpand((prev) =>
      direction === 'past'
        ? { ...prev, before: prev.before + LIST_EXPAND_STEP_DAYS }
        : { ...prev, after: prev.after + LIST_EXPAND_STEP_DAYS }
    )
  }, [])

  const queryRange = useMemo(() => {
    if (currentView !== 'list') return visibleRange
    const start = anchorDate.minus({ days: LIST_BASE_DAYS_BEFORE + listExpand.before }).startOf('day')
    const end = anchorDate.plus({ days: LIST_BASE_DAYS_AFTER + listExpand.after }).endOf('day')
    return {
      startUtc: start.toUTC().toISO() || start.toISO()!,
      endUtc: end.toUTC().toISO() || end.toISO()!,
      label: visibleRange.label
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView, anchorDate, listExpand, visibleRange.label])

  const loadCalendarsAndEvents = useCallback(async () => {
    if (!window.gone?.calendars || !window.gone?.events) return

    try {
      const cals = await window.gone.calendars.list()
      setCalendars(cals)

      const activeCalIds = cals.filter((c) => c.isVisible).map((c) => c.id)
      if (activeCalIds.length > 0) {
        const occs = await window.gone.events.queryRange(
          activeCalIds,
          queryRange.startUtc,
          queryRange.endUtc
        )
        const calColorById = new Map(cals.map((c) => [c.id, c.color]))
        setOccurrences(
          occs.map((occ) => ({ ...occ, color: occ.color || calColorById.get(occ.calendarId) }))
        )
      } else {
        setOccurrences([])
      }
    } catch (err) {
      console.error('Failed to load calendars or events:', err)
    }

    if (window.gone?.events?.listConflicts) {
      try {
        setConflicts(await window.gone.events.listConflicts())
      } catch (err) {
        console.error('Failed to load sync conflicts:', err)
      }
    }
  }, [queryRange.startUtc, queryRange.endUtc])

  const handleResolveConflict = async (eventId: string, resolution: 'keepMine' | 'keepTheirs') => {
    if (!window.gone?.events?.resolveConflict) return
    try {
      await window.gone.events.resolveConflict(eventId, resolution)
      setConflicts((prev) => prev.filter((c) => c.eventId !== eventId))
      toast.success(t('toast.conflictResolved'))
    } catch (err: any) {
      showFriendlyError(err, t('toast.conflictResolveFailed'))
    }
  }

  const handleDirectMove = useCallback(
    async (
      occ: ExpandedOccurrence,
      targetStart: DateTime,
      targetEnd: DateTime,
      isCopy: boolean,
      kind: 'move' | 'resize' = 'move'
    ) => {
      if (!window.gone?.events) return

      const sourceCal = calendars.find((c) => c.id === occ.calendarId)
      if (sourceCal?.isReadOnly && !isCopy) {
        toast.error(t('toast.readOnlyTitle'), { description: t('toast.readOnlyMove') })
        return
      }

      const when = `${targetStart.toFormat('dd/MM')} ${formatClockTime(targetStart, timeFormat)} – ${formatClockTime(targetEnd, timeFormat)}`

      try {
        if (isCopy) {
          await window.gone.events.copy({
            sourceEventId: occ.eventId,
            dtStartUtc: targetStart.toUTC().toISO()!,
            dtEndUtc: targetEnd.toUTC().toISO()!,
            targetCalendarId: occ.calendarId,
            copyInstanceOnly: true
          })
          toast.success(t('toast.eventCopied'), {
            description: t('toast.copiedTo', {
              title: occ.title,
              date: targetStart.toFormat('dd/MM/yyyy')
            })
          })
        } else if (occ.isRecurring) {
          await window.gone.events.updateScope({
            masterEventId: occ.eventId,
            originalStartUtc: occ.originalStartUtc || occ.startUtc,
            scope: 'this',
            updateInput: {
              title: occ.title,
              dtStartUtc: targetStart.toUTC().toISO()!,
              dtEndUtc: targetEnd.toUTC().toISO()!,
              tzid: occ.tzid,
              notes: occ.notes,
              location: occ.location,
              meetingUrl: occ.meetingUrl
            }
          })
          toast.success(kind === 'resize' ? t('toast.eventTimeUpdated') : t('toast.eventMoved'), {
            description: t('toast.movedDetail', { title: occ.title, when })
          })
        } else {
          await window.gone.events.move({
            eventId: occ.eventId,
            dtStartUtc: targetStart.toUTC().toISO()!,
            dtEndUtc: targetEnd.toUTC().toISO()!,
            targetCalendarId: occ.calendarId
          })
          toast.success(kind === 'resize' ? t('toast.eventTimeUpdated') : t('toast.eventMoved'), {
            description: t('toast.movedDetail', { title: occ.title, when })
          })
        }
        await loadCalendarsAndEvents()
      } catch (err: any) {
        showFriendlyError(err, t('toast.moveFailed'))
      }
    },
    [calendars, loadCalendarsAndEvents, t]
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
    handleDropOnDate,
    markPointerBusyEnd
  } = useEventDnD(handleDirectMove)

  const handleResizeCommit = useCallback(
    (occ: ExpandedOccurrence, start: DateTime, end: DateTime) => {
      void handleDirectMove(occ, start, end, false, 'resize')
    },
    [handleDirectMove]
  )

  // Week view: dragging an event drops a copy rather than moving the original.
  const handleWeekDrop = useCallback(
    (e: React.DragEvent, targetDate: DateTime, minutes?: number) => {
      handleDropOnDate(e, targetDate, minutes, true)
    },
    [handleDropOnDate]
  )

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

  useEffect(() => {
    const initApp = async (): Promise<void> => {
      if (window.gone?.app) {
        try {
          const version = await window.gone.app.getVersion()
          const plat = await window.gone.app.getPlatform()
          setAppVersion(version || '0.1.0')
          setPlatform(plat || 'win32')
        } catch (err) {
          console.warn('IPC init failed, using fallbacks:', err)
        }
      }

      if (window.gone?.settings) {
        try {
          const settings = await window.gone.settings.getAll()
          setShowLunar(settings.showLunar ?? true)
          setShowWeekNumbers(settings.showWeekNumbers ?? true)
          setShowMiniCalendar(settings.showMiniCalendar ?? false)
          setAutoHideHeader(settings.autoHideHeader ?? true)
          setTimeFormat(settings.timeFormat ?? '24h')
          setDayStartHour(settings.dayStartHour ?? 7)
          setHourBlockSize(settings.hourBlockSize ?? 'medium')
          setSecondaryTimezone(settings.secondaryTimezone ?? '')
          setFirstDayOfWeek(settings.firstDayOfWeek ?? 1)
          const loc = settings.locale === 'vi' || settings.locale === 'en' ? settings.locale : 'en'
          if (loc !== i18n.language) await i18n.changeLanguage(loc)
          if (window.gone.app?.setLocale) await window.gone.app.setLocale(loc)
        } catch (err) {
          console.warn('Failed to load settings:', err)
        }
      }

      await loadFromSettings()
      await loadCalendarsAndEvents()
    }
    initApp()
  }, [i18n, loadCalendarsAndEvents, loadFromSettings])

  const handleToday = () => setAnchorDate(DateTime.local())

  // Taskbar-style auto-hide: the header only stays up while the pointer is near
  // the top edge or resting on it, and slides away again after a short delay.
  const showHeader = () => {
    if (headerHideTimerRef.current) {
      clearTimeout(headerHideTimerRef.current)
      headerHideTimerRef.current = null
    }
    setHeaderVisible(true)
  }

  const scheduleHideHeader = () => {
    if (headerHideTimerRef.current) clearTimeout(headerHideTimerRef.current)
    headerHideTimerRef.current = setTimeout(() => setHeaderVisible(false), 150)
  }

  useEffect(() => {
    scheduleHideHeader()
    return () => {
      if (headerHideTimerRef.current) clearTimeout(headerHideTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const setLanguage = async (next: AppLocale): Promise<void> => {
    if (next === i18n.language) return
    await i18n.changeLanguage(next)
    if (window.gone?.settings) await window.gone.settings.set('locale', next)
    if (window.gone?.app?.setLocale) await window.gone.app.setLocale(next)
  }

  const toggleLanguage = () => setLanguage(i18n.language === 'vi' ? 'en' : 'vi')

  const toggleLunar = async (enabled: boolean) => {
    setShowLunar(enabled)
    if (window.gone?.settings) await window.gone.settings.set('showLunar', enabled)
  }

  const toggleWeekNumbers = async (enabled: boolean) => {
    setShowWeekNumbers(enabled)
    if (window.gone?.settings) await window.gone.settings.set('showWeekNumbers', enabled)
  }

  const toggleAutoHideHeader = async (enabled: boolean) => {
    setAutoHideHeader(enabled)
    if (!enabled) showHeader()
    if (window.gone?.settings) await window.gone.settings.set('autoHideHeader', enabled)
  }

  const changeTimeFormat = async (value: DisplayPreferences['timeFormat']) => {
    setTimeFormat(value)
    if (window.gone?.settings) await window.gone.settings.set('timeFormat', value)
  }

  const changeDayStartHour = async (value: number) => {
    setDayStartHour(value)
    if (window.gone?.settings) await window.gone.settings.set('dayStartHour', value)
  }

  const changeHourBlockSize = async (value: DisplayPreferences['hourBlockSize']) => {
    setHourBlockSize(value)
    if (window.gone?.settings) await window.gone.settings.set('hourBlockSize', value)
  }

  const changeSecondaryTimezone = async (value: string) => {
    setSecondaryTimezone(value)
    if (window.gone?.settings) await window.gone.settings.set('secondaryTimezone', value)
  }

  const toggleMiniCalendar = async (enabled: boolean) => {
    setShowMiniCalendar(enabled)
    if (window.gone?.settings) await window.gone.settings.set('showMiniCalendar', enabled)
  }

  const toggleCalendarVisibility = async (cal: Calendar) => {
    if (window.gone?.calendars) {
      const updated = await window.gone.calendars.update(cal.id, { isVisible: !cal.isVisible })
      setCalendars((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
      await loadCalendarsAndEvents()
    }
  }

  const changeCalendarColor = async (cal: Calendar, color: string) => {
    if (!window.gone?.calendars) return
    const updated = await window.gone.calendars.update(cal.id, { color })
    setCalendars((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
    setColorPickerCalId(null)
    await loadCalendarsAndEvents()
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
        toast.success(t('toast.eventCreated'))
      } else if (payload.eventId) {
        if (payload.isRecurringOccurrence && payload.occurrenceStartUtc) {
          setIsEditorOpen(false)
          setPendingRecurringScope({
            action: 'edit',
            title: (payload.input as UpdateEventInput).title || '',
            eventId: payload.eventId,
            occurrenceStartUtc: payload.occurrenceStartUtc,
            input: payload.input as UpdateEventInput
          })
        } else {
          await window.gone.events.update(payload.eventId, payload.input as UpdateEventInput)
          setIsEditorOpen(false)
          await loadCalendarsAndEvents()
          toast.success(t('toast.changesSaved'))
        }
      }
    } catch (err: any) {
      showFriendlyError(err, t('toast.saveFailed'))
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
        title: '',
        eventId,
        occurrenceStartUtc
      })
    } else if (confirm(t('toast.confirmDelete'))) {
      try {
        await window.gone.events.delete(eventId)
        setIsEditorOpen(false)
        await loadCalendarsAndEvents()
        toast.success(t('toast.eventDeleted'))
      } catch (err: any) {
        showFriendlyError(err, t('toast.deleteFailed'))
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
        toast.success(t('toast.recurringUpdated'))
      } else if (pendingRecurringScope.action === 'delete') {
        await window.gone.events.deleteScope({
          masterEventId: pendingRecurringScope.eventId,
          originalStartUtc: pendingRecurringScope.occurrenceStartUtc,
          scope
        })
        toast.success(t('toast.recurringDeleted'))
      }
      setPendingRecurringScope(null)
      await loadCalendarsAndEvents()
    } catch (err: any) {
      showFriendlyError(err, t('toast.recurringUpdateFailed'))
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

  // Week view middle-click gesture: delete the occurrence without opening the editor.
  const handleQuickDeleteOccurrence = useCallback(
    (occ: ExpandedOccurrence) => {
      if (wasJustDragging()) return
      const sourceCal = calendars.find((c) => c.id === occ.calendarId)
      if (sourceCal?.isReadOnly) {
        toast.error(t('toast.readOnlyTitle'), { description: t('toast.readOnlyDelete') })
        return
      }
      void handleDeleteEvent(occ.eventId, occ.originalStartUtc || occ.startUtc, occ.isRecurring)
    },
    [calendars, wasJustDragging] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const handleDropMove = async (drop: PendingDropAction) => {
    if (!window.gone?.events) return

    const targetCalId = drop.targetCalendarId || drop.occurrence.calendarId
    const targetCal = calendars.find((c) => c.id === targetCalId)
    const sourceCal = calendars.find((c) => c.id === drop.occurrence.calendarId)
    if (sourceCal?.isReadOnly || targetCal?.isReadOnly) {
      toast.error(t('toast.readOnlyTitle'), { description: t('toast.readOnlyMove') })
      setPendingDrop(null)
      return
    }

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
        targetCalendarId: targetCalId
      })
      setPendingDrop(null)
      await loadCalendarsAndEvents()
      toast.success(t('toast.eventMoved'))
    } catch (err: any) {
      showFriendlyError(err, t('toast.moveFailed'))
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
      toast.success(t('toast.eventCopied'))
    } catch (err: any) {
      showFriendlyError(err, t('toast.copyFailed'))
    }
  }

  return (
    <DisplayPreferencesProvider value={{ timeFormat, hourBlockSize, dayStartHour, secondaryTimezone }}>
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

      {(() => {
          const header = (
            <AppHeader
              title={currentView === 'week' || currentView === 'year' ? '' : visibleRange.label}
              currentView={currentView}
              language={i18n.language}
              themeMode={mode}
              showSidebarToggle={showMiniCalendar}
              onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
              onPrev={handlePrev}
              onNext={handleNext}
              onChangeView={setCurrentView}
              onSearch={() => setIsSearchPaletteOpen(true)}
              onOpenSettings={() => {
                setSettingsTab('general')
                setIsSettingsOpen(true)
              }}
              onOpenTheme={() => setIsThemeModalOpen(true)}
              onOpenShortcuts={() => setIsShortcutsModalOpen(true)}
              onToggleLanguage={toggleLanguage}
              onSetThemeMode={persistMode}
              conflictCount={conflicts.length}
              onOpenConflicts={() => setIsConflictsModalOpen(true)}
            />
          )

          if (!autoHideHeader) {
            // Plain, always-visible header - no collapse machinery.
            return <div className="shrink-0">{header}</div>
          }

          return (
            <>
              {/* Thin hotspot at the very top edge - catches the pointer re-entering
                  while the header is collapsed away, taskbar-style. */}
              <div className="fixed inset-x-0 top-0 z-20 h-1.5" onMouseEnter={showHeader} />

              {/* Push-based collapse (not an overlay) - the header's own box shrinks to
                  0, so the calendar content underneath slides down/up with it instead of
                  ever being covered. Overflow only clips while collapsed/collapsing -
                  once expanded it switches to visible so the view-switcher and overflow
                  menu dropdowns (which extend below the 48px bar) aren't cut off. */}
              <div
                className={`shrink-0 transition-[max-height] duration-100 ease-out ${
                  headerVisible ? 'overflow-visible' : 'overflow-hidden'
                }`}
                style={{ maxHeight: headerVisible ? '48px' : '0px' }}
                onMouseEnter={showHeader}
                onMouseLeave={scheduleHideHeader}
              >
                {header}
              </div>
            </>
          )
        })()}

      <div className="z-10 flex min-h-0 flex-1 overflow-hidden">
        {showMiniCalendar && (
          <AppSidebar
            collapsed={sidebarCollapsed}
            anchorDate={anchorDate}
            occurrences={occurrences}
            firstDayOfWeek={firstDayOfWeek}
            onSelectDate={setAnchorDate}
            onPrevMonth={() => setAnchorDate((d) => d.minus({ months: 1 }))}
            onNextMonth={() => setAnchorDate((d) => d.plus({ months: 1 }))}
          />
        )}

        <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-surface">

          {currentView === 'month' && (
            <MonthView
              anchorDate={anchorDate}
              occurrences={occurrences}
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
              occurrences={occurrences}
              showLunar={showLunar}
              showWeekNumbers={showWeekNumbers}
              previewSlot={draftPreview}
              onSelectSlot={(start, end, meta) => {
                if (wasJustDragging()) return
                setEditorData({
                  initialStart: start,
                  initialEnd: end,
                  initialAllDay: meta?.allDay,
                  initialClientX: meta?.clientX
                })
                setIsEditorOpen(true)
              }}
              onSelectOccurrence={handleSelectOccurrence}
              onDeleteOccurrence={handleQuickDeleteOccurrence}
              onGoToday={handleToday}
              onPrevWeek={handlePrev}
              onNextWeek={handleNext}
              draggedOccurrenceId={draggedOccurrence?.id}
              dropTarget={dropTarget}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOverTarget={handleDragOverTarget}
              onDropOnDate={handleWeekDrop}
              onResizeCommit={handleResizeCommit}
              onResizeBusyEnd={markPointerBusyEnd}
            />
          )}

          {currentView === 'day' && (
            <DayView
              anchorDate={anchorDate}
              occurrences={occurrences}
              showLunar={showLunar}
              previewSlot={draftPreview}
              onSelectSlot={(start, end, meta) => {
                if (wasJustDragging()) return
                setEditorData({
                  initialStart: start,
                  initialEnd: end,
                  initialAllDay: meta?.allDay,
                  initialClientX: meta?.clientX
                })
                setIsEditorOpen(true)
              }}
              onSelectOccurrence={handleSelectOccurrence}
              draggedOccurrenceId={draggedOccurrence?.id}
              dropTarget={dropTarget}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOverTarget={handleDragOverTarget}
              onDropOnDate={handleDropOnDate}
              onResizeCommit={handleResizeCommit}
              onResizeBusyEnd={markPointerBusyEnd}
            />
          )}

          {currentView === 'year' && (
            <YearView
              anchorDate={anchorDate}
              occurrences={occurrences}
              showLunar={showLunar}
              onSelectMonth={(year, month) => {
                setAnchorDate((d) => d.set({ year, month, day: 1 }))
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
              onSelectOccurrence={handleSelectOccurrence}
              onAddEvent={() => openEditorForDate(anchorDate)}
              onNearEdge={handleListNearEdge}
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

      <SyncConflictsModal
        isOpen={isConflictsModalOpen}
        conflicts={conflicts}
        onClose={() => setIsConflictsModalOpen(false)}
        onResolve={handleResolveConflict}
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
        onDataChanged={loadCalendarsAndEvents}
        onClose={() => setIsEditorOpen(false)}
        onDraftChange={handleDraftChange}
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

            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <SettingsIcon className="h-5 w-5 text-accent" />
              {t('settings.title')}
            </h3>

            <div className="mb-4 flex gap-1 border-b border-hairline">
              {(['general', 'calendars'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setSettingsTab(tab)}
                  className={`-mb-px border-b-2 px-3 py-1.5 text-xs font-medium transition-colors ${
                    settingsTab === tab
                      ? 'border-accent text-primary'
                      : 'border-transparent text-muted hover:text-primary'
                  }`}
                >
                  {tab === 'general' ? t('settings.tabGeneral') : t('settings.tabCalendars')}
                </button>
              ))}
            </div>

            {settingsTab === 'general' && (
              <div className="space-y-1">
                <div className="flex items-center justify-between border-b border-hairline py-2">
                  <span className="text-sm">{t('settings.language')}</span>
                  <button type="button" className="gc-btn" onClick={toggleLanguage}>
                    {i18n.language === 'vi' ? 'Tiếng Việt' : 'English'}
                  </button>
                </div>
                <div className="flex items-center justify-between border-b border-hairline py-2">
                  <span className="text-sm">{t('settings.theme')}</span>
                  <span className="text-xs text-muted">
                    {isDark ? t('settings.themeDark') : t('settings.themeLight')}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-hairline py-2">
                  <span className="text-sm">{t('settings.lunar')}</span>
                  <button
                    type="button"
                    className={showLunar ? 'gc-btn-primary' : 'gc-btn'}
                    onClick={() => toggleLunar(!showLunar)}
                  >
                    {showLunar ? t('common.on') : t('common.off')}
                  </button>
                </div>
                <div className="flex items-center justify-between border-b border-hairline py-2">
                  <span className="text-sm">{t('settings.weekNumbers')}</span>
                  <button
                    type="button"
                    className={showWeekNumbers ? 'gc-btn-primary' : 'gc-btn'}
                    onClick={() => toggleWeekNumbers(!showWeekNumbers)}
                  >
                    {showWeekNumbers ? t('common.on') : t('common.off')}
                  </button>
                </div>
                <div className="flex items-center justify-between border-b border-hairline py-2">
                  <span className="text-sm">{t('settings.autoHideHeader')}</span>
                  <button
                    type="button"
                    className={autoHideHeader ? 'gc-btn-primary' : 'gc-btn'}
                    onClick={() => toggleAutoHideHeader(!autoHideHeader)}
                  >
                    {autoHideHeader ? t('common.on') : t('common.off')}
                  </button>
                </div>
                <div className="flex items-center justify-between border-b border-hairline py-2">
                  <span className="text-sm">{t('settings.timeFormat')}</span>
                  <div className="flex gap-1">
                    {(['24h', '12h'] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        className={timeFormat === opt ? 'gc-btn-primary' : 'gc-btn'}
                        onClick={() => changeTimeFormat(opt)}
                      >
                        {opt === '24h' ? t('settings.timeFormat24h') : t('settings.timeFormat12h')}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between border-b border-hairline py-2">
                  <span className="text-sm">{t('settings.dayStartHour')}</span>
                  <NumberInput
                    value={dayStartHour}
                    onChange={(v) => changeDayStartHour(Math.max(0, Math.min(23, Math.round(v))))}
                    min={0}
                    max={23}
                    suffix="h"
                  />
                </div>
                <div className="flex items-center justify-between border-b border-hairline py-2">
                  <span className="text-sm">{t('settings.hourBlockSize')}</span>
                  <div className="flex gap-1">
                    {(['small', 'medium', 'large'] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        className={hourBlockSize === opt ? 'gc-btn-primary' : 'gc-btn'}
                        onClick={() => changeHourBlockSize(opt)}
                      >
                        {t(`settings.hourBlockSize${opt[0].toUpperCase()}${opt.slice(1)}`)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between border-b border-hairline py-2 gap-3">
                  <span className="text-sm shrink-0">{t('settings.secondaryTimezone')}</span>
                  <div className="w-48">
                    <CustomSelect
                      value={secondaryTimezone}
                      onChange={changeSecondaryTimezone}
                      searchable
                      placeholder={t('settings.secondaryTimezoneNone')}
                      options={[
                        { value: '', label: t('settings.secondaryTimezoneNone') },
                        ...TIMEZONE_NAMES.map((tz) => ({ value: tz, label: tz.replace(/_/g, ' ') }))
                      ]}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between border-b border-hairline py-2">
                  <span className="text-sm">{t('settings.showMiniCalendar')}</span>
                  <button
                    type="button"
                    className={showMiniCalendar ? 'gc-btn-primary' : 'gc-btn'}
                    onClick={() => toggleMiniCalendar(!showMiniCalendar)}
                  >
                    {showMiniCalendar ? t('common.on') : t('common.off')}
                  </button>
                </div>
                <div className="flex items-center justify-between border-b border-hairline py-2">
                  <span className="text-sm">{t('settings.advancedAppearance')}</span>
                  <button
                    type="button"
                    className="gc-btn"
                    onClick={() => {
                      setIsSettingsOpen(false)
                      setIsThemeModalOpen(true)
                    }}
                  >
                    {t('actions.appearance')}
                  </button>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm">{t('settings.version')}</span>
                  <span className="font-mono text-xs text-muted">
                    v{appVersion} ({platform})
                  </span>
                </div>
              </div>
            )}

            {settingsTab === 'calendars' && (
              <div className="space-y-3">
                <div className="space-y-0.5">
                  <div className="text-[11px] font-medium text-muted">{t('settings.myCalendars')}</div>
                  {calendars.length > 0 ? (
                    calendars.map((cal) => (
                      <div
                        key={cal.id}
                        className="relative flex items-center gap-2 rounded-[3px] px-1 py-1.5 text-xs text-primary hover:bg-hover transition-colors"
                      >
                        <label className="flex flex-1 min-w-0 cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            checked={cal.isVisible}
                            onChange={() => toggleCalendarVisibility(cal)}
                            className="h-3.5 w-3.5 rounded-[3px] accent-accent cursor-pointer"
                          />
                          <button
                            type="button"
                            title={t('settings.changeColor')}
                            onClick={(e) => {
                              e.preventDefault()
                              setColorPickerCalId(colorPickerCalId === cal.id ? null : cal.id)
                            }}
                            className="h-2.5 w-2.5 shrink-0 rounded-full cursor-pointer ring-offset-1 hover:ring-2 hover:ring-hairline transition-all"
                            style={{ backgroundColor: cal.color }}
                          />
                          <span className="flex-1 truncate font-medium">{cal.name}</span>
                        </label>
                        {cal.isReadOnly && (
                          <span className="text-[9px] font-medium text-muted bg-hover px-1.5 py-0.5 rounded-[3px]">
                            {t('common.readOnlyShort')}
                          </span>
                        )}

                        {colorPickerCalId === cal.id && (
                          <div
                            className="absolute top-full left-0 z-20 mt-1 grid grid-cols-8 gap-1.5 border border-hairline bg-surface p-2 shadow-lg"
                            style={{ borderRadius: 'var(--radius-control)' }}
                          >
                            {CALENDAR_COLOR_PALETTE.map((hex) => {
                              const usedByOther = calendars.some(
                                (other) => other.id !== cal.id && other.color?.toLowerCase() === hex.toLowerCase()
                              )
                              return (
                                <button
                                  key={hex}
                                  type="button"
                                  onClick={() => changeCalendarColor(cal, hex)}
                                  className="relative h-5 w-5 shrink-0 rounded-full cursor-pointer transition-transform hover:scale-110"
                                  style={{
                                    backgroundColor: hex,
                                    outline: cal.color === hex ? '2px solid var(--color-border)' : 'none',
                                    outlineOffset: '1px'
                                  }}
                                  title={usedByOther ? `${hex} (${t('settings.colorInUse')})` : hex}
                                >
                                  {usedByOther && (
                                    <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-surface border border-hairline" />
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="px-1 py-1.5 text-xs text-muted">{t('settings.noCalendars')}</div>
                  )}
                </div>

                <HolidayCalendarToggle
                  calendars={calendars}
                  onCalendarsChanged={loadCalendarsAndEvents}
                />

                <button
                  type="button"
                  className="gc-btn w-full justify-center"
                  onClick={() => {
                    setIsSettingsOpen(false)
                    setIsAccountModalOpen(true)
                  }}
                >
                  <Users className="h-4 w-4" />
                  <span>{t('settings.manageAccounts')}</span>
                </button>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                className="gc-btn-primary"
                onClick={() => setIsSettingsOpen(false)}
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      <NotionToaster />
    </div>
    </DisplayPreferencesProvider>
  )
}

export default App
