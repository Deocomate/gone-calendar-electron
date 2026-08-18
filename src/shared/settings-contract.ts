/**
 * Application Settings Interface & Defaults
 */

export interface AppSettings {
  showLunar: boolean
  showWeekNumbers: boolean
  firstDayOfWeek: number // 0 = Sunday, 1 = Monday (default)
  timeFormat: '12h' | '24h'
  theme: 'system' | 'dark' | 'light'
  themeAccent?: string
  themeCustomBg?: string
  themeOverlayOpacity?: number
  themeBlur?: number
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  showLunar: true,
  showWeekNumbers: true,
  firstDayOfWeek: 1, // ISO standard Monday
  timeFormat: '24h',
  theme: 'system',
  themeAccent: '#6366f1',
  themeCustomBg: '',
  themeOverlayOpacity: 0.8,
  themeBlur: 8
}
