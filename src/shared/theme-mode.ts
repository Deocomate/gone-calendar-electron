export type ThemeMode = 'light' | 'dark' | 'system'

export function shouldUseDarkClass(mode: ThemeMode, systemPrefersDark: boolean): boolean {
  if (mode === 'dark') return true
  if (mode === 'light') return false
  return systemPrefersDark
}

export function applyDocumentTheme(isDark: boolean): void {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', isDark)
}
