import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Move, Copy, X, CalendarCheck } from 'lucide-react'
import { DateTime } from 'luxon'
import type { ExpandedOccurrence } from '@shared/event-model'
import { formatClockTime } from '@shared/time-format'
import { useDisplayPreferences } from '../context/DisplayPreferencesContext'

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
  onCopy: (drop: PendingDropAction, copyInstanceOnly?: boolean) => void
  onCancel: () => void
}

export const DropActionPopover: React.FC<DropActionPopoverProps> = ({
  pendingDrop,
  onMove,
  onCopy,
  onCancel
}) => {
  const { t } = useTranslation()
  const { timeFormat } = useDisplayPreferences()
  useEffect(() => {
    if (!pendingDrop) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [pendingDrop, onCancel])

  if (!pendingDrop) return null

  // Ensure popover remains on-screen
  const x = Math.min(window.innerWidth - 280, Math.max(16, pendingDrop.position.x))
  const y = Math.min(window.innerHeight - 240, Math.max(16, pendingDrop.position.y))

  const isRecurring = pendingDrop.occurrence.isRecurring
  const targetTimeStr = pendingDrop.occurrence.allDay
    ? pendingDrop.targetStart.toFormat('dd/MM/yyyy')
    : `${pendingDrop.targetStart.toFormat('dd/MM')} ${formatClockTime(pendingDrop.targetStart, timeFormat)} – ${formatClockTime(pendingDrop.targetEnd, timeFormat)}`

  return (
    <div className="gc-dnd-overlay pointer-events-auto select-none" onClick={onCancel}>
      <div
        style={{ left: `${x}px`, top: `${y}px` }}
        onClick={(e) => e.stopPropagation()}
        className="animate-popover fixed w-72 rounded-xl border border-hairline bg-surface p-4 text-primary shadow-2xl"
      >
        <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
          <div className="truncate pr-2">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
              {pendingDrop.occurrence.title}
            </h4>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono">
              📍 {targetTimeStr}
            </span>
          </div>
          <button
            onClick={onCancel}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="space-y-1.5 text-xs">
          <button
            onClick={() => onMove(pendingDrop)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-600/20 hover:bg-indigo-600 text-indigo-700 dark:text-indigo-300 hover:text-white border border-indigo-200 dark:border-indigo-500/30 transition-all font-semibold cursor-pointer"
          >
            <Move className="h-4 w-4 shrink-0" />
            <span>{t('drop.moveHere')}</span>
          </button>

          {isRecurring ? (
            <>
              <button
                onClick={() => onCopy(pendingDrop, true)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 dark:hover:text-emerald-200 border border-emerald-500/30 transition-all font-medium cursor-pointer text-left"
                title={t('drop.copyStandaloneHint')}
              >
                <CalendarCheck className="h-4 w-4 shrink-0 text-emerald-500 dark:text-emerald-400" />
                <div>
                  <span className="block font-semibold">{t('drop.copyThisOnly')}</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{t('drop.copyStandalone')}</span>
                </div>
              </button>

              <button
                onClick={() => onCopy(pendingDrop, false)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700/60 transition-all font-medium cursor-pointer text-left"
              >
                <Copy className="h-4 w-4 shrink-0 text-slate-400" />
                <div>
                  <span className="block font-semibold">{t('drop.copyWholeSeries')}</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{t('drop.copyWholeSeriesHint')}</span>
                </div>
              </button>
            </>
          ) : (
            <button
              onClick={() => onCopy(pendingDrop, false)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700/60 transition-all font-medium cursor-pointer"
            >
              <Copy className="h-4 w-4 shrink-0 text-slate-400" />
              <span>{t('drop.copyHere')}</span>
            </button>
          )}

          <button
            onClick={onCancel}
            className="w-full text-center py-1.5 text-[11px] text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-medium cursor-pointer"
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DropActionPopover
