import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { sortOccurrencesWithinDay } from '@shared/occurrence-order'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { DateTime } from 'luxon'
import { X, Plus } from 'lucide-react'
import type { ExpandedOccurrence } from '@shared/event-model'
import { formatClockTime } from '@shared/time-format'
import { useDisplayPreferences } from '../context/DisplayPreferencesContext'
import EventPill from './EventPill'

export interface DayPeekData {
  day: DateTime
  occurrences: ExpandedOccurrence[]
  /** Cell the peek grew from, in viewport coordinates. */
  anchorRect: DOMRect
}

interface DayPeekPopoverProps {
  data: DayPeekData | null
  onClose: () => void
  onSelectOccurrence?: (occ: ExpandedOccurrence) => void
  onAddEvent?: (day: DateTime) => void
  onOpenDay?: (day: DateTime) => void
  draggedOccurrenceId?: string
}

const MIN_WIDTH = 260
const MARGIN = 8

/**
 * The full list of a day's events, opened deliberately from the month grid.
 *
 * This replaces a hover flyout that appeared whenever the pointer crossed a busy
 * cell and was positioned beside it - so it covered the neighbouring days, which
 * are exactly the ones you are trying to read, and it did so without being
 * asked. This one opens on click and grows *over its own cell*: the day it hides
 * is the day whose contents it is already showing.
 */
export const DayPeekPopover: React.FC<DayPeekPopoverProps> = ({
  data,
  onClose,
  onSelectOccurrence,
  onAddEvent,
  onOpenDay,
  draggedOccurrenceId
}) => {
  const { t } = useTranslation()
  const { timeFormat } = useDisplayPreferences()
  const panelRef = useRef<HTMLDivElement>(null)
  const [style, setStyle] = useState<React.CSSProperties | null>(null)

  // Position after mount so the panel's real height can be measured and clamped
  // to the viewport rather than guessed.
  useLayoutEffect(() => {
    if (!data || !panelRef.current) {
      setStyle(null)
      return
    }
    const rect = data.anchorRect
    const panel = panelRef.current.getBoundingClientRect()
    const width = Math.max(MIN_WIDTH, rect.width + 24)

    // Grow from the cell, centred on it, then pull back inside the viewport.
    let left = rect.left + rect.width / 2 - width / 2
    left = Math.min(Math.max(MARGIN, left), window.innerWidth - width - MARGIN)

    let top = rect.top - 6
    if (top + panel.height > window.innerHeight - MARGIN) {
      top = Math.max(MARGIN, window.innerHeight - panel.height - MARGIN)
    }

    setStyle({ left: `${left}px`, top: `${top}px`, width: `${width}px` })
  }, [data])

  useEffect(() => {
    if (!data) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    const onPointerDown = (e: MouseEvent): void => {
      if (!panelRef.current?.contains(e.target as Node)) onClose()
    }
    // A popover pinned to viewport coordinates would drift away from its cell,
    // so scrolling or resizing dismisses it instead.
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onPointerDown, true)
    window.addEventListener('resize', onClose)
    window.addEventListener('scroll', onClose, true)
    window.addEventListener('dragstart', onClose)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onPointerDown, true)
      window.removeEventListener('resize', onClose)
      window.removeEventListener('scroll', onClose, true)
      window.removeEventListener('dragstart', onClose)
    }
  }, [data, onClose])

  if (!data || typeof document === 'undefined' || draggedOccurrenceId) return null

  const { day, occurrences } = data
  const ordered = sortOccurrencesWithinDay(occurrences)
  const allDay = ordered.filter((o) => o.allDay)
  const timed = ordered.filter((o) => !o.allDay)

  const renderPill = (occ: ExpandedOccurrence): React.ReactNode => (
    <EventPill
      key={occ.id}
      title={occ.title}
      color={occ.color}
      time={
        occ.allDay
          ? undefined
          : formatClockTime(DateTime.fromISO(occ.startUtc, { zone: 'utc' }).toLocal(), timeFormat)
      }
      onClick={(e) => {
        e.stopPropagation()
        onSelectOccurrence?.(occ)
        onClose()
      }}
    />
  )

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-label={day.toFormat('cccc, dd/MM/yyyy')}
      style={{ ...(style ?? { left: -9999, top: -9999, width: MIN_WIDTH }), position: 'fixed' }}
      className="z-[9999] flex max-h-[60vh] flex-col overflow-hidden rounded-[4px] border border-hairline bg-surface text-primary shadow-xl select-none"
    >
      <div className="flex shrink-0 items-start justify-between gap-2 border-b border-hairline px-3 py-2">
        <button
          type="button"
          onClick={() => {
            onOpenDay?.(day)
            onClose()
          }}
          className="min-w-0 cursor-pointer text-left"
          title={t('actions.openDay')}
        >
          <div className="text-[10px] tracking-wide text-muted uppercase">
            {day.toFormat('ccc')}
          </div>
          <div className="text-xl leading-tight font-semibold text-primary">{day.day}</div>
        </button>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            className="gc-icon-btn"
            title={t('actions.newEvent')}
            onClick={() => {
              onAddEvent?.(day)
              onClose()
            }}
          >
            <Plus className="h-4 w-4" />
          </button>
          <button type="button" className="gc-icon-btn" onClick={onClose} title={t('common.close')}>
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
        {allDay.length > 0 && (
          <div className="space-y-0.5">
            {allDay.map(renderPill)}
            {timed.length > 0 && <div className="my-1.5 border-t border-hairline" />}
          </div>
        )}
        {timed.map(renderPill)}
        {occurrences.length === 0 && (
          <div className="px-1 py-3 text-center text-xs text-muted">{t('list.empty')}</div>
        )}
      </div>
    </div>,
    document.body
  )
}

export default DayPeekPopover
