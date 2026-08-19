import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  MoreHorizontal,
  Settings,
  Palette,
  Globe,
  Keyboard,
  Users,
  FileUp,
  Filter,
  Sun,
  Moon,
  Monitor
} from 'lucide-react'
import type { ThemeMode } from '@shared/theme-mode'

export const COLOR_FILTERS: { hex: string; label: string }[] = [
  { hex: '#529cca', label: 'Blue' },
  { hex: '#52b788', label: 'Green' },
  { hex: '#ea9a5f', label: 'Orange' },
  { hex: '#9a6dd7', label: 'Lavender' },
  { hex: '#eb5757', label: 'Coral' },
  { hex: '#4dab9a', label: 'Teal' },
  { hex: '#e06f9f', label: 'Rose' }
]

interface OverflowMenuProps {
  language: string
  themeMode: ThemeMode
  selectedColorFilter: string | null
  onOpenSettings: () => void
  onOpenTheme: () => void
  onOpenShortcuts: () => void
  onOpenAccounts: () => void
  onImportIcs: () => void
  onToggleLanguage: () => void
  onSetThemeMode: (mode: ThemeMode) => void
  onSelectColorFilter: (hex: string | null) => void
}

export const OverflowMenu: React.FC<OverflowMenuProps> = ({
  language,
  themeMode,
  selectedColorFilter,
  onOpenSettings,
  onOpenTheme,
  onOpenShortcuts,
  onOpenAccounts,
  onImportIcs,
  onToggleLanguage,
  onSetThemeMode,
  onSelectColorFilter
}) => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [colorOpen, setColorOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
        setColorOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const close = () => {
    setOpen(false)
    setColorOpen(false)
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="gc-icon-btn"
        title={t('actions.more')}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div className="gc-menu right-0 mt-1 w-56">
          <button type="button" className="gc-menu-item" onClick={() => setColorOpen((v) => !v)}>
            <Filter className="h-4 w-4 text-muted" />
            <span>{t('actions.filterColor')}</span>
          </button>
          {colorOpen && (
            <div className="flex flex-wrap gap-1.5 px-3 pb-2">
              <button
                type="button"
                className={`rounded-md px-2 py-0.5 text-[11px] ${
                  selectedColorFilter === null ? 'bg-hover font-semibold' : 'text-muted'
                }`}
                onClick={() => {
                  onSelectColorFilter(null)
                  close()
                }}
              >
                {t('filter.all')}
              </button>
              {COLOR_FILTERS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  title={c.label}
                  className={`h-5 w-5 rounded-full border ${
                    selectedColorFilter === c.hex ? 'border-primary' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  onClick={() => {
                    onSelectColorFilter(selectedColorFilter === c.hex ? null : c.hex)
                    close()
                  }}
                />
              ))}
            </div>
          )}
          <button
            type="button"
            className="gc-menu-item"
            onClick={() => {
              onOpenAccounts()
              close()
            }}
          >
            <Users className="h-4 w-4 text-muted" />
            <span>{t('actions.accounts')}</span>
          </button>
          <button
            type="button"
            className="gc-menu-item"
            onClick={() => {
              onImportIcs()
              close()
            }}
          >
            <FileUp className="h-4 w-4 text-muted" />
            <span>{t('actions.importIcs')}</span>
          </button>
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
