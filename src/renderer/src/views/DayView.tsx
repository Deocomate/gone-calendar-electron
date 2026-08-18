import React, { useRef, useEffect } from 'react'
import { DateTime } from 'luxon'
import type { ExpandedOccurrence } from '@shared/event-model'
import LunarLabel from '../components/LunarLabel'

interface DayViewProps {
  anchorDate: DateTime
  occurrences: ExpandedOccurrence[]
  showLunar: boolean
  onSelectOccurrence?: (occ: ExpandedOccurrence) => void
  onSelectSlot?: (start: DateTime, end: DateTime) => void
  onDragStart?: (e: React.DragEvent, occ: ExpandedOccurrence) => void
  onDropOnDate?: (e: React.DragEvent, targetDate: DateTime, targetHour?: number) => void
}

const HOUR_HEIGHT = 60

export const DayView: React.FC<DayViewProps> = ({
  anchorDate,
  occurrences,
  showLunar,
  onSelectOccurrence,
  onSelectSlot,
  onDragStart,
  onDropOnDate
}) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const today = DateTime.local()
  const isToday = anchorDate.hasSame(today, 'day')

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 8 * HOUR_HEIGHT
    }
  }, [anchorDate])

  const allDayOccurrences = occurrences.filter((o) => o.allDay)
  const timedOccurrences = occurrences.filter((o) => !o.allDay)
  const hours = Array.from({ length: 24 }, (_, i) => i)

  return (
    <div className="h-full w-full flex flex-col bg-slate-950/60 rounded-2xl border border-slate-800/80 overflow-hidden shadow-xl select-none">
      {/* Header Banner */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span
            className={`text-2xl font-bold h-11 w-11 rounded-2xl flex items-center justify-center ${
              isToday
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/40'
                : 'bg-slate-800 text-slate-100'
            }`}
          >
            {anchorDate.day}
          </span>
          <div>
            <h3 className="text-base font-bold text-slate-100 capitalize">
              {anchorDate.toFormat('cccc, dd MMMM yyyy')}
            </h3>
            {showLunar && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs text-slate-400">Âm lịch:</span>
                <LunarLabel
                  day={anchorDate.day}
                  month={anchorDate.month}
                  year={anchorDate.year}
                  className="text-xs"
                />
              </div>
            )}
          </div>
        </div>

        {allDayOccurrences.length > 0 && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDropOnDate?.(e, anchorDate)}
            className="flex items-center gap-2 max-w-md overflow-x-auto p-1"
          >
            {allDayOccurrences.map((occ) => (
              <div
                key={occ.id}
                draggable
                onDragStart={(e) => onDragStart?.(e, occ)}
                onClick={() => onSelectOccurrence?.(occ)}
                className="px-3 py-1 rounded-lg text-xs font-semibold text-white truncate cursor-grab active:cursor-grabbing shadow-md"
                style={{ backgroundColor: occ.color || '#6366f1' }}
              >
                {occ.title}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hourly Timeline */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto relative">
        <div className="grid grid-cols-[70px_1fr] divide-x divide-slate-800/60 relative min-h-[1440px]">
          {/* Time Gutter */}
          <div className="bg-slate-950/30 text-right pr-3 select-none">
            {hours.map((hour) => (
              <div
                key={hour}
                style={{ height: `${HOUR_HEIGHT}px` }}
                className="text-xs font-mono text-slate-500 -translate-y-2"
              >
                {hour.toString().padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Main Day Timeline Area */}
          <div
            className="relative cursor-pointer hover:bg-slate-900/10"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              const dropY = e.clientY - rect.top
              const droppedHour = Math.floor(dropY / HOUR_HEIGHT)
              onDropOnDate?.(e, anchorDate, droppedHour)
            }}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              const clickY = e.clientY - rect.top
              const clickedHour = Math.floor(clickY / HOUR_HEIGHT)
              const startSlot = anchorDate.set({ hour: clickedHour, minute: 0, second: 0 })
              const endSlot = startSlot.plus({ hours: 1 })
              onSelectSlot?.(startSlot, endSlot)
            }}
          >
            {/* Grid lines */}
            {hours.map((hour) => (
              <div
                key={hour}
                style={{ height: `${HOUR_HEIGHT}px` }}
                className="border-b border-slate-800/40"
              />
            ))}

            {/* Current Time Line */}
            {isToday && (
              <div
                className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                style={{
                  top: `${((today.hour * 60 + today.minute) / 60) * HOUR_HEIGHT}px`
                }}
              >
                <div className="h-3 w-3 -ml-1.5 rounded-full bg-rose-500 shadow-md shadow-rose-500/50" />
                <div className="flex-1 h-0.5 bg-rose-500 shadow-sm" />
              </div>
            )}

            {/* Event Blocks */}
            {timedOccurrences.map((occ) => {
              const startDt = DateTime.fromISO(occ.startUtc, { zone: 'utc' }).setZone('local')
              const endDt = DateTime.fromISO(occ.endUtc, { zone: 'utc' }).setZone('local')
              const durationMinutes = Math.max(30, endDt.diff(startDt, 'minutes').minutes)

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
                    backgroundColor: occ.color ? `${occ.color}33` : '#6366f133',
                    borderLeft: `5px solid ${occ.color || '#6366f1'}`
                  }}
                  className="absolute inset-x-4 rounded-xl p-3 text-xs text-slate-100 overflow-hidden shadow-lg backdrop-blur-md transition-all hover:z-30 hover:scale-[1.005] cursor-grab active:cursor-grabbing"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-100">{occ.title}</span>
                    <span className="text-xs text-slate-400 font-mono">
                      {startDt.toFormat('HH:mm')} – {endDt.toFormat('HH:mm')}
                    </span>
                  </div>

                  {occ.location && (
                    <div className="text-xs text-slate-300 mt-1 flex items-center gap-1">
                      <span>📍</span> {occ.location}
                    </div>
                  )}

                  {occ.notes && (
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {occ.notes}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DayView
