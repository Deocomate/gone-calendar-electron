import { describe, it, expect } from 'vitest'
import { sortOccurrencesWithinDay } from '../src/shared/occurrence-order'
import type { ExpandedOccurrence } from '../src/shared/event-model'

/**
 * A day's list was left in the repo's global startUtc order. That mixes two
 * different kinds of value: an all-day occurrence is a floating date stored at
 * UTC midnight, a timed one is a real instant. East of GMT a 09:00 event is
 * 22:00Z the previous day, so it sorted ahead of the all-day entry for its own
 * date - the opposite of what a calendar should show.
 */
function occ(
  id: string,
  startUtc: string,
  endUtc: string,
  allDay: boolean,
  title = id
): ExpandedOccurrence {
  return {
    id,
    eventId: id,
    calendarId: 'cal',
    title,
    startUtc,
    endUtc,
    tzid: 'UTC',
    allDay,
    isRecurring: false,
    isException: false,
    originalStartUtc: startUtc
  }
}

const names = (list: ExpandedOccurrence[]): string[] => list.map((o) => o.id)

describe('sortOccurrencesWithinDay', () => {
  it('puts all-day entries before timed ones', () => {
    // 09:00 in UTC+11 is 22:00Z the day before, which is why plain startUtc
    // ordering got this wrong.
    const timed = occ('timed-09:00', '2026-09-13T22:00:00.000Z', '2026-09-13T23:00:00.000Z', false)
    const allDay = occ('all-day', '2026-09-14T00:00:00.000Z', '2026-09-14T23:59:59.999Z', true)

    expect(names(sortOccurrencesWithinDay([timed, allDay]))).toEqual(['all-day', 'timed-09:00'])
  })

  it('orders timed events chronologically', () => {
    const a = occ('09:00', '2026-09-14T09:00:00.000Z', '2026-09-14T10:00:00.000Z', false)
    const b = occ('13:30', '2026-09-14T13:30:00.000Z', '2026-09-14T14:00:00.000Z', false)
    const c = occ('08:15', '2026-09-14T08:15:00.000Z', '2026-09-14T08:45:00.000Z', false)

    expect(names(sortOccurrencesWithinDay([b, a, c]))).toEqual(['08:15', '09:00', '13:30'])
  })

  it('keeps several all-day entries together, ahead of every timed one', () => {
    const timed = occ('timed', '2026-09-14T01:00:00.000Z', '2026-09-14T02:00:00.000Z', false)
    const ad1 = occ('ad1', '2026-09-14T00:00:00.000Z', '2026-09-14T23:59:59.999Z', true)
    const ad2 = occ('ad2', '2026-09-14T00:00:00.000Z', '2026-09-14T23:59:59.999Z', true, 'aaa')

    const sorted = sortOccurrencesWithinDay([timed, ad1, ad2])
    expect(sorted.slice(0, 2).every((o) => o.allDay)).toBe(true)
    expect(sorted[2].id).toBe('timed')
  })

  it('places a longer multi-day banner above a single-day entry that starts with it', () => {
    const span = occ('span', '2026-09-14T00:00:00.000Z', '2026-09-17T23:59:59.999Z', true)
    const single = occ('single', '2026-09-14T00:00:00.000Z', '2026-09-14T23:59:59.999Z', true)

    expect(names(sortOccurrencesWithinDay([single, span]))).toEqual(['span', 'single'])
  })

  it('breaks ties by title then id so the order is stable across renders', () => {
    const b = occ('id-b', '2026-09-14T09:00:00.000Z', '2026-09-14T10:00:00.000Z', false, 'Beta')
    const a = occ('id-a', '2026-09-14T09:00:00.000Z', '2026-09-14T10:00:00.000Z', false, 'Alpha')

    expect(names(sortOccurrencesWithinDay([b, a]))).toEqual(['id-a', 'id-b'])
    // Same input in the other order must produce the same result.
    expect(names(sortOccurrencesWithinDay([a, b]))).toEqual(['id-a', 'id-b'])
  })

  it('does not mutate the array it was given', () => {
    const a = occ('a', '2026-09-14T09:00:00.000Z', '2026-09-14T10:00:00.000Z', false)
    const b = occ('b', '2026-09-14T00:00:00.000Z', '2026-09-14T23:59:59.999Z', true)
    const input = [a, b]

    sortOccurrencesWithinDay(input)
    expect(names(input)).toEqual(['a', 'b'])
  })
})
