export type ThemeMode = 'light' | 'dark' | 'system'

export interface ThemeConfig {
  mode: 'dark' | 'light' | 'system'
  accentColor: string
  customBgUrl?: string
  bgOverlayOpacity: number // 0.0 to 1.0 (default 0.75)
  bgBlur: number // px (default 0)
}

export function shouldUseDarkClass(mode: ThemeMode, systemPrefersDark: boolean): boolean {
  if (mode === 'dark') return true
  if (mode === 'light') return false
  return systemPrefersDark
}

export function applyDocumentTheme(isDark: boolean): void {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', isDark)
}

/**
 * Marks the document as having a custom background image so the chrome can go
 * translucent (see `.gc-custom-bg` in the stylesheet). Without this the image is
 * painted behind fully opaque panels and is never visible.
 */
export function applyCustomBackground(hasBackground: boolean): void {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('gc-custom-bg', hasBackground)
}
