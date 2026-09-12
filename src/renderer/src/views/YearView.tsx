import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DateTime } from 'luxon'
import type { ExpandedOccurrence } from '@shared/event-model'
import { TODAY_COLOR, DEFAULT_EVENT_COLOR } from '@shared/mini-calendar-grid'
import { weekdayShortLabels } from '../i18n/weekday-labels'
import LunarLabel from '../components/LunarLabel'

interface YearViewProps {
  anchorDate: DateTime
  occurrences: ExpandedOccurrence[]
  showLunar: boolean
  onSelectMonth: (year: number, month: number) => void
  onSelectDate: (date: DateTime) => void
  /** Reports the mounted year span so the container can widen its event query to
   *  cover every year the user can currently scroll into. */
  onVisibleYearsChange?: (startYear: number, endYear: number) => void
}

/** How close to an edge (px) triggers loading another year in that direction. */
const EXTEND_THRESHOLD_PX = 600
/** Cap on how many years stay mounted at once, so a long scroll session doesn't
 *  grow the DOM forever - and so the event query the container runs for the
 *  mounted span stays bounded. */
const MAX_YEARS_WINDOW = 5
/** Height of the pinned year bar; the scroller sits below it, never under it. */
const HEADER_H = 44

// ---------------------------------------------------------------------------
// Month card
// ---------------------------------------------------------------------------

interface MonthCardProps {
  year: number
  month: number
  weekdayHeaders: string[]
  locale: string
  todayKey: string
  showLunar: boolean
  colorsByDay: Map<string, string[]>
  onSelectMonth: (year: number, month: number) => void
  onSelectDate: (date: DateTime) => void
  registerMonthRef: (key: string, el: HTMLDivElement | null) => void
}

/** Memoized so extending the year window re-renders only the newly added year -
 *  without this, every scroll-triggered extend re-rendered ~2,000 day buttons
 *  (each running a lunar conversion), which is what made the scroll stutter. */
const MonthCard = React.memo<MonthCardProps>(
  ({
    year,
    month,
    weekdayHeaders,
    locale,
    todayKey,
    showLunar,
    colorsByDay,
    onSelectMonth,
    onSelectDate,
    registerMonthRef
  }) => {
    const cells = useMemo(() => {
      const first = DateTime.local(year, month, 1)
      const daysInMonth = first.daysInMonth || 31
      const out: (DateTime | null)[] = []
      for (let pad = 1; pad < first.weekday; pad++) out.push(null)
      for (let d = 1; d <= daysInMonth; d++) out.push(DateTime.local(year, month, d))
      return out
    }, [year, month])

    const monthLabel = useMemo(
      () => DateTime.local(year, month, 1).setLocale(locale).toFormat('MMMM'),
      [year, month, locale]
    )

    const setRef = useCallback(
      (el: HTMLDivElement | null) => registerMonthRef(`${year}-${month}`, el),
      [registerMonthRef, year, month]
    )

    return (
      <div
        ref={setRef}
        onClick={() => onSelectMonth(year, month)}
        className="cursor-pointer rounded-lg p-3 transition-colors duration-150 hover:bg-hover"
      >
        {/* Centered over the week grid below it, rather than pinned to the
            left edge - reads as the month's own label, not a section header. */}
        <h4 className="mb-2 text-center text-lg font-semibold text-primary">{monthLabel}</h4>

        <div className="mb-1 grid grid-cols-7 text-center text-xs font-medium text-muted">
          {weekdayHeaders.map((h, idx) => (
            <span key={`${h}-${idx}`} className={idx >= 5 ? 'text-today' : ''}>
              {h}
            </span>
          ))}
        </div>

        {/* Day cells size with `w-full max-w-[40px]` rather than a fixed width so
            they shrink instead of spilling when four year-columns are squeezed
            into a narrow window. */}
        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {cells.map((day, cellIdx) => {
            if (!day) return <div key={`empty-${cellIdx}`} className="h-10 w-full" />

            const key = day.toFormat('yyyy-MM-dd')
            const isToday = key === todayKey
            const blockColor = colorsByDay.get(key)?.[0]

            return (
              <button
                type="button"
                key={key}
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectDate(day)
                }}
                className={`relative mx-auto flex h-10 w-full max-w-[40px] flex-col items-center justify-center gap-0 rounded-md text-[15px] leading-none text-primary transition-all duration-150 hover:bg-hover ${
                  blockColor ? 'gc-stack-card-3d font-semibold' : ''
                }`}
                style={
                  isToday
                    ? { color: '#fff', backgroundColor: TODAY_COLOR, fontWeight: 600 }
                    : blockColor
                      ? { backgroundColor: `${blockColor}33`, borderRadius: 6 }
                      : undefined
                }
              >
                <span>{day.day}</span>
                {/* Small enough to sit under the day number without crowding
                    it - only the lunar day shows here, not the full label. */}
                {showLunar && (
                  <LunarLabel
                    day={day.day}
                    month={day.month}
                    year={day.year}
                    className={`!text-[9px] leading-none ${isToday ? '!text-white/85' : ''}`}
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>
    )
  }
)
MonthCard.displayName = 'MonthCard'

// ---------------------------------------------------------------------------
// Year block
// ---------------------------------------------------------------------------

type YearBlockProps = Omit<MonthCardProps, 'month'> & {
  registerYearRef: (year: number, el: HTMLDivElement | null) => void
}

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

const YearBlock = React.memo<YearBlockProps>(({ year, registerYearRef, ...monthProps }) => {
  const setRef = useCallback(
    (el: HTMLDivElement | null) => registerYearRef(year, el),
    [registerYearRef, year]
  )

  return (
    <div ref={setRef} className="pb-10">
      {/* The year label itself lives in the pinned bar above the scroller. This
          in-flow heading is what the bar mirrors, and it keeps each block
          self-labelled when the list is read top to bottom. */}
      <h3 className="mb-4 py-2 text-center text-2xl font-bold text-primary">{year}</h3>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {MONTHS.map((month) => (
          <MonthCard key={month} year={year} month={month} {...monthProps} />
        ))}
      </div>
    </div>
  )
})
YearBlock.displayName = 'YearBlock'

// ---------------------------------------------------------------------------
// Year view
// ---------------------------------------------------------------------------

export const YearView: React.FC<YearViewProps> = ({
  anchorDate,
  occurrences,
  showLunar,
  onSelectMonth,
  onSelectDate,
  onVisibleYearsChange
}) => {
  const { t, i18n } = useTranslation()

  const scrollRef = useRef<HTMLDivElement>(null)
  const yearRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const monthRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  /** Guards against a second extend firing before the first has been laid out
   *  and scroll-compensated (a fast fling emits many scroll events per frame). */
  const busyRef = useRef(false)
  const rafRef = useRef(0)
  /** Scroll position to restore after the year list changes, expressed as an
   *  offset from a year block that survives the change - see captureAnchor. */
  const restoreRef = useRef<{ year: number; delta: number } | null>(null)

  const [years, setYears] = useState<number[]>(() => {
    const y = anchorDate.year
    return [y - 1, y, y + 1]
  })
  const [activeYear, setActiveYear] = useState(anchorDate.year)

  // Callers pass inline arrows, which would change identity on every parent
  // render and defeat MonthCard's memo. Route them through refs so the props
  // handed down stay stable for the lifetime of the view.
  const selectMonthRef = useRef(onSelectMonth)
  const selectDateRef = useRef(onSelectDate)
  useEffect(() => {
    selectMonthRef.current = onSelectMonth
    selectDateRef.current = onSelectDate
  })
  const handleSelectMonth = useCallback(
    (year: number, month: number) => selectMonthRef.current(year, month),
    []
  )
  const handleSelectDate = useCallback((date: DateTime) => selectDateRef.current(date), [])

  const registerYearRef = useCallback((year: number, el: HTMLDivElement | null) => {
    if (el) yearRefs.current.set(year, el)
    else yearRefs.current.delete(year)
  }, [])
  const registerMonthRef = useCallback((key: string, el: HTMLDivElement | null) => {
    if (el) monthRefs.current.set(key, el)
    else monthRefs.current.delete(key)
  }, [])

  const weekdayHeaders = useMemo(() => weekdayShortLabels(t, 1), [t, i18n.language])
  const todayKey = useMemo(() => DateTime.local().toFormat('yyyy-MM-dd'), [])

  const colorsByDay = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const occ of occurrences) {
      // All-day occurrences are stored as a bare calendar date; running those
      // through a UTC->local conversion would shift them a day west of GMT.
      const key = occ.allDay
        ? occ.startUtc.slice(0, 10)
        : DateTime.fromISO(occ.startUtc, { zone: 'utc' }).setZone('local').toFormat('yyyy-MM-dd')
      const list = map.get(key)
      const color = occ.color || DEFAULT_EVENT_COLOR
      if (!list) map.set(key, [color])
      else if (list.length < 3 && !list.includes(color)) list.push(color)
    }
    return map
  }, [occurrences])

  /** Records where the viewport sits relative to a year block that will still be
   *  mounted after the pending update. Restoring from a stable element covers
   *  prepend, append and trim-from-either-end with one formula - the previous
   *  scrollHeight-delta approach only compensated prepends, so trimming the
   *  earliest year while scrolling down jumped the view by a whole block. */
  const captureAnchor = useCallback((surviving: Set<number>) => {
    const el = scrollRef.current
    if (!el) return
    const top = el.scrollTop
    const candidates = [...yearRefs.current.entries()]
      .filter(([year]) => surviving.has(year))
      .map(([year, node]) => ({ year, top: node.offsetTop }))
      .sort((a, b) => a.top - b.top)
    if (candidates.length === 0) {
      restoreRef.current = null
      return
    }
    // The lowest block that still starts at or above the viewport top; falls
    // back to the first block when the viewport sits above all of them.
    let pick = candidates[0]
    for (const c of candidates) if (c.top <= top + 1) pick = c
    restoreRef.current = { year: pick.year, delta: top - pick.top }
  }, [])

  /** Year whose block currently occupies the top of the viewport. */
  const syncActiveYear = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const probe = el.scrollTop + 8
    const candidates = [...yearRefs.current.entries()]
      .map(([year, node]) => ({ year, top: node.offsetTop }))
      .sort((a, b) => a.top - b.top)
    if (candidates.length === 0) return
    let pick = candidates[0]
    for (const c of candidates) if (c.top <= probe) pick = c
    setActiveYear((prev) => (prev === pick.year ? prev : pick.year))
  }, [])

  const extend = useCallback(
    (direction: 'up' | 'down') => {
      busyRef.current = true
      const sorted = [...years].sort((a, b) => a - b)
      let next =
        direction === 'up'
          ? [sorted[0] - 1, ...sorted]
          : [...sorted, sorted[sorted.length - 1] + 1]
      // Extend and trim in a single update: two updates meant two renders and
      // two layout passes per scroll step, and the trim pass never compensated
      // its own scroll shift.
      if (next.length > MAX_YEARS_WINDOW) {
        next =
          direction === 'up'
            ? next.slice(0, MAX_YEARS_WINDOW)
            : next.slice(next.length - MAX_YEARS_WINDOW)
      }
      captureAnchor(new Set(next))
      setYears(next)
    },
    [years, captureAnchor]
  )

  // Scroll work is coalesced to one rAF: a trackpad fling emits scroll events
  // far faster than a frame, and doing DOM reads per event is what turned an
  // upward fling into a stutter.
  const handleScroll = useCallback(() => {
    if (rafRef.current) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0
      const el = scrollRef.current
      if (!el) return
      syncActiveYear()
      if (busyRef.current) return
      const { scrollTop, scrollHeight, clientHeight } = el
      if (scrollTop < EXTEND_THRESHOLD_PX) extend('up')
      else if (scrollHeight - clientHeight - scrollTop < EXTEND_THRESHOLD_PX) extend('down')
    })
  }, [extend, syncActiveYear])

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  // Restore the viewport before the browser paints, so a prepend never shows a
  // frame at the wrong offset.
  useLayoutEffect(() => {
    const el = scrollRef.current
    const restore = restoreRef.current
    restoreRef.current = null
    if (el && restore) {
      const node = yearRefs.current.get(restore.year)
      if (node) {
        const target = node.offsetTop + restore.delta
        if (Math.abs(el.scrollTop - target) > 0.5) el.scrollTop = target
      }
    }
    syncActiveYear()
    // Release on the next frame rather than immediately: the scroll event for
    // the compensating assignment above is still queued, and letting it through
    // with the guard already down would chain a second extend off one gesture.
    const id = requestAnimationFrame(() => {
      busyRef.current = false
    })
    return () => cancelAnimationFrame(id)
  }, [years, syncActiveYear])

  useEffect(() => {
    if (!onVisibleYearsChange || years.length === 0) return
    const sorted = [...years].sort((a, b) => a - b)
    onVisibleYearsChange(sorted[0], sorted[sorted.length - 1])
  }, [years, onVisibleYearsChange])

  // Re-center on the anchor month whenever it changes from outside this view (nav
  // arrows, "today", jumping in from another view) - not from the user's own scroll.
  useEffect(() => {
    const y = anchorDate.year
    const month = anchorDate.month
    setYears((prev) => (prev.includes(y) ? prev : [y - 1, y, y + 1]))
    setActiveYear(y)
    busyRef.current = true
    // Two frames: one for the year window above to commit, one for its month
    // cards to lay out so offsetTop is real.
    const outer = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = scrollRef.current
        const node = monthRefs.current.get(`${y}-${month}`)
        // offsetTop is relative to the scroller (it is the offset parent), so
        // this lands the month flush with the top of the scroll area - under
        // the pinned bar is no longer possible, the bar sits outside it.
        if (el && node) el.scrollTop = node.offsetTop
        busyRef.current = false
        syncActiveYear()
      })
    })
    return () => cancelAnimationFrame(outer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorDate.year, anchorDate.month])

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col bg-surface select-none">
      {/* Pinned outside the scroller rather than sticky inside it. As a sticky
          child it un-pinned at its own block's bottom edge and the next year's
          label only pinned once that block reached the top, so the label blinked
          out across the gap between blocks - and translucent day cells smeared
          through it in the scroller's top padding. */}
      <div
        className="flex shrink-0 items-center justify-center border-b border-hairline bg-surface"
        style={{ height: HEADER_H }}
      >
        <h3 className="text-2xl font-bold text-primary tabular-nums">{activeYear}</h3>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="relative min-h-0 flex-1 overflow-y-auto px-6 pt-4"
      >
        {[...years]
          .sort((a, b) => a - b)
          .map((year) => (
            <YearBlock
              key={year}
              year={year}
              weekdayHeaders={weekdayHeaders}
              locale={i18n.language}
              todayKey={todayKey}
              showLunar={showLunar}
              colorsByDay={colorsByDay}
              onSelectMonth={handleSelectMonth}
              onSelectDate={handleSelectDate}
              registerMonthRef={registerMonthRef}
              registerYearRef={registerYearRef}
            />
          ))}
      </div>
    </div>
  )
}

export default YearView
