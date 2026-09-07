import React, { useRef } from 'react'
import { DEFAULT_EVENT_COLOR } from '@shared/mini-calendar-grid'

interface EventPillProps {
  title: string
  color?: string | null
  time?: string
  className?: string
  dense?: boolean
  isDragging?: boolean
  onClick?: (e: React.MouseEvent) => void
  /** Fired on non-primary button (used for middle-click delete). */
  onAuxClick?: (e: React.MouseEvent) => void
  draggable?: boolean
  onDragStart?: (e: React.DragEvent) => void
  onDragEnd?: (e: React.DragEvent) => void
}

export const EventPill: React.FC<EventPillProps> = ({
  title,
  color,
  time,
  className = '',
  dense = false,
  isDragging = false,
  onClick,
  onAuxClick,
  draggable,
  onDragStart,
  onDragEnd
}) => {
  const bg = color || DEFAULT_EVENT_COLOR
  const dragStartedRef = useRef(false)

  const handleDragStart = (e: React.DragEvent) => {
    dragStartedRef.current = true
    onDragStart?.(e)
  }

  const handleDragEnd = (e: React.DragEvent) => {
    onDragEnd?.(e)
    setTimeout(() => {
      dragStartedRef.current = false
    }, 150)
  }

  const handleClick = (e: React.MouseEvent) => {
    if (dragStartedRef.current || isDragging) {
      e.stopPropagation()
      e.preventDefault()
      return
    }
    onClick?.(e)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    // Suppress middle-click autoscroll so it can act as a delete gesture.
    if (e.button === 1) e.preventDefault()
  }

  const handleAuxClick = (e: React.MouseEvent) => {
    if (e.button !== 1) return
    e.preventDefault()
    e.stopPropagation()
    onAuxClick?.(e)
  }

  return (
    <div
      draggable={draggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onAuxClick={handleAuxClick}
      title={title}
      className={`gc-event w-full truncate rounded-none text-white min-w-0 ${
        dense ? 'gc-event-dense px-1.5 py-0.5 text-[11px] leading-tight' : 'px-2 py-1 text-[13px]'
      } ${draggable ? 'cursor-grab active:cursor-grabbing' : ''} ${isDragging ? 'is-dragging' : ''} ${className}`}
      style={{ backgroundColor: bg }}
    >
      {time ? <span className="opacity-90 font-mono text-[10px] mr-1">{time}</span> : null}
      <span className="font-medium">{title}</span>
    </div>
  )
}

export default EventPill
