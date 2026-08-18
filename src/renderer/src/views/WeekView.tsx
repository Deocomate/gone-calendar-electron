import React, { useRef, useEffect } from 'react'
import { DateTime } from 'luxon'
import type { ExpandedOccurrence } from '@shared/event-model'
import LunarLabel from '../components/LunarLabel'
import WeekNumber from '../components/WeekNumber'

interface WeekViewProps {
  anchorDate: DateTime
  occurrences: ExpandedOccurrence[]
  showLunar: boolean
  showWeekNumbers: boolean
  onSelectSlot?: (start: DateTime, end: DateTime) => void
  onSelectOccurrence?: (occ: ExpandedOccurrence) => void
  onDragStart?: (e: React.DragEvent, occ: ExpandedOccurrence) => void
  onDropOnDate?: (e: React.DragEvent, targetDate: DateTime, hour?: number) => void
}

const HOUR_HEIGHT = 54 // px per hour

export const WeekView: React.FC<WeekViewProps> = ({
  anchorDate,
  occurrences,
  showLunar,
  showWeekNumbers,
  onSelectSlot,
  onSelectOccurrence,
  onDragStart,
  onDropOnDate
}) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const today = DateTime.local()
  const weekStart = anchorDate.startOf('week') // Monday

  const weekDays = Array.from({ length: 7 }, (_, i) => weekStart.plus({ days: i }))

  // Scroll to 08:00 on mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 8 * HOUR_HEIGHT
    }
  }, [])

  // Filter all-day vs timed occurrences
  const allDayOccurrences = occurrences.filter((o) => o.allDay)
  const timedOccurrences = occurrences.filter((o) => !o.allDay)

  const hours = Array.from({ length: 24 }, (_, i) => i)

  return (
    <div className="h-full w-full flex flex-col bg-white dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800/80 overflow-hidden shadow-xl select-none">
      {/* Header Row: Weekdays + All-day Events */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-900/80 shrink-0">
        <div className="grid grid-cols-[60px_repeat(7,1fr)] divide-x divide-slate-200 dark:divide-slate-800">
          {/* Week number / Corner */}
          <div className="flex flex-col items-center justify-center p-2 bg-slate-50 dark:bg-slate-950/40">
            {showWeekNumbers && <WeekNumber weekNumber={anchorDate.weekNumber} />}
          </div>

          {/* 7 Days Header */}
          {weekDays.map((day) => {
            const isToday = day.hasSame(today, 'day')
            return (
              <div key={day.toISO()} className="p-2 text-center flex flex-col items-center">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {day.toFormat('ccc')}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`text-sm font-bold h-7 w-7 rounded-full flex items-center justify-center ${
                      isToday
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/40'
                        : 'text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {day.day}
                  </span>
                  {showLunar && (
                    <LunarLabel day={day.day} month={day.month} year={day.year} />
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* All-Day Events Strip */}
        {allDayOccurrences.length > 0 && (
          <div className="grid grid-cols-[60px_repeat(7,1fr)] divide-x divide-slate-200 dark:divide-slate-800 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-950/30 min-h-[32px] text-xs">
            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold p-1.5 text-center flex items-center justify-center">
              All Day
            </div>
            {weekDays.map((day) => {
              const dayStr = day.toFormat('yyyy-MM-dd')
              const dayAllDay = allDayOccurrences.filter((occ) => {
                const occDate = DateTime.fromISO(occ.startUtc, { zone: 'utc' }).toFormat('yyyy-MM-dd')
                return occDate === dayStr
              })

              return (
                <div
                  key={dayStr}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => onDropOnDate?.(e, day)}
                  className="p-1 space-y-1"
                >
                  {dayAllDay.map((occ) => (
                    <div
                      key={occ.id}
                      draggable
                      onDragStart={(e) => onDragStart?.(e, occ)}
                      onClick={() => onSelectOccurrence?.(occ)}
                      className="px-2 py-0.5 rounded text-[11px] font-medium text-white truncate cursor-grab active:cursor-grabbing shadow-xs"
                      style={{ backgroundColor: occ.color || '#6366f1' }}
                    >
                      {occ.title}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Hourly Scroll Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto relative">
        <div className="grid grid-cols-[60px_repeat(7,1fr)] divide-x divide-slate-200 dark:divide-slate-800/60 relative min-h-[1296px]">
          {/* Time Gutter (Left) */}
          <div className="bg-slate-50/80 dark:bg-slate-950/30 text-right pr-2 select-none">
            {hours.map((hour) => (
              <div
                key={hour}
                style={{ height: `${HOUR_HEIGHT}px` }}
                className="text-[11px] font-mono text-slate-400 dark:text-slate-500 -translate-y-2"
              >
                {hour.toString().padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* 7 Day Columns */}
          {weekDays.map((day) => {
            const isToday = day.hasSame(today, 'day')
            const dayKey = day.toFormat('yyyy-MM-dd')

            const dayTimedEvents = timedOccurrences.filter((occ) => {
              const dt = DateTime.fromISO(occ.startUtc, { zone: 'utc' }).setZone('local')
              return dt.toFormat('yyyy-MM-dd') === dayKey
            })

            return (
              <div
                key={dayKey}
                className="relative cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-900/20"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  const dropY = e.clientY - rect.top
                  const droppedHour = Math.floor(dropY / HOUR_HEIGHT)
                  onDropOnDate?.(e, day, droppedHour)
                }}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  const clickY = e.clientY - rect.top
                  const clickedHour = Math.floor(clickY / HOUR_HEIGHT)
                  const startSlot = day.set({ hour: clickedHour, minute: 0, second: 0 })
                  const endSlot = startSlot.plus({ hours: 1 })
                  onSelectSlot?.(startSlot, endSlot)
                }}
              >
                {/* Horizontal Grid lines */}
                {hours.map((hour) => (
                  <div
                    key={hour}
                    style={{ height: `${HOUR_HEIGHT}px` }}
                    className="border-b border-slate-200/70 dark:border-slate-800/40"
                  />
                ))}

                {/* Live Current Time Line for Today */}
                {isToday && (
                  <div
                    className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                    style={{
                      top: `${((today.hour * 60 + today.minute) / 60) * HOUR_HEIGHT}px`
                    }}
                  >
                    <div className="h-2.5 w-2.5 -ml-1 rounded-full bg-rose-500 shadow-md shadow-rose-500/50" />
                    <div className="flex-1 h-0.5 bg-rose-500 shadow-sm" />
                  </div>
                )}

                {/* Event Cards */}
                {dayTimedEvents.map((occ) => {
                  const startDt = DateTime.fromISO(occ.startUtc, { zone: 'utc' }).setZone('local')
                  const endDt = DateTime.fromISO(occ.endUtc, { zone: 'utc' }).setZone('local')
                  const durationMinutes = Math.max(25, endDt.diff(startDt, 'minutes').minutes)

                  const topPos = ((startDt.hour * 60 + startDt.minute) / 60) * HOUR_HEIGHT
                  const height = (durationMinutes / 60) * HOUR_HEIGHT

                  return (
                    <div
                      key={occ.id}
                      draggable
                      onDragStart={(e) => onDragStart?.(e, occ)}
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectOccurrence?.(occ)
                      }}
                      style={{
                        top: `${topPos}px`,
                        height: `${height}px`,
                        backgroundColor: occ.color ? `${occ.color}26` : '#6366f126',
                        borderLeft: `4px solid ${occ.color || '#6366f1'}`
                      }}
                      className="absolute inset-x-1 rounded-lg p-1.5 text-xs text-slate-800 dark:text-slate-100 overflow-hidden shadow-md backdrop-blur-xs transition-all hover:z-30 hover:scale-[1.01] cursor-grab active:cursor-grabbing"
                    >
                      <div className="font-semibold text-[11px] truncate leading-tight">
                        {occ.title}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                        {startDt.toFormat('HH:mm')} – {endDt.toFormat('HH:mm')}
                      </div>
                      {occ.location && (
                        <div className="text-[9px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          📍 {occ.location}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default WeekView
