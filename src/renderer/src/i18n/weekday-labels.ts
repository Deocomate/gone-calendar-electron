import type { TFunction } from 'i18next'

const MON_FIRST_ORDER = ['mo', 'tu', 'we', 'th', 'fr', 'sa', 'su'] as const
const SUN_FIRST_ORDER = ['su', 'mo', 'tu', 'we', 'th', 'fr', 'sa'] as const

/**
 * Locale-aware short weekday headers (reuses the recurrence editor's weekday
 * abbreviations so "T2/T3/.../CN" only shows up for the vi locale, not en too).
 */
export function weekdayShortLabels(t: TFunction, firstDayOfWeek: number): string[] {
  const order = firstDayOfWeek === 0 ? SUN_FIRST_ORDER : MON_FIRST_ORDER
  return order.map((code) => t(`editor.weekdayShort.${code}`))
}
