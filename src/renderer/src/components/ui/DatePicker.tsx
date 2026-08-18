import React, { useState, useRef, useEffect, useMemo } from 'react'
import { DateTime } from 'luxon'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X
} from 'lucide-react'

export interface DatePickerProps {
  value?: string // format: yyyy-MM-dd
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  minDate?: string
  maxDate?: string
  disabled?: boolean
  compact?: boolean
  className?: string
  showPresets?: boolean
  align?: 'left' | 'right'
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder = 'Chọn ngày...',
  label,
  minDate,
  maxDate,
  disabled = false,
  compact = false,
  className = '',
  showPresets = true,
  align = 'left'
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Current view month/year in calendar
  const parsedValue = useMemo(() => {
    if (!value) return null
    const dt = DateTime.fromISO(value)
    return dt.isValid ? dt : null
  }, [value])

  const [viewDate, setViewDate] = useState<DateTime>(() => parsedValue || DateTime.local())

  // Sync viewDate when opened
  useEffect(() => {
    if (isOpen) {
      setViewDate(parsedValue || DateTime.local())
    }
  }, [isOpen, parsedValue])

  // Handle click outside to close popover
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  // Generate calendar days
  const calendarGrid = useMemo(() => {
    const startOfMonth = viewDate.startOf('month')
    const endOfMonth = viewDate.endOf('month')

    // Find the Monday on or before startOfMonth (assuming Monday start = 1)
    let cur = startOfMonth.startOf('week')
    // Find the Sunday on or after endOfMonth
    const endGrid = endOfMonth.endOf('week')

    const days: DateTime[] = []
    while (cur <= endGrid || days.length < 35) {
      days.push(cur)
      cur = cur.plus({ days: 1 })
      if (days.length >= 42) break
    }

    return days
  }, [viewDate])

  const handleSelectDate = (date: DateTime) => {
    onChange(date.toFormat('yyyy-MM-dd'))
    setIsOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
    setIsOpen(false)
  }

  const handlePrevMonth = () => setViewDate((d) => d.minus({ months: 1 }))
  const handleNextMonth = () => setViewDate((d) => d.plus({ months: 1 }))
  const handlePrevYear = () => setViewDate((d) => d.minus({ years: 1 }))
  const handleNextYear = () => setViewDate((d) => d.plus({ years: 1 }))

  const today = DateTime.local()

  // Display label for trigger button
  const displayLabel = useMemo(() => {
    if (!parsedValue) return ''
    return parsedValue.toFormat('dd/MM/yyyy')
  }, [parsedValue])

  // Presets
  const presets = [
    { label: 'Hôm nay', getDt: () => today },
    { label: 'Ngày mai', getDt: () => today.plus({ days: 1 }) },
    {
      label: 'Cuối tuần',
      getDt: () => {
        const sat = today.set({ weekday: 6 })
        return sat < today ? sat.plus({ weeks: 1 }) : sat
      }
    },
    { label: 'Tuần sau', getDt: () => today.plus({ weeks: 1 }) }
  ]

  const weekHeaders = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

  return (
    <div className={`relative inline-block w-full ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-slate-500 dark:text-slate-400 font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`group flex items-center justify-between gap-1.5 w-full rounded-xl border transition-all text-left select-none cursor-pointer overflow-hidden ${
          compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-xs font-medium'
        } ${
          isOpen
            ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-surface'
            : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100/50 dark:hover:bg-slate-900/50'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
          <CalendarIcon
            className={`shrink-0 transition-colors ${compact ? 'h-3.5 w-3.5' : 'h-3.5 w-3.5'} ${
              isOpen || parsedValue ? 'text-indigo-500 dark:text-indigo-400' : 'text-slate-400'
            }`}
          />
          <span
            className={`truncate ${
              parsedValue
                ? 'text-slate-800 dark:text-slate-100 font-medium'
                : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            {parsedValue ? displayLabel : placeholder}
          </span>
        </div>

        {parsedValue && !disabled && (
          <div
            onClick={handleClear}
            className="p-0.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors shrink-0 cursor-pointer"
            title="Xóa ngày đã chọn"
          >
            <X className="h-3.5 w-3.5" />
          </div>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          className={`absolute top-full z-50 mt-1.5 w-72 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-2xl shadow-black/20 animate-popover ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {/* Quick Presets */}
          {showPresets && (
            <div className="mb-2.5 flex flex-wrap gap-1 border-b border-slate-100 dark:border-slate-800/80 pb-2">
              {presets.map((p) => {
                const presetDt = p.getDt()
                const isSelected = parsedValue && parsedValue.hasSame(presetDt, 'day')
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => handleSelectDate(presetDt)}
                    className={`rounded-lg px-2 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-300'
                    }`}
                  >
                    {p.label}
                  </button>
                )
              })}
            </div>
          )}

          {/* Month / Year Navigator */}
          <div className="mb-2 flex items-center justify-between px-1">
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={handlePrevYear}
                className="p-1 rounded-md text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Năm trước"
              >
                <ChevronsLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 rounded-md text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Tháng trước"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
            </div>

            <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
              {viewDate.toFormat('MMMM yyyy')}
            </span>

            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 rounded-md text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Tháng sau"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleNextYear}
                className="p-1 rounded-md text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Năm sau"
              >
                <ChevronsRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Weekday Headers */}
          <div className="mb-1 grid grid-cols-7 text-center text-[10px] font-semibold text-slate-400 dark:text-slate-500">
            {weekHeaders.map((h) => (
              <span key={h} className="py-1">
                {h}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-0.5 text-center">
            {calendarGrid.map((day) => {
              const key = day.toFormat('yyyy-MM-dd')
              const isCurrentMonth = day.month === viewDate.month
              const isToday = day.hasSame(today, 'day')
              const isSelected = Boolean(parsedValue && day.hasSame(parsedValue, 'day'))

              let isDisabled = false
              if (minDate) {
                const minDt = DateTime.fromISO(minDate)
                if (minDt.isValid && day < minDt.startOf('day')) isDisabled = true
              }
              if (maxDate) {
                const maxDt = DateTime.fromISO(maxDate)
                if (maxDt.isValid && day > maxDt.endOf('day')) isDisabled = true
              }

              return (
                <button
                  key={key}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleSelectDate(day)}
                  className={`relative flex h-8 w-8 items-center justify-center rounded-xl text-xs transition-all mx-auto cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30'
                      : isToday
                        ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-800/80 hover:bg-indigo-100 dark:hover:bg-indigo-900/50'
                        : isCurrentMonth
                          ? 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                          : 'text-slate-300 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  } ${isDisabled ? 'opacity-20 cursor-not-allowed' : ''}`}
                >
                  {day.day}
                  {isToday && !isSelected && (
                    <span className="absolute bottom-1 h-1 w-1 rounded-full bg-indigo-500 dark:bg-indigo-400" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Footer Jump to Today */}
          <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2 text-[11px]">
            <button
              type="button"
              onClick={() => handleSelectDate(today)}
              className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              Hôm nay ({today.toFormat('dd/MM')})
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default DatePicker
