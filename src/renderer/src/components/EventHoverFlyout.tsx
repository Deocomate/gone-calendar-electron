import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { DateTime } from 'luxon'
import { Clock, MapPin, Repeat, CheckCircle2, Layers, Calendar } from 'lucide-react'
import type { ExpandedOccurrence } from '@shared/event-model'
import type { TaskItem } from '@shared/task-model'
import { DEFAULT_EVENT_COLOR } from '@shared/mini-calendar-grid'

export interface HoverFlyoutData {
  title: string
  subtitle?: string
  occurrences: ExpandedOccurrence[]
  tasks?: TaskItem[]
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

  const totalItems = data.occurrences.length + (data.tasks?.length || 0)
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
      className="gc-3d-deck-panel fixed z-[9999] rounded-xl border border-slate-200/90 dark:border-slate-700/90 bg-surface/98 dark:bg-slate-900/98 p-3 shadow-2xl backdrop-blur-xl animate-popover select-none pointer-events-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-hairline pb-2 mb-2">
        <div className="min-w-0 pr-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-primary truncate">
            <Calendar className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
            <span className="truncate">{data.title}</span>
          </div>
          {data.subtitle && (
            <div className="text-[10px] text-muted font-mono mt-0.5">{data.subtitle}</div>
          )}
        </div>
        <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 px-2 py-0.5 rounded-full shrink-0 border border-indigo-200/40 dark:border-indigo-800/40">
          <Layers className="h-2.5 w-2.5" />
          {totalItems}
        </span>
      </div>

      {/* List of items */}
      <div className="space-y-1.5 max-h-80 overflow-y-auto p-1 pr-1.5">
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
              className={`gc-stack-card-3d cursor-grab active:cursor-grabbing rounded-lg p-2.5 text-white shadow-md transition-all ${
                isDragging ? 'is-dragging' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold leading-tight truncate">{occ.title}</span>
                {occ.isRecurring && <Repeat className="h-3 w-3 opacity-80 shrink-0" />}
              </div>

              <div className="mt-1 flex items-center justify-between gap-2 text-[10px] opacity-90 font-mono">
                <span className="flex items-center gap-1 bg-black/20 px-1.5 py-0.5 rounded">
                  <Clock className="h-2.5 w-2.5 shrink-0" />
                  {occ.allDay
                    ? 'Cả ngày'
                    : `${startDt.toFormat('HH:mm')} – ${endDt.toFormat('HH:mm')}`}
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

        {data.tasks?.map((task) => (
          <div
            key={task.id}
            className="gc-stack-card-3d rounded-lg p-2.5 text-white text-xs font-semibold shadow-md"
            style={{ backgroundColor: DEFAULT_EVENT_COLOR }}
            title={`Nhiệm vụ: ${task.title}`}
          >
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span className={`truncate ${task.completed ? 'line-through opacity-75' : ''}`}>
                {task.title}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  return createPortal(content, document.body)
}

export default EventHoverFlyout
