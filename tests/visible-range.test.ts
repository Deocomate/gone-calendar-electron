import { describe, it, expect } from 'vitest'
import { DateTime } from 'luxon'
import { getVisibleRange } from '../src/shared/visible-range'

describe('Visible Range & Week Calculations', () => {
  const anchorDate = DateTime.fromISO('2026-08-18T10:00:00.000Z', { zone: 'utc' })

  it('should calculate 42-day Month range starting on Monday', () => {
    const range = getVisibleRange(anchorDate, 'month', 'vi')
    expect(range.label).toContain('Tháng 8, 2026')

    const start = DateTime.fromISO(range.startUtc, { zone: 'utc' })
    const end = DateTime.fromISO(range.endUtc, { zone: 'utc' })

    // August 2026 starts on Saturday (Aug 1), so grid starts on Monday July 27
    expect(start.weekday).toBe(1) // Monday
    const diffDays = Math.round(end.diff(start, 'days').days)
    expect(diffDays).toBe(42)
  })

  it('should calculate 7-day Week range with ISO week number', () => {
    const range = getVisibleRange(anchorDate, 'week', 'en')
    expect(range.label).toContain('Week 34')

    const start = DateTime.fromISO(range.startUtc, { zone: 'utc' })
    const end = DateTime.fromISO(range.endUtc, { zone: 'utc' })

    expect(start.weekday).toBe(1) // Monday Aug 17
    expect(end.weekday).toBe(7)   // Sunday Aug 23
    expect(Math.round(end.diff(start, 'days').days)).toBe(7)
  })

  it('should calculate 1-day Day range', () => {
    const range = getVisibleRange(anchorDate, 'day', 'en')
    expect(range.label).toContain('August 18, 2026')

    const start = DateTime.fromISO(range.startUtc, { zone: 'utc' })
    const end = DateTime.fromISO(range.endUtc, { zone: 'utc' })

    expect(start.day).toBe(18)
    expect(end.day).toBe(18)
  })

  it('should calculate Year range covering entire calendar year', () => {
    const range = getVisibleRange(anchorDate, 'year', 'en')
    expect(range.label).toBe('2026')

    const start = DateTime.fromISO(range.startUtc, { zone: 'utc' })
    const end = DateTime.fromISO(range.endUtc, { zone: 'utc' })

    expect(start.month).toBe(1)
    expect(start.day).toBe(1)
    expect(end.month).toBe(12)
    expect(end.day).toBe(31)
  })
})
