import { describe, it, expect } from 'vitest'
import { DateTime, Settings } from 'luxon'
import { layoutAllDayEvents } from '../src/renderer/src/dnd/layout-allday-events'
import type { ExpandedOccurrence } from '../src/shared/event-model'

/**
 * All-day events are stored as UTC midnight standing in for a calendar date -
 * they are floating dates, not instants. The layout used to compare those UTC
 * values against the week's LOCAL day boundaries, so east of GMT the arithmetic
 * drifted by the zone offset. On the final column (Sunday in a Monday-first
 * week) the UTC day start landed past the clamped week end and the bar was
 * discarded outright, making every Sunday all-day event vanish.
 */

function allDay(id: string, date: string, endDate = date): ExpandedOccurrence {
  return {
    id,
    eventId: id,
    calendarId: 'cal',
    title: id,
    startUtc: `${date}T00:00:00.000Z`,
    endUtc: `${endDate}T23:59:59.999Z`,
    tzid: 'UTC',
    allDay: true,
    isRecurring: false,
    isException: false,
    originalStartUtc: `${date}T00:00:00.000Z`
  }
}

/** Monday-first week of 2026-09-14 .. 2026-09-20, built in the ambient zone. */
function weekDays(): DateTime[] {
  return Array.from({ length: 7 }, (_, i) =>
    DateTime.fromISO('2026-09-14T00:00:00').plus({ days: i })
  )
}

function withZone<T>(zone: string, fn: () => T): T {
  const previous = Settings.defaultZone
  Settings.defaultZone = zone
  try {
    return fn()
  } finally {
    Settings.defaultZone = previous
  }
}

describe('layoutAllDayEvents', () => {
  for (const zone of ['UTC', 'Australia/Sydney', 'Asia/Ho_Chi_Minh', 'America/Los_Angeles']) {
    describe(`in ${zone}`, () => {
      it('places a single-day bar on its own column, one day wide', () => {
        withZone(zone, () => {
          const layouts = layoutAllDayEvents([allDay('wed', '2026-09-16')], weekDays())
          expect(layouts).toHaveLength(1)
          expect(layouts[0].startCol).toBe(2)
          expect(layouts[0].span).toBe(1)
        })
      })

      it('keeps the final column (Sunday) instead of dropping it', () => {
        withZone(zone, () => {
          const layouts = layoutAllDayEvents([allDay('sun', '2026-09-20')], weekDays())
          expect(layouts, 'Sunday all-day bar must not be discarded').toHaveLength(1)
          expect(layouts[0].startCol).toBe(6)
          expect(layouts[0].span).toBe(1)
        })
      })

      it('keeps the first column (Monday) on its own day', () => {
        withZone(zone, () => {
          const layouts = layoutAllDayEvents([allDay('mon', '2026-09-14')], weekDays())
          expect(layouts).toHaveLength(1)
          expect(layouts[0].startCol).toBe(0)
          expect(layouts[0].span).toBe(1)
        })
      })

      it('spans a multi-day bar across exactly the days it covers', () => {
        withZone(zone, () => {
          const layouts = layoutAllDayEvents(
            [allDay('trip', '2026-09-15', '2026-09-17')],
            weekDays()
          )
          expect(layouts[0].startCol).toBe(1)
          expect(layouts[0].span).toBe(3)
        })
      })

      it('clamps a bar that overruns both week edges', () => {
        withZone(zone, () => {
          const layouts = layoutAllDayEvents(
            [allDay('long', '2026-09-10', '2026-09-25')],
            weekDays()
          )
          expect(layouts[0].startCol).toBe(0)
          expect(layouts[0].span).toBe(7)
        })
      })

      it('excludes bars that fall entirely outside the week', () => {
        withZone(zone, () => {
          expect(layoutAllDayEvents([allDay('before', '2026-09-01')], weekDays())).toHaveLength(0)
          expect(layoutAllDayEvents([allDay('after', '2026-09-28')], weekDays())).toHaveLength(0)
        })
      })

      it('stacks overlapping bars into separate lanes', () => {
        withZone(zone, () => {
          const layouts = layoutAllDayEvents(
            [allDay('a', '2026-09-14', '2026-09-17'), allDay('b', '2026-09-15', '2026-09-18')],
            weekDays()
          )
          expect(layouts).toHaveLength(2)
          expect(new Set(layouts.map((l) => l.lane)).size).toBe(2)
        })
      })
    })
  }
})
