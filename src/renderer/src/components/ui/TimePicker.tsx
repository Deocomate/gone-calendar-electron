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
  showQuickDurations?: boolean
  disabled?: boolean
  className?: string
  align?: 'left' | 'right'
}

// Generate array of 24h slots e.g. ["00:00", "00:15", ..., "23:45"]
function generateTimeSlots(step = 15): string[] {
  const slots: string[] = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += step) {
      const hh = h.toString().padStart(2, '0')
      const mm = m.toString().padStart(2, '0')
      slots.push(`${hh}:${mm}`)
    }
  }
  return slots
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
  stepMinutes = 15,
  startTime,
  showQuickDurations = false,
  disabled = false,
  className = '',
  align = 'left'
}) => {
  const { timeFormat } = useDisplayPreferences()
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState(value ? formatClockTimeStr(value, timeFormat) : '')
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const activeItemRef = useRef<HTMLButtonElement>(null)

  const timeSlots = useMemo(() => generateTimeSlots(stepMinutes), [stepMinutes])

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

  // Quick duration presets (when startTime is provided)
  const quickDurations = [
    { label: '+15p', mins: 15 },
    { label: '+30p', mins: 30 },
    { label: '+45p', mins: 45 },
    { label: '+1h', mins: 60 },
    { label: '+1.5h', mins: 90 },
    { label: '+2h', mins: 120 },
    { label: '+3h', mins: 180 }
  ]

  const handleQuickDuration = (minsToAdd: number) => {
    if (!startTime) return
    const [sh, sm] = startTime.split(':').map(Number)
    if (isNaN(sh) || isNaN(sm)) return

    const totalMins = (sh * 60 + sm + minsToAdd) % (24 * 60)
    const eh = Math.floor(totalMins / 60)
    const em = totalMins % 60
    const newTime = `${eh.toString().padStart(2, '0')}:${em.toString().padStart(2, '0')}`
    onChange(newTime)
    setInputValue(formatClockTimeStr(newTime, timeFormat))
    setIsOpen(false)
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
            {/* Quick Duration Chips (if enabled and startTime given) */}
            {showQuickDurations && startTime && (
              <div className="mb-1.5 flex flex-wrap gap-1 border-b border-hairline pb-1.5 px-0.5">
                {quickDurations.map((d) => (
                  <button
                    key={d.label}
                    type="button"
                    onClick={() => handleQuickDuration(d.mins)}
                    className="px-1.5 py-0.5 text-[10px] font-medium text-muted hover:bg-hover hover:text-primary transition-colors cursor-pointer bg-hover/60"
                    style={{ borderRadius: 'var(--radius-control)' }}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            )}

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
