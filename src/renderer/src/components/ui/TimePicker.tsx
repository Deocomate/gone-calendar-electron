import React, { useState, useRef, useEffect, useMemo } from 'react'
import { Clock } from 'lucide-react'

export interface TimePickerProps {
  value: string // Format: HH:mm (e.g. "09:00", "14:30")
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  stepMinutes?: 15 | 30 | 60
  startTime?: string // Optional reference start time to display duration hints (e.g. "09:00")
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

  // If end is next day
  if (endMins < startMins) {
    endMins += 24 * 60
  }

  const diffMins = endMins - startMins
  if (diffMins <= 0) return null

  const hours = Math.floor(diffMins / 60)
  const mins = diffMins % 60

  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`
  if (hours > 0) return `${hours} giờ`
  return `${mins} phút`
}

// Smart parse text into HH:mm
function parseSmartTime(raw: string): string | null {
  const clean = raw.trim().toLowerCase().replace(/\s+/g, '')
  if (!clean) return null

  // Check pm/am
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
    // 3 or 4 digits like "930" or "1430"
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
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState(value || '')
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const activeItemRef = useRef<HTMLButtonElement>(null)

  const timeSlots = useMemo(() => generateTimeSlots(stepMinutes), [stepMinutes])

  useEffect(() => {
    setInputValue(value || '')
  }, [value])

  // Scroll active item into view when opening
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (activeItemRef.current && listRef.current) {
          const list = listRef.current
          const item = activeItemRef.current
          list.scrollTop = item.offsetTop - list.clientHeight / 2 + item.clientHeight / 2
        }
      }, 50)
    }
  }, [isOpen])

  // Click outside & Escape listener
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        commitInput()
        setIsOpen(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setInputValue(value || '')
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, value, inputValue])

  const commitInput = () => {
    const parsed = parseSmartTime(inputValue)
    if (parsed) {
      onChange(parsed)
      setInputValue(parsed)
    } else {
      setInputValue(value || '')
    }
  }

  const handleSelectSlot = (slot: string) => {
    onChange(slot)
    setInputValue(slot)
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
    setInputValue(newTime)
    setIsOpen(false)
  }

  return (
    <div className={`relative inline-block w-full ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-slate-500 dark:text-slate-400 font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
          {label}
        </label>
      )}

      {/* Input / Trigger */}
      <div
        className={`group flex items-center justify-between rounded-xl border transition-all overflow-hidden ${
          isOpen
            ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-surface'
            : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 hover:border-slate-300 dark:hover:border-slate-700'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <div className="flex items-center gap-1 px-2.5 py-2 flex-1 min-w-0">
          <Clock
            className={`h-3.5 w-3.5 shrink-0 transition-colors ${
              isOpen ? 'text-indigo-500 dark:text-indigo-400' : 'text-slate-400'
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
            className="w-full bg-transparent text-xs font-mono font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden min-w-0"
          />
        </div>

        {/* Small Toggle Arrow Button */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen((prev) => !prev)}
          className="pr-2 pl-0.5 py-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer shrink-0"
          tabIndex={-1}
        >
          <span className="text-[8px] opacity-70">▼</span>
        </button>
      </div>

      {/* Dropdown Popover */}
      {isOpen && (
        <div
          className={`absolute top-full z-50 mt-1.5 w-60 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 shadow-2xl shadow-black/20 animate-popover ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {/* Quick Duration Chips (if enabled and startTime given) */}
          {showQuickDurations && startTime && (
            <div className="mb-2 flex flex-wrap gap-1 border-b border-slate-100 dark:border-slate-800/80 pb-2">
              {quickDurations.map((d) => (
                <button
                  key={d.label}
                  type="button"
                  onClick={() => handleQuickDuration(d.mins)}
                  className="rounded-md bg-indigo-50 dark:bg-indigo-950/50 px-2 py-1 text-[10px] font-semibold text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors cursor-pointer"
                >
                  {d.label}
                </button>
              ))}
            </div>
          )}

          {/* Time Slot List */}
          <div ref={listRef} className="max-h-52 overflow-y-auto space-y-0.5 pr-1">
            {timeSlots.map((slot) => {
              const isSelected = slot === value
              const duration = startTime ? formatDuration(startTime, slot) : null

              return (
                <button
                  key={slot}
                  type="button"
                  ref={isSelected ? activeItemRef : undefined}
                  onClick={() => handleSelectSlot(slot)}
                  className={`flex w-full items-center justify-between px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white font-bold shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                  }`}
                >
                  <span>{slot}</span>
                  {duration && (
                    <span
                      className={`text-[10px] font-sans ${
                        isSelected
                          ? 'text-indigo-100'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {duration}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default TimePicker
