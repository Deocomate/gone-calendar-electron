import { describe, it, expect } from 'vitest'
import { DateTime, Settings } from 'luxon'
import { expandOccurrences } from '../src/shared/expand-occurrences'
import type { CalendarEvent } from '../src/shared/event-model'

/**
 * A recurring event keeps its clock time, not its UTC offset.
 *
 * The rule used to be expanded in UTC, which pins a series to whatever offset it
 * happened to start with. A 09:00 Sydney standup created in September therefore
 * became 10:00 from October onwards and stayed wrong for half the year - and
 * nothing in the app said so, because every occurrence was internally consistent.
 */
function withZone<T>(zone: string, fn: () => T): T {
  const previous = Settings.defaultZone
  Settings.defaultZone = zone
  try {
    return fn()
  } finally {
    Settings.defaultZone = previous
  }
}

function weeklyAt(localIso: string, zone: string, rrule: string): CalendarEvent {
  const start = DateTime.fromISO(localIso, { zone })
  return {
    id: 'e1',
    calendarId: 'c1',
    uid: 'u1',
    title: 'Standup',
    dtStartUtc: start.toUTC().toISO()!,
    dtEndUtc: start.plus({ minutes: 30 }).toUTC().toISO()!,
    tzid: zone,
    allDay: false,
    rrule,
    isDeleted: false,
    createdAt: '',
    updatedAt: ''
  } as CalendarEvent
}

function clockTimes(event: CalendarEvent, zone: string, fromIso: string, toIso: string): string[] {
  return expandOccurrences(event, [], fromIso, toIso).map((o) =>
    DateTime.fromISO(o.startUtc, { zone: 'utc' }).setZone(zone).toFormat('HH:mm')
  )
}

describe('recurring events across a DST change', () => {
  it('holds 09:00 through the southern spring-forward', () => {
    // Sydney moves to UTC+11 on 4 October 2026.
    const zone = 'Australia/Sydney'
    const event = weeklyAt('2026-09-01T09:00', zone, 'FREQ=WEEKLY;BYDAY=TU')

    const times = clockTimes(event, zone, '2026-09-01T00:00:00Z', '2026-11-01T00:00:00Z')

    expect(times.length).toBeGreaterThan(6)
    expect(new Set(times), times.join(' ')).toEqual(new Set(['09:00']))
  })

  it('holds 09:00 through a northern fall-back', () => {
    // New York leaves DST on 1 November 2026.
    const zone = 'America/New_York'
    const event = weeklyAt('2026-10-06T09:00', zone, 'FREQ=WEEKLY;BYDAY=TU')

    const times = clockTimes(event, zone, '2026-10-01T00:00:00Z', '2026-12-01T00:00:00Z')

    expect(times.length).toBeGreaterThan(6)
    expect(new Set(times), times.join(' ')).toEqual(new Set(['09:00']))
  })

  it('holds a daily event through both directions in one year', () => {
    const zone = 'Europe/London'
    const event = weeklyAt('2026-01-05T08:30', zone, 'FREQ=MONTHLY;BYMONTHDAY=5')

    const times = clockTimes(event, zone, '2026-01-01T00:00:00Z', '2026-12-31T00:00:00Z')

    expect(times.length).toBeGreaterThanOrEqual(11)
    expect(new Set(times), times.join(' ')).toEqual(new Set(['08:30']))
  })

  it('leaves a zone without DST exactly as it was', () => {
    const zone = 'Asia/Ho_Chi_Minh'
    const event = weeklyAt('2026-09-01T09:00', zone, 'FREQ=WEEKLY;BYDAY=TU')

    const times = clockTimes(event, zone, '2026-09-01T00:00:00Z', '2026-12-01T00:00:00Z')

    expect(new Set(times)).toEqual(new Set(['09:00']))
  })

  it('still expands correctly when the event carries no zone of its own', () => {
    withZone('Australia/Sydney', () => {
      const start = DateTime.fromISO('2026-09-01T09:00', { zone: 'utc' })
      const event = {
        ...weeklyAt('2026-09-01T09:00', 'utc', 'FREQ=WEEKLY;BYDAY=TU'),
        tzid: '',
        dtStartUtc: start.toISO()!,
        dtEndUtc: start.plus({ minutes: 30 }).toISO()!
      } as CalendarEvent

      const times = clockTimes(event, 'utc', '2026-09-01T00:00:00Z', '2026-11-01T00:00:00Z')
      expect(new Set(times)).toEqual(new Set(['09:00']))
    })
  })

  it('keeps each occurrence half an hour long in real time', () => {
    const zone = 'Australia/Sydney'
    const event = weeklyAt('2026-09-01T09:00', zone, 'FREQ=WEEKLY;BYDAY=TU')

    for (const occ of expandOccurrences(
      event,
      [],
      '2026-09-01T00:00:00Z',
      '2026-11-01T00:00:00Z'
    )) {
      const mins = DateTime.fromISO(occ.endUtc, { zone: 'utc' })
        .diff(DateTime.fromISO(occ.startUtc, { zone: 'utc' }), 'minutes').minutes
      expect(mins).toBe(30)
    }
  })
})
