import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Search,
  MapPin,
  Clock,
  Users,
  X,
  ArrowRight,
  Sparkles
} from 'lucide-react'
import { DateTime } from 'luxon'
import type { CalendarEvent, Calendar } from '@shared/event-model'
import { formatClockTime } from '@shared/time-format'
import { useDisplayPreferences } from '../context/DisplayPreferencesContext'

interface SearchPaletteModalProps {
  isOpen: boolean
  onClose: () => void
  calendars: Calendar[]
  onSelectEvent: (event: CalendarEvent, targetDate: string) => void
}

export const SearchPaletteModal: React.FC<SearchPaletteModalProps> = ({
  isOpen,
  onClose,
  calendars,
  onSelectEvent
}) => {
  const { t } = useTranslation()
  const { timeFormat } = useDisplayPreferences()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CalendarEvent[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const calendarMap = new Map(calendars.map((c) => [c.id, c]))

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setSelectedIndex(0)
    } else {
      setQuery('')
      setResults([])
    }
  }, [isOpen])

  // Real-time search query
  useEffect(() => {
    if (!isOpen) return
    const trimmed = query.trim()
    if (!trimmed) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      if (!window.gone?.events?.search) return
      setIsLoading(true)
      try {
        const res = await window.gone.events.search(trimmed, 30)
        setResults(res)
        setSelectedIndex(0)
      } catch (err) {
        console.error('Search failed:', err)
      } finally {
        setIsLoading(false)
      }
    }, 150)

    return () => clearTimeout(timer)
  }, [query, isOpen])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (results[selectedIndex]) {
        handleSelect(results[selectedIndex])
      }
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  const handleSelect = (event: CalendarEvent) => {
    const targetDate = event.allDay
      ? event.dtStartUtc.slice(0, 10)
      : DateTime.fromISO(event.dtStartUtc).toISODate() || event.dtStartUtc.slice(0, 10)

    onSelectEvent(event, targetDate)
    onClose()
  }

  const formatEventTime = (event: CalendarEvent) => {
    const dt = DateTime.fromISO(event.dtStartUtc)
    if (event.allDay) {
      return `${dt.toFormat('dd/MM/yyyy')} (${t('search.allDaySuffix')})`
    }
    const endDt = DateTime.fromISO(event.dtEndUtc)
    return `${dt.toFormat('dd/MM/yyyy')} ${formatClockTime(dt, timeFormat)} – ${formatClockTime(endDt, timeFormat)}`
  }

  if (!isOpen) return null

  return (
    <div
      className="gc-overlay items-start pt-20 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="gc-dialog w-full max-w-2xl max-h-[80vh]">
        {/* Search Header Input */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 bg-slate-50 dark:bg-slate-950/60">
          <Search className="h-5 w-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('search.placeholder')}
            className="w-full bg-transparent border-none text-slate-800 dark:text-slate-100 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoading && (
            <div className="p-8 text-center text-xs text-slate-400">{t('search.searching')}</div>
          )}

          {!isLoading && query.trim() && results.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-500">
              {t('search.noResults', { q: query })}
            </div>
          )}

          {!isLoading && !query.trim() && (
            <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500 flex flex-col items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
              <span>{t('search.empty')}</span>
            </div>
          )}

          {!isLoading &&
            results.map((evt, idx) => {
              const cal = calendarMap.get(evt.calendarId)
              const calColor = evt.color || cal?.color || '#6366f1'
              const isSelected = idx === selectedIndex

              return (
                <div
                  key={evt.id}
                  onClick={() => handleSelect(evt)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-3 rounded-xl cursor-pointer transition-all flex items-start justify-between gap-3 ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-600/20 border border-indigo-200 dark:border-indigo-500/40 text-slate-900 dark:text-slate-100'
                      : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/40 border border-transparent text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="min-w-0 space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: calColor }}
                      />
                      <span className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">
                        {evt.title || t('common.untitled')}
                      </span>
                      {cal && (
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/80 font-medium">
                          {cal.name}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                        {formatEventTime(evt)}
                      </span>

                      {evt.location && (
                        <span className="flex items-center gap-1 truncate max-w-xs">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                          <span className="truncate">{evt.location}</span>
                        </span>
                      )}

                      {evt.attendees && evt.attendees.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                          <span>{t('search.attendees', { count: evt.attendees.length })}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center self-center text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200">
                    <div
                      className={`p-1.5 rounded-lg ${
                        isSelected ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400'
                      }`}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              )
            })}
        </div>
      </div>
    </div>
  )
}

export default SearchPaletteModal
