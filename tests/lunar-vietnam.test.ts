import { describe, it, expect } from 'vitest'
import { convertSolarToLunar, formatLunarLabel } from '../src/shared/lunar-vietnam'

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
