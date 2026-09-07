import React from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import type { RecurringEditScope } from '@shared/event-model'

interface RecurringScopeDialogProps {
  isOpen: boolean
  title: string
  action: 'edit' | 'delete'
  onConfirm: (scope: RecurringEditScope) => void
  onCancel: () => void
}

export const RecurringScopeDialog: React.FC<RecurringScopeDialogProps> = ({
  isOpen,
  title,
  action,
  onConfirm,
  onCancel
}) => {
  const { t } = useTranslation()
  if (!isOpen) return null

  const isDelete = action === 'delete'

  const options: { scope: RecurringEditScope; label: string; hint: string }[] = [
    { scope: 'this', label: t('recurring.thisLabel'), hint: t('recurring.thisHint') },
    { scope: 'future', label: t('recurring.futureLabel'), hint: t('recurring.futureHint') },
    { scope: 'all', label: t('recurring.allLabel'), hint: t('recurring.allHint') }
  ]

  return (
    <div className="gc-overlay select-none">
      <div className="gc-dialog w-full max-w-sm p-5">
        <button type="button" onClick={onCancel} className="gc-icon-btn absolute top-3 right-3">
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4 pr-6">
          <h3 className="text-sm font-semibold text-primary mb-0.5">
            {isDelete ? t('recurring.deleteTitle') : t('recurring.editTitle')}
          </h3>
          {title && <p className="text-xs text-muted truncate max-w-[280px]">"{title}"</p>}
        </div>

        <p className="text-xs text-muted mb-4">
          {isDelete ? t('recurring.askDelete') : t('recurring.askEdit')}
        </p>

        <div className="space-y-0.5">
          {options.map(({ scope, label, hint }) => (
            <button
              key={scope}
              onClick={() => onConfirm(scope)}
              className="w-full flex flex-col px-3 py-2.5 text-left hover:bg-hover transition-colors cursor-pointer group"
              style={{ borderRadius: 'var(--radius-control)' }}
            >
              <span className="text-xs font-medium text-primary group-hover:text-primary">{label}</span>
              <span className="text-[11px] text-muted">{hint}</span>
            </button>
          ))}
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs text-muted hover:text-primary transition-colors cursor-pointer"
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default RecurringScopeDialog
