import { describe, it, expect } from 'vitest'
import { parseIcsContent, MAX_ICS_SIZE_BYTES } from '../src/main/ics/parse-ics'
import { generateIcs } from '../src/main/ics/write-ics'
import type { Calendar, CalendarEvent } from '../src/shared/event-model'

describe('ICS Parse, Generate & Roundtrip', () => {
  const mockCalendar: Calendar = {
    id: 'cal-test',
    accountId: 'acc-test',
    name: 'Work Calendar',
    color: '#4f46e5',
    isVisible: true,
    isReadOnly: false,
    isDefault: true,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z'
  }

  it('should parse valid RFC 5545 iCalendar content', () => {
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Test//EN',
      'BEGIN:VEVENT',
      'UID:unique-event-123@gone.calendar',
      'SUMMARY:Project Kickoff',
      'DESCRIPTION:Kickoff sync for Q3 sprint',
      'LOCATION:Room 402',
      'DTSTART:20260818T100000Z',
      'DTEND:20260818T110000Z',
      'RRULE:FREQ=WEEKLY;BYDAY=TU,TH',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n')

    const parsed = parseIcsContent(ics, 'cal-test')
    expect(parsed.events).toHaveLength(1)
    const ev = parsed.events[0]
    expect(ev.title).toBe('Project Kickoff')
    expect(ev.notes).toBe('Kickoff sync for Q3 sprint')
    expect(ev.location).toBe('Room 402')
    expect(ev.rrule).toBe('FREQ=WEEKLY;BYDAY=TU,TH')
    expect(ev.dtStartUtc).toBe('2026-08-18T10:00:00.000Z')
    expect(ev.dtEndUtc).toBe('2026-08-18T11:00:00.000Z')
  })

  it('should parse occurrence exceptions (RECURRENCE-ID)', () => {
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Test//EN',
      'BEGIN:VEVENT',
      'UID:series-1@gone.calendar',
      'SUMMARY:Daily Sync',
      'DTSTART:20260818T090000Z',
      'DTEND:20260818T093000Z',
      'RRULE:FREQ=DAILY',
      'END:VEVENT',
      'BEGIN:VEVENT',
      'UID:series-1@gone.calendar',
      'RECURRENCE-ID:20260819T090000Z',
      'SUMMARY:Daily Sync (Moved to Afternoon)',
      'DTSTART:20260819T140000Z',
      'DTEND:20260819T143000Z',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n')

    const parsed = parseIcsContent(ics, 'cal-test')
    expect(parsed.events).toHaveLength(1)
    expect(parsed.exceptions).toHaveLength(1)
    expect(parsed.exceptions[0].title).toBe('Daily Sync (Moved to Afternoon)')
    expect(parsed.exceptions[0].originalStartUtc).toBe('2026-08-19T09:00:00.000Z')
  })

  it('should roundtrip generate and re-parse events', () => {
    const originalEvent: CalendarEvent = {
      id: 'evt-rt',
      calendarId: 'cal-test',
      uid: 'rt-uid-999@gone.calendar',
      title: 'Architectural Review',
      notes: 'Reviewing domain schemas',
      location: 'Online',
      dtStartUtc: '2026-08-20T15:00:00.000Z',
      dtEndUtc: '2026-08-20T16:30:00.000Z',
      tzid: 'UTC',
      allDay: false,
      rrule: 'FREQ=MONTHLY',
      dirty: false,
      isDeleted: false,
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z'
    }

    const generatedIcs = generateIcs(mockCalendar, [originalEvent])
    expect(generatedIcs).toContain('BEGIN:VCALENDAR')
    expect(generatedIcs).toContain('SUMMARY:Architectural Review')

    const reParsed = parseIcsContent(generatedIcs, 'cal-test')
    expect(reParsed.events).toHaveLength(1)
    expect(reParsed.events[0].title).toBe(originalEvent.title)
    expect(reParsed.events[0].dtStartUtc).toBe(originalEvent.dtStartUtc)
    expect(reParsed.events[0].dtEndUtc).toBe(originalEvent.dtEndUtc)
    expect(reParsed.events[0].rrule).toBe('FREQ=MONTHLY')
  })

  it('should reject payload exceeding 5MB size cap', () => {
    const largeContent = 'A'.repeat(MAX_ICS_SIZE_BYTES + 100)
    expect(() => parseIcsContent(largeContent, 'cal-test')).toThrowError(/exceeds size cap/)
  })

  it('should handle empty or whitespace content safely', () => {
    const result = parseIcsContent('   ', 'cal-test')
    expect(result.events).toHaveLength(0)
    expect(result.exceptions).toHaveLength(0)
  })
})
