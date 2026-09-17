import { describe, it, expect } from 'vitest'
import { generateTimeSlots } from '../src/renderer/src/components/ui/TimePicker'
import { endDateForTimes } from '../src/shared/time-format'

describe('generateTimeSlots', () => {
  it('lists the plain day when there is no start to work from', () => {
    const slots = generateTimeSlots(30)
    expect(slots[0]).toBe('00:00')
    expect(slots.at(-1)).toBe('23:30')
    expect(slots).toHaveLength(48)
  })

  it('starts the end-time list after the start and wraps through midnight', () => {
    // The point of the change: choosing an end never means scrolling past every
    // hour that has already gone.
    const slots = generateTimeSlots(30, '15:00')

    expect(slots.slice(0, 3)).toEqual(['15:30', '16:00', '16:30'])
    expect(slots).toContain('23:30')
    expect(slots).toContain('00:00')
    expect(slots).toContain('00:30')
    // Exactly one day's worth, ending just before it would repeat the start.
    expect(slots).toHaveLength(48)
    expect(slots.at(-1)).toBe('15:00')
  })

  it('wraps cleanly from a late start', () => {
    const slots = generateTimeSlots(30, '23:00')
    expect(slots.slice(0, 4)).toEqual(['23:30', '00:00', '00:30', '01:00'])
  })

  it('never offers the start time itself as an end', () => {
    for (const step of [15, 30, 60] as const) {
      for (const start of ['00:00', '09:00', '23:00']) {
        expect(generateTimeSlots(step, start)[0], `${step}/${start}`).not.toBe(start)
      }
    }
  })

  it('rounds a start that is off the grid up onto it', () => {
    // An event pulled from a provider can start at 15:07; the next offer should
    // be a real slot, not 15:22.
    expect(generateTimeSlots(15, '15:07')[0]).toBe('15:15')
    expect(generateTimeSlots(30, '15:07')[0]).toBe('15:30')
  })

  it('honours each step', () => {
    expect(generateTimeSlots(15)).toHaveLength(96)
    expect(generateTimeSlots(60)).toHaveLength(24)
    expect(generateTimeSlots(60, '15:00').slice(0, 2)).toEqual(['16:00', '17:00'])
  })
})

describe('endDateForTimes', () => {
  const base = { startDate: '2026-09-17', startClock: '15:00', currentEndDate: '2026-09-17' }

  it('moves the end to the next day when the time runs past midnight', () => {
    expect(endDateForTimes({ ...base, endClock: '01:00' })).toBe('2026-09-18')
  })

  it('treats an end equal to the start as a full day, not a zero-length event', () => {
    expect(endDateForTimes({ ...base, endClock: '15:00' })).toBe('2026-09-18')
  })

  it('leaves the date alone when the end is simply later the same day', () => {
    expect(endDateForTimes({ ...base, endClock: '16:00' })).toBe('2026-09-17')
  })

  it('reverses its own roll when the end moves back into the same day', () => {
    expect(
      endDateForTimes({ ...base, endClock: '16:00', currentEndDate: '2026-09-18' })
    ).toBe('2026-09-17')
  })

  it('leaves a deliberately multi-day event alone', () => {
    // Three days out is not a roll this function made, so it is not one to undo.
    expect(
      endDateForTimes({ ...base, endClock: '16:00', currentEndDate: '2026-09-20' })
    ).toBe('2026-09-20')
  })

  it('crosses a month and a year boundary', () => {
    expect(
      endDateForTimes({
        startDate: '2026-09-30',
        startClock: '23:00',
        endClock: '01:00',
        currentEndDate: '2026-09-30'
      })
    ).toBe('2026-10-01')
    expect(
      endDateForTimes({
        startDate: '2026-12-31',
        startClock: '23:00',
        endClock: '01:00',
        currentEndDate: '2026-12-31'
      })
    ).toBe('2027-01-01')
  })

  it('leaves things alone rather than guessing when a time is unparseable', () => {
    expect(endDateForTimes({ ...base, endClock: 'nonsense' })).toBe('2026-09-17')
    expect(endDateForTimes({ ...base, startDate: '', endClock: '01:00' })).toBe('2026-09-17')
  })
})
