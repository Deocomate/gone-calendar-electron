import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  MoreHorizontal,
  Settings,
  Palette,
  Globe,
  Keyboard,
  Sun,
  Moon,
  Monitor,
  AlertTriangle
} from 'lucide-react'
import type { ThemeMode } from '@shared/theme-mode'

interface OverflowMenuProps {
  language: string
  themeMode: ThemeMode
  conflictCount?: number
  onOpenSettings: () => void
  onOpenTheme: () => void
  onOpenShortcuts: () => void
  onOpenConflicts?: () => void
  onToggleLanguage: () => void
  onSetThemeMode: (mode: ThemeMode) => void
}

export const OverflowMenu: React.FC<OverflowMenuProps> = ({
  language,
  themeMode,
  conflictCount = 0,
  onOpenSettings,
  onOpenTheme,
  onOpenShortcuts,
  onOpenConflicts,
  onToggleLanguage,
  onSetThemeMode
}) => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const close = () => setOpen(false)

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="gc-icon-btn relative"
        title={t('actions.more')}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreHorizontal className="h-4 w-4" />
        {conflictCount > 0 && (
          <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-today" />
        )}
      </button>
      {open && (
        <div className="gc-menu right-0 mt-1 w-56">
          {conflictCount > 0 && onOpenConflicts && (
            <>
              <button
                type="button"
                className="gc-menu-item"
                onClick={() => {
                  onOpenConflicts()
                  close()
                }}
              >
                <AlertTriangle className="h-4 w-4 text-today" />
                <span>{t('sync.conflictsMenuItem', { count: conflictCount })}</span>
              </button>
              <div className="my-1 border-t border-hairline" />
            </>
          )}
          <button
            type="button"
            className="gc-menu-item"
            onClick={() => {
              onOpenShortcuts()
              close()
            }}
          >
            <Keyboard className="h-4 w-4 text-muted" />
            <span>{t('actions.keyboard')}</span>
          </button>
          <div className="my-1 border-t border-hairline" />
          <div className="flex items-center gap-1 px-3 py-1.5">
            <span className="mr-auto text-xs text-muted">{t('settings.theme')}</span>
            {(
              [
                { id: 'light' as const, icon: Sun },
                { id: 'dark' as const, icon: Moon },
                { id: 'system' as const, icon: Monitor }
              ] as const
            ).map(({ id, icon: Icon }) => (
              <button
                key={id}
                type="button"
                title={t(`settings.theme${id[0].toUpperCase()}${id.slice(1)}`)}
                className={`rounded-md p-1 ${themeMode === id ? 'bg-hover text-primary' : 'text-muted hover:text-primary'}`}
                onClick={() => onSetThemeMode(id)}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
          <button
            type="button"
            className="gc-menu-item"
            onClick={() => {
              onOpenTheme()
              close()
            }}
          >
            <Palette className="h-4 w-4 text-muted" />
            <span>{t('actions.appearance')}</span>
          </button>
          <button
            type="button"
            className="gc-menu-item"
            onClick={() => {
              onToggleLanguage()
              close()
            }}
          >
            <Globe className="h-4 w-4 text-muted" />
            <span>
              {t('settings.language')} ({language.toUpperCase()})
            </span>
          </button>
          <button
            type="button"
            className="gc-menu-item"
            onClick={() => {
              onOpenSettings()
              close()
            }}
          >
            <Settings className="h-4 w-4 text-muted" />
            <span>{t('actions.settings')}</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default OverflowMenu
