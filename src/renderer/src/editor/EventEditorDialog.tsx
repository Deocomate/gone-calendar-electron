import React, { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { DateTime } from 'luxon'
import { Trash2, X, Share2, MapPin, Link as LinkIcon, Users } from 'lucide-react'
import type {
  Calendar,
  CalendarEvent,
  ExpandedOccurrence,
  Attendee,
  CreateEventInput,
  UpdateEventInput,
  LunarRecurrenceSpec
} from '@shared/event-model'
import { convertSolarToLunar, resolveLunarOccurrence } from '@shared/lunar-vietnam'
import {
  DatePicker,
  TimePicker,
  CustomSelect,
  TextInput,
  NumberInput,
  ToggleSwitch,
  FormRow,
  TextArea,
  toast,
  showFriendlyError
} from '../components/ui'

export interface EventEditorInitialData {
  occurrence?: ExpandedOccurrence
  event?: CalendarEvent
  initialStart?: DateTime
  initialEnd?: DateTime
  initialCalendarId?: string
  /** Slot was picked from the all-day row — default the new event to all-day. */
  initialAllDay?: boolean
  /** Viewport X of the click that started creation — used to dock the dialog on the opposite side. */
  initialClientX?: number
}

interface EventEditorDialogProps {
  isOpen: boolean
  calendars: Calendar[]
  data: EventEditorInitialData | null
  onSave: (payload: {
    isNew: boolean
    eventId?: string
    occurrenceStartUtc?: string
    isRecurringOccurrence?: boolean
    input: CreateEventInput | UpdateEventInput
  }) => void
  onDelete: (eventId: string, occurrenceStartUtc?: string, isRecurring?: boolean) => void
  onDataChanged?: () => void
  onClose: () => void
}

const LUNAR_MONTHS = [
  '', 'Giêng', 'Hai', 'Ba', 'Tư', 'Năm', 'Sáu',
  'Bảy', 'Tám', 'Chín', 'Mười', 'Mười một', 'Chạp'
]

const WEEKDAY_CODES = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as const
const RRULE_KNOWN_KEYS = new Set(['FREQ', 'INTERVAL', 'BYDAY', 'COUNT', 'UNTIL'])

function parseRruleParts(rrule: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const part of rrule.split(';')) {
    const [key, val] = part.split('=')
    if (key && val !== undefined) out[key] = val
  }
  return out
}

/** True when the rrule only uses controls the friendly editor understands (no BYMONTHDAY etc.). */
function isSimpleRrule(rrule: string): boolean {
  return rrule.split(';').every((part) => RRULE_KNOWN_KEYS.has(part.split('=')[0]))
}

function toggleWeekday(days: string[], code: string): string[] {
  return days.includes(code) ? days.filter((d) => d !== code) : [...days, code]
}

export const EventEditorDialog: React.FC<EventEditorDialogProps> = ({
  isOpen,
  calendars,
  data,
  onSave,
  onDelete,
  onDataChanged,
  onClose
}) => {
  const { t } = useTranslation()
  const isEditing = Boolean(data?.occurrence || data?.event)
  // Lunar anniversaries have no per-instance RRULE semantics — edits always apply
  // to the whole series, so they skip the recurring-scope prompt.
  const isRecurringOccurrence = Boolean(
    data?.occurrence?.isRecurring && !data?.occurrence?.isLunar
  )

  // Form states (location / notes / meetingUrl / attendees / tzid / color are kept
  // so edits to synced events preserve those fields, but they are not shown in the UI)
  const [calendarId, setCalendarId] = useState<string>('')
  const [title, setTitle] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [location, setLocation] = useState<string>('')
  const [meetingUrl, setMeetingUrl] = useState<string>('')
  const [color, setColor] = useState<string>('')
  const [allDay, setAllDay] = useState<boolean>(false)
  const [tzid, setTzid] = useState<string>('UTC')

  const [startDateStr, setStartDateStr] = useState<string>('')
  const [startTimeStr, setStartTimeStr] = useState<string>('09:00')
  const [endDateStr, setEndDateStr] = useState<string>('')
  const [endTimeStr, setEndTimeStr] = useState<string>('10:00')

  const [recurrencePreset, setRecurrencePreset] = useState<string>('none')
  const [customRrule, setCustomRrule] = useState<string>('')
  const [recurrenceInterval, setRecurrenceInterval] = useState<number>(1)
  const [recurrenceByDay, setRecurrenceByDay] = useState<string[]>([])
  const [recurrenceEnd, setRecurrenceEnd] = useState<'never' | 'onDate' | 'afterCount'>('never')
  const [recurrenceUntil, setRecurrenceUntil] = useState<string>('')
  const [recurrenceCount, setRecurrenceCount] = useState<number>(10)
  const [lunarLeap, setLunarLeap] = useState<boolean>(false)
  const [lunarBusy, setLunarBusy] = useState<boolean>(false)
  const [materializeTargetId, setMaterializeTargetId] = useState<string>('')

  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [attendeeInput, setAttendeeInput] = useState<string>('')

  const [isDirty, setIsDirty] = useState<boolean>(false)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState<boolean>(false)
  const [shareSuccess, setShareSuccess] = useState<boolean>(false)

  useEffect(() => {
    if (!isOpen) return

    setIsDirty(false)
    setShowDiscardConfirm(false)
    setShareSuccess(false)

    const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    setTzid(userTz)

    if (data?.occurrence) {
      const occ = data.occurrence
      setTitle(occ.title)
      setNotes(occ.notes || '')
      setLocation(occ.location || '')
      setMeetingUrl(occ.meetingUrl || '')
      setColor(occ.color || '')
      setCalendarId(occ.calendarId)
      setAllDay(occ.allDay)
      setTzid(occ.tzid || userTz)
      setAttendees([])

      const startLocal = DateTime.fromISO(occ.startUtc, { zone: 'utc' }).setZone('local')
      const endLocal = DateTime.fromISO(occ.endUtc, { zone: 'utc' }).setZone('local')

      setStartDateStr(startLocal.toFormat('yyyy-MM-dd'))
      setStartTimeStr(startLocal.toFormat('HH:mm'))
      setEndDateStr(endLocal.toFormat('yyyy-MM-dd'))
      setEndTimeStr(endLocal.toFormat('HH:mm'))

      if (occ.isLunar) {
        setRecurrencePreset('lunar-yearly')
        setAllDay(true)
        const l = convertSolarToLunar(startLocal.day, startLocal.month, startLocal.year)
        setLunarLeap(l.leap)
      } else {
        setRecurrencePreset(occ.isRecurring ? 'custom' : 'none')
      }
    } else if (data?.event) {
      const evt = data.event
      setTitle(evt.title)
      setNotes(evt.notes || '')
      setLocation(evt.location || '')
      setMeetingUrl(evt.meetingUrl || '')
      setColor(evt.color || '')
      setCalendarId(evt.calendarId)
      setAllDay(evt.allDay)
      setTzid(evt.tzid || userTz)
      setAttendees(evt.attendees || [])

      const startLocal = DateTime.fromISO(evt.dtStartUtc, { zone: 'utc' }).setZone('local')
      const endLocal = DateTime.fromISO(evt.dtEndUtc, { zone: 'utc' }).setZone('local')

      setStartDateStr(startLocal.toFormat('yyyy-MM-dd'))
      setStartTimeStr(startLocal.toFormat('HH:mm'))
      setEndDateStr(endLocal.toFormat('yyyy-MM-dd'))
      setEndTimeStr(endLocal.toFormat('HH:mm'))

      if (evt.lunarRule) {
        setRecurrencePreset('lunar-yearly')
        setLunarLeap(evt.lunarRule.leap)
        setAllDay(true)
        setCustomRrule('')
      } else if (evt.rrule) {
        setCustomRrule(evt.rrule)
        const parts = parseRruleParts(evt.rrule)
        const simple = isSimpleRrule(evt.rrule)
        if (simple && parts.FREQ === 'DAILY') setRecurrencePreset('daily')
        else if (simple && parts.FREQ === 'WEEKLY') setRecurrencePreset('weekly')
        else if (simple && parts.FREQ === 'MONTHLY') setRecurrencePreset('monthly')
        else if (simple && parts.FREQ === 'YEARLY') setRecurrencePreset('yearly')
        else setRecurrencePreset('custom')

        setRecurrenceInterval(parts.INTERVAL ? Math.max(1, parseInt(parts.INTERVAL, 10) || 1) : 1)
        setRecurrenceByDay(parts.BYDAY ? parts.BYDAY.split(',') : [])
        if (parts.UNTIL) {
          const untilLocal = DateTime.fromFormat(parts.UNTIL, "yyyyMMdd'T'HHmmss'Z'", {
            zone: 'utc'
          }).setZone('local')
          setRecurrenceEnd('onDate')
          setRecurrenceUntil(untilLocal.isValid ? untilLocal.toFormat('yyyy-MM-dd') : '')
          setRecurrenceCount(10)
        } else if (parts.COUNT) {
          setRecurrenceEnd('afterCount')
          setRecurrenceCount(Math.max(1, parseInt(parts.COUNT, 10) || 10))
          setRecurrenceUntil('')
        } else {
          setRecurrenceEnd('never')
          setRecurrenceUntil('')
          setRecurrenceCount(10)
        }
      } else {
        setRecurrencePreset('none')
        setCustomRrule('')
        setRecurrenceInterval(1)
        setRecurrenceByDay([])
        setRecurrenceEnd('never')
        setRecurrenceUntil('')
        setRecurrenceCount(10)
      }
    } else {
      const defaultCal = calendars.find((c) => !c.isReadOnly) || calendars[0]
      setCalendarId(data?.initialCalendarId || defaultCal?.id || '')
      setTitle('')
      setNotes('')
      setLocation('')
      setMeetingUrl('')
      setColor('')
      setAllDay(Boolean(data?.initialAllDay))
      setRecurrencePreset('none')
      setCustomRrule('')
      setRecurrenceInterval(1)
      setRecurrenceByDay([])
      setRecurrenceEnd('never')
      setRecurrenceUntil('')
      setRecurrenceCount(10)
      setAttendees([])

      const start = data?.initialStart || DateTime.local().set({ hour: 9, minute: 0, second: 0 })
      const end = data?.initialEnd || start.plus({ hours: 1 })

      setStartDateStr(start.toFormat('yyyy-MM-dd'))
      setStartTimeStr(start.toFormat('HH:mm'))
      setEndDateStr(end.toFormat('yyyy-MM-dd'))
      setEndTimeStr(end.toFormat('HH:mm'))
    }
  }, [isOpen, data, calendars])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (isDirty) setShowDiscardConfirm(true)
        else onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isDirty, onClose])

  const calendarOptions = useMemo(
    () =>
      (calendars || []).map((cal) => ({
        value: cal.id,
        label: cal.name,
        color: cal.color,
        badge: cal.isReadOnly ? t('editor.readOnlyBadge') : undefined,
        disabled: cal.isReadOnly
      })),
    [calendars, t]
  )

  const recurrenceOptions = useMemo(
    () => [
      { value: 'none', label: t('editor.repeatNone') },
      { value: 'daily', label: t('editor.repeatDaily') },
      { value: 'weekly', label: t('editor.repeatWeekly') },
      { value: 'monthly', label: t('editor.repeatMonthly') },
      { value: 'yearly', label: t('editor.repeatYearly') },
      { value: 'lunar-yearly', label: t('editor.repeatLunar') },
      { value: 'custom', label: t('editor.repeatCustom') }
    ],
    [t]
  )

  if (!isOpen) return null

  const handleFieldChange = (setter: React.Dispatch<React.SetStateAction<any>>, val: any) => {
    setter(val)
    setIsDirty(true)
  }

  const handleStartDateChange = (newStart: string) => {
    setStartDateStr(newStart)
    setIsDirty(true)
    if (!endDateStr || endDateStr < newStart) setEndDateStr(newStart)
  }

  const handleStartTimeChange = (newStart: string) => {
    setStartTimeStr(newStart)
    setIsDirty(true)
    if (startDateStr === endDateStr || !endDateStr) {
      const [sh, sm] = newStart.split(':').map(Number)
      const [eh, em] = endTimeStr.split(':').map(Number)
      if (!isNaN(sh) && !isNaN(sm) && !isNaN(eh) && !isNaN(em)) {
        if (eh * 60 + em <= sh * 60 + sm) {
          const nextHour = (sh + 1) % 24
          setEndTimeStr(`${nextHour.toString().padStart(2, '0')}:${sm.toString().padStart(2, '0')}`)
        }
      }
    }
  }

  const handleCloseAttempt = () => {
    if (isDirty) setShowDiscardConfirm(true)
    else onClose()
  }

  const handleAddAttendee = () => {
    const email = attendeeInput.trim()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return
    if (attendees.some((a) => a.email.toLowerCase() === email.toLowerCase())) {
      setAttendeeInput('')
      return
    }
    handleFieldChange(setAttendees, [...attendees, { email, responseStatus: 'needsAction' as const }])
    setAttendeeInput('')
  }

  const handleRemoveAttendee = (email: string) => {
    handleFieldChange(
      setAttendees,
      attendees.filter((a) => a.email !== email)
    )
  }

  const ATTENDEE_STATUS_DOT: Record<string, string> = {
    accepted: 'bg-emerald-500',
    declined: 'bg-today',
    tentative: 'bg-amber-500',
    needsAction: 'bg-muted'
  }

  const isLunarYearly = recurrencePreset === 'lunar-yearly'

  const RECURRENCE_FREQ: Record<string, string> = {
    daily: 'DAILY',
    weekly: 'WEEKLY',
    monthly: 'MONTHLY',
    yearly: 'YEARLY'
  }

  const buildRrule = (): string | undefined => {
    if (recurrencePreset === 'custom') return customRrule.trim() || undefined
    const freq = RECURRENCE_FREQ[recurrencePreset]
    if (!freq) return undefined

    const parts = [`FREQ=${freq}`]
    if (recurrenceInterval > 1) parts.push(`INTERVAL=${recurrenceInterval}`)
    if (recurrencePreset === 'weekly' && recurrenceByDay.length > 0) {
      parts.push(`BYDAY=${recurrenceByDay.join(',')}`)
    }
    if (recurrenceEnd === 'onDate' && recurrenceUntil) {
      const untilUtc = DateTime.fromISO(recurrenceUntil, { zone: 'local' }).endOf('day').toUTC()
      if (untilUtc.isValid) parts.push(`UNTIL=${untilUtc.toFormat("yyyyMMdd'T'HHmmss'Z'")}`)
    } else if (recurrenceEnd === 'afterCount' && recurrenceCount > 0) {
      parts.push(`COUNT=${recurrenceCount}`)
    }
    return parts.join(';')
  }

  const lunarSpec: LunarRecurrenceSpec | null = (() => {
    if (!isLunarYearly || !startDateStr) return null
    const d = DateTime.fromISO(startDateStr)
    if (!d.isValid) return null
    const l = convertSolarToLunar(d.day, d.month, d.year)
    return { day: l.day, month: l.month, leap: lunarLeap }
  })()

  const describeLunarSpec = (spec: LunarRecurrenceSpec): string =>
    t('editor.lunarDescribe', {
      day: spec.day,
      month: spec.month,
      name: LUNAR_MONTHS[spec.month] || String(spec.month),
      leap: spec.leap ? t('editor.lunarLeapSuffix') : ''
    })

  const lunarPreview: string[] = (() => {
    if (!lunarSpec) return []
    const thisYear = DateTime.local().year
    const out: string[] = []
    for (let y = thisYear; y < thisYear + 4; y++) {
      const iso = resolveLunarOccurrence(lunarSpec, y)
      if (iso) out.push(DateTime.fromISO(iso).toFormat('EEE, dd LLL yyyy'))
    }
    return out
  })()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast.warning(t('editor.needTitle'))
      return
    }
    if (!calendarId) {
      toast.warning(t('editor.needCalendar'))
      return
    }

    let startIso: string
    let endIso: string

    if (allDay || isLunarYearly) {
      startIso = `${startDateStr}T00:00:00.000Z`
      endIso = `${(!isLunarYearly && endDateStr) || startDateStr}T23:59:59.999Z`
    } else {
      const startLocal = DateTime.fromISO(`${startDateStr}T${startTimeStr}:00`, { zone: 'local' })
      const endLocal = DateTime.fromISO(`${endDateStr}T${endTimeStr}:00`, { zone: 'local' })
      if (endLocal <= startLocal) {
        toast.warning(t('editor.endAfterStart'))
        return
      }
      startIso = startLocal.toUTC().toISO()!
      endIso = endLocal.toUTC().toISO()!
    }

    if (isLunarYearly && !lunarSpec) {
      toast.warning(t('editor.needLunarDate'))
      return
    }

    const payloadInput: CreateEventInput = {
      calendarId,
      title: title.trim(),
      notes: notes.trim() || undefined,
      location: location.trim() || undefined,
      meetingUrl: meetingUrl.trim() || undefined,
      color: color || undefined,
      allDay: isLunarYearly ? true : allDay,
      tzid,
      dtStartUtc: startIso,
      dtEndUtc: endIso,
      rrule: isLunarYearly ? '' : buildRrule(),
      lunarRule: isLunarYearly ? lunarSpec! : null,
      attendees
    }

    onSave({
      isNew: !isEditing,
      eventId: data?.occurrence?.eventId || data?.event?.id,
      occurrenceStartUtc: data?.occurrence?.originalStartUtc,
      isRecurringOccurrence,
      input: payloadInput
    })
  }

  const writableCalendars = (calendars || []).filter((c) => !c.isReadOnly)

  const handleMaterializeLunar = async () => {
    const eventId = data?.occurrence?.eventId || data?.event?.id
    const targetId = materializeTargetId || writableCalendars[0]?.id
    if (!eventId || !targetId || !window.gone?.events?.materializeLunar) return
    setLunarBusy(true)
    try {
      const throughYear = DateTime.local().year + 10
      const res = await window.gone.events.materializeLunar({
        masterEventId: eventId,
        targetCalendarId: targetId,
        throughYear
      })
      if (res.count > 0) {
        toast.success(t('toast.lunarAdded', { count: res.count }), {
          description: t('toast.lunarAddedDetail', { year: throughYear })
        })
        onDataChanged?.()
      } else {
        toast.info(t('toast.lunarUpToDate'))
      }
    } catch (err: any) {
      showFriendlyError(err, t('toast.lunarAddFailed'))
    } finally {
      setLunarBusy(false)
    }
  }

  const handleDetachLunar = async () => {
    const eventId = data?.occurrence?.eventId || data?.event?.id
    if (!eventId || !window.gone?.events?.detachLunar) return
    setLunarBusy(true)
    try {
      const res = await window.gone.events.detachLunar({ masterEventId: eventId })
      toast.success(res.count > 0 ? t('toast.lunarRemoved', { count: res.count }) : t('toast.lunarNoneToRemove'))
      if (res.count > 0) onDataChanged?.()
    } catch (err: any) {
      showFriendlyError(err, t('toast.lunarRemoveFailed'))
    } finally {
      setLunarBusy(false)
    }
  }

  const handleShare = async () => {
    const eventId = data?.occurrence?.eventId || data?.event?.id
    if (!eventId || !window.gone?.events?.shareIcs) return
    try {
      const res = await window.gone.events.shareIcs(eventId)
      if (res.success) {
        setShareSuccess(true)
        toast.success(t('toast.icsCreated'))
        setTimeout(() => setShareSuccess(false), 4000)
      } else {
        toast.error(t('toast.shareFailed'), { description: res.message })
      }
    } catch (err: any) {
      showFriendlyError(err, t('toast.shareError'))
    }
  }

  const selectedCalendar = (calendars || []).find((c) => c.id === calendarId)

  // New events created by clicking a slot dock as a side panel, on the side opposite
  // the click, so the panel never covers the spot the event was just created at.
  const isSidePanel = !isEditing && typeof data?.initialClientX === 'number'
  const panelSide: 'left' | 'right' =
    isSidePanel && data!.initialClientX! < window.innerWidth / 2 ? 'right' : 'left'

  return (
    <div
      className={isSidePanel ? 'fixed inset-0 z-50 select-none bg-black/10' : 'gc-overlay select-none'}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleCloseAttempt()
      }}
    >
      <div
        className={
          isSidePanel
            ? `absolute top-0 flex h-full w-full max-w-[420px] flex-col overflow-hidden bg-surface text-primary shadow-xl ${
                panelSide === 'right' ? 'right-0 border-l border-hairline gc-slide-right' : 'left-0 border-r border-hairline gc-slide-left'
              }`
            : 'gc-dialog w-full max-w-lg'
        }
      >
        <div className="flex shrink-0 items-center justify-between border-b border-hairline px-5 py-3">
          <div className="flex items-center gap-2.5">
            <div
              className="h-3 w-3 rounded-full shrink-0 transition-colors"
              style={{ backgroundColor: selectedCalendar?.color || '#4A90E2' }}
            />
            <h3 className="text-sm font-semibold text-primary">
              {isEditing ? t('editor.editEvent') : t('editor.newEvent')}
            </h3>
          </div>

          <button onClick={handleCloseAttempt} className="gc-icon-btn">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="px-6 py-3.5 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex-1 text-xs space-y-0"
        >
          <div className="pb-2 mb-1 border-b border-hairline/60">
            <input
              type="text"
              value={title}
              onChange={(e) => handleFieldChange(setTitle, e.target.value)}
              placeholder={t('editor.titlePlaceholder')}
              autoFocus
              className="w-full bg-transparent text-[20px] font-semibold text-primary placeholder:text-muted/60 border-none outline-none focus:outline-none focus:ring-0 focus-visible:outline-none tracking-tight"
            />
          </div>

          <div className="space-y-0">
            <FormRow label={t('editor.calendar')} divider>
              <CustomSelect
                value={calendarId}
                onChange={(val) => handleFieldChange(setCalendarId, val)}
                options={calendarOptions}
                placeholder={t('editor.chooseCalendar')}
              />
            </FormRow>

            <FormRow label={t('editor.allDay')} divider>
              <div className="px-2.5 py-1 flex items-center">
                <ToggleSwitch
                  checked={allDay || isLunarYearly}
                  onChange={(checked) => handleFieldChange(setAllDay, checked)}
                  size="sm"
                  disabled={isLunarYearly}
                />
              </div>
            </FormRow>

            <FormRow label={isLunarYearly ? t('editor.anniversaryDate') : t('editor.start')} divider>
              <div className="flex items-center gap-1.5 min-w-0 w-full">
                <div className="flex-1 min-w-0">
                  <DatePicker
                    value={startDateStr}
                    onChange={handleStartDateChange}
                    placeholder={t('editor.startDate')}
                  />
                </div>
                {!allDay && !isLunarYearly && (
                  <div className="w-[105px] shrink-0">
                    <TimePicker value={startTimeStr} onChange={handleStartTimeChange} />
                  </div>
                )}
              </div>
            </FormRow>

            {!isLunarYearly && (
              <FormRow label={t('editor.end')} divider>
                <div className="flex items-center gap-1.5 min-w-0 w-full">
                  <div className="flex-1 min-w-0">
                    <DatePicker
                      value={endDateStr}
                      onChange={(val) => handleFieldChange(setEndDateStr, val)}
                      minDate={startDateStr}
                      placeholder={t('editor.endDate')}
                    />
                  </div>
                  {!allDay && (
                    <div className="w-[105px] shrink-0">
                      <TimePicker
                        value={endTimeStr}
                        onChange={(val) => handleFieldChange(setEndTimeStr, val)}
                        startTime={startDateStr === endDateStr ? startTimeStr : undefined}
                        showQuickDurations={startDateStr === endDateStr}
                        align="right"
                      />
                    </div>
                  )}
                </div>
              </FormRow>
            )}

            <FormRow label={t('editor.location')} divider>
              <TextInput
                value={location}
                onChange={(val) => handleFieldChange(setLocation, val)}
                placeholder={t('editor.locationPlaceholder')}
                prefixIcon={<MapPin className="h-3.5 w-3.5" />}
              />
            </FormRow>

            <FormRow label={t('editor.meetingUrl')} divider>
              <TextInput
                value={meetingUrl}
                onChange={(val) => handleFieldChange(setMeetingUrl, val)}
                placeholder={t('editor.meetingUrlPlaceholder')}
                type="url"
                prefixIcon={<LinkIcon className="h-3.5 w-3.5" />}
              />
            </FormRow>

            <FormRow label={t('editor.attendees')} divider alignTop>
              <div className="w-full space-y-1.5 py-1">
                {attendees.length > 0 && (
                  <div className="space-y-1">
                    {attendees.map((a) => (
                      <div
                        key={a.email}
                        className="flex items-center gap-2 rounded-[3px] bg-hover/60 px-2 py-1 text-xs"
                      >
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                            ATTENDEE_STATUS_DOT[a.responseStatus || 'needsAction']
                          }`}
                          title={a.responseStatus || 'needsAction'}
                        />
                        <span className="flex-1 min-w-0 truncate text-primary">
                          {a.displayName || a.email}
                          {a.isOrganizer && (
                            <span className="ml-1.5 text-[10px] text-muted">{t('editor.organizer')}</span>
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttendee(a.email)}
                          className="shrink-0 cursor-pointer text-muted hover:text-today transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <TextInput
                    value={attendeeInput}
                    onChange={setAttendeeInput}
                    placeholder={t('editor.attendeesPlaceholder')}
                    type="email"
                    prefixIcon={<Users className="h-3.5 w-3.5" />}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddAttendee()
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddAttendee}
                    className="gc-btn shrink-0 text-xs"
                  >
                    {t('common.add')}
                  </button>
                </div>
              </div>
            </FormRow>

            <FormRow label={t('editor.notes')} divider alignTop>
              <TextArea
                value={notes}
                onChange={(val) => handleFieldChange(setNotes, val)}
                placeholder={t('editor.notesPlaceholder')}
                rows={3}
              />
            </FormRow>

            <FormRow label={t('editor.repeat')} divider={recurrencePreset === 'none' || recurrencePreset === 'custom'}>
              <CustomSelect
                value={recurrencePreset}
                onChange={(val) => {
                  handleFieldChange(setRecurrencePreset, val)
                  if (val === 'weekly' && recurrenceByDay.length === 0 && startDateStr) {
                    const d = DateTime.fromISO(startDateStr)
                    if (d.isValid) setRecurrenceByDay([WEEKDAY_CODES[d.weekday - 1]])
                  }
                }}
                options={recurrenceOptions}
              />
            </FormRow>

            {(['daily', 'weekly', 'monthly', 'yearly'] as string[]).includes(recurrencePreset) && (
              <FormRow label="" divider alignTop>
                <div className="w-full space-y-2.5 py-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted">{t('editor.repeatEvery')}</span>
                    <NumberInput
                      value={recurrenceInterval}
                      onChange={(v) => handleFieldChange(setRecurrenceInterval, Math.max(1, Math.round(v)))}
                      min={1}
                      max={999}
                    />
                    <span className="text-xs text-muted">
                      {t(
                        {
                          daily: 'editor.repeatUnitDaily',
                          weekly: 'editor.repeatUnitWeekly',
                          monthly: 'editor.repeatUnitMonthly',
                          yearly: 'editor.repeatUnitYearly'
                        }[recurrencePreset] as string
                      )}
                    </span>
                  </div>

                  {recurrencePreset === 'weekly' && (
                    <div className="flex items-center gap-1">
                      {WEEKDAY_CODES.map((code) => (
                        <button
                          key={code}
                          type="button"
                          onClick={() => handleFieldChange(setRecurrenceByDay, toggleWeekday(recurrenceByDay, code))}
                          className={`h-6 w-6 shrink-0 cursor-pointer rounded-full text-[10px] font-semibold transition-colors ${
                            recurrenceByDay.includes(code)
                              ? 'bg-accent text-white'
                              : 'bg-hover text-muted hover:text-primary'
                          }`}
                        >
                          {t(`editor.weekdayShort.${code.toLowerCase()}`)}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <span className="w-[72px] shrink-0 text-xs text-muted">{t('editor.repeatEnds')}</span>
                    <CustomSelect
                      value={recurrenceEnd}
                      onChange={(val) => handleFieldChange(setRecurrenceEnd, val as typeof recurrenceEnd)}
                      options={[
                        { value: 'never', label: t('editor.repeatEndsNever') },
                        { value: 'onDate', label: t('editor.repeatEndsOnDate') },
                        { value: 'afterCount', label: t('editor.repeatEndsAfter') }
                      ]}
                    />
                  </div>

                  {recurrenceEnd === 'onDate' && (
                    <DatePicker
                      value={recurrenceUntil}
                      onChange={(val) => handleFieldChange(setRecurrenceUntil, val)}
                      minDate={startDateStr}
                      placeholder={t('editor.endDate')}
                    />
                  )}

                  {recurrenceEnd === 'afterCount' && (
                    <div className="flex items-center gap-2">
                      <NumberInput
                        value={recurrenceCount}
                        onChange={(v) => handleFieldChange(setRecurrenceCount, Math.max(1, Math.round(v)))}
                        min={1}
                        max={999}
                      />
                      <span className="text-xs text-muted">{t('editor.repeatOccurrences')}</span>
                    </div>
                  )}
                </div>
              </FormRow>
            )}

            {recurrencePreset === 'custom' && (
              <FormRow label="" divider>
                <TextInput
                  value={customRrule}
                  onChange={(val) => handleFieldChange(setCustomRrule, val)}
                  placeholder={t('editor.customRrulePlaceholder')}
                  inputClassName="font-mono text-xs"
                  variant="boxed"
                />
              </FormRow>
            )}

            {isLunarYearly && (
              <FormRow label={t('editor.lunarDate')} divider alignTop>
                <div className="px-2.5 py-2 space-y-2 w-full">
                  <div className="text-xs text-primary">
                    {lunarSpec ? describeLunarSpec(lunarSpec) : t('editor.lunarPickDate')}
                  </div>
                  <label className="flex items-center gap-2 text-xs text-muted cursor-pointer">
                    <input
                      type="checkbox"
                      checked={lunarLeap}
                      onChange={(e) => handleFieldChange(setLunarLeap, e.target.checked)}
                    />
                    {t('editor.lunarLeapCheckbox')}
                  </label>
                  {lunarPreview.length > 0 && (
                    <div className="text-[11px] text-muted leading-relaxed">
                      {t('editor.lunarNext', { dates: lunarPreview.join(' · ') })}
                    </div>
                  )}
                  <p className="text-[11px] text-muted leading-relaxed">{t('editor.lunarHelp')}</p>
                </div>
              </FormRow>
            )}

            {isLunarYearly && isEditing && writableCalendars.length > 0 && (
              <FormRow label={t('editor.addToCalendar')} divider alignTop>
                <div className="px-2.5 py-2 space-y-2 w-full">
                  <CustomSelect
                    value={materializeTargetId || writableCalendars[0].id}
                    onChange={setMaterializeTargetId}
                    options={writableCalendars.map((c) => ({
                      value: c.id,
                      label: c.name,
                      color: c.color
                    }))}
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleMaterializeLunar}
                      disabled={lunarBusy}
                      className="gc-btn text-xs disabled:opacity-50"
                    >
                      {t('editor.generateThrough', { year: DateTime.local().year + 10 })}
                    </button>
                    <button
                      type="button"
                      onClick={handleDetachLunar}
                      disabled={lunarBusy}
                      className="px-2.5 py-1.5 text-xs text-today hover:opacity-80 transition-opacity cursor-pointer disabled:opacity-50"
                    >
                      {t('editor.removeSyncedCopies')}
                    </button>
                  </div>
                </div>
              </FormRow>
            )}
          </div>
        </form>

        <div className="px-5 py-3 border-t border-hairline flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1">
            {isEditing && (
              <>
                <button
                  type="button"
                  onClick={handleShare}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-muted hover:text-primary transition-colors text-xs cursor-pointer"
                  title={t('editor.shareTitle')}
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span>{shareSuccess ? t('editor.shareCreated') : t('editor.share')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const eventId = data?.occurrence?.eventId || data?.event?.id
                    if (eventId) {
                      onDelete(
                        eventId,
                        data?.occurrence?.originalStartUtc,
                        Boolean(data?.occurrence?.isRecurring)
                      )
                    }
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-today hover:opacity-80 transition-opacity text-xs cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>{t('common.delete')}</span>
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCloseAttempt}
              className="px-3 py-1.5 text-xs text-muted hover:text-primary transition-colors cursor-pointer"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="gc-btn-primary px-4 py-1.5 text-xs"
              style={{ borderRadius: 'var(--radius-control)' }}
            >
              {isEditing ? t('editor.saveChanges') : t('editor.create')}
            </button>
          </div>
        </div>

        {showDiscardConfirm && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center p-6 z-60">
            <div
              className="bg-surface border border-hairline p-5 max-w-xs w-full"
              style={{ borderRadius: 'var(--radius-dialog)' }}
            >
              <h4 className="text-sm font-semibold text-primary mb-1.5">{t('editor.discardTitle')}</h4>
              <p className="text-xs text-muted mb-4">{t('editor.discardBody')}</p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowDiscardConfirm(false)} className="gc-btn text-xs">
                  {t('editor.keepEditing')}
                </button>
                <button
                  onClick={() => {
                    setShowDiscardConfirm(false)
                    onClose()
                  }}
                  className="px-3 py-1.5 text-xs text-today hover:opacity-80 transition-opacity cursor-pointer font-medium"
                >
                  {t('editor.discard')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default EventEditorDialog
