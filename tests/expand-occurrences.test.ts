import { describe, it, expect } from 'vitest'
import { expandOccurrences } from '../src/shared/expand-occurrences'
import type { CalendarEvent, EventException } from '../src/shared/event-model'

describe('expandOccurrences', () => {
  const baseEvent: CalendarEvent = {
    id: 'evt-1',
    calendarId: 'cal-1',
    uid: 'uid-1@gone.calendar',
    title: 'Team Standup',
    dtStartUtc: '2026-08-03T09:00:00.000Z',
    dtEndUtc: '2026-08-03T09:30:00.000Z',
    tzid: 'UTC',
    allDay: false,
    dirty: false,
    isDeleted: false,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z'
  }

  it('should expand a non-recurring event within date window', () => {
    const occs = expandOccurrences(
      baseEvent,
      [],
      '2026-08-01T00:00:00.000Z',
      '2026-08-10T00:00:00.000Z'
    )
    expect(occs).toHaveLength(1)
    expect(occs[0].title).toBe('Team Standup')
    expect(occs[0].startUtc).toBe('2026-08-03T09:00:00.000Z')
    expect(occs[0].isRecurring).toBe(false)
  })

  it('should return empty when non-recurring event is outside date window', () => {
    const occs = expandOccurrences(
      baseEvent,
      [],
      '2026-08-10T00:00:00.000Z',
      '2026-08-20T00:00:00.000Z'
    )
    expect(occs).toHaveLength(0)
  })

  it('should expand weekly recurring event across multiple weeks', () => {
    const recurringEvent: CalendarEvent = {
      ...baseEvent,
      rrule: 'FREQ=WEEKLY;BYDAY=MO'
    }

    // Window covering 4 Mondays in August 2026: Aug 3, 10, 17, 24, 31
    const occs = expandOccurrences(
      recurringEvent,
      [],
      '2026-08-01T00:00:00.000Z',
      '2026-08-31T23:59:59.999Z'
    )

    expect(occs).toHaveLength(5)
    expect(occs.every((o) => o.isRecurring)).toBe(true)
    expect(occs[0].startUtc).toBe('2026-08-03T09:00:00.000Z')
    expect(occs[1].startUtc).toBe('2026-08-10T09:00:00.000Z')
    expect(occs[2].startUtc).toBe('2026-08-17T09:00:00.000Z')
    expect(occs[3].startUtc).toBe('2026-08-24T09:00:00.000Z')
    expect(occs[4].startUtc).toBe('2026-08-31T09:00:00.000Z')
  })

  it('should respect COUNT limit in RRULE', () => {
    const countEvent: CalendarEvent = {
      ...baseEvent,
      rrule: 'FREQ=WEEKLY;COUNT=3'
    }

    const occs = expandOccurrences(
      countEvent,
      [],
      '2026-08-01T00:00:00.000Z',
      '2026-08-31T23:59:59.999Z'
    )

    expect(occs).toHaveLength(3)
  })

  it('should exclude dates listed in EXDATE', () => {
    const exdateEvent: CalendarEvent = {
      ...baseEvent,
      rrule: 'FREQ=WEEKLY;BYDAY=MO',
      exdate: '2026-08-10T09:00:00.000Z,2026-08-24T09:00:00.000Z'
    }

    const occs = expandOccurrences(
      exdateEvent,
      [],
      '2026-08-01T00:00:00.000Z',
      '2026-08-31T23:59:59.999Z'
    )

    // 5 mondays minus 2 excluded mondays = 3
    expect(occs).toHaveLength(3)
    const dates = occs.map((o) => o.startUtc)
    expect(dates).toContain('2026-08-03T09:00:00.000Z')
    expect(dates).not.toContain('2026-08-10T09:00:00.000Z')
    expect(dates).toContain('2026-08-17T09:00:00.000Z')
    expect(dates).not.toContain('2026-08-24T09:00:00.000Z')
    expect(dates).toContain('2026-08-31T09:00:00.000Z')
  })

  it('should apply modified occurrence exception', () => {
    const recurringEvent: CalendarEvent = {
      ...baseEvent,
      rrule: 'FREQ=WEEKLY;BYDAY=MO'
    }

    const exception: EventException = {
      id: 'ex-1',
      masterEventId: 'evt-1',
      originalStartUtc: '2026-08-10T09:00:00.000Z',
      isCancelled: false,
      title: 'Rescheduled Special Standup',
      dtStartUtc: '2026-08-10T14:00:00.000Z',
      dtEndUtc: '2026-08-10T14:45:00.000Z',
      tzid: 'UTC',
      createdAt: '2026-08-02T00:00:00.000Z',
      updatedAt: '2026-08-02T00:00:00.000Z'
    }

    const occs = expandOccurrences(
      recurringEvent,
      [exception],
      '2026-08-01T00:00:00.000Z',
      '2026-08-15T23:59:59.999Z'
    )

    expect(occs).toHaveLength(2)
    expect(occs[0].title).toBe('Team Standup')
    expect(occs[1].title).toBe('Rescheduled Special Standup')
    expect(occs[1].startUtc).toBe('2026-08-10T14:00:00.000Z')
    expect(occs[1].endUtc).toBe('2026-08-10T14:45:00.000Z')
    expect(occs[1].isException).toBe(true)
  })

  it('should omit cancelled occurrence exception', () => {
    const recurringEvent: CalendarEvent = {
      ...baseEvent,
      rrule: 'FREQ=WEEKLY;BYDAY=MO'
    }

    const cancelledException: EventException = {
      id: 'ex-cancel',
      masterEventId: 'evt-1',
      originalStartUtc: '2026-08-17T09:00:00.000Z',
      isCancelled: true,
      createdAt: '2026-08-02T00:00:00.000Z',
      updatedAt: '2026-08-02T00:00:00.000Z'
    }

    const occs = expandOccurrences(
      recurringEvent,
      [cancelledException],
      '2026-08-01T00:00:00.000Z',
      '2026-08-31T23:59:59.999Z'
    )

    expect(occs).toHaveLength(4)
    const dates = occs.map((o) => o.startUtc)
    expect(dates).not.toContain('2026-08-17T09:00:00.000Z')
  })
})
