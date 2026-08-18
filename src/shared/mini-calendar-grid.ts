import { DateTime } from 'luxon'

/** 0 = Sunday, 1 = Monday (matches AppSettings.firstDayOfWeek). */
export type FirstDayOfWeek = 0 | 1

export const WEEKDAY_LABELS_MON: string[] = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
export const WEEKDAY_LABELS_SUN: string[] = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

export function weekdayHeaders(firstDayOfWeek: number): string[] {
  return firstDayOfWeek === 0 ? WEEKDAY_LABELS_SUN : WEEKDAY_LABELS_MON
}

/**
 * Convert settings firstDayOfWeek (0=Sun, 1=Mon) to Luxon weekday (1=Mon..7=Sun).
 */
export function toLuxonWeekStart(firstDayOfWeek: number): number {
  return firstDayOfWeek === 0 ? 7 : 1
}

/**
 * Build a 42-cell month grid starting on the configured first weekday.
 */
export function buildMiniCalendarDays(
  anchorDate: DateTime,
  firstDayOfWeek: number = 1
): DateTime[] {
  const monthStart = anchorDate.startOf('month')
  const weekStart = toLuxonWeekStart(firstDayOfWeek)
  const startOffset = (monthStart.weekday - weekStart + 7) % 7
  const gridStart = monthStart.minus({ days: startOffset }).startOf('day')
  return Array.from({ length: 42 }, (_, i) => gridStart.plus({ days: i }))
}

export const DEFAULT_EVENT_COLOR = '#4A90E2'
export const DEFAULT_ACCENT_COLOR = '#1A73E8'
export const TODAY_COLOR = '#E63946'
