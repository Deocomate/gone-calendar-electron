import React, { useState, useEffect } from 'react'
import {
  Palette,
  Image as ImageIcon,
  Sliders,
  Check,
  RotateCcw,
  X,
  Sparkles
} from 'lucide-react'
import type { ThemeConfig } from '@shared/task-model'
import { TextInput } from './ui'

interface ThemeSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onThemeChanged: (theme: ThemeConfig) => void
}

const ACCENT_COLORS = [
  { hex: '#1A73E8', name: 'Google Blue' },
  { hex: '#34C77B', name: 'Green' },
  { hex: '#4A90E2', name: 'Blue' },
  { hex: '#F3722C', name: 'Orange' },
  { hex: '#E63946', name: 'Red' },
  { hex: '#10b981', name: 'Emerald' },
  { hex: '#8b5cf6', name: 'Violet' },
  { hex: '#06b6d4', name: 'Cyan' }
]

const PRESET_WALLPAPERS = [
  {
    name: 'Không dùng ảnh (Mặc định)',
    url: ''
  },
  {
    name: 'Vũ trụ Đêm (Cosmic Night)',
    url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=1200&auto=format&fit=crop'
  },
  {
    name: 'Rừng sương mù (Misty Forest)',
    url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=1200&auto=format&fit=crop'
  },
  {
    name: 'Hoàng hôn Tím (Purple Sunset)',
    url: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?q=80&w=1200&auto=format&fit=crop'
  },
  {
    name: 'Thành phố Cyber (Cyber City)',
    url: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?q=80&w=1200&auto=format&fit=crop'
  }
]

export const ThemeSettingsModal: React.FC<ThemeSettingsModalProps> = ({
  isOpen,
  onClose,
  onThemeChanged
}) => {
  const [accentColor, setAccentColor] = useState('#1A73E8')
  const [customBgUrl, setCustomBgUrl] = useState('')
  const [bgOverlayOpacity, setBgOverlayOpacity] = useState(0.8)
  const [bgBlur, setBgBlur] = useState(8)

  useEffect(() => {
    if (!isOpen) return

    // Load current theme from settings
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

    // Save to settings
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
      accent: '#1A73E8',
      bgUrl: '',
      opacity: 0.8,
      blur: 8
    })
  }

  if (!isOpen) return null

  return (
    <div className="gc-overlay select-none">
      <div className="gc-dialog w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-hairline bg-app px-6 py-4">
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-accent" />
            <h3 className="text-sm font-semibold text-primary">Tùy biến giao diện</h3>
          </div>
          <button type="button" onClick={onClose} className="gc-icon-btn">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          {/* Accent Color Section */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              Màu chủ đạo (Accent Color)
            </label>
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
                    className="h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer relative shadow-xs hover:scale-105"
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                  >
                    {isSelected && <Check className="h-4 w-4 text-white drop-shadow-md" />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Background Wallpaper Section */}
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ImageIcon className="h-3.5 w-3.5 text-indigo-400" />
              Hình nền ứng dụng (Background Wallpaper)
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESET_WALLPAPERS.map((wp) => {
                const isSelected = customBgUrl === wp.url
                return (
                  <button
                    key={wp.name}
                    type="button"
                    onClick={() =>
                      applyTheme({
                        accent: accentColor,
                        bgUrl: wp.url,
                        opacity: bgOverlayOpacity,
                        blur: bgBlur
                      })
                    }
                    className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg border p-2.5 text-left text-xs transition-all ${
                      isSelected
                        ? 'border-accent bg-hover font-semibold text-primary'
                        : 'border-hairline bg-surface text-muted hover:bg-hover hover:text-primary'
                    }`}
                  >
                    <span className="truncate">{wp.name}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-indigo-400 shrink-0" />}
                  </button>
                )
              })}
            </div>

            {/* Custom URL Input */}
            <div className="pt-1">
              <TextInput
                type="url"
                placeholder="Hoặc dán URL ảnh nền tùy chỉnh (https://...)"
                value={customBgUrl}
                clearable
                onChange={(val) =>
                  applyTheme({
                    accent: accentColor,
                    bgUrl: val,
                    opacity: bgOverlayOpacity,
                    blur: bgBlur
                  })
                }
                inputClassName="font-mono text-xs"
              />
            </div>
          </div>

          {/* Overlay Opacity & Blur Sliders */}
          {customBgUrl && (
            <div className="space-y-4 rounded-lg border border-hairline bg-app p-4">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                <Sliders className="h-3.5 w-3.5 text-indigo-400" />
                <span>Độ tương phản & Làm mờ nền</span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Lớp phủ bóng tối (Overlay Darkness)</span>
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
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Làm mờ ảnh nền (Blur Effect)</span>
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
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-hairline bg-app px-6 py-4">
          <button type="button" onClick={handleReset} className="gc-btn">
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Mặc định</span>
          </button>
          <button type="button" onClick={onClose} className="gc-btn-primary">
            Hoàn tất
          </button>
        </div>
      </div>
    </div>
  )
}

export default ThemeSettingsModal
