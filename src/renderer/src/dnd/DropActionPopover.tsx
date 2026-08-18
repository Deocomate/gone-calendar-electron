import React from 'react'
import { Move, Copy, X } from 'lucide-react'
import { DateTime } from 'luxon'
import type { ExpandedOccurrence } from '@shared/event-model'

export interface PendingDropAction {
  occurrence: ExpandedOccurrence
  targetStart: DateTime
  targetEnd: DateTime
  targetCalendarId?: string
  position: { x: number; y: number }
}

interface DropActionPopoverProps {
  pendingDrop: PendingDropAction | null
  onMove: (drop: PendingDropAction) => void
  onCopy: (drop: PendingDropAction) => void
  onCancel: () => void
}

export const DropActionPopover: React.FC<DropActionPopoverProps> = ({
  pendingDrop,
  onMove,
  onCopy,
  onCancel
}) => {
  if (!pendingDrop) return null

  // Ensure popover remains on-screen
  const x = Math.min(window.innerWidth - 260, Math.max(16, pendingDrop.position.x))
  const y = Math.min(window.innerHeight - 200, Math.max(16, pendingDrop.position.y))

  const targetTimeStr = pendingDrop.occurrence.allDay
    ? pendingDrop.targetStart.toFormat('dd/MM/yyyy')
    : `${pendingDrop.targetStart.toFormat('dd/MM HH:mm')} – ${pendingDrop.targetEnd.toFormat('HH:mm')}`

  return (
    <div className="fixed inset-0 z-50 pointer-events-auto bg-black/40 backdrop-blur-xs select-none">
      <div
        style={{ left: `${x}px`, top: `${y}px` }}
        className="fixed w-64 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-4 animate-in zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
          <div className="truncate pr-2">
            <h4 className="text-xs font-bold text-slate-100 truncate">
              {pendingDrop.occurrence.title}
            </h4>
            <span className="text-[10px] text-indigo-400 font-mono">
              📍 {targetTimeStr}
            </span>
          </div>
          <button
            onClick={onCancel}
            className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="space-y-1.5 text-xs">
          <button
            onClick={() => onMove(pendingDrop)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 transition-all font-semibold"
          >
            <Move className="h-4 w-4 shrink-0" />
            <span>Di chuyển (Move here)</span>
          </button>

          <button
            onClick={() => onCopy(pendingDrop)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700/60 transition-all font-medium"
          >
            <Copy className="h-4 w-4 shrink-0 text-slate-400" />
            <span>Sao chép (Copy here)</span>
          </button>

          <button
            onClick={onCancel}
            className="w-full text-center py-1.5 text-[11px] text-slate-400 hover:text-slate-200 font-medium"
          >
            Hủy bỏ (Cancel)
          </button>
        </div>
      </div>
    </div>
  )
}

export default DropActionPopover
