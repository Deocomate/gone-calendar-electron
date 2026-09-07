import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Palette,
  Image as ImageIcon,
  Sliders,
  Check,
  RotateCcw,
  X
} from 'lucide-react'
import type { ThemeConfig } from '@shared/theme-mode'
import { TextInput } from './ui'

interface ThemeSettingsModalProps {
  isOpen: boolean
  onClose: () => void
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

export const ThemeSettingsModal: React.FC<ThemeSettingsModalProps> = ({
  isOpen,
  onClose,
  onThemeChanged
}) => {
  const { t } = useTranslation()
  const [accentColor, setAccentColor] = useState('#2383E2')
  const [customBgUrl, setCustomBgUrl] = useState('')
  const [bgOverlayOpacity, setBgOverlayOpacity] = useState(0.8)
  const [bgBlur, setBgBlur] = useState(8)

  useEffect(() => {
    if (!isOpen) return

    if (window.gone?.settings) {
      window.gone.settings.getAll().then((st: any) => {
        if (st.themeAccent) setAccentColor(st.themeAccent)
        if (st.themeCustomBg !== undefined) setCustomBgUrl(st.themeCustomBg)
        if (st.themeOverlayOpacity !== undefined) setBgOverlayOpacity(st.themeOverlayOpacity)
        if (st.themeBlur !== undefined) setBgBlur(st.themeBlur)
      })
    }
  }, [isOpen])

  const applyTheme = async (config: {
    accent: string
    bgUrl: string
    opacity: number
    blur: number
  }) => {
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

    const isDark = document.documentElement.classList.contains('dark')
    onThemeChanged({
      mode: isDark ? 'dark' : 'light',
      accentColor: config.accent,
      customBgUrl: config.bgUrl || undefined,
      bgOverlayOpacity: config.opacity,
      bgBlur: config.blur
    })
  }

  const handleReset = () => {
    applyTheme({
      accent: '#2383E2',
      bgUrl: '',
      opacity: 0.8,
      blur: 8
    })
  }

  if (!isOpen) return null

  return (
    <div className="gc-overlay select-none">
      <div className="gc-dialog w-full max-w-lg">
        {/* Header — plain icon, no tinted section icons */}
        <div className="flex items-center justify-between border-b border-hairline px-5 py-3">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-muted" />
            <h3 className="text-sm font-semibold text-primary">{t('theme.title')}</h3>
          </div>
          <button type="button" onClick={onClose} className="gc-icon-btn">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Accent Color Section */}
          <div className="space-y-2">
            {/* Section label — sentence case, muted, no uppercase tracking */}
            <span className="block text-xs text-muted flex items-center gap-1.5">
              {t('theme.accentColor')}
            </span>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {ACCENT_COLORS.map((c) => {
                const isSelected = accentColor === c.hex
                return (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() =>
                      applyTheme({
                        accent: c.hex,
                        bgUrl: customBgUrl,
                        opacity: bgOverlayOpacity,
                        blur: bgBlur
                      })
                    }
                    className="h-9 flex items-center justify-center transition-all cursor-pointer relative hover:scale-105"
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

          {/* Background Wallpaper Section */}
          <div className="space-y-2">
            <span className="block text-xs text-muted flex items-center gap-1.5">
              <ImageIcon className="h-3.5 w-3.5" />
              {t('theme.wallpaper')}
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {PRESET_WALLPAPERS.map((wp) => {
                const isSelected = customBgUrl === wp.url
                return (
                  <button
                    key={wp.key}
                    type="button"
                    onClick={() =>
                      applyTheme({
                        accent: accentColor,
                        bgUrl: wp.url,
                        opacity: bgOverlayOpacity,
                        blur: bgBlur
                      })
                    }
                    className={`flex cursor-pointer items-center justify-between gap-2 border p-2.5 text-left text-xs transition-colors ${
                      isSelected
                        ? 'border-accent bg-hover font-semibold text-primary'
                        : 'border-hairline bg-surface text-muted hover:bg-hover hover:text-primary'
                    }`}
                    style={{ borderRadius: 'var(--radius-control)' }}
                  >
                    <span className="truncate">{t(`theme.${wp.key}`)}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-accent shrink-0" />}
                  </button>
                )
              })}
            </div>

            {/* Custom URL Input */}
            <div className="flex items-center gap-1.5 pt-1">
              <TextInput
                type="url"
                placeholder={t('theme.customUrl')}
                value={customBgUrl.startsWith('data:') ? '' : customBgUrl}
                clearable
                variant="boxed"
                onChange={(val) =>
                  applyTheme({
                    accent: accentColor,
                    bgUrl: val,
                    opacity: bgOverlayOpacity,
                    blur: bgBlur
                  })
                }
                inputClassName="font-mono text-xs"
                className="flex-1"
              />
              <button
                type="button"
                className="gc-btn shrink-0"
                onClick={async () => {
                  if (!window.gone?.app?.pickBackgroundImage) return
                  const result = await window.gone.app.pickBackgroundImage()
                  if (result?.dataUrl) {
                    applyTheme({
                      accent: accentColor,
                      bgUrl: result.dataUrl,
                      opacity: bgOverlayOpacity,
                      blur: bgBlur
                    })
                  }
                }}
              >
                <ImageIcon className="h-3.5 w-3.5" />
                <span>{t('theme.importImage')}</span>
              </button>
            </div>
          </div>

          {/* Overlay Opacity & Blur Sliders */}
          {customBgUrl && (
            <div
              className="space-y-4 border border-hairline bg-app p-4"
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
                  min="0.3"
                  max="0.95"
                  step="0.05"
                  value={bgOverlayOpacity}
                  onChange={(e) =>
                    applyTheme({
                      accent: accentColor,
                      bgUrl: customBgUrl,
                      opacity: parseFloat(e.target.value),
                      blur: bgBlur
                    })
                  }
                  className="w-full accent-accent cursor-pointer"
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
                  onChange={(e) =>
                    applyTheme({
                      accent: accentColor,
                      bgUrl: customBgUrl,
                      opacity: bgOverlayOpacity,
                      blur: parseInt(e.target.value, 10)
                    })
                  }
                  className="w-full accent-accent cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-hairline px-5 py-3">
          <button type="button" onClick={handleReset} className="gc-btn">
            <RotateCcw className="h-3.5 w-3.5" />
            <span>{t('theme.default')}</span>
          </button>
          <button type="button" onClick={onClose} className="gc-btn-primary">
            {t('theme.done')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ThemeSettingsModal
