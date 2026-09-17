import i18n from '../../i18n'
import React, { useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Clock, ChevronDown } from 'lucide-react'
import { formatClockTimeStr } from '@shared/time-format'
import { useDisplayPreferences } from '../../context/DisplayPreferencesContext'

export interface TimePickerProps {
  value: string // Format: HH:mm (e.g. "09:00", "14:30")
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  stepMinutes?: 15 | 30 | 60
  startTime?: string // Optional reference start time to display duration hints
  disabled?: boolean
  className?: string
  align?: 'left' | 'right'
}

const MINUTES_IN_DAY = 24 * 60

function toClock(totalMinutes: number): string {
  const m = ((totalMinutes % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY
  return `${Math.floor(m / 60)
    .toString()
    .padStart(2, '0')}:${(m % 60).toString().padStart(2, '0')}`
}

function clockToMinutes(clock: string): number | null {
  const [h, m] = clock.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return h * 60 + m
}

/**
 * The times to offer.
 *
 * Without `after` this is the plain day, 00:00 onwards. With it - the end-time
 * picker, handed the start - the list begins at the first slot *after* the start
 * and wraps through midnight, so choosing an end never means scrolling past
 * every hour that has already gone. A 15:00 start opens on 15:30, 16:00, ...
 * 23:30, 00:00, 00:30, and round to 15:00 again a full day later.
 */
export function generateTimeSlots(step = 15, after?: string): string[] {
  const count = Math.floor(MINUTES_IN_DAY / step)
  const afterMinutes = after ? clockToMinutes(after) : null

  if (afterMinutes === null) {
    return Array.from({ length: count }, (_, i) => toClock(i * step))
  }

  // Round the start onto the grid before stepping off it, so an event starting
  // at 15:07 still offers 15:15 rather than 15:22.
  const first = Math.ceil((afterMinutes + 1) / step) * step
  return Array.from({ length: count }, (_, i) => toClock(first + i * step))
}

// Format duration between startTime and targetTime
function formatDuration(startStr: string, endStr: string): string | null {
  const [sh, sm] = startStr.split(':').map(Number)
  const [eh, em] = endStr.split(':').map(Number)
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return null

  const startMins = sh * 60 + sm
  let endMins = eh * 60 + em

  if (endMins < startMins) {
    endMins += 24 * 60
  }

  const diffMins = endMins - startMins
  if (diffMins <= 0) return null

  const hours = Math.floor(diffMins / 60)
  const mins = diffMins % 60

  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`
  if (hours > 0) return i18n.t('ui.hours', { n: hours })
  return i18n.t('ui.minutes', { n: mins })
}

// Smart parse text into HH:mm
function parseSmartTime(raw: string): string | null {
  const clean = raw.trim().toLowerCase().replace(/\s+/g, '')
  if (!clean) return null

  const isPm = clean.endsWith('pm') || clean.endsWith('ch')
  const isAm = clean.endsWith('am') || clean.endsWith('sa')
  const textWithoutMeridiem = clean.replace(/pm|am|ch|sa/g, '')

  let hours = 0
  let mins = 0

  if (textWithoutMeridiem.includes(':') || textWithoutMeridiem.includes('h') || textWithoutMeridiem.includes('.')) {
    const parts = textWithoutMeridiem.split(/[:h.]/)
    hours = parseInt(parts[0], 10) || 0
    mins = parseInt(parts[1], 10) || 0
  } else if (/^\d{3,4}$/.test(textWithoutMeridiem)) {
    if (textWithoutMeridiem.length === 3) {
      hours = parseInt(textWithoutMeridiem.slice(0, 1), 10)
      mins = parseInt(textWithoutMeridiem.slice(1), 10)
    } else {
      hours = parseInt(textWithoutMeridiem.slice(0, 2), 10)
      mins = parseInt(textWithoutMeridiem.slice(2), 10)
    }
  } else if (/^\d{1,2}$/.test(textWithoutMeridiem)) {
    hours = parseInt(textWithoutMeridiem, 10)
    mins = 0
  } else {
    return null
  }

  if (isPm && hours < 12) hours += 12
  if (isAm && hours === 12) hours = 0

  if (hours >= 0 && hours < 24 && mins >= 0 && mins < 60) {
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
  }

  return null
}

export const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  placeholder = 'HH:mm',
  label,
  stepMinutes,
  startTime,
  disabled = false,
  className = '',
  align = 'left'
}) => {
  const { timeFormat, dragSnapMinutes } = useDisplayPreferences()
  // Same grid the calendar snaps to unless a caller insists otherwise, so the
  // times offered here match the ones a drag can produce.
  const step = stepMinutes ?? dragSnapMinutes
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState(value ? formatClockTimeStr(value, timeFormat) : '')
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const activeItemRef = useRef<HTMLButtonElement>(null)

  const timeSlots = useMemo(
    () => generateTimeSlots(step, startTime),
    [step, startTime]
  )

  useEffect(() => {
    setInputValue(value ? formatClockTimeStr(value, timeFormat) : '')
  }, [value, timeFormat])

  const updateCoords = () => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const popoverWidth = 200
    const popoverHeight = 250

    let left = align === 'right' ? rect.right - popoverWidth : rect.left
    if (left + popoverWidth > window.innerWidth - 8) {
      left = window.innerWidth - popoverWidth - 8
    }
    if (left < 8) {
      left = 8
    }

    let top = rect.bottom + 4
    if (top + popoverHeight > window.innerHeight - 8 && rect.top - popoverHeight - 4 > 8) {
      top = rect.top - popoverHeight - 4
    }

    setCoords({ top, left })
  }

  // Scroll active item into view and update coordinates when opening
  useEffect(() => {
    if (!isOpen) return

    updateCoords()
    setTimeout(() => {
      if (activeItemRef.current && listRef.current) {
        const list = listRef.current
        const item = activeItemRef.current
        list.scrollTop = item.offsetTop - list.clientHeight / 2 + item.clientHeight / 2
      }
    }, 50)

    const handleScrollOrResize = () => {
      updateCoords()
    }
    window.addEventListener('resize', handleScrollOrResize)
    window.addEventListener('scroll', handleScrollOrResize, true)
    return () => {
      window.removeEventListener('resize', handleScrollOrResize)
      window.removeEventListener('scroll', handleScrollOrResize, true)
    }
  }, [isOpen, align])

  // Click outside & Escape listener
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
        commitInput()
        setIsOpen(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setInputValue(value ? formatClockTimeStr(value, timeFormat) : '')
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, value, inputValue, timeFormat])

  const commitInput = () => {
    const parsed = parseSmartTime(inputValue)
    if (parsed) {
      onChange(parsed)
      setInputValue(formatClockTimeStr(parsed, timeFormat))
    } else {
      setInputValue(value ? formatClockTimeStr(value, timeFormat) : '')
    }
  }

  const handleSelectSlot = (slot: string) => {
    onChange(slot)
    setInputValue(formatClockTimeStr(slot, timeFormat))
    setIsOpen(false)
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commitInput()
      setIsOpen(false)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIsOpen(true)
    }
  }



  const popover =
    isOpen && coords && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={popoverRef}
            className="fixed z-[99999] border border-hairline bg-surface p-1.5 text-primary shadow-xl animate-popover select-none"
            style={{
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: '200px',
              borderRadius: 'var(--radius-dialog)',
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.18), 0 0 0 1px var(--color-border)'
            }}
          >

            {/* Time Slot List */}
            <div ref={listRef} className="max-h-52 overflow-y-auto space-y-0.5 pr-0.5">
              {timeSlots.map((slot) => {
                const isSelected = slot === value
                const duration = startTime ? formatDuration(startTime, slot) : null

                return (
                  <button
                    key={slot}
                    type="button"
                    ref={isSelected ? activeItemRef : undefined}
                    onClick={() => handleSelectSlot(slot)}
                    className={`flex w-full items-center justify-between px-2.5 py-1.5 text-xs font-mono tabular-nums transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-accent text-white font-bold'
                        : 'text-primary hover:bg-hover'
                    }`}
                    style={{ borderRadius: 'var(--radius-control)' }}
                  >
                    <span>{formatClockTimeStr(slot, timeFormat)}</span>
                    {duration && (
                      <span
                        className={`text-[10px] font-sans ${
                          isSelected ? 'text-white/80' : 'text-muted'
                        }`}
                      >
                        {duration}
                      </span>
                    )}
                  </button>
                )
              })}
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

      {/* Input / Trigger — matching DatePicker ghost styling */}
      <div
        onClick={() => !disabled && setIsOpen(true)}
        className={`flex items-center justify-between gap-1 w-full text-left select-none cursor-pointer overflow-hidden transition-colors duration-100 bg-transparent border ${
          isOpen ? 'border-accent bg-hover/50' : 'border-transparent hover:border-hairline hover:bg-hover/30'
        } px-2.5 py-1.5 text-xs ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        style={{ borderRadius: 'var(--radius-control)' }}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
          <Clock
            className={`h-3.5 w-3.5 shrink-0 transition-colors ${
              isOpen ? 'text-accent' : 'text-muted'
            }`}
          />
          <input
            type="text"
            disabled={disabled}
            value={inputValue}
            placeholder={placeholder}
            onFocus={() => !disabled && setIsOpen(true)}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={commitInput}
            onKeyDown={handleInputKeyDown}
            className="w-full bg-transparent text-xs font-mono font-medium text-primary placeholder:text-muted border-none outline-none focus:outline-none focus:ring-0 focus-visible:outline-none min-w-0 tabular-nums p-0"
          />
        </div>

        <ChevronDown
          className={`h-3 w-3 text-muted/60 shrink-0 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-accent' : ''
          }`}
        />
      </div>

      {popover}
    </div>
  )
}

export default TimePicker
