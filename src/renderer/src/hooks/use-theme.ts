import { useCallback, useEffect, useState } from 'react'
import type { ThemeConfig } from '@shared/theme-mode'
import {
  applyDocumentTheme,
  shouldUseDarkClass,
  type ThemeMode
} from '@shared/theme-mode'
import { DEFAULT_ACCENT_COLOR } from '@shared/mini-calendar-grid'
import { DEFAULT_APP_SETTINGS } from '@shared/settings-contract'

function getSystemPrefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(DEFAULT_APP_SETTINGS.theme)
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(getSystemPrefersDark)
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>({
    mode: DEFAULT_APP_SETTINGS.theme,
    accentColor: DEFAULT_APP_SETTINGS.themeAccent || DEFAULT_ACCENT_COLOR,
    customBgUrl: '',
    bgOverlayOpacity: DEFAULT_APP_SETTINGS.themeOverlayOpacity ?? 0.8,
    bgBlur: DEFAULT_APP_SETTINGS.themeBlur ?? 8
  })

  const isDark = shouldUseDarkClass(mode, systemPrefersDark)

  useEffect(() => {
    applyDocumentTheme(isDark)
  }, [isDark])

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (event: MediaQueryListEvent) => setSystemPrefersDark(event.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const persistMode = useCallback(async (next: ThemeMode) => {
    setMode(next)
    setThemeConfig((prev) => ({ ...prev, mode: next }))
    if (window.gone?.settings) {
      await window.gone.settings.set('theme', next)
    }
  }, [])

  const loadFromSettings = useCallback(async () => {
    if (!window.gone?.settings) return
    try {
      const settings = await window.gone.settings.getAll()
      const nextMode = (settings.theme as ThemeMode) || DEFAULT_APP_SETTINGS.theme
      setMode(nextMode)
      setThemeConfig({
        mode: nextMode,
        accentColor: settings.themeAccent || DEFAULT_ACCENT_COLOR,
        customBgUrl: settings.themeCustomBg || '',
        bgOverlayOpacity:
          settings.themeOverlayOpacity !== undefined
            ? settings.themeOverlayOpacity
            : 0.8,
        bgBlur: settings.themeBlur !== undefined ? settings.themeBlur : 8
      })
    } catch (err) {
      console.warn('Failed to load theme settings:', err)
    }
  }, [])

  return {
    mode,
    isDark,
    themeConfig,
    setThemeConfig,
    persistMode,
    loadFromSettings
  }
}
