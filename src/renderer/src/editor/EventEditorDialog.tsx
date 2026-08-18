import React, { useState, useEffect, useMemo } from 'react'
import { DateTime } from 'luxon'
import {
  MapPin,
  Video,
  FileText,
  Repeat,
  Trash2,
  X,
  AlertTriangle,
  Share2,
  Users,
  Calendar as CalendarIcon
} from 'lucide-react'
import type {
  Calendar,
  CalendarEvent,
  ExpandedOccurrence,
  Attendee,
  CreateEventInput,
  UpdateEventInput
} from '@shared/event-model'
import AttendeeInput from '../components/AttendeeInput'
import {
  DatePicker,
  TimePicker,
  CustomSelect,
  TextInput,
  TextArea,
  ToggleSwitch
} from '../components/ui'

export interface EventEditorInitialData {
  occurrence?: ExpandedOccurrence
  event?: CalendarEvent
  initialStart?: DateTime
  initialEnd?: DateTime
  initialCalendarId?: string
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
  onClose: () => void
}

const COLOR_PALETTE = [
  '#34C77B',
  '#4A90E2',
  '#F3722C',
  '#1A73E8',
  '#E63946',
  '#10b981',
  '#64748b'
]

const TIMEZONE_OPTIONS = [
  'Asia/Ho_Chi_Minh',
  'UTC',
  'Asia/Bangkok',
  'Asia/Tokyo',
  'Asia/Singapore',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Australia/Sydney'
]

export const EventEditorDialog: React.FC<EventEditorDialogProps> = ({
  isOpen,
  calendars,
  data,
  onSave,
  onDelete,
  onClose
}) => {
  const isEditing = Boolean(data?.occurrence || data?.event)
  const isRecurringOccurrence = Boolean(data?.occurrence?.isRecurring)

  // Form states
  const [calendarId, setCalendarId] = useState<string>('')
  const [title, setTitle] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [location, setLocation] = useState<string>('')
  const [meetingUrl, setMeetingUrl] = useState<string>('')
  const [color, setColor] = useState<string>('')
  const [allDay, setAllDay] = useState<boolean>(false)
  const [tzid, setTzid] = useState<string>('Asia/Ho_Chi_Minh')

  // Date & Time states (Local values for inputs)
  const [startDateStr, setStartDateStr] = useState<string>('')
  const [startTimeStr, setStartTimeStr] = useState<string>('09:00')
  const [endDateStr, setEndDateStr] = useState<string>('')
  const [endTimeStr, setEndTimeStr] = useState<string>('10:00')

  // Recurrence states
  const [recurrencePreset, setRecurrencePreset] = useState<string>('none')
  const [customRrule, setCustomRrule] = useState<string>('')

  // Attendees state
  const [attendees, setAttendees] = useState<Attendee[]>([])

  // Dirty state tracking
  const [isDirty, setIsDirty] = useState<boolean>(false)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState<boolean>(false)
  const [shareSuccess, setShareSuccess] = useState<boolean>(false)

  // Populate form when data changes
  useEffect(() => {
    if (!isOpen) return

    setIsDirty(false)
    setShowDiscardConfirm(false)
    setShareSuccess(false)

    const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Ho_Chi_Minh'
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

      setRecurrencePreset(occ.isRecurring ? 'custom' : 'none')
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

      if (evt.rrule) {
        setCustomRrule(evt.rrule)
        if (evt.rrule.includes('FREQ=DAILY')) setRecurrencePreset('daily')
        else if (evt.rrule.includes('FREQ=WEEKLY')) setRecurrencePreset('weekly')
        else if (evt.rrule.includes('FREQ=MONTHLY')) setRecurrencePreset('monthly')
        else if (evt.rrule.includes('FREQ=YEARLY')) setRecurrencePreset('yearly')
        else setRecurrencePreset('custom')
      } else {
        setRecurrencePreset('none')
        setCustomRrule('')
      }
    } else {
      // New event
      const defaultCal = calendars.find((c) => !c.isReadOnly) || calendars[0]
      setCalendarId(data?.initialCalendarId || defaultCal?.id || '')
      setTitle('')
      setNotes('')
      setLocation('')
      setMeetingUrl('')
      setColor('')
      setAllDay(false)
      setRecurrencePreset('none')
      setCustomRrule('')
      setAttendees([])

      const start = data?.initialStart || DateTime.local().set({ hour: 9, minute: 0, second: 0 })
      const end = data?.initialEnd || start.plus({ hours: 1 })

      setStartDateStr(start.toFormat('yyyy-MM-dd'))
      setStartTimeStr(start.toFormat('HH:mm'))
      setEndDateStr(end.toFormat('yyyy-MM-dd'))
      setEndTimeStr(end.toFormat('HH:mm'))
    }
  }, [isOpen, data, calendars])

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (isDirty) {
          setShowDiscardConfirm(true)
        } else {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isDirty, onClose])

  // Options for custom selects
  const calendarOptions = useMemo(
    () =>
      (calendars || []).map((cal) => ({
        value: cal.id,
        label: cal.name,
        color: cal.color,
        badge: cal.isReadOnly ? 'Chỉ đọc' : undefined,
        disabled: cal.isReadOnly
      })),
    [calendars]
  )

  const timezoneOptions = useMemo(
    () =>
      TIMEZONE_OPTIONS.map((tz) => ({
        value: tz,
        label: tz
      })),
    []
  )

  if (!isOpen) return null

  const handleFieldChange = (setter: React.Dispatch<React.SetStateAction<any>>, val: any) => {
    setter(val)
    setIsDirty(true)
  }

  const handleStartDateChange = (newStart: string) => {
    setStartDateStr(newStart)
    setIsDirty(true)
    // If end date is missing or before start date, auto-sync end date
    if (!endDateStr || endDateStr < newStart) {
      setEndDateStr(newStart)
    }
  }

  const handleStartTimeChange = (newStart: string) => {
    setStartTimeStr(newStart)
    setIsDirty(true)
    // If start date equals end date, make sure end time is after start time
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
    if (isDirty) {
      setShowDiscardConfirm(true)
    } else {
      onClose()
    }
  }

  const buildRrule = (): string | undefined => {
    if (recurrencePreset === 'none') return undefined
    if (recurrencePreset === 'daily') return 'FREQ=DAILY'
    if (recurrencePreset === 'weekly') return 'FREQ=WEEKLY'
    if (recurrencePreset === 'monthly') return 'FREQ=MONTHLY'
    if (recurrencePreset === 'yearly') return 'FREQ=YEARLY'
    if (recurrencePreset === 'custom') return customRrule.trim() || undefined
    return undefined
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      alert('Vui lòng nhập tiêu đề sự kiện')
      return
    }

    if (!calendarId) {
      alert('Vui lòng chọn lịch')
      return
    }

    // Build ISO UTC strings
    let startIso: string
    let endIso: string

    if (allDay) {
      startIso = `${startDateStr}T00:00:00.000Z`
      endIso = `${endDateStr || startDateStr}T23:59:59.999Z`
    } else {
      const startLocal = DateTime.fromISO(`${startDateStr}T${startTimeStr}:00`, { zone: 'local' })
      const endLocal = DateTime.fromISO(`${endDateStr}T${endTimeStr}:00`, { zone: 'local' })

      if (endLocal <= startLocal) {
        alert('Thời gian kết thúc phải sau thời gian bắt đầu')
        return
      }

      startIso = startLocal.toUTC().toISO()!
      endIso = endLocal.toUTC().toISO()!
    }

    const rruleString = buildRrule()

    const payloadInput: CreateEventInput = {
      calendarId,
      title: title.trim(),
      notes: notes.trim() || undefined,
      location: location.trim() || undefined,
      meetingUrl: meetingUrl.trim() || undefined,
      color: color || undefined,
      allDay,
      tzid,
      dtStartUtc: startIso,
      dtEndUtc: endIso,
      rrule: rruleString,
      attendees
    }

    const eventId = data?.occurrence?.eventId || data?.event?.id
    const occurrenceStartUtc = data?.occurrence?.originalStartUtc

    onSave({
      isNew: !isEditing,
      eventId,
      occurrenceStartUtc,
      isRecurringOccurrence,
      input: payloadInput
    })
  }

  const handleShare = async () => {
    const eventId = data?.occurrence?.eventId || data?.event?.id
    if (!eventId || !window.gone?.events?.shareIcs) return

    try {
      const res = await window.gone.events.shareIcs(eventId)
      if (res.success) {
        setShareSuccess(true)
        setTimeout(() => setShareSuccess(false), 4000)
      } else {
        alert(`Chia sẻ thất bại: ${res.message}`)
      }
    } catch (err: any) {
      alert(`Lỗi chia sẻ: ${err.message}`)
    }
  }

  const selectedCalendar = (calendars || []).find((c) => c.id === calendarId)

  return (
    <div className="gc-overlay select-none">
      <div className="gc-dialog w-full max-w-2xl">
        {/* Modal Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-hairline bg-app px-6 py-4">
          <div className="flex items-center gap-3">
            <div
              className="h-4 w-4 rounded-full shadow-md transition-colors"
              style={{ backgroundColor: color || selectedCalendar?.color || '#4A90E2' }}
            />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {isEditing ? 'Chỉnh sửa sự kiện' : 'Tạo sự kiện mới'}
            </h3>
          </div>

          <button
            onClick={handleCloseAttempt}
            className="gc-icon-btn"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* Title & Color Picker */}
          <div>
            <label className="block text-slate-500 dark:text-slate-400 font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
              Tiêu đề sự kiện (Title) *
            </label>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <TextInput
                  value={title}
                  onChange={(val) => handleFieldChange(setTitle, val)}
                  placeholder="VD: Họp định kỳ tuần, Thiết kế UI..."
                  autoFocus
                  inputClassName="text-sm font-medium"
                />
              </div>

              {/* Color Circles */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 shrink-0">
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleFieldChange(setColor, color === c ? '' : c)}
                    className={`h-5 w-5 rounded-full transition-transform cursor-pointer ${
                      color === c ? 'scale-125 ring-2 ring-indigo-500 shadow-md' : 'hover:scale-110 opacity-70'
                    }`}
                    style={{ backgroundColor: c }}
                    title={`Color ${c}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Calendar & Timezone Selectors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <CustomSelect
                label="Lịch (Calendar) *"
                value={calendarId}
                onChange={(val) => handleFieldChange(setCalendarId, val)}
                options={calendarOptions}
                placeholder="Chọn lịch..."
              />
            </div>

            <div>
              <CustomSelect
                label="Múi giờ (Timezone)"
                value={tzid}
                onChange={(val) => handleFieldChange(setTzid, val)}
                options={timezoneOptions}
                searchable
                searchPlaceholder="Tìm múi giờ..."
              />
            </div>
          </div>

          {/* All Day Toggle */}
          <div className="py-1">
            <ToggleSwitch
              checked={allDay}
              onChange={(checked) => handleFieldChange(setAllDay, checked)}
              label="Sự kiện cả ngày (All-day)"
              description="Không cố định khung giờ bắt đầu và kết thúc"
            />
          </div>

          {/* Date & Time Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/90 dark:border-slate-800/80">
            {/* Start Date & Time */}
            <div className="min-w-0 space-y-1.5">
              <label className="text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1.5 text-[10px] uppercase tracking-wider">
                <CalendarIcon className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
                Bắt đầu (Start)
              </label>
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex-1 min-w-0">
                  <DatePicker
                    value={startDateStr}
                    onChange={handleStartDateChange}
                    placeholder="Chọn ngày bắt đầu"
                  />
                </div>
                {!allDay && (
                  <div className="w-24 shrink-0">
                    <TimePicker
                      value={startTimeStr}
                      onChange={handleStartTimeChange}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* End Date & Time */}
            <div className="min-w-0 space-y-1.5">
              <label className="text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1.5 text-[10px] uppercase tracking-wider">
                <CalendarIcon className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
                Kết thúc (End)
              </label>
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex-1 min-w-0">
                  <DatePicker
                    value={endDateStr}
                    onChange={(val) => handleFieldChange(setEndDateStr, val)}
                    minDate={startDateStr}
                    placeholder="Chọn ngày kết thúc"
                  />
                </div>
                {!allDay && (
                  <div className="w-24 shrink-0">
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
            </div>
          </div>

          {/* Recurrence Selector */}
          <div>
            <label className="block text-slate-500 dark:text-slate-400 font-semibold mb-1.5 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
              <Repeat className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
              Lặp lại (Recurrence)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 mb-2">
              {[
                { id: 'none', label: 'Không lặp' },
                { id: 'daily', label: 'Hàng ngày' },
                { id: 'weekly', label: 'Hàng tuần' },
                { id: 'monthly', label: 'Hàng tháng' },
                { id: 'yearly', label: 'Hàng năm' },
                { id: 'custom', label: 'Tùy chỉnh' }
              ].map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleFieldChange(setRecurrencePreset, preset.id)}
                  className={`px-3 py-2 rounded-xl border text-center transition-all cursor-pointer text-xs ${
                    recurrencePreset === preset.id
                      ? 'bg-indigo-600 border-indigo-500 text-white font-semibold shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200/70 border-slate-200 text-slate-700 dark:bg-slate-950/80 dark:border-slate-800 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {recurrencePreset === 'custom' && (
              <TextInput
                value={customRrule}
                onChange={(val) => handleFieldChange(setCustomRrule, val)}
                placeholder="RFC 5545 RRULE (VD: FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=10)"
                inputClassName="font-mono text-xs"
              />
            )}
          </div>

          {/* Location & Meeting URL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <TextInput
                label="Địa điểm (Location)"
                value={location}
                onChange={(val) => handleFieldChange(setLocation, val)}
                placeholder="VD: Phòng họp A, Tầng 3"
                prefixIcon={<MapPin className="h-3.5 w-3.5" />}
              />
            </div>

            <div>
              <TextInput
                label="Link họp trực tuyến (Meeting URL)"
                type="url"
                value={meetingUrl}
                onChange={(val) => handleFieldChange(setMeetingUrl, val)}
                placeholder="https://meet.google.com/..."
                prefixIcon={<Video className="h-3.5 w-3.5" />}
                inputClassName="font-mono text-xs"
              />
            </div>
          </div>

          {/* Attendees */}
          <div>
            <label className="block text-slate-500 dark:text-slate-400 font-semibold mb-1.5 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
              Người tham gia (Attendees)
            </label>
            <AttendeeInput
              attendees={attendees}
              onChange={(newAtts) => handleFieldChange(setAttendees, newAtts)}
            />
          </div>

          {/* Notes / Description */}
          <div>
            <TextArea
              label="Ghi chú (Notes & Description)"
              value={notes}
              onChange={(val) => handleFieldChange(setNotes, val)}
              placeholder="Thêm mô tả chi tiết, nội dung cuộc họp..."
              rows={3}
              icon={<FileText className="h-3.5 w-3.5 text-slate-400" />}
            />
          </div>
        </form>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {isEditing && (
              <>
                <button
                  type="button"
                  onClick={handleShare}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors font-medium text-xs border border-slate-200 dark:border-slate-700 cursor-pointer"
                  title="Xuất file .ics và mở trong thư mục"
                >
                  <Share2 className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
                  <span>{shareSuccess ? '✓ Đã tạo file' : 'Chia sẻ (.ics)'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const eventId = data?.occurrence?.eventId || data?.event?.id
                    if (eventId) {
                      onDelete(eventId, data?.occurrence?.originalStartUtc, isRecurringOccurrence)
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 hover:text-rose-700 dark:hover:text-rose-300 transition-colors font-medium text-xs cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Xóa sự kiện</span>
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCloseAttempt}
              className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Hủy bỏ (Cancel)
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
            >
              {isEditing ? 'Lưu thay đổi' : 'Tạo sự kiện'}
            </button>
          </div>
        </div>

        {/* Unsaved Changes Confirmation */}
        {showDiscardConfirm && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-6 z-60 animate-in fade-in duration-100">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/20 text-amber-500 dark:text-amber-400 flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">Hủy bỏ các thay đổi?</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
                Các nội dung vừa nhập chưa được lưu sẽ bị mất. Bạn có chắc muốn đóng?
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setShowDiscardConfirm(false)}
                  className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Tiếp tục sửa
                </button>
                <button
                  onClick={() => {
                    setShowDiscardConfirm(false)
                    onClose()
                  }}
                  className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-xl transition-colors cursor-pointer"
                >
                  Hủy thay đổi
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
