import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DateTime } from 'luxon'
import { AlertTriangle, X } from 'lucide-react'
import type { SyncConflict } from '@shared/event-model'

interface SyncConflictsModalProps {
  isOpen: boolean
  conflicts: SyncConflict[]
  onClose: () => void
  onResolve: (eventId: string, resolution: 'keepMine' | 'keepTheirs') => Promise<void>
}

export const SyncConflictsModal: React.FC<SyncConflictsModalProps> = ({
  isOpen,
  conflicts,
  onClose,
  onResolve
}) => {
  const { t, i18n } = useTranslation()
  const [busyId, setBusyId] = useState<string | null>(null)
  if (!isOpen) return null

  const handleResolve = async (eventId: string, resolution: 'keepMine' | 'keepTheirs') => {
    setBusyId(eventId)
    try {
      await onResolve(eventId, resolution)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="gc-overlay select-none">
      <div className="gc-dialog w-full max-w-lg">
        <div className="flex items-center justify-between border-b border-hairline bg-app px-6 py-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-today" />
            <h3 className="text-sm font-semibold text-primary">{t('sync.conflictsTitle')}</h3>
          </div>
          <button type="button" onClick={onClose} className="gc-icon-btn">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-3 overflow-y-auto max-h-[65vh]">
          <p className="text-xs text-muted">{t('sync.conflictsExplain')}</p>

          {conflicts.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted">{t('sync.conflictsNone')}</p>
          ) : (
            conflicts.map((c) => (
              <div
                key={c.eventId}
                className="border border-hairline p-3 space-y-2"
                style={{ borderRadius: 'var(--radius-control)' }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-primary truncate">
                    {c.title || t('common.untitled')}
                  </span>
                  <span className="shrink-0 text-[10px] text-muted">{c.calendarName}</span>
                </div>
                <p className="text-[11px] text-muted">
                  {t('sync.conflictsUpdated', {
                    when: DateTime.fromISO(c.updatedAt).setLocale(i18n.language).toFormat('cccc, d MMMM HH:mm')
                  })}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={busyId === c.eventId}
                    onClick={() => handleResolve(c.eventId, 'keepMine')}
                    className="gc-btn text-xs disabled:opacity-50"
                  >
                    {t('sync.keepMine')}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === c.eventId}
                    onClick={() => handleResolve(c.eventId, 'keepTheirs')}
                    className="gc-btn text-xs disabled:opacity-50"
                  >
                    {t('sync.keepTheirs')}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end border-t border-hairline bg-app px-6 py-3">
          <button type="button" onClick={onClose} className="gc-btn-primary">
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default SyncConflictsModal
