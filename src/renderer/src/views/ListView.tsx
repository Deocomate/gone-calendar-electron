import React, { useEffect, useLayoutEffect, useRef } from 'react'
import { DateTime } from 'luxon'
import { useTranslation } from 'react-i18next'
import { CalendarDays, Clock, MapPin, Repeat, Layers } from 'lucide-react'
import type { ExpandedOccurrence } from '@shared/event-model'
import { TODAY_COLOR, DEFAULT_EVENT_COLOR } from '@shared/mini-calendar-grid'
import { formatClockTime } from '@shared/time-format'
import { useDisplayPreferences } from '../context/DisplayPreferencesContext'
import LunarLabel from '../components/LunarLabel'

interface ListViewProps {
  anchorDate: DateTime
  occurrences: ExpandedOccurrence[]
  showLunar: boolean
  onSelectOccurrence?: (occ: ExpandedOccurrence) => void
  onAddEvent?: () => void
  /** Scrolled near the top/bottom of what's currently loaded - ask for more. */
  onNearEdge?: (direction: 'past' | 'future') => void
}

const NEAR_EDGE_PX = 600

export const ListView: React.FC<ListViewProps> = ({
  anchorDate,
  occurrences,
  showLunar,
  onSelectOccurrence,
  onAddEvent,
  onNearEdge
}) => {
  const { t, i18n } = useTranslation()
  const { timeFormat } = useDisplayPreferences()
  const today = DateTime.local()
  const scrollRef = useRef<HTMLDivElement>(null)
  const groupRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const hasScrolledRef = useRef(false)
  const lastAnchorKeyRef = useRef('')
  const edgeRequestedRef = useRef<{ past: boolean; future: boolean }>({ past: false, future: false })
  const prevScrollHeightRef = useRef(0)
  const isPrependingRef = useRef(false)

  const groupedOccurrences = React.useMemo(() => {
    const groups: { date: DateTime; items: ExpandedOccurrence[] }[] = []
    const map = new Map<string, ExpandedOccurrence[]>()

    for (const occ of occurrences) {
      const dt = DateTime.fromISO(occ.startUtc, { zone: 'utc' }).setZone('local')
      const key = dt.toFormat('yyyy-MM-dd')
      const list = map.get(key) || []
      list.push(occ)
      map.set(key, list)
    }

    const sortedKeys = Array.from(map.keys()).sort()
    for (const key of sortedKeys) {
      groups.push({
        date: DateTime.fromFormat(key, 'yyyy-MM-dd'),
        items: map.get(key)!
      })
    }

    return groups
  }, [occurrences])

  // Focus on today (or wherever anchorDate points) first, but stay put across
  // routine data refreshes so editing an event elsewhere doesn't yank the scroll.
  useEffect(() => {
    const anchorKey = anchorDate.toFormat('yyyy-MM-dd')
    const anchorChanged = anchorKey !== lastAnchorKeyRef.current
    lastAnchorKeyRef.current = anchorKey
    if (!anchorChanged && hasScrolledRef.current) return
    if (groupedOccurrences.length === 0) return

    let closestKey: string | null = null
    for (const { date } of groupedOccurrences) {
      const key = date.toFormat('yyyy-MM-dd')
      if (key === anchorKey) {
        closestKey = key
        break
      }
      if (key > anchorKey && !closestKey) closestKey = key
    }
    if (!closestKey) closestKey = groupedOccurrences[groupedOccurrences.length - 1].date.toFormat('yyyy-MM-dd')

    requestAnimationFrame(() => {
      groupRefs.current.get(closestKey!)?.scrollIntoView({ block: 'start' })
    })
    hasScrolledRef.current = true
  }, [anchorDate, groupedOccurrences])

  // New data landing means the loaded range actually grew - allow asking again.
  useEffect(() => {
    edgeRequestedRef.current = { past: false, future: false }
  }, [occurrences])

  // Loading more past events inserts groups above the current scroll position -
  // compensate so the view doesn't jump. Future events land below, no compensation needed.
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (el && isPrependingRef.current) {
      el.scrollTop += el.scrollHeight - prevScrollHeightRef.current
    }
    isPrependingRef.current = false
  }, [groupedOccurrences])

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el || !onNearEdge) return
    const { scrollTop, scrollHeight, clientHeight } = el

    if (scrollTop < NEAR_EDGE_PX && !edgeRequestedRef.current.past) {
      edgeRequestedRef.current.past = true
      isPrependingRef.current = true
      prevScrollHeightRef.current = scrollHeight
      onNearEdge('past')
    } else if (scrollHeight - clientHeight - scrollTop < NEAR_EDGE_PX && !edgeRequestedRef.current.future) {
      edgeRequestedRef.current.future = true
      onNearEdge('future')
    }
  }

  if (occurrences.length === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-surface p-8 text-center select-none">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-hover">
          <CalendarDays className="h-8 w-8 text-accent" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-primary">
          {anchorDate.setLocale(i18n.language).toFormat('MMMM yyyy')}
        </h3>
        <p className="mb-5 max-w-sm text-sm text-muted">{t('list.empty')}</p>
        <button type="button" onClick={onAddEvent} className="gc-btn-primary">
          + {t('list.addEvent')}
        </button>
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="h-full w-full space-y-6 overflow-y-auto bg-surface p-5 select-none"
    >
      {groupedOccurrences.map(({ date, items }) => {
        const isToday = date.hasSame(today, 'day')
        const isWeekend = date.weekday >= 6
        const totalDayCount = items.length
        const dateKey = date.toFormat('yyyy-MM-dd')
        const dateFormat = date.year === today.year ? 'cccc, d MMMM' : 'cccc, d MMMM yyyy'

        return (
          <div
            key={dateKey}
            ref={(el) => {
              if (el) groupRefs.current.set(dateKey, el)
              else groupRefs.current.delete(dateKey)
            }}
            className="gc-stack-container space-y-2.5"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-surface/90 backdrop-blur-md py-1.5 border-b border-hairline">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="truncate rounded-full px-3 py-1 text-sm font-semibold"
                  style={
                    isToday
                      ? { color: TODAY_COLOR, backgroundColor: `${TODAY_COLOR}14` }
                      : isWeekend
                        ? { color: TODAY_COLOR, backgroundColor: 'var(--color-hover-fill)' }
                        : undefined
                  }
                >
                  {date.setLocale(i18n.language).toFormat(dateFormat)}
                </span>
                {totalDayCount >= 2 && (
                  <span className="flex shrink-0 items-center gap-1 text-[10px] font-medium text-muted bg-hover px-1.5 py-0.5 rounded-[3px] border border-hairline font-mono">
                    <Layers className="w-3 h-3 text-muted" />
                    {totalDayCount}
                  </span>
                )}
              </div>
              {showLunar && (
                <LunarLabel day={date.day} month={date.month} year={date.year} full className="shrink-0" />
              )}
            </div>

            <div className="grid gap-2 pl-1">
              {items.map((occ, idx) => {
                const startDt = DateTime.fromISO(occ.startUtc, { zone: 'utc' }).setZone('local')
                const endDt = DateTime.fromISO(occ.endUtc, { zone: 'utc' }).setZone('local')
                const bg = occ.color || DEFAULT_EVENT_COLOR

                return (
                  <button
                    type="button"
                    key={occ.id}
                    onClick={() => onSelectOccurrence?.(occ)}
                    className="gc-event gc-stack-card-3d flex w-full cursor-pointer flex-col gap-1 rounded-[3px] px-3.5 py-3 text-left text-white shadow-xs sm:flex-row sm:items-center sm:justify-between"
                    style={{
                      backgroundColor: bg,
                      animationDelay: `${idx * 20}ms`
                    }}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold">{occ.title}</h4>
                        {occ.isRecurring && <Repeat className="h-3.5 w-3.5 opacity-80" />}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs opacity-90">
                      <span className="inline-flex items-center gap-1 font-mono">
                        <Clock className="h-3.5 w-3.5" />
                        {occ.allDay
                          ? t('list.allDay')
                          : `${formatClockTime(startDt, timeFormat)} - ${formatClockTime(endDt, timeFormat)}`}
                      </span>
                      {occ.location && (
                        <span className="inline-flex max-w-[150px] items-center gap-1 truncate">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          {occ.location}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default ListView
