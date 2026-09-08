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
