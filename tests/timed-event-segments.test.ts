import { DateTime } from 'luxon'
import { describe, expect, it } from 'vitest'
import type { ExpandedOccurrence } from '../src/shared/event-model'
import { segmentDayMinutes, segmentTimedOccurrence } from '../src/shared/timed-event-segments'

function occ(
  partial: Partial<ExpandedOccurrence> & { start: DateTime; end: DateTime }
): ExpandedOccurrence {
  const { start, end, ...rest } = partial
  return {
    id: rest.id || 'evt_1',
    eventId: 'evt',
    calendarId: 'cal',
    title: 'Test',
    startUtc: start.toUTC().toISO()!,
    endUtc: end.toUTC().toISO()!,
    tzid: 'local',
    allDay: false,
    isRecurring: false,
    isException: false,
    originalStartUtc: start.toUTC().toISO()!,
    ...rest
  }
}

describe('segmentTimedOccurrence', () => {
  it('keeps a same-day timed event as one first+last segment', () => {
    const start = DateTime.local(2026, 8, 19, 10, 0, 0)
    const end = DateTime.local(2026, 8, 19, 11, 15, 0)
    const segments = segmentTimedOccurrence(occ({ start, end }))
    expect(segments).toHaveLength(1)
    expect(segments[0].isFirst).toBe(true)
    expect(segments[0].isLast).toBe(true)
    expect(segments[0].dateKey).toBe('2026-08-19')
    expect(segmentDayMinutes(segments[0])).toEqual({ startMin: 10 * 60, endMin: 11 * 60 + 15 })
  })

  it('splits overnight events across two local days', () => {
    const start = DateTime.local(2026, 8, 18, 22, 0, 0)
    const end = DateTime.local(2026, 8, 19, 2, 0, 0)
    const segments = segmentTimedOccurrence(occ({ start, end }))
    expect(segments.map((s) => s.dateKey)).toEqual(['2026-08-18', '2026-08-19'])
    expect(segments[0].isFirst).toBe(true)
    expect(segments[0].isLast).toBe(false)
    expect(segments[1].isFirst).toBe(false)
    expect(segments[1].isLast).toBe(true)
    expect(segmentDayMinutes(segments[0]).endMin).toBe(24 * 60)
    expect(segmentDayMinutes(segments[1])).toEqual({ startMin: 0, endMin: 120 })
  })

  it('treats exclusive midnight as ending on the previous day', () => {
    const start = DateTime.local(2026, 8, 18, 22, 0, 0)
    const end = DateTime.local(2026, 8, 19, 0, 0, 0)
    const segments = segmentTimedOccurrence(occ({ start, end }))
    expect(segments).toHaveLength(1)
    expect(segments[0].dateKey).toBe('2026-08-18')
    expect(segments[0].isLast).toBe(true)
  })

  it('returns no segments for all-day events', () => {
    const start = DateTime.local(2026, 8, 19)
    const segments = segmentTimedOccurrence(
      occ({ start, end: start.plus({ days: 1 }), allDay: true, id: 'all' })
    )
    expect(segments).toHaveLength(0)
  })

  it('repeats the clock window on each day when a daytime event spans dates', () => {
    const start = DateTime.local(2026, 8, 18, 10, 0, 0)
    const end = DateTime.local(2026, 8, 20, 11, 0, 0)
    const segments = segmentTimedOccurrence(occ({ start, end }))
    expect(segments.map((s) => s.dateKey)).toEqual(['2026-08-18', '2026-08-19', '2026-08-20'])
    expect(segments.map((s) => segmentDayMinutes(s))).toEqual([
      { startMin: 10 * 60, endMin: 11 * 60 },
      { startMin: 10 * 60, endMin: 11 * 60 },
      { startMin: 10 * 60, endMin: 11 * 60 }
    ])
  })
})
