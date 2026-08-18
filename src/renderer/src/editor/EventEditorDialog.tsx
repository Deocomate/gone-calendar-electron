import React, { useState, useEffect } from 'react'
import { DateTime } from 'luxon'
import {
  Clock,
  MapPin,
  Video,
  FileText,
  Repeat,
  Trash2,
  X,
  AlertTriangle,
  Share2,
  Users
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
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#0ea5e9', // Sky
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#f43f5e', // Rose
  '#64748b'  // Slate
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

  if (!isOpen) return null

  const handleFieldChange = (setter: React.Dispatch<React.SetStateAction<any>>, val: any) => {
    setter(val)
    setIsDirty(true)
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

  const selectedCalendar = calendars.find((c) => c.id === calendarId)

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="h-4 w-4 rounded-full shadow-md"
              style={{ backgroundColor: color || selectedCalendar?.color || '#6366f1' }}
            />
            <h3 className="text-base font-bold text-slate-100">
              {isEditing ? 'Chỉnh sửa sự kiện' : 'Tạo sự kiện mới'}
            </h3>
          </div>

          <button
            onClick={handleCloseAttempt}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* Title & Color Picker */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
              Tiêu đề sự kiện (Title) *
            </label>
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="VD: Họp định kỳ tuần, Thiết kế UI..."
                value={title}
                onChange={(e) => handleFieldChange(setTitle, e.target.value)}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 font-medium"
                autoFocus
              />

              {/* Color Circles */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 shrink-0">
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleFieldChange(setColor, color === c ? '' : c)}
                    className={`h-5 w-5 rounded-full transition-transform ${
                      color === c ? 'scale-125 ring-2 ring-white shadow-md' : 'hover:scale-110 opacity-70'
                    }`}
                    style={{ backgroundColor: c }}
                    title={`Color ${c}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Calendar Selector */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
                Lịch (Calendar) *
              </label>
              <div className="relative">
                <select
                  value={calendarId}
                  onChange={(e) => handleFieldChange(setCalendarId, e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-hidden focus:border-indigo-500 cursor-pointer"
                >
                  {calendars.map((cal) => (
                    <option key={cal.id} value={cal.id} disabled={cal.isReadOnly}>
                      {cal.name} {cal.isReadOnly ? '(Read-only)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
                Múi giờ (Timezone)
              </label>
              <select
                value={tzid}
                onChange={(e) => handleFieldChange(setTzid, e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-hidden focus:border-indigo-500 cursor-pointer"
              >
                {TIMEZONE_OPTIONS.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* All Day Toggle */}
          <div className="flex items-center gap-2 py-1">
            <input
              type="checkbox"
              id="allDayCheck"
              checked={allDay}
              onChange={(e) => handleFieldChange(setAllDay, e.target.checked)}
              className="rounded accent-indigo-500 h-4 w-4"
            />
            <label htmlFor="allDayCheck" className="text-slate-300 font-medium cursor-pointer">
              Sự kiện cả ngày (All-day)
            </label>
          </div>

          {/* Date & Time Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            {/* Start */}
            <div className="space-y-1.5">
              <label className="text-slate-400 font-semibold flex items-center gap-1.5 text-[10px] uppercase tracking-wider">
                <Clock className="h-3.5 w-3.5 text-indigo-400" />
                Bắt đầu (Start)
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={startDateStr}
                  onChange={(e) => handleFieldChange(setStartDateStr, e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 focus:outline-hidden focus:border-indigo-500"
                />
                {!allDay && (
                  <input
                    type="time"
                    value={startTimeStr}
                    onChange={(e) => handleFieldChange(setStartTimeStr, e.target.value)}
                    className="w-24 px-2 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 focus:outline-hidden focus:border-indigo-500 font-mono"
                  />
                )}
              </div>
            </div>

            {/* End */}
            <div className="space-y-1.5">
              <label className="text-slate-400 font-semibold flex items-center gap-1.5 text-[10px] uppercase tracking-wider">
                <Clock className="h-3.5 w-3.5 text-indigo-400" />
                Kết thúc (End)
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={endDateStr}
                  onChange={(e) => handleFieldChange(setEndDateStr, e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 focus:outline-hidden focus:border-indigo-500"
                />
                {!allDay && (
                  <input
                    type="time"
                    value={endTimeStr}
                    onChange={(e) => handleFieldChange(setEndTimeStr, e.target.value)}
                    className="w-24 px-2 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 focus:outline-hidden focus:border-indigo-500 font-mono"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Recurrence Selector */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1.5 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
              <Repeat className="h-3.5 w-3.5 text-indigo-400" />
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
                  className={`px-3 py-2 rounded-lg border text-center transition-all ${
                    recurrencePreset === preset.id
                      ? 'bg-indigo-600 border-indigo-500 text-white font-semibold shadow-xs'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {recurrencePreset === 'custom' && (
              <input
                type="text"
                placeholder="RFC 5545 RRULE (VD: FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=10)"
                value={customRrule}
                onChange={(e) => handleFieldChange(setCustomRrule, e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs focus:outline-hidden focus:border-indigo-500"
              />
            )}
          </div>

          {/* Location & Meeting URL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-semibold mb-1.5 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-slate-500" />
                Địa điểm (Location)
              </label>
              <input
                type="text"
                placeholder="VD: Phòng họp A, Tầng 3"
                value={location}
                onChange={(e) => handleFieldChange(setLocation, e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1.5 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <Video className="h-3.5 w-3.5 text-slate-500" />
                Link họp trực tuyến (Meeting URL)
              </label>
              <input
                type="url"
                placeholder="https://meet.google.com/..."
                value={meetingUrl}
                onChange={(e) => handleFieldChange(setMeetingUrl, e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-hidden focus:border-indigo-500 font-mono text-xs"
              />
            </div>
          </div>

          {/* Attendees */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1.5 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-slate-500" />
              Người tham gia (Attendees)
            </label>
            <AttendeeInput
              attendees={attendees}
              onChange={(newAtts) => handleFieldChange(setAttendees, newAtts)}
            />
          </div>

          {/* Notes / Description */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1.5 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-slate-500" />
              Ghi chú (Notes & Description)
            </label>
            <textarea
              rows={3}
              placeholder="Thêm mô tả chi tiết, nội dung cuộc họp..."
              value={notes}
              onChange={(e) => handleFieldChange(setNotes, e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-hidden focus:border-indigo-500 resize-none leading-relaxed"
            />
          </div>
        </form>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {isEditing && (
              <>
                <button
                  type="button"
                  onClick={handleShare}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors font-medium text-xs border border-slate-700"
                  title="Xuất file .ics và mở trong thư mục"
                >
                  <Share2 className="h-3.5 w-3.5 text-indigo-400" />
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
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors font-medium text-xs"
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
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
            >
              Hủy bỏ (Cancel)
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-md shadow-indigo-600/30 transition-all"
            >
              {isEditing ? 'Lưu thay đổi' : 'Tạo sự kiện'}
            </button>
          </div>
        </div>

        {/* Unsaved Changes Confirmation */}
        {showDiscardConfirm && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-6 z-60 animate-in fade-in duration-100">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h4 className="text-base font-bold text-slate-100 mb-2">Hủy bỏ các thay đổi?</h4>
              <p className="text-xs text-slate-400 mb-5">
                Các nội dung vừa nhập chưa được lưu sẽ bị mất. Bạn có chắc muốn đóng?
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setShowDiscardConfirm(false)}
                  className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
                >
                  Tiếp tục sửa
                </button>
                <button
                  onClick={() => {
                    setShowDiscardConfirm(false)
                    onClose()
                  }}
                  className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors"
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
