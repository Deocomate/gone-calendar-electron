/**
 * Application Settings Interface & Defaults
 */

export interface AppSettings {
  showLunar: boolean
  showWeekNumbers: boolean
  firstDayOfWeek: number // 0 = Sunday, 1 = Monday (default)
  timeFormat: '12h' | '24h'
  theme: 'system' | 'dark' | 'light'
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  showLunar: true,
  showWeekNumbers: true,
  firstDayOfWeek: 1, // ISO standard Monday
  timeFormat: '24h',
  theme: 'system'
}
