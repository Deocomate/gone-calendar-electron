import React, { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { DateTime } from 'luxon'
import type { ExpandedOccurrence } from '@shared/event-model'
import { TODAY_COLOR, DEFAULT_EVENT_COLOR } from '@shared/mini-calendar-grid'
import { weekdayShortLabels } from '../i18n/weekday-labels'

interface YearViewProps {
  anchorDate: DateTime
  occurrences: ExpandedOccurrence[]
  onSelectMonth: (year: number, month: number) => void
  onSelectDate: (date: DateTime) => void
}

/** How close to an edge (px) triggers loading another year in that direction. */
const EXTEND_THRESHOLD_PX = 400
/** Cap on how many years stay mounted at once, so a long scroll session doesn't
 *  grow the DOM forever. */
const MAX_YEARS_WINDOW = 7

export const YearView: React.FC<YearViewProps> = ({
  anchorDate,
  occurrences,
  onSelectMonth,
  onSelectDate
}) => {
  const { t, i18n } = useTranslation()
  const today = DateTime.local()
  const headers = weekdayShortLabels(t, 1)

  const scrollRef = useRef<HTMLDivElement>(null)
  const monthRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const busyRef = useRef(false)
  const isPrependRef = useRef(false)
  const prevScrollHeightRef = useRef(0)

  const [years, setYears] = useState<number[]>(() => {
    const y = anchorDate.year
    return [y - 1, y, y + 1]
  })

  // Continuous scroll: reveal an earlier/later year once the pointer nears an edge.
  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el || busyRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = el

    if (scrollTop < EXTEND_THRESHOLD_PX) {
      busyRef.current = true
      isPrependRef.current = true
      prevScrollHeightRef.current = scrollHeight
      setYears((prev) => [Math.min(...prev) - 1, ...prev])
    } else if (scrollHeight - clientHeight - scrollTop < EXTEND_THRESHOLD_PX) {
      busyRef.current = true
      isPrependRef.current = false
      setYears((prev) => [...prev, Math.max(...prev) + 1])
    }
  }, [])

  // Prepending shifts everything down visually - compensate scrollTop so the view
  // doesn't jump. Appending needs no compensation (it lands below the fold).
  useLayoutEffect(() => {
    const el = scrollRef.current
    const wasPrepend = isPrependRef.current
    if (el && wasPrepend) {
      el.scrollTop += el.scrollHeight - prevScrollHeightRef.current
    }
    isPrependRef.current = false
    busyRef.current = false

    // Trim from the far end in its own pass (never combined with the compensation
    // above) - dropping invisible off-screen content needs no scroll adjustment,
    // but computing that from a single combined delta would under-compensate.
    if (years.length > MAX_YEARS_WINDOW) {
      setYears((prev) => {
        const sorted = [...prev].sort((a, b) => a - b)
        return wasPrepend
          ? sorted.slice(0, MAX_YEARS_WINDOW)
          : sorted.slice(sorted.length - MAX_YEARS_WINDOW)
      })
    }
  }, [years])

  // Re-center on the anchor month whenever it changes from outside this view (nav
  // arrows, "today", jumping in from another view) - not from the user's own scroll.
  useEffect(() => {
    const y = anchorDate.year
    setYears((prev) => (prev.includes(y) ? prev : [y - 1, y, y + 1]))
    const key = `${y}-${anchorDate.month}`
    requestAnimationFrame(() => {
      monthRefs.current.get(key)?.scrollIntoView({ block: 'start' })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorDate.year, anchorDate.month])

  const colorsByDay = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const occ of occurrences) {
      const dt = DateTime.fromISO(occ.startUtc, { zone: 'utc' }).setZone('local')
      const key = dt.toFormat('yyyy-MM-dd')
      const list = map.get(key) || []
      const color = occ.color || DEFAULT_EVENT_COLOR
      if (!list.includes(color)) list.push(color)
      map.set(key, list.slice(0, 3))
    }
    return map
  }, [occurrences])

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="h-full w-full overflow-y-auto bg-surface p-6 select-none"
    >
      {[...years]
        .sort((a, b) => a - b)
        .map((year) => (
          <div key={year} className="mb-10">
            {/* Sticky, not fixed to the app header - it's this year's own label, so it
                naturally updates as you scroll from one year's block into the next. */}
            <h3 className="sticky top-0 z-10 mb-4 bg-surface/95 py-2 text-center text-2xl font-bold text-primary backdrop-blur-sm">
              {year}
            </h3>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((monthNum) => {
                const firstDayOfMonth = DateTime.local(year, monthNum, 1)
                const daysInMonth = firstDayOfMonth.daysInMonth || 31
                const startWeekday = firstDayOfMonth.weekday
                const cells: (DateTime | null)[] = []
                for (let pad = 1; pad < startWeekday; pad++) cells.push(null)
                for (let d = 1; d <= daysInMonth; d++) {
                  cells.push(DateTime.local(year, monthNum, d))
                }

                return (
                  <div
                    key={monthNum}
                    ref={(el) => {
                      const key = `${year}-${monthNum}`
                      if (el) monthRefs.current.set(key, el)
                      else monthRefs.current.delete(key)
                    }}
                    onClick={() => onSelectMonth(year, monthNum)}
                    className="cursor-pointer rounded-lg p-3 transition-colors duration-150 hover:bg-hover"
                  >
                    <h4 className="mb-2 text-sm font-semibold text-primary">
                      {firstDayOfMonth.setLocale(i18n.language).toFormat('MMMM')}
                    </h4>

                    <div className="mb-1 grid grid-cols-7 text-center text-[10px] font-medium text-muted">
                      {headers.map((h, idx) => (
                        <span key={h} className={idx >= 5 ? 'text-today' : ''}>
                          {h}
                        </span>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-0.5 text-center text-xs">
                      {cells.map((day, cellIdx) => {
                        if (!day) return <div key={`empty-${cellIdx}`} className="h-6 w-6" />

                        const isToday = day.hasSame(today, 'day')
                        const colors = colorsByDay.get(day.toFormat('yyyy-MM-dd')) || []
                        const blockColor = colors[0]

                        return (
                          <button
                            type="button"
                            key={day.toISO()}
                            onClick={(e) => {
                              e.stopPropagation()
                              onSelectDate(day)
                            }}
                            className={`relative mx-auto flex h-6 w-6 items-center justify-center rounded text-[11px] text-primary transition-all duration-150 hover:bg-hover ${
                              colors.length > 0 ? 'gc-stack-card-3d font-semibold' : ''
                            }`}
                            style={
                              isToday
                                ? { color: '#fff', backgroundColor: TODAY_COLOR, fontWeight: 600 }
                                : blockColor
                                  ? { backgroundColor: `${blockColor}33`, borderRadius: 4 }
                                  : undefined
                            }
                          >
                            {day.day}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
    </div>
  )
}

export default YearView
