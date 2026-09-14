import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Image as ImageIcon, Sliders, Check, RotateCcw } from 'lucide-react'
import type { ThemeConfig, ThemeMode } from '@shared/theme-mode'
import { TextInput } from './ui'

/**
 * Everything that changes how the app looks, in one panel.
 *
 * This used to be a standalone modal reachable from the menu while the
 * light/dark toggle lived in Settings, so "change the appearance" meant two
 * different dialogs. It is now the Appearance tab of Settings.
 */
interface AppearanceSettingsProps {
  mode: ThemeMode
  onSetMode: (mode: ThemeMode) => void
  onThemeChanged: (theme: ThemeConfig) => void
}

const ACCENT_COLORS = [
  { hex: '#2383E2', name: 'Notion Blue' },
  { hex: '#52B788', name: 'Sage Green' },
  { hex: '#EA9A5F', name: 'Peach Orange' },
  { hex: '#9A6DD7', name: 'Lavender' },
  { hex: '#EB5757', name: 'Coral Red' },
  { hex: '#4DAB9A', name: 'Teal' },
  { hex: '#E06F9F', name: 'Rose Pink' },
  { hex: '#868E96', name: 'Slate Gray' }
]

const PRESET_WALLPAPERS = [
  { key: 'noImage', url: '' },
  {
    key: 'cosmicNight',
    url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=1200&auto=format&fit=crop'
  },
  {
    key: 'mistyForest',
    url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=1200&auto=format&fit=crop'
  },
  {
    key: 'purpleSunset',
    url: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?q=80&w=1200&auto=format&fit=crop'
  },
  {
    key: 'cyberCity',
    url: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?q=80&w=1200&auto=format&fit=crop'
  }
]

const THEME_MODES: ThemeMode[] = ['system', 'light', 'dark']

export const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({
  mode,
  onSetMode,
  onThemeChanged
}) => {
  const { t } = useTranslation()
  const [accentColor, setAccentColor] = useState('#2383E2')
  const [customBgUrl, setCustomBgUrl] = useState('')
  const [bgOverlayOpacity, setBgOverlayOpacity] = useState(0.8)
  const [bgBlur, setBgBlur] = useState(8)

  useEffect(() => {
    if (!window.gone?.settings) return
    window.gone.settings.getAll().then((st: any) => {
      if (st.themeAccent) setAccentColor(st.themeAccent)
      if (st.themeCustomBg !== undefined) setCustomBgUrl(st.themeCustomBg)
      if (st.themeOverlayOpacity !== undefined) setBgOverlayOpacity(st.themeOverlayOpacity)
      if (st.themeBlur !== undefined) setBgBlur(st.themeBlur)
    })
  }, [])

  const applyTheme = async (config: {
    accent: string
    bgUrl: string
    opacity: number
    blur: number
  }): Promise<void> => {
    setAccentColor(config.accent)
    setCustomBgUrl(config.bgUrl)
    setBgOverlayOpacity(config.opacity)
    setBgBlur(config.blur)

    if (window.gone?.settings) {
      await window.gone.settings.set('themeAccent', config.accent)
      await window.gone.settings.set('themeCustomBg', config.bgUrl)
      await window.gone.settings.set('themeOverlayOpacity', config.opacity)
      await window.gone.settings.set('themeBlur', config.blur)
    }

    onThemeChanged({
      mode,
      accentColor: config.accent,
      customBgUrl: config.bgUrl || undefined,
      bgOverlayOpacity: config.opacity,
      bgBlur: config.blur
    })
  }

  const current = { accent: accentColor, bgUrl: customBgUrl, opacity: bgOverlayOpacity, blur: bgBlur }

  return (
    <div className="space-y-5">
      {/* Light / dark / follow system */}
      <div className="space-y-2">
        <span className="block text-xs text-muted">{t('settings.theme')}</span>
        <div className="flex gap-1">
          {THEME_MODES.map((m) => (
            <button
              key={m}
              type="button"
              className={mode === m ? 'gc-btn-primary' : 'gc-btn'}
              onClick={() => onSetMode(m)}
            >
              {t(`settings.themeMode${m[0].toUpperCase()}${m.slice(1)}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <span className="block text-xs text-muted">{t('theme.accentColor')}</span>
        <div className="grid grid-cols-8 gap-2">
          {ACCENT_COLORS.map((c) => {
            const isSelected = accentColor === c.hex
            return (
              <button
                key={c.hex}
                type="button"
                onClick={() => applyTheme({ ...current, accent: c.hex })}
                className="relative flex h-9 cursor-pointer items-center justify-center transition-all hover:scale-105"
                style={{
                  backgroundColor: c.hex,
                  borderRadius: 'var(--radius-control)',
                  outline: isSelected ? '2px solid var(--color-border)' : 'none',
                  outlineOffset: '2px'
                }}
                title={c.name}
              >
                {isSelected && <Check className="h-4 w-4 text-white drop-shadow-sm" />}
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-2">
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <ImageIcon className="h-3.5 w-3.5" />
          {t('theme.wallpaper')}
        </span>

        <div className="grid grid-cols-2 gap-1.5">
          {PRESET_WALLPAPERS.map((wp) => {
            const isSelected = customBgUrl === wp.url
            return (
              <button
                key={wp.key}
                type="button"
                onClick={() => applyTheme({ ...current, bgUrl: wp.url })}
                className={`flex cursor-pointer items-center justify-between gap-2 border p-2.5 text-left text-xs transition-colors ${
                  isSelected
                    ? 'border-accent bg-hover font-semibold text-primary'
                    : 'border-hairline bg-surface text-muted hover:bg-hover hover:text-primary'
                }`}
                style={{ borderRadius: 'var(--radius-control)' }}
              >
                <span className="truncate">{t(`theme.${wp.key}`)}</span>
                {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-accent" />}
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-1.5 pt-1">
          <TextInput
            type="url"
            placeholder={t('theme.customUrl')}
            value={customBgUrl.startsWith('data:') ? '' : customBgUrl}
            clearable
            variant="boxed"
            onChange={(val) => applyTheme({ ...current, bgUrl: val })}
            inputClassName="font-mono text-xs"
            className="flex-1"
          />
          <button
            type="button"
            className="gc-btn shrink-0"
            onClick={async () => {
              if (!window.gone?.app?.pickBackgroundImage) return
              const result = await window.gone.app.pickBackgroundImage()
              if (result?.dataUrl) await applyTheme({ ...current, bgUrl: result.dataUrl })
            }}
          >
            <ImageIcon className="h-3.5 w-3.5" />
            <span>{t('theme.importImage')}</span>
          </button>
        </div>

        {customBgUrl.startsWith('data:') && (
          <p className="text-xs text-muted">{t('theme.usingImportedImage')}</p>
        )}
      </div>

      {customBgUrl && (
        <div
          className="space-y-4 border border-hairline p-4"
          style={{ borderRadius: 'var(--radius-control)' }}
        >
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <Sliders className="h-3.5 w-3.5" />
            <span>{t('theme.overlayAndBlur')}</span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted">
              <span>{t('theme.overlayDarkness')}</span>
              <span className="font-mono">{Math.round(bgOverlayOpacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="0.95"
              step="0.05"
              value={bgOverlayOpacity}
              onChange={(e) => applyTheme({ ...current, opacity: parseFloat(e.target.value) })}
              className="w-full cursor-pointer accent-accent"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted">
              <span>{t('theme.backgroundBlur')}</span>
              <span className="font-mono">{bgBlur}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="20"
              step="1"
              value={bgBlur}
              onChange={(e) => applyTheme({ ...current, blur: parseInt(e.target.value, 10) })}
              className="w-full cursor-pointer accent-accent"
            />
          </div>
        </div>
      )}

      <button
        type="button"
        className="gc-btn"
        onClick={() => applyTheme({ accent: '#2383E2', bgUrl: '', opacity: 0.8, blur: 8 })}
      >
        <RotateCcw className="h-3.5 w-3.5" />
        <span>{t('theme.default')}</span>
      </button>
    </div>
  )
}

export default AppearanceSettings
