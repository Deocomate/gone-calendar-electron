import { describe, it, expect } from 'vitest'
import { DateTime } from 'luxon'
import {
  buildMiniCalendarDays,
  weekdayHeaders,
  toLuxonWeekStart
} from '../src/shared/mini-calendar-grid'
import { DEFAULT_APP_SETTINGS } from '../src/shared/settings-contract'
import { shouldUseDarkClass } from '../src/shared/theme-mode'

describe('Mini calendar weekday offset', () => {
  it('starts Monday weeks on Monday when firstDayOfWeek is 1', () => {
    const august = DateTime.fromObject({ year: 2021, month: 8, day: 15 })
    const days = buildMiniCalendarDays(august, 1)
    expect(days).toHaveLength(42)
    expect(days[0].weekday).toBe(1)
    expect(days[0].toISODate()).toBe('2021-07-26')
    expect(days[6].toISODate()).toBe('2021-08-01')
  })

  it('starts Sunday weeks on Sunday when firstDayOfWeek is 0', () => {
    const august = DateTime.fromObject({ year: 2021, month: 8, day: 15 })
    const days = buildMiniCalendarDays(august, 0)
    expect(days[0].weekday).toBe(7)
    expect(days[0].toISODate()).toBe('2021-08-01')
    expect(weekdayHeaders(0)[0]).toBe('CN')
    expect(toLuxonWeekStart(0)).toBe(7)
  })

  it('includes the full current month in the 6-week grid', () => {
    const february = DateTime.fromObject({ year: 2026, month: 2, day: 1 })
    const days = buildMiniCalendarDays(february, 1)
    const monthDays = days.filter((d) => d.month === 2)
    expect(monthDays).toHaveLength(28)
  })
})

describe('Theme defaults', () => {
  it('defaults application theme to light', () => {
    expect(DEFAULT_APP_SETTINGS.theme).toBe('light')
    expect(DEFAULT_APP_SETTINGS.themeAccent).toBe('#2383e2')
  })

  it('resolves dark class from explicit and system modes', () => {
    expect(shouldUseDarkClass('light', true)).toBe(false)
    expect(shouldUseDarkClass('dark', false)).toBe(true)
    expect(shouldUseDarkClass('system', true)).toBe(true)
    expect(shouldUseDarkClass('system', false)).toBe(false)
  })
})
