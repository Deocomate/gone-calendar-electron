import { DateTime } from 'luxon'
import { convertLunarToSolar } from './lunar-vietnam'
import type { CreateEventInput } from './event-model'

export interface HolidayDefinition {
  title: string
  notes?: string
  color: string
}

export function getVietnamHolidays(year: number): Array<{
  title: string
  solarDate: string // YYYY-MM-DD
  notes: string
  color: string
}> {
  const list: Array<{ title: string; solarDate: string; notes: string; color: string }> = []

  // 1. Fixed Solar Holidays
  const solarHolidays = [
    { day: 1, month: 1, title: 'Tết Dương Lịch (New Year)', notes: 'Nghỉ lễ toàn quốc', color: '#ef4444' },
    { day: 14, month: 2, title: 'Lễ Tình nhân (Valentine)', notes: 'Ngày lễ Tình yêu', color: '#ec4899' },
    { day: 8, month: 3, title: 'Quốc tế Phụ nữ', notes: 'International Women\'s Day', color: '#ec4899' },
    { day: 30, month: 4, title: 'Ngày Giải phóng Miền Nam', notes: 'Reunification Day', color: '#ef4444' },
    { day: 1, month: 5, title: 'Quốc tế Lao động', notes: 'International Workers\' Day', color: '#ef4444' },
    { day: 1, month: 6, title: 'Quốc tế Thiếu nhi', notes: 'International Children\'s Day', color: '#3b82f6' },
    { day: 27, month: 7, title: 'Ngày Thương binh Liệt sĩ', notes: 'Tưởng niệm anh hùng liệt sĩ', color: '#f59e0b' },
    { day: 19, month: 8, title: 'Ngày Cách mạng Tháng Tám', notes: 'August Revolution', color: '#f59e0b' },
    { day: 2, month: 9, title: 'Quốc khánh Việt Nam', notes: 'National Day of Vietnam', color: '#ef4444' },
    { day: 20, month: 10, title: 'Ngày Phụ nữ Việt Nam', notes: 'Vietnamese Women\'s Day', color: '#ec4899' },
    { day: 20, month: 11, title: 'Ngày Nhà giáo Việt Nam', notes: 'Vietnamese Teachers\' Day', color: '#10b981' },
    { day: 22, month: 12, title: 'Ngày Thành lập Quân đội Nhân dân VN', notes: 'VPA Foundation Day', color: '#f59e0b' },
    { day: 24, month: 12, title: 'Đêm Lễ Giáng sinh (Christmas Eve)', notes: 'Giáng sinh', color: '#10b981' },
    { day: 25, month: 12, title: 'Lễ Giáng sinh (Christmas Day)', notes: 'Giáng sinh', color: '#10b981' }
  ]

  for (const h of solarHolidays) {
    const dt = DateTime.fromObject({ year, month: h.month, day: h.day })
    if (dt.isValid) {
      list.push({
        title: h.title,
        solarDate: dt.toISODate()!,
        notes: h.notes,
        color: h.color
      })
    }
  }

  // 2. Lunar Holidays
  const lunarHolidays = [
    { lDay: 23, lMonth: 12, title: 'Ông Táo về Trời (23 Tháng Chạp)', notes: 'Tiễn Táo Quân về trời', color: '#f59e0b' },
    { lDay: 30, lMonth: 12, title: 'Đêm Giao Thừa / Tất Niên', notes: 'Giao thừa Tết Nguyên Đán', color: '#ef4444' },
    { lDay: 1, lMonth: 1, title: 'Mùng 1 Tết Nguyên Đán', notes: 'Tết Cổ Truyền - Đầu năm mới', color: '#ef4444' },
    { lDay: 2, lMonth: 1, title: 'Mùng 2 Tết Nguyên Đán', notes: 'Tết Cổ Truyền', color: '#ef4444' },
    { lDay: 3, lMonth: 1, title: 'Mùng 3 Tết Nguyên Đán', notes: 'Tết Cổ Truyền', color: '#ef4444' },
    { lDay: 15, lMonth: 1, title: 'Tết Nguyên Tiêu (Rằm Tháng Giêng)', notes: 'Rằm đầu năm', color: '#f59e0b' },
    { lDay: 10, lMonth: 3, title: 'Giỗ Tổ Hùng Vương', notes: 'Quốc lễ Giỗ Tổ Hùng Vương (10/3 Âm)', color: '#ef4444' },
    { lDay: 15, lMonth: 4, title: 'Đại lễ Phật Đản (Vesak)', notes: 'Rằm tháng Tư', color: '#f59e0b' },
    { lDay: 5, lMonth: 5, title: 'Tết Đoan Ngọ (Giết sâu bọ)', notes: 'Mùng 5 tháng 5 Âm', color: '#10b981' },
    { lDay: 15, lMonth: 7, title: 'Lễ Vu Lan Báo Hiếu (Rằm Tháng Bảy)', notes: 'Xá tội vong nhân', color: '#f59e0b' },
    { lDay: 15, lMonth: 8, title: 'Tết Trung Thu (Rằm Tháng Tám)', notes: 'Tết Thiếu nhi / Trông trăng', color: '#3b82f6' }
  ]

  for (const lh of lunarHolidays) {
    // For 23/12 and 30/12 lunar, we convert for lunarYear = year - 1 (since it happens near Jan/Feb of current solar year)
    const lYear = lh.lMonth === 12 ? year - 1 : year
    let solar = convertLunarToSolar(lh.lDay, lh.lMonth, lYear)
    if (!solar && lh.lDay === 30) {
      // Month might only have 29 days
      solar = convertLunarToSolar(29, lh.lMonth, lYear)
    }

    if (solar) {
      const dt = DateTime.fromObject({ year: solar.year, month: solar.month, day: solar.day })
      if (dt.isValid) {
        list.push({
          title: lh.title,
          solarDate: dt.toISODate()!,
          notes: `${lh.notes} (${lh.lDay}/${lh.lMonth} Âm lịch)`,
          color: lh.color
        })
      }
    }
  }

  return list.sort((a, b) => a.solarDate.localeCompare(b.solarDate))
}

export function getInternationalHolidays(year: number): Array<{
  title: string
  solarDate: string
  notes: string
  color: string
}> {
  const list: Array<{ title: string; solarDate: string; notes: string; color: string }> = [
    { title: "New Year's Day", solarDate: `${year}-01-01`, notes: 'Global Holiday', color: '#ef4444' },
    { title: "Valentine's Day", solarDate: `${year}-02-14`, notes: 'Celebration of love', color: '#ec4899' },
    { title: "Earth Day", solarDate: `${year}-04-22`, notes: 'Environmental awareness', color: '#10b981' },
    { title: "International Workers' Day", solarDate: `${year}-05-01`, notes: 'Labour Day', color: '#ef4444' },
    { title: "Halloween", solarDate: `${year}-10-31`, notes: 'Costume & treats', color: '#f59e0b' },
    { title: "Christmas Eve", solarDate: `${year}-12-24`, notes: 'Christmas Eve', color: '#10b981' },
    { title: "Christmas Day", solarDate: `${year}-12-25`, notes: 'Christmas celebration', color: '#ef4444' },
    { title: "New Year's Eve", solarDate: `${year}-12-31`, notes: 'End of year celebration', color: '#8b5cf6' }
  ]

  return list.sort((a, b) => a.solarDate.localeCompare(b.solarDate))
}

/**
 * Generate Event Inputs for Holiday Calendars
 */
export function generateHolidayEvents(
  calendarId: string,
  type: 'vietnam' | 'international',
  years: number[]
): CreateEventInput[] {
  const results: CreateEventInput[] = []

  for (const y of years) {
    const holidays = type === 'vietnam' ? getVietnamHolidays(y) : getInternationalHolidays(y)

    for (const h of holidays) {
      const startUtc = DateTime.fromISO(`${h.solarDate}T00:00:00`, { zone: 'utc' }).toISO()!
      const endUtc = DateTime.fromISO(`${h.solarDate}T23:59:59`, { zone: 'utc' }).toISO()!

      results.push({
        calendarId,
        title: h.title,
        dtStartUtc: startUtc,
        dtEndUtc: endUtc,
        allDay: true,
        notes: h.notes,
        color: h.color
      })
    }
  }

  return results
}
