/**
 * Vietnamese Lunar Calendar Algorithm (Âm Lịch Việt Nam)
 * Based on astronomical formulas by Dr. Ho Ngoc Duc (UTC+7 timezone baseline)
 */

import type { LunarRecurrenceSpec } from './event-model'

export interface LunarDate {
  day: number
  month: number
  year: number
  leap: boolean
  jd: number
  canChiYear: string
}

const CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý']
const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi']

const PI = Math.PI

/**
 * Calculate Julian Day Number from solar date (dd/mm/yyyy)
 */
export function jdFromDate(dd: number, mm: number, yy: number): number {
  const a = Math.floor((14 - mm) / 12)
  const y = yy + 4800 - a
  const m = mm + 12 * a - 3
  let jd =
    dd +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  if (jd < 2299161) {
    jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083
  }
  return jd
}

/**
 * Convert Julian Day Number back to solar date
 */
export function jdToDate(jd: number): { day: number; month: number; year: number } {
  let a: number
  let b: number
  let c: number
  let d: number
  let e: number
  let m: number

  if (jd > 2299160) {
    const alpha = Math.floor((jd - 1867216.25) / 36524.25)
    a = jd + 1 + alpha - Math.floor(alpha / 4)
  } else {
    a = jd
  }

  b = a + 1524
  c = Math.floor((b - 122.1) / 365.25)
  d = Math.floor(365.25 * c)
  e = Math.floor((b - d) / 30.6001)

  const day = b - d - Math.floor(30.6001 * e)
  if (e < 14) {
    m = e - 1
  } else {
    m = e - 13
  }

  let year = m > 2 ? c - 4716 : c - 4715
  if (year <= 0) {
    year--
  }

  return { day, month: m, year }
}

/**
 * Calculate k-th new moon day (Sóc) after 1900-01-01
 */
export function getNewMoonDay(k: number, timeZone: number = 7): number {
  const T = k / 1236.85
  const T2 = T * T
  const T3 = T2 * T
  const dr = PI / 180

  let Jd1 =
    2415020.75933 +
    29.53058868 * k +
    0.0001178 * T2 -
    0.000000155 * T3 +
    0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr)

  const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3
  const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3
  const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3

  let C1 =
    (0.1734 - 0.000393 * T) * Math.sin(M * dr) +
    0.0021 * Math.sin(2 * dr * M) -
    0.4068 * Math.sin(Mpr * dr) +
    0.0161 * Math.sin(2 * dr * Mpr) -
    0.0004 * Math.sin(3 * dr * Mpr) +
    0.0104 * Math.sin(2 * dr * F) -
    0.0051 * Math.sin((M + Mpr) * dr) -
    0.0074 * Math.sin((M - Mpr) * dr) +
    0.0004 * Math.sin((2 * F + M) * dr) -
    0.0004 * Math.sin((2 * F - M) * dr) -
    0.0006 * Math.sin((2 * F + Mpr) * dr) +
    0.001 * Math.sin((2 * F - Mpr) * dr) +
    0.0005 * Math.sin((2 * Mpr + M) * dr)

  const deltat =
    T < -4
      ? 0.00117 + 0.00165 * T + 0.0005 * T2
      : 0.00011 + 0.0002 * T + 0.00018 * T2 - 0.000015 * T3

  const JdNew = Jd1 + C1 - deltat
  return Math.floor(JdNew + 0.5 + timeZone / 24)
}

/**
 * Calculate solar longitude (Tiết khí) for a given Julian Day Number (0..11)
 */
export function getSunLongitude(jdn: number, timeZone: number = 7): number {
  const T = (jdn - 2451545.0 + 0.5 - timeZone / 24) / 36525
  const T2 = T * T
  const dr = PI / 180

  const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2
  const M = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2
  const C =
    (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M) +
    (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) +
    0.00029 * Math.sin(dr * 3 * M)

  let theta = (L0 + C) % 360
  if (theta < 0) theta += 360

  return Math.floor(theta / 30)
}

/**
 * Find the Julian Day Number of the 11th lunar month of the given solar year
 */
function getLunarMonth11(yy: number, timeZone: number = 7): number {
  const off = jdFromDate(31, 12, yy) - 2415021
  const k = Math.floor(off / 29.530588853)
  let nm = getNewMoonDay(k, timeZone)
  const sunLong = getSunLongitude(nm, timeZone)
  if (sunLong >= 9) {
    nm = getNewMoonDay(k - 1, timeZone)
  }
  return nm
}

/**
 * Find leap month if any in the lunar year starting at a11
 */
function getLeapMonthOffset(a11: number, timeZone: number = 7): number {
  const k = Math.floor((a11 - 2415021.076998695) / 29.530588853 + 0.5)
  let last = 0
  let i = 1
  let arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone)

  do {
    last = arc
    i++
    arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone)
  } while (arc !== last && i < 14)

  return i - 1
}

/**
 * Convert Solar Date (day, month, year) to Vietnamese Lunar Date
 */
export function convertSolarToLunar(
  dd: number,
  mm: number,
  yy: number,
  timeZone: number = 7
): LunarDate {
  const jd = jdFromDate(dd, mm, yy)
  const k = Math.floor((jd - 2415021.076998695) / 29.530588853)
  let dayNumber = getNewMoonDay(k + 1, timeZone)

  if (dayNumber > jd) {
    dayNumber = getNewMoonDay(k, timeZone)
  }

  let a11 = getLunarMonth11(yy, timeZone)
  let b11 = a11
  let lunarYear: number

  if (a11 >= dayNumber) {
    lunarYear = yy
    a11 = getLunarMonth11(yy - 1, timeZone)
  } else {
    lunarYear = yy + 1
    b11 = getLunarMonth11(yy + 1, timeZone)
  }

  const lunarDay = jd - dayNumber + 1
  const diff = Math.floor((dayNumber - a11) / 29)
  let lunarMonth = diff + 11
  let lunarLeap = false

  if (b11 - a11 > 365) {
    const leapOffset = getLeapMonthOffset(a11, timeZone)
    if (diff >= leapOffset) {
      lunarMonth = diff + 10
      if (diff === leapOffset) {
        lunarLeap = true
      }
    }
  }

  if (lunarMonth > 12) {
    lunarMonth -= 12
  }
  if (lunarMonth >= 11 && diff < 4) {
    lunarYear--
  }

  // Can Chi calculation for lunar year
  const canIndex = (lunarYear + 6) % 10
  const chiIndex = (lunarYear + 8) % 12
  const canChiYear = `${CAN[canIndex]} ${CHI[chiIndex]}`

  return {
    day: lunarDay,
    month: lunarMonth,
    year: lunarYear,
    leap: lunarLeap,
    jd,
    canChiYear
  }
}

/**
 * Format lunar date string for calendar cells.
 * Example outputs:
 * - "1/8" (Day 1 of 8th lunar month - emphasized)
 * - "15/8" (Rằm Trung Thu)
 * - "29" (Standard days)
 */
export function formatLunarLabel(lunarDate: LunarDate): {
  label: string
  isFirstDay: boolean
  isFullMoon: boolean
  isTet: boolean
} {
  const isFirstDay = lunarDate.day === 1
  const isFullMoon = lunarDate.day === 15
  const isTet = lunarDate.day === 1 && lunarDate.month === 1

  const leapSuffix = lunarDate.leap ? '*' : ''
  let label: string

  if (isFirstDay) {
    label = `1/${lunarDate.month}${leapSuffix}`
  } else if (isFullMoon) {
    label = `15/${lunarDate.month}${leapSuffix}`
  } else {
    label = `${lunarDate.day}`
  }

  return {
    label,
    isFirstDay,
    isFullMoon,
    isTet
  }
}

/**
 * Convert a Lunar date (day, month, year, leap) to its Solar date counterpart (day, month, year)
 */
export function convertLunarToSolar(
  lunarDay: number,
  lunarMonth: number,
  lunarYear: number,
  lunarLeap: boolean = false,
  timeZone: number = 7
): { day: number; month: number; year: number } | null {
  // Approximate starting point for the lunar year in solar calendar
  const jdStart = jdFromDate(1, 1, lunarYear)
  for (let i = 0; i < 400; i++) {
    const jd = jdStart + i
    const solar = jdToDate(jd)
    const lunar = convertSolarToLunar(solar.day, solar.month, solar.year, timeZone)
    if (
      lunar.day === lunarDay &&
      lunar.month === lunarMonth &&
      lunar.year === lunarYear &&
      lunar.leap === lunarLeap
    ) {
      return solar
    }
  }
  return null
}

const lunarOccurrenceCache = new Map<string, string | null>()

function toIsoDate(d: { day: number; month: number; year: number }): string {
  const mm = String(d.month).padStart(2, '0')
  const dd = String(d.day).padStart(2, '0')
  return `${d.year}-${mm}-${dd}`
}

/**
 * Resolve a yearly lunar anniversary spec to its Gregorian date in `gregorianYear`.
 * Returns an ISO date string (YYYY-MM-DD) or null when it cannot be placed in
 * that year.
 *
 * Fallbacks:
 * - a leap-month anniversary in a year that has no such leap month falls back to
 *   the ordinary month;
 * - a day-30 anniversary in a 29-day lunar month falls back to day 29.
 *
 * Note: anniversaries in lunar months 11-12 straddle the Gregorian new year and
 * may occasionally land twice or skip a year across consecutive Gregorian years.
 * Death anniversaries (giỗ) are rarely in those months, so v1 accepts this.
 */
export function resolveLunarOccurrence(
  spec: LunarRecurrenceSpec,
  gregorianYear: number
): string | null {
  const key = `${spec.day}-${spec.month}-${spec.leap ? 1 : 0}@${gregorianYear}`
  const cached = lunarOccurrenceCache.get(key)
  if (cached !== undefined) return cached

  const candidates: Array<{ day: number; month: number; leap: boolean }> = [
    { day: spec.day, month: spec.month, leap: spec.leap }
  ]
  if (spec.leap) {
    candidates.push({ day: spec.day, month: spec.month, leap: false })
  }
  if (spec.day === 30) {
    candidates.push({ day: 29, month: spec.month, leap: spec.leap })
    if (spec.leap) candidates.push({ day: 29, month: spec.month, leap: false })
  }

  let result: string | null = null
  outer: for (const lunarYear of [gregorianYear, gregorianYear - 1]) {
    for (const c of candidates) {
      const solar = convertLunarToSolar(c.day, c.month, lunarYear, c.leap)
      if (solar && solar.year === gregorianYear) {
        result = toIsoDate(solar)
        break outer
      }
    }
  }

  lunarOccurrenceCache.set(key, result)
  return result
}
