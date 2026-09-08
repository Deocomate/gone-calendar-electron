import { createContext, useContext } from 'react'
import type { AppSettings } from '@shared/settings-contract'

export interface DisplayPreferences {
  timeFormat: AppSettings['timeFormat']
  hourBlockSize: AppSettings['hourBlockSize']
  dayStartHour: number
  /** IANA zone name, or '' when the secondary timezone gutter is disabled. */
  secondaryTimezone: string
}

export const DEFAULT_DISPLAY_PREFERENCES: DisplayPreferences = {
  timeFormat: '24h',
  hourBlockSize: 'medium',
  dayStartHour: 7,
  secondaryTimezone: ''
}

/** Row height (px) of one hour in the Day/Week timed grid, per hourBlockSize setting. */
export const HOUR_HEIGHT_BY_SIZE: Record<AppSettings['hourBlockSize'], number> = {
  small: 40,
  medium: 56,
  large: 76
}

const DisplayPreferencesContext = createContext<DisplayPreferences>(DEFAULT_DISPLAY_PREFERENCES)

export const DisplayPreferencesProvider = DisplayPreferencesContext.Provider

/** Cross-cutting display settings (time format, hour block size, day start hour) - read via
 *  context instead of prop-drilling through every view/leaf component that shows a clock time. */
export function useDisplayPreferences(): DisplayPreferences {
  return useContext(DisplayPreferencesContext)
}
