import React from 'react'
import { useTranslation } from 'react-i18next'
import { Keyboard, X } from 'lucide-react'

interface KeyboardShortcutsModalProps {
  isOpen: boolean
  onClose: () => void
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose
}) => {
  const { t } = useTranslation()
  if (!isOpen) return null

  const groups = [
    {
      title: t('shortcuts.navGroup'),
      shortcuts: [
        { key: 'T', description: t('shortcuts.goToday') },
        { key: 'J / →', description: t('shortcuts.nextPeriod') },
        { key: 'K / ←', description: t('shortcuts.prevPeriod') }
      ]
    },
    {
      title: t('shortcuts.viewsGroup'),
      shortcuts: [
        { key: '1', description: t('shortcuts.dayView') },
        { key: '2', description: t('shortcuts.weekView') },
        { key: '3', description: t('shortcuts.monthView') },
        { key: '4', description: t('shortcuts.yearView') },
        { key: '5', description: t('shortcuts.listView') }
      ]
    },
    {
      title: t('shortcuts.actionsGroup'),
      shortcuts: [
        { key: `N ${t('shortcuts.orKey')} C`, description: t('shortcuts.createEvent') },
        { key: `Ctrl + K ${t('shortcuts.orKey')} /`, description: t('shortcuts.searchPalette') },
        { key: 'Esc', description: t('shortcuts.closeDialog') },
        { key: '?', description: t('shortcuts.openShortcuts') }
      ]
    }
  ]

  return (
    <div className="gc-overlay select-none">
      <div className="gc-dialog w-full max-w-lg">
        <div className="flex items-center justify-between border-b border-hairline bg-app px-6 py-4">
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-accent" />
            <h3 className="text-sm font-semibold text-primary">{t('shortcuts.title')}</h3>
          </div>
          <button type="button" onClick={onClose} className="gc-icon-btn">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
          {groups.map((grp) => (
            <div key={grp.title} className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {grp.title}
              </h4>
              <div className="grid gap-1.5">
                {grp.shortcuts.map((s) => (
                  <div
                    key={s.key}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 text-xs"
                  >
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      {s.description}
                    </span>
                    <kbd className="px-2 py-1 bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-300 rounded-lg font-mono text-[11px] font-semibold shadow-xs">
                      {s.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end border-t border-hairline bg-app px-6 py-3">
          <button type="button" onClick={onClose} className="gc-btn-primary">
            {t('common.gotIt')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default KeyboardShortcutsModal
