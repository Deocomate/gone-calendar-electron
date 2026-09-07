import { describe, it, expect } from 'vitest'
import {
  convertSolarToLunar,
  formatLunarLabel,
  resolveLunarOccurrence
} from '../src/shared/lunar-vietnam'

describe('Vietnamese Lunar Calendar (Âm Lịch Việt Nam)', () => {
  it('should accurately calculate Lunar New Year (Tết Nguyên Đán) across multiple years', () => {
    // 2024 Tết Giáp Thìn: Feb 10, 2024 -> 1/1/2024 Lunar (Giáp Thìn)
    const tet2024 = convertSolarToLunar(10, 2, 2024)
    expect(tet2024.day).toBe(1)
    expect(tet2024.month).toBe(1)
    expect(tet2024.year).toBe(2024)
    expect(tet2024.canChiYear).toBe('Giáp Thìn')

    // 2025 Tết Ất Tỵ: Jan 29, 2025 -> 1/1/2025 Lunar (Ất Tỵ)
    const tet2025 = convertSolarToLunar(29, 1, 2025)
    expect(tet2025.day).toBe(1)
    expect(tet2025.month).toBe(1)
    expect(tet2025.year).toBe(2025)
    expect(tet2025.canChiYear).toBe('Ất Tỵ')

    // 2026 Tết Bính Ngọ: Feb 17, 2026 -> 1/1/2026 Lunar (Bính Ngọ)
    const tet2026 = convertSolarToLunar(17, 2, 2026)
    expect(tet2026.day).toBe(1)
    expect(tet2026.month).toBe(1)
    expect(tet2026.year).toBe(2026)
    expect(tet2026.canChiYear).toBe('Bính Ngọ')
  })

  it('should accurately calculate Mid-Autumn Festival (Rằm Tháng Tám)', () => {
    // 2026 Mid-Autumn: Sep 25, 2026 -> 15/8/2026 Lunar
    const midAutumn2026 = convertSolarToLunar(25, 9, 2026)
    expect(midAutumn2026.day).toBe(15)
    expect(midAutumn2026.month).toBe(8)
  })

  it('should format labels correctly for day 1, day 15, and normal days', () => {
    const day1 = convertSolarToLunar(17, 2, 2026)
    const day1Label = formatLunarLabel(day1)
    expect(day1Label.label).toBe('1/1')
    expect(day1Label.isFirstDay).toBe(true)
    expect(day1Label.isTet).toBe(true)

    const day15 = convertSolarToLunar(25, 9, 2026)
    const day15Label = formatLunarLabel(day15)
    expect(day15Label.label).toBe('15/8')
    expect(day15Label.isFullMoon).toBe(true)

    const normalDay = convertSolarToLunar(18, 8, 2026) // Solar Aug 18, 2026 -> Lunar 6/7
    const normalLabel = formatLunarLabel(normalDay)
    expect(normalLabel.label).toBe('6')
    expect(normalLabel.isFirstDay).toBe(false)
  })
})

describe('resolveLunarOccurrence (yearly lunar anniversaries / giỗ)', () => {
  it('places a normal anniversary on the right Gregorian date each year', () => {
    // 10/3 âm lịch = Giỗ Tổ Hùng Vương, a nationally observed date.
    const spec = { day: 10, month: 3, leap: false }
    expect(resolveLunarOccurrence(spec, 2024)).toBe('2024-04-18')
    expect(resolveLunarOccurrence(spec, 2025)).toBe('2025-04-07')
    expect(resolveLunarOccurrence(spec, 2026)).toBe('2026-04-26')
    expect(resolveLunarOccurrence(spec, 2027)).toBe('2027-04-16')
  })

  it('round-trips: the resolved solar date maps back to the lunar spec', () => {
    const spec = { day: 5, month: 7, leap: false }
    for (const year of [2024, 2025, 2026, 2027, 2028]) {
      const iso = resolveLunarOccurrence(spec, year)
      expect(iso).not.toBeNull()
      const [y, m, d] = iso!.split('-').map(Number)
      const back = convertSolarToLunar(d, m, y)
      expect(back.day).toBe(5)
      expect(back.month).toBe(7)
      expect(back.leap).toBe(false)
      expect(y).toBe(year)
    }
  })

  it('falls back to day 29 when the lunar month has only 29 days', () => {
    // Lunar month 2 of 2025 has 29 days — a "day 30" anniversary lands on day 29.
    expect(resolveLunarOccurrence({ day: 30, month: 2, leap: false }, 2025)).toBe('2025-03-28')
  })

  it('falls back to the ordinary month when the target year has no matching leap month', () => {
    // 2026 has no leap month 6, so a leap-6 anniversary resolves to ordinary 15/6.
    const leapSpec = { day: 15, month: 6, leap: true }
    const ordinary = resolveLunarOccurrence({ day: 15, month: 6, leap: false }, 2026)
    expect(resolveLunarOccurrence(leapSpec, 2026)).toBe(ordinary)
  })

  it('resolves to the leap month when the target year actually has one', () => {
    // 2025 has a leap month 7 — the leap occurrence is distinct from and later
    // than the ordinary one.
    const ordinary = resolveLunarOccurrence({ day: 15, month: 7, leap: false }, 2025)
    const leap = resolveLunarOccurrence({ day: 15, month: 7, leap: true }, 2025)
    expect(ordinary).toBe('2025-08-08')
    expect(leap).toBe('2025-09-06')
    expect(leap! > ordinary!).toBe(true)
  })
})
