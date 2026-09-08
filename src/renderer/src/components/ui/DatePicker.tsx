import i18n from '../../i18n'
import React, { useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
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
  placeholder = i18n.t('ui.selectPlaceholder'),
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
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  const parsedValue = useMemo(() => {
    if (!value) return null
    const dt = DateTime.fromISO(value)
    return dt.isValid ? dt : null
  }, [value])

  const [viewDate, setViewDate] = useState<DateTime>(() => parsedValue || DateTime.local())

  const updateCoords = () => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const popoverWidth = 280
    const popoverHeight = 330

    // Horizontal positioning
    let left = align === 'right' ? rect.right - popoverWidth : rect.left
    if (left + popoverWidth > window.innerWidth - 8) {
      left = window.innerWidth - popoverWidth - 8
    }
    if (left < 8) {
      left = 8
    }

    // Vertical positioning: default below, flip above if overflowing bottom
    let top = rect.bottom + 4
    if (top + popoverHeight > window.innerHeight - 8 && rect.top - popoverHeight - 4 > 8) {
      top = rect.top - popoverHeight - 4
    }

    setCoords({ top, left })
  }

  useEffect(() => {
    if (!isOpen) return

    setViewDate(parsedValue || DateTime.local())
    updateCoords()

    const handleScrollOrResize = () => {
      updateCoords()
    }
    window.addEventListener('resize', handleScrollOrResize)
    window.addEventListener('scroll', handleScrollOrResize, true)
    return () => {
      window.removeEventListener('resize', handleScrollOrResize)
      window.removeEventListener('scroll', handleScrollOrResize, true)
    }
  }, [isOpen, parsedValue, align])

  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
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

  const calendarGrid = useMemo(() => {
    const startOfMonth = viewDate.startOf('month')
    const endOfMonth = viewDate.endOf('month')

    let cur = startOfMonth.startOf('week')
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

  const displayLabel = useMemo(() => {
    if (!parsedValue) return ''
    return parsedValue.toFormat('dd/MM/yyyy')
  }, [parsedValue])

  const presets = [
    { label: i18n.t('ui.today'), getDt: () => today },
    { label: i18n.t('ui.tomorrow'), getDt: () => today.plus({ days: 1 }) },
    {
      label: i18n.t('ui.weekend'),
      getDt: () => {
        const sat = today.set({ weekday: 6 })
        return sat < today ? sat.plus({ weeks: 1 }) : sat
      }
    },
    { label: i18n.t('ui.nextWeek'), getDt: () => today.plus({ weeks: 1 }) }
  ]

  const weekHeaders = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

  const popover =
    isOpen && coords && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={popoverRef}
            className="fixed z-[99999] border border-hairline bg-surface p-3 text-primary shadow-xl animate-popover select-none"
            style={{
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: '280px',
              borderRadius: 'var(--radius-dialog)',
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.18), 0 0 0 1px var(--color-border)'
            }}
          >
            {/* Quick Presets */}
            {showPresets && (
              <div className="mb-2 flex flex-wrap gap-1 border-b border-hairline pb-2">
                {presets.map((p) => {
                  const presetDt = p.getDt()
                  const isSelected = parsedValue && parsedValue.hasSame(presetDt, 'day')
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => handleSelectDate(presetDt)}
                      className={`px-2 py-0.5 text-[11px] font-medium transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-accent text-white font-semibold'
                          : 'bg-hover text-muted hover:text-primary'
                      }`}
                      style={{ borderRadius: 'var(--radius-control)' }}
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
                  className="p-1 text-muted hover:text-primary hover:bg-hover transition-colors cursor-pointer"
                  style={{ borderRadius: 'var(--radius-control)' }}
                  title={i18n.t('ui.prevYear')}
                >
                  <ChevronsLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1 text-muted hover:text-primary hover:bg-hover transition-colors cursor-pointer"
                  style={{ borderRadius: 'var(--radius-control)' }}
                  title={i18n.t('ui.prevMonth')}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
              </div>

              <span className="text-xs font-semibold text-primary">
                {viewDate.toFormat('MMMM yyyy')}
              </span>

              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1 text-muted hover:text-primary hover:bg-hover transition-colors cursor-pointer"
                  style={{ borderRadius: 'var(--radius-control)' }}
                  title={i18n.t('ui.nextMonth')}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleNextYear}
                  className="p-1 text-muted hover:text-primary hover:bg-hover transition-colors cursor-pointer"
                  style={{ borderRadius: 'var(--radius-control)' }}
                  title={i18n.t('ui.nextYear')}
                >
                  <ChevronsRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Weekday Headers */}
            <div className="mb-1 grid grid-cols-7 text-center text-[10px] font-medium text-muted uppercase tracking-wider">
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
                    className={`relative flex h-7 w-7 items-center justify-center text-xs tabular-nums transition-colors mx-auto cursor-pointer ${
                      isSelected
                        ? 'bg-accent text-white font-bold'
                        : isToday
                          ? 'border border-accent/60 text-accent font-semibold hover:bg-hover'
                          : isCurrentMonth
                            ? 'text-primary hover:bg-hover'
                            : 'text-muted/60 hover:bg-hover'
                    } ${isDisabled ? 'opacity-20 cursor-not-allowed' : ''}`}
                    style={{ borderRadius: 'var(--radius-control)' }}
                  >
                    {day.day}
                    {isToday && !isSelected && (
                      <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-accent" />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Footer */}
            <div className="mt-2.5 flex items-center justify-between border-t border-hairline pt-2 text-[11px]">
              <button
                type="button"
                onClick={() => handleSelectDate(today)}
                className="font-medium text-accent hover:underline cursor-pointer"
              >
                {i18n.t('ui.today')} ({today.toFormat('dd/MM')})
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-muted hover:text-primary cursor-pointer transition-colors"
              >
                {i18n.t('ui.close')}
              </button>
            </div>
          </div>,
          document.body
        )
      : null

  return (
    <div className={`relative inline-block w-full ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-[12px] font-normal text-muted mb-1.5">
          {label}
        </label>
      )}

      {/* Trigger Button — ghost: transparent, hairline on hover */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`flex items-center justify-between gap-1.5 w-full text-left select-none cursor-pointer overflow-hidden transition-colors duration-100 bg-transparent border outline-none focus:outline-none focus:ring-0 focus-visible:outline-none ${
          isOpen ? 'border-hairline bg-hover/40' : 'border-transparent hover:border-hairline hover:bg-hover/30'
        } ${compact ? 'px-2 py-1 text-xs' : 'px-2.5 py-1.5 text-xs'} ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        style={{ borderRadius: 'var(--radius-control)' }}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
          <CalendarIcon
            className={`shrink-0 h-3.5 w-3.5 transition-colors ${
              isOpen || parsedValue ? 'text-accent' : 'text-muted'
            }`}
          />
          <span
            className={`truncate tabular-nums ${
              parsedValue ? 'text-primary font-medium' : 'text-muted'
            }`}
          >
            {parsedValue ? displayLabel : placeholder}
          </span>
        </div>

        {parsedValue && !disabled && (
          <div
            onClick={handleClear}
            className="p-0.5 text-muted hover:text-primary transition-colors shrink-0 cursor-pointer"
            title={i18n.t('ui.clearDate')}
            style={{ borderRadius: 'var(--radius-control)' }}
          >
            <X className="h-3.5 w-3.5" />
          </div>
        )}
      </button>

      {popover}
    </div>
  )
}

export default DatePicker
