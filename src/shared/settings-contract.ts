/**
 * Application Settings Interface & Defaults
 */

export interface AppSettings {
  locale: 'en' | 'vi'
  showLunar: boolean
  showWeekNumbers: boolean
  showMiniCalendar: boolean
  firstDayOfWeek: number // 0 = Sunday, 1 = Monday (default)
  timeFormat: '12h' | '24h'
  theme: 'system' | 'dark' | 'light'
  themeAccent?: string
  themeCustomBg?: string
  themeOverlayOpacity?: number
  themeBlur?: number
  /** Taskbar-style auto-hide for the top app header (menu/nav/search/view bar). */
  autoHideHeader: boolean
  /** Hour the Day/Week timed grid is scrolled to by default (0-23). */
  dayStartHour: number
  /** Row height of one hour in the Day/Week timed grid. */
  hourBlockSize: 'small' | 'medium' | 'large'
  /** IANA zone name (e.g. "America/New_York") shown as a second hour gutter in
   *  Day/Week view - empty means disabled. */
  secondaryTimezone: string
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  locale: 'en',
  showLunar: true,
  showWeekNumbers: true,
  showMiniCalendar: false,
  firstDayOfWeek: 1, // ISO standard Monday
  timeFormat: '24h',
  theme: 'dark',
  themeAccent: '#5865f2',
  themeCustomBg: '',
  themeOverlayOpacity: 0.8,
  themeBlur: 8,
  autoHideHeader: true,
  dayStartHour: 7,
  hourBlockSize: 'medium',
  secondaryTimezone: ''
}
