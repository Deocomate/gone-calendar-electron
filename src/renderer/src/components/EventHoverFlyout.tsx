import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { DateTime } from 'luxon'
import { useTranslation } from 'react-i18next'
import { Clock, MapPin, Repeat, Layers, Calendar } from 'lucide-react'
import type { ExpandedOccurrence } from '@shared/event-model'
import { DEFAULT_EVENT_COLOR } from '@shared/mini-calendar-grid'
import { formatClockTime } from '@shared/time-format'
import { useDisplayPreferences } from '../context/DisplayPreferencesContext'

export interface HoverFlyoutData {
  title: string
  subtitle?: string
  occurrences: ExpandedOccurrence[]
  anchorRect: { top: number; bottom: number; left: number; right: number; width: number; height: number }
}

interface EventHoverFlyoutProps {
  data: HoverFlyoutData | null
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  onSelectOccurrence?: (occ: ExpandedOccurrence) => void
  onDragStart?: (e: React.DragEvent, occ: ExpandedOccurrence) => void
  onDragEnd?: () => void
  draggedOccurrenceId?: string
}

export const EventHoverFlyout: React.FC<EventHoverFlyoutProps> = ({
  data,
  onMouseEnter,
  onMouseLeave,
  onSelectOccurrence,
  onDragStart,
  onDragEnd,
  draggedOccurrenceId
}) => {
  const { t } = useTranslation()
  const { timeFormat } = useDisplayPreferences()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const handleGlobalDragStart = () => {
      onMouseLeave?.()
    }
    window.addEventListener('dragstart', handleGlobalDragStart)
    return () => window.removeEventListener('dragstart', handleGlobalDragStart)
  }, [onMouseLeave])

  // Immediately hide flyout if currently dragging or invalid state
  if (!data || !mounted || typeof document === 'undefined' || draggedOccurrenceId) return null

  const totalItems = data.occurrences.length
  if (totalItems === 0) return null

  const FLYOUT_WIDTH = 290
  const prefersRight = data.anchorRect.right + FLYOUT_WIDTH + 12 <= window.innerWidth
  const x = prefersRight
    ? data.anchorRect.right + 8
    : Math.max(12, data.anchorRect.left - FLYOUT_WIDTH - 8)

  const y = Math.min(
    window.innerHeight - 360,
    Math.max(16, data.anchorRect.top - 4)
  )

  const content = (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ left: `${x}px`, top: `${y}px`, width: `${FLYOUT_WIDTH}px` }}
      className="gc-3d-deck-panel fixed z-[9999] rounded-[4px] border border-hairline bg-surface p-3 shadow-xl animate-popover select-none pointer-events-auto text-primary"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-hairline pb-2 mb-2">
        <div className="min-w-0 pr-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-primary truncate">
            <Calendar className="h-3.5 w-3.5 text-muted shrink-0" />
            <span className="truncate">{data.title}</span>
          </div>
          {data.subtitle && (
            <div className="text-[10px] text-muted font-mono mt-0.5">{data.subtitle}</div>
          )}
        </div>
        <span className="flex items-center gap-1 text-[10px] font-medium text-muted bg-hover px-1.5 py-0.5 rounded-[3px] shrink-0 border border-hairline font-mono">
          <Layers className="h-2.5 w-2.5" />
          {totalItems}
        </span>
      </div>

      {/* List of items */}
      <div className="space-y-1.5 max-h-80 overflow-y-auto p-0.5 pr-1">
        {data.occurrences.map((occ, idx) => {
          const startDt = DateTime.fromISO(occ.startUtc, { zone: 'utc' }).setZone('local')
          const endDt = DateTime.fromISO(occ.endUtc, { zone: 'utc' }).setZone('local')
          const bg = occ.color || DEFAULT_EVENT_COLOR
          const isDragging = draggedOccurrenceId === occ.id

          return (
            <div
              key={occ.id}
              draggable
              onDragStart={(e) => {
                onMouseLeave?.()
                onDragStart?.(e, occ)
              }}
              onDragEnd={onDragEnd}
              onClick={(e) => {
                e.stopPropagation()
                onSelectOccurrence?.(occ)
              }}
              style={{
                backgroundColor: bg,
                animationDelay: `${idx * 25}ms`
              }}
              className={`gc-stack-card-3d cursor-grab active:cursor-grabbing rounded-[3px] p-2 text-white shadow-xs transition-all ${
                isDragging ? 'is-dragging' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-semibold leading-tight truncate">{occ.title}</span>
                {occ.isRecurring && <Repeat className="h-3 w-3 opacity-80 shrink-0" />}
              </div>

              <div className="mt-1 flex items-center justify-between gap-2 text-[10px] opacity-90 font-mono">
                <span className="flex items-center gap-1 bg-black/15 px-1 py-0.2 rounded-[2px]">
                  <Clock className="h-2.5 w-2.5 shrink-0" />
                  {occ.allDay
                    ? t('list.allDay')
                    : `${formatClockTime(startDt, timeFormat)} – ${formatClockTime(endDt, timeFormat)}`}
                </span>
                {occ.location && (
                  <span className="flex items-center gap-1 truncate font-sans max-w-[110px]">
                    <MapPin className="h-2.5 w-2.5 shrink-0" />
                    {occ.location}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  return createPortal(content, document.body)
}

export default EventHoverFlyout
