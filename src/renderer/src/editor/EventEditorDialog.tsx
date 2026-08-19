import React, { useState, useEffect, useMemo } from 'react'
import { DateTime } from 'luxon'
import {
  MapPin,
  Video,
  FileText,
  Trash2,
  X,
  Share2,
  Check
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
  ToggleSwitch,
  FormRow,
  toast,
  showFriendlyError
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
  '#529cca',
  '#52b788',
  '#ea9a5f',
  '#9a6dd7',
  '#eb5757',
  '#4dab9a',
  '#e06f9f',
  '#868e96'
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

const RECURRENCE_OPTIONS = [
  { value: 'none', label: 'Không lặp' },
  { value: 'daily', label: 'Hàng ngày' },
  { value: 'weekly', label: 'Hàng tuần' },
  { value: 'monthly', label: 'Hàng tháng' },
  { value: 'yearly', label: 'Hàng năm' },
  { value: 'custom', label: 'Tùy chỉnh (RRULE)' }
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

  // Date & Time states
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
    if (!endDateStr || endDateStr < newStart) {
      setEndDateStr(newStart)
    }
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
      toast.warning('Vui lòng nhập tiêu đề sự kiện')
      return
    }

    if (!calendarId) {
      toast.warning('Vui lòng chọn lịch')
      return
    }

    let startIso: string
    let endIso: string

    if (allDay) {
      startIso = `${startDateStr}T00:00:00.000Z`
      endIso = `${endDateStr || startDateStr}T23:59:59.999Z`
    } else {
      const startLocal = DateTime.fromISO(`${startDateStr}T${startTimeStr}:00`, { zone: 'local' })
      const endLocal = DateTime.fromISO(`${endDateStr}T${endTimeStr}:00`, { zone: 'local' })

      if (endLocal <= startLocal) {
        toast.warning('Thời gian kết thúc phải sau thời gian bắt đầu')
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
        toast.success('Đã sao chép link / tạo file chia sẻ sự kiện!')
        setTimeout(() => setShareSuccess(false), 4000)
      } else {
        toast.error('Chia sẻ thất bại', { description: res.message })
      }
    } catch (err: any) {
      showFriendlyError(err, 'Lỗi chia sẻ sự kiện')
    }
  }

  const selectedCalendar = (calendars || []).find((c) => c.id === calendarId)

  return (
    <div className="gc-overlay select-none">
      <div className="gc-dialog w-full max-w-lg">
        {/* Modal Header — color dot + title + close */}
        <div className="flex shrink-0 items-center justify-between border-b border-hairline px-5 py-3">
          <div className="flex items-center gap-2.5">
            <div
              className="h-3 w-3 rounded-full shrink-0 transition-colors"
              style={{ backgroundColor: color || selectedCalendar?.color || '#4A90E2' }}
            />
            <h3 className="text-sm font-semibold text-primary">
              {isEditing ? 'Chỉnh sửa sự kiện' : 'Tạo sự kiện mới'}
            </h3>
          </div>

          <button onClick={handleCloseAttempt} className="gc-icon-btn">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body without vertical scrollbar */}
        <form
          onSubmit={handleSubmit}
          className="px-6 py-3.5 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex-1 text-xs space-y-0"
        >
          {/* Ghost title — large, borderless, clean Notion style with subtle bottom margin */}
          <div className="pb-2 mb-1 border-b border-hairline/60">
            <input
              type="text"
              value={title}
              onChange={(e) => handleFieldChange(setTitle, e.target.value)}
              placeholder="Tiêu đề sự kiện..."
              autoFocus
              className="w-full bg-transparent text-[20px] font-semibold text-primary placeholder:text-muted/60 border-none outline-none focus:outline-none focus:ring-0 focus-visible:outline-none tracking-tight"
            />
          </div>

          {/* Property rows */}
          <div className="space-y-0">
            <FormRow label="Lịch" divider>
              <CustomSelect
                value={calendarId}
                onChange={(val) => handleFieldChange(setCalendarId, val)}
                options={calendarOptions}
                placeholder="Chọn lịch..."
              />
            </FormRow>

            <FormRow label="Múi giờ" divider>
              <CustomSelect
                value={tzid}
                onChange={(val) => handleFieldChange(setTzid, val)}
                options={timezoneOptions}
                searchable
                searchPlaceholder="Tìm múi giờ..."
              />
            </FormRow>

            <FormRow label="Cả ngày" divider>
              <div className="px-2.5 py-1 flex items-center">
                <ToggleSwitch
                  checked={allDay}
                  onChange={(checked) => handleFieldChange(setAllDay, checked)}
                  size="sm"
                />
              </div>
            </FormRow>

            <FormRow label="Bắt đầu" divider>
              <div className="flex items-center gap-1.5 min-w-0 w-full">
                <div className="flex-1 min-w-0">
                  <DatePicker
                    value={startDateStr}
                    onChange={handleStartDateChange}
                    placeholder="Ngày bắt đầu"
                  />
                </div>
                {!allDay && (
                  <div className="w-[105px] shrink-0">
                    <TimePicker value={startTimeStr} onChange={handleStartTimeChange} />
                  </div>
                )}
              </div>
            </FormRow>

            <FormRow label="Kết thúc" divider>
              <div className="flex items-center gap-1.5 min-w-0 w-full">
                <div className="flex-1 min-w-0">
                  <DatePicker
                    value={endDateStr}
                    onChange={(val) => handleFieldChange(setEndDateStr, val)}
                    minDate={startDateStr}
                    placeholder="Ngày kết thúc"
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

            <FormRow label="Lặp lại" divider>
              <CustomSelect
                value={recurrencePreset}
                onChange={(val) => handleFieldChange(setRecurrencePreset, val)}
                options={RECURRENCE_OPTIONS}
              />
            </FormRow>

            {/* Custom RRULE input shown inline when 'custom' selected */}
            {recurrencePreset === 'custom' && (
              <FormRow label="" divider>
                <TextInput
                  value={customRrule}
                  onChange={(val) => handleFieldChange(setCustomRrule, val)}
                  placeholder="RFC 5545 RRULE (VD: FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=10)"
                  inputClassName="font-mono text-xs"
                  variant="boxed"
                />
              </FormRow>
            )}

            <FormRow label="Màu sắc" divider>
              <div className="flex items-center gap-2 px-2.5 py-1.5 overflow-x-auto">
                {/* Default/Calendar color */}
                <button
                  type="button"
                  onClick={() => handleFieldChange(setColor, '')}
                  className={`relative h-5 w-5 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    !color
                      ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface scale-110 shadow-xs'
                      : 'opacity-75 hover:opacity-100 hover:scale-105'
                  }`}
                  style={{ backgroundColor: selectedCalendar?.color || '#529cca' }}
                  title="Màu mặc định theo lịch"
                >
                  {!color && <Check className="h-3 w-3 text-white stroke-[3] drop-shadow-xs" />}
                </button>

                {COLOR_PALETTE.map((c) => {
                  const isSelected = color === c
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handleFieldChange(setColor, isSelected ? '' : c)}
                      className={`relative h-5 w-5 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                        isSelected
                          ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface scale-110 shadow-xs'
                          : 'opacity-75 hover:opacity-100 hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                      title={`Màu ${c}`}
                    >
                      {isSelected && <Check className="h-3 w-3 text-white stroke-[3] drop-shadow-xs" />}
                    </button>
                  )
                })}
              </div>
            </FormRow>

            <FormRow label="Địa điểm" divider>
              <TextInput
                value={location}
                onChange={(val) => handleFieldChange(setLocation, val)}
                placeholder="Phòng họp, địa chỉ..."
                prefixIcon={<MapPin className="h-3.5 w-3.5" />}
              />
            </FormRow>

            <FormRow label="Link họp" divider>
              <TextInput
                type="url"
                value={meetingUrl}
                onChange={(val) => handleFieldChange(setMeetingUrl, val)}
                placeholder="https://meet.google.com/..."
                prefixIcon={<Video className="h-3.5 w-3.5" />}
                inputClassName="font-mono text-xs"
              />
            </FormRow>

            <FormRow label="Người tham gia" divider alignTop>
              <AttendeeInput
                attendees={attendees}
                onChange={(newAtts) => handleFieldChange(setAttendees, newAtts)}
              />
            </FormRow>

            <FormRow label="Ghi chú" alignTop>
              <TextArea
                value={notes}
                onChange={(val) => handleFieldChange(setNotes, val)}
                placeholder="Mô tả, nội dung cuộc họp..."
                rows={2}
                icon={<FileText className="h-3.5 w-3.5 text-muted" />}
              />
            </FormRow>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-hairline flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1">
            {isEditing && (
              <>
                <button
                  type="button"
                  onClick={handleShare}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-muted hover:text-primary transition-colors text-xs cursor-pointer"
                  title="Xuất file .ics và mở trong thư mục"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span>{shareSuccess ? '✓ Đã tạo file' : 'Chia sẻ'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const eventId = data?.occurrence?.eventId || data?.event?.id
                    if (eventId) {
                      onDelete(eventId, data?.occurrence?.originalStartUtc, isRecurringOccurrence)
                    }
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-today hover:opacity-80 transition-opacity text-xs cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Xóa</span>
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
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="gc-btn-primary px-4 py-1.5 text-xs"
              style={{ borderRadius: 'var(--radius-control)' }}
            >
              {isEditing ? 'Lưu thay đổi' : 'Tạo sự kiện'}
            </button>
          </div>
        </div>

        {/* Unsaved Changes Confirmation — quiet overlay */}
        {showDiscardConfirm && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center p-6 z-60">
            <div
              className="bg-surface border border-hairline p-5 max-w-xs w-full"
              style={{ borderRadius: 'var(--radius-dialog)' }}
            >
              <h4 className="text-sm font-semibold text-primary mb-1.5">Hủy các thay đổi?</h4>
              <p className="text-xs text-muted mb-4">
                Nội dung vừa nhập chưa được lưu sẽ bị mất.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowDiscardConfirm(false)}
                  className="gc-btn text-xs"
                >
                  Tiếp tục sửa
                </button>
                <button
                  onClick={() => {
                    setShowDiscardConfirm(false)
                    onClose()
                  }}
                  className="px-3 py-1.5 text-xs text-today hover:opacity-80 transition-opacity cursor-pointer font-medium"
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
