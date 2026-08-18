import { describe, it, expect } from 'vitest'
import {
  getVietnamHolidays,
  getInternationalHolidays,
  generateHolidayEvents
} from '../src/shared/holiday-calendars'
import { convertLunarToSolar, convertSolarToLunar } from '../src/shared/lunar-vietnam'

describe('Holiday Calendars & Lunar Solar conversion', () => {
  it('should convert lunar date to solar date and round-trip correctly', () => {
    // Tết Nguyên Đán 2026 (1/1 Âm lịch Bính Ngọ) corresponds to 17/02/2026 Solar
    const solarTet2026 = convertLunarToSolar(1, 1, 2026)
    expect(solarTet2026).toBeDefined()
    expect(solarTet2026).toEqual({ day: 17, month: 2, year: 2026 })

    // Convert back from solar to lunar
    const lunarBack = convertSolarToLunar(solarTet2026!.day, solarTet2026!.month, solarTet2026!.year)
    expect(lunarBack.day).toBe(1)
    expect(lunarBack.month).toBe(1)
    expect(lunarBack.year).toBe(2026)
  })

  it('should generate Vietnam public and lunar holidays for 2026', () => {
    const vn2026 = getVietnamHolidays(2026)
    expect(vn2026.length).toBeGreaterThan(15)

    // Check fixed solar holidays
    expect(vn2026.some((h) => h.title.includes('Tết Dương Lịch') && h.solarDate === '2026-01-01')).toBe(true)
    expect(vn2026.some((h) => h.title.includes('Quốc khánh') && h.solarDate === '2026-09-02')).toBe(true)
    expect(vn2026.some((h) => h.title.includes('Giải phóng Miền Nam') && h.solarDate === '2026-04-30')).toBe(true)

    // Check lunar calculated holidays
    expect(vn2026.some((h) => h.title.includes('Mùng 1 Tết') && h.solarDate === '2026-02-17')).toBe(true)
    expect(vn2026.some((h) => h.title.includes('Giỗ Tổ Hùng Vương'))).toBe(true)
    expect(vn2026.some((h) => h.title.includes('Trung Thu'))).toBe(true)
  })

  it('should generate International holidays for 2026', () => {
    const intl2026 = getInternationalHolidays(2026)
    expect(intl2026.length).toBeGreaterThanOrEqual(8)
    expect(intl2026.some((h) => h.title === "New Year's Day" && h.solarDate === '2026-01-01')).toBe(true)
    expect(intl2026.some((h) => h.title === 'Christmas Day' && h.solarDate === '2026-12-25')).toBe(true)
  })

  it('should generate event inputs for multiple years', () => {
    const events = generateHolidayEvents('cal_vn_holidays', 'vietnam', [2026, 2027])
    expect(events.length).toBeGreaterThan(30)
    expect(events[0].calendarId).toBe('cal_vn_holidays')
    expect(events[0].allDay).toBe(true)
  })
})
