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

interface ThemeSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onThemeChanged: (theme: ThemeConfig) => void
}

const ACCENT_COLORS = [
  { hex: '#6366f1', name: 'Indigo' },
  { hex: '#8b5cf6', name: 'Violet' },
  { hex: '#0ea5e9', name: 'Sky Blue' },
  { hex: '#10b981', name: 'Emerald' },
  { hex: '#f59e0b', name: 'Amber' },
  { hex: '#f43f5e', name: 'Rose' },
  { hex: '#d946ef', name: 'Fuchsia' },
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
  const [accentColor, setAccentColor] = useState('#6366f1')
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
      accent: '#6366f1',
      bgUrl: '',
      opacity: 0.8,
      blur: 8
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in select-none">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Tùy biến Giao diện (Deep Theme)</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
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
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all flex items-center justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500 text-slate-100 font-semibold'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <span className="truncate">{wp.name}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-indigo-400 shrink-0" />}
                  </button>
                )
              })}
            </div>

            {/* Custom URL Input */}
            <div className="space-y-1 pt-1">
              <input
                type="url"
                placeholder="Hoặc dán URL ảnh nền tùy chỉnh (https://...)"
                value={customBgUrl}
                onChange={(e) =>
                  applyTheme({
                    accent: accentColor,
                    bgUrl: e.target.value,
                    opacity: bgOverlayOpacity,
                    blur: bgBlur
                  })
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-hidden focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          {/* Overlay Opacity & Blur Sliders */}
          {customBgUrl && (
            <div className="space-y-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
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
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Mặc định</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-md shadow-indigo-600/30 transition-all"
          >
            Hoàn tất
          </button>
        </div>
      </div>
    </div>
  )
}

export default ThemeSettingsModal
