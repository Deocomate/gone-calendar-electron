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
  // Matches the w-64 below; the old figure was for a wider popover and left a
  // gap on the right.
  const x = Math.min(window.innerWidth - 272, Math.max(16, pendingDrop.position.x))
  const y = Math.min(window.innerHeight - 200, Math.max(16, pendingDrop.position.y))

  const isRecurring = pendingDrop.occurrence.isRecurring
  const targetTimeStr = pendingDrop.occurrence.allDay
    ? pendingDrop.targetStart.toFormat('dd/MM/yyyy')
    : `${pendingDrop.targetStart.toFormat('dd/MM')} ${formatClockTime(pendingDrop.targetStart, timeFormat)} – ${formatClockTime(pendingDrop.targetEnd, timeFormat)}`

  return (
    <div className="gc-dnd-overlay pointer-events-auto select-none" onClick={onCancel}>
      <div
        style={{
          left: `${x}px`,
          top: `${y}px`,
          borderRadius: 'var(--radius-dialog)',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.18), 0 0 0 1px var(--color-border)'
        }}
        onClick={(e) => e.stopPropagation()}
        className="animate-popover fixed w-64 border border-hairline bg-dialog p-1.5 text-primary"
      >
        <div className="flex items-start gap-2 px-2 pb-1.5 pt-1">
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-medium text-primary">
              {pendingDrop.occurrence.title}
            </div>
            <div className="truncate text-[10px] tabular-nums text-muted">{targetTimeStr}</div>
          </div>
          <button onClick={onCancel} className="gc-icon-btn shrink-0" title={t('common.cancel')}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="mt-0.5 border-t border-hairline pt-1.5">
          <Action icon={<Move className="h-3.5 w-3.5" />} onClick={() => onMove(pendingDrop)} primary>
            {t('drop.moveHere')}
          </Action>

          {isRecurring ? (
            <>
              <Action
                icon={<CalendarCheck className="h-3.5 w-3.5" />}
                onClick={() => onCopy(pendingDrop, true)}
                hint={t('drop.copyStandalone')}
              >
                {t('drop.copyThisOnly')}
              </Action>
              <Action
                icon={<Copy className="h-3.5 w-3.5" />}
                onClick={() => onCopy(pendingDrop, false)}
                hint={t('drop.copyWholeSeriesHint')}
              >
                {t('drop.copyWholeSeries')}
              </Action>
            </>
          ) : (
            <Action icon={<Copy className="h-3.5 w-3.5" />} onClick={() => onCopy(pendingDrop, false)}>
              {t('drop.copyHere')}
            </Action>
          )}
        </div>
      </div>
    </div>
  )
}

/** One row of the popover, styled like the rest of the app's menus. */
const Action: React.FC<{
  icon: React.ReactNode
  onClick: () => void
  hint?: string
  primary?: boolean
  children: React.ReactNode
}> = ({ icon, onClick, hint, primary, children }) => (
  <button
    type="button"
    onClick={onClick}
    style={{ borderRadius: 'var(--radius-control)' }}
    className={`flex w-full items-center gap-2.5 px-2 py-1.5 text-left transition-colors hover:bg-hover ${
      primary ? 'text-primary' : 'text-primary'
    }`}
  >
    <span className={`shrink-0 ${primary ? 'text-accent' : 'text-muted'}`}>{icon}</span>
    <span className="min-w-0 flex-1">
      <span className={`block truncate text-xs ${primary ? 'font-medium' : ''}`}>{children}</span>
      {hint && <span className="block truncate text-[10px] text-muted">{hint}</span>}
    </span>
  </button>
)

export default DropActionPopover
