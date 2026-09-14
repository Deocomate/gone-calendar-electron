import { describe, it, expect } from 'vitest'
import { allDayCoversDate, occurrenceDateKey, occurrenceDateKeys } from '../src/shared/all-day'

/**
 * The day view filtered its all-day row on the `allDay` flag alone, so it showed
 * whatever the range query returned. That query matches instants, and a local
 * day window east of GMT starts on the previous UTC date - in UTC+11 the window
 * for the 14th runs 13T14:00Z..14T13:59Z - so yesterday's all-day events fell
 * inside it and appeared on today.
 */
describe('allDayCoversDate', () => {
  const day = (d: string): [string, string] => [
    `2026-09-${d}T00:00:00.000Z`,
    `2026-09-${d}T23:59:59.999Z`
  ]

  it('matches the date the occurrence is on', () => {
    const [s, e] = day('14')
    expect(allDayCoversDate(s, e, '2026-09-14')).toBe(true)
  })

  it('excludes the previous day, which an instant-overlap query lets through', () => {
    const [s, e] = day('13')
    expect(allDayCoversDate(s, e, '2026-09-14')).toBe(false)
  })

  it('excludes the following day', () => {
    const [s, e] = day('15')
    expect(allDayCoversDate(s, e, '2026-09-14')).toBe(false)
  })

  it('covers every date of a multi-day span, inclusive of both ends', () => {
    const s = '2026-09-14T00:00:00.000Z'
    const e = '2026-09-17T23:59:59.999Z'
    expect(allDayCoversDate(s, e, '2026-09-13')).toBe(false)
    expect(allDayCoversDate(s, e, '2026-09-14')).toBe(true)
    expect(allDayCoversDate(s, e, '2026-09-16')).toBe(true)
    expect(allDayCoversDate(s, e, '2026-09-17')).toBe(true)
    expect(allDayCoversDate(s, e, '2026-09-18')).toBe(false)
  })

  it('handles a span crossing a month boundary', () => {
    const s = '2026-09-29T00:00:00.000Z'
    const e = '2026-10-02T23:59:59.999Z'
    expect(allDayCoversDate(s, e, '2026-09-30')).toBe(true)
    expect(allDayCoversDate(s, e, '2026-10-01')).toBe(true)
    expect(allDayCoversDate(s, e, '2026-10-03')).toBe(false)
  })
})

describe('occurrenceDateKeys', () => {
  it('returns the single day for a one-day all-day event', () => {
    expect(
      occurrenceDateKeys(true, '2026-09-14T00:00:00.000Z', '2026-09-14T23:59:59.999Z')
    ).toEqual(['2026-09-14'])
  })

  it('returns every day a multi-day all-day span covers', () => {
    // Previously the mini calendar and year view marked only the first day, so a
    // week-long trip showed a single dot.
    expect(
      occurrenceDateKeys(true, '2026-09-14T00:00:00.000Z', '2026-09-17T23:59:59.999Z')
    ).toEqual(['2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17'])
  })

  it('walks across a month boundary', () => {
    expect(
      occurrenceDateKeys(true, '2026-09-29T00:00:00.000Z', '2026-10-01T23:59:59.999Z')
    ).toEqual(['2026-09-29', '2026-09-30', '2026-10-01'])
  })

  it('returns one day for a timed event inside a single day', () => {
    expect(
      occurrenceDateKeys(false, '2026-09-14T09:00:00.000Z', '2026-09-14T10:00:00.000Z')
    ).toEqual([occurrenceDateKey(false, '2026-09-14T09:00:00.000Z')])
  })

  it('never returns an empty list, even if the end precedes the start', () => {
    const keys = occurrenceDateKeys(true, '2026-09-14T00:00:00.000Z', '2026-09-10T00:00:00.000Z')
    expect(keys).toEqual(['2026-09-14'])
  })

  it('caps a corrupt span rather than walking for years', () => {
    const keys = occurrenceDateKeys(true, '2026-01-01T00:00:00.000Z', '2999-01-01T00:00:00.000Z')
    expect(keys.length).toBeLessThanOrEqual(366)
    expect(keys[0]).toBe('2026-01-01')
  })
})
