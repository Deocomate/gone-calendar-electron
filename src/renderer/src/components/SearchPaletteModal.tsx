import React, { useState, useEffect, useRef } from 'react'
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
      return dt.toFormat('dd/MM/yyyy') + ' (Cả ngày)'
    }
    const endDt = DateTime.fromISO(event.dtEndUtc)
    return `${dt.toFormat('dd/MM/yyyy • HH:mm')} - ${endDt.toFormat('HH:mm')}`
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-start justify-center pt-20 p-4 z-50 animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Header Input */}
        <div className="p-4 border-b border-slate-800 flex items-center gap-3 bg-slate-950/60">
          <Search className="h-5 w-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tìm kiếm sự kiện theo tiêu đề, địa điểm, ghi chú... (Ctrl+K)"
            className="w-full bg-transparent border-none text-slate-100 text-sm placeholder:text-slate-500 focus:outline-hidden"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-slate-200 rounded-md"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoading && (
            <div className="p-8 text-center text-xs text-slate-400">Đang tìm kiếm...</div>
          )}

          {!isLoading && query.trim() && results.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-500">
              Không tìm thấy sự kiện nào khớp với "{query}".
            </div>
          )}

          {!isLoading && !query.trim() && (
            <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-400" />
              <span>Gõ từ khóa để tìm kiếm nhanh trong toàn bộ lịch</span>
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
                      ? 'bg-indigo-600/20 border border-indigo-500/40 text-slate-100'
                      : 'hover:bg-slate-800/40 border border-transparent text-slate-300'
                  }`}
                >
                  <div className="min-w-0 space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: calColor }}
                      />
                      <span className="font-semibold text-sm text-slate-100 truncate">
                        {evt.title || '(Không có tiêu đề)'}
                      </span>
                      {cal && (
                        <span className="text-[10px] text-slate-400 px-1.5 py-0.5 rounded-md bg-slate-800/80 font-medium">
                          {cal.name}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-slate-500" />
                        {formatEventTime(evt)}
                      </span>

                      {evt.location && (
                        <span className="flex items-center gap-1 truncate max-w-xs">
                          <MapPin className="h-3.5 w-3.5 text-slate-500" />
                          <span className="truncate">{evt.location}</span>
                        </span>
                      )}

                      {evt.attendees && evt.attendees.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5 text-slate-500" />
                          <span>{evt.attendees.length} người</span>
                        </span>
                      )}
                    </div>

                    {evt.notes && (
                      <p className="text-[11px] text-slate-400 line-clamp-1 italic">
                        {evt.notes}
                      </p>
                    )}
                  </div>

                  <div className="shrink-0 pt-1">
                    <div
                      className={`p-1.5 rounded-lg ${
                        isSelected ? 'bg-indigo-500 text-white' : 'text-slate-500'
                      }`}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              )
            })}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded-md border border-slate-700 text-slate-300 font-mono">
                ↑
              </kbd>{' '}
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded-md border border-slate-700 text-slate-300 font-mono">
                ↓
              </kbd>{' '}
              để chuyển
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded-md border border-slate-700 text-slate-300 font-mono">
                Enter
              </kbd>{' '}
              để mở
            </span>
          </div>
          <span>
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded-md border border-slate-700 text-slate-300 font-mono">
              Esc
            </kbd>{' '}
            để đóng
          </span>
        </div>
      </div>
    </div>
  )
}

export default SearchPaletteModal
