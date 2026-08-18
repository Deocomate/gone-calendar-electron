import { describe, it, expect } from 'vitest'
import {
  mapGoogleEventToDomain,
  mapDomainEventToGoogle,
  type GoogleCalendarApiEvent
} from '../src/main/sync/google-event-mapper'

describe('Google Event Mapper', () => {
  const targetCalendarId = 'primary'

  it('should map a standard timed Google event to domain event and back', () => {
    const fixture: GoogleCalendarApiEvent = {
      id: 'g_evt_101',
      summary: 'Q3 Product Strategy Review',
      description: 'Review product deliverables for next quarter',
      location: 'Conference Room Alpha',
      start: { dateTime: '2026-08-18T14:00:00+07:00', timeZone: 'Asia/Ho_Chi_Minh' },
      end: { dateTime: '2026-08-18T15:30:00+07:00', timeZone: 'Asia/Ho_Chi_Minh' },
      colorId: '9', // Blueberry (#3f51b5)
      hangoutLink: 'https://meet.google.com/abc-defg-hij',
      etag: '"312891238912"'
    }

    const domain = mapGoogleEventToDomain(fixture, targetCalendarId)
    expect(domain.isException).toBe(false)
    expect(domain.event).toBeDefined()
    expect(domain.event!.title).toBe('Q3 Product Strategy Review')
    expect(domain.event!.notes).toBe('Review product deliverables for next quarter')
    expect(domain.event!.location).toBe('Conference Room Alpha')
    expect(domain.event!.color).toBe('#3f51b5')
    expect(domain.event!.meetingUrl).toBe('https://meet.google.com/abc-defg-hij')
    expect(domain.event!.allDay).toBe(false)
    expect(domain.event!.dtStartUtc).toBe('2026-08-18T07:00:00.000Z')
    expect(domain.event!.dtEndUtc).toBe('2026-08-18T08:30:00.000Z')

    // Test reverse mapping
    const backToGoogle = mapDomainEventToGoogle(domain.event! as any)
    expect(backToGoogle.summary).toBe('Q3 Product Strategy Review')
    expect(backToGoogle.start?.dateTime).toBe('2026-08-18T07:00:00.000Z')
  })

  it('should map an all-day Google event correctly', () => {
    const fixture: GoogleCalendarApiEvent = {
      id: 'g_evt_allday',
      summary: 'Company Offsite Day 1',
      start: { date: '2026-09-01' },
      end: { date: '2026-09-02' }
    }

    const domain = mapGoogleEventToDomain(fixture, targetCalendarId)
    expect(domain.isException).toBe(false)
    expect(domain.event!.allDay).toBe(true)
    expect(domain.event!.dtStartUtc).toBe('2026-09-01T00:00:00.000Z')
    expect(domain.event!.dtEndUtc).toBe('2026-09-02T00:00:00.000Z')

    const backToGoogle = mapDomainEventToGoogle(domain.event! as any)
    expect(backToGoogle.start?.date).toBe('2026-09-01')
    expect(backToGoogle.end?.date).toBe('2026-09-02')
  })

  it('should map a recurring master Google event with RRULE', () => {
    const fixture: GoogleCalendarApiEvent = {
      id: 'g_master_recurring',
      summary: 'Weekly Sprint Standup',
      start: { dateTime: '2026-08-03T09:00:00+07:00', timeZone: 'Asia/Ho_Chi_Minh' },
      end: { dateTime: '2026-08-03T09:30:00+07:00', timeZone: 'Asia/Ho_Chi_Minh' },
      recurrence: ['RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=20']
    }

    const domain = mapGoogleEventToDomain(fixture, targetCalendarId)
    expect(domain.isException).toBe(false)
    expect(domain.event!.rrule).toBe('FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=20')
  })

  it('should map a modified occurrence exception (recurringEventId + originalStartTime)', () => {
    const fixture: GoogleCalendarApiEvent = {
      id: 'g_master_recurring_20260810T020000Z',
      recurringEventId: 'g_master_recurring',
      originalStartTime: { dateTime: '2026-08-10T09:00:00+07:00', timeZone: 'Asia/Ho_Chi_Minh' },
      summary: 'Standup with Guest Speaker',
      start: { dateTime: '2026-08-10T10:00:00+07:00', timeZone: 'Asia/Ho_Chi_Minh' },
      end: { dateTime: '2026-08-10T11:00:00+07:00', timeZone: 'Asia/Ho_Chi_Minh' },
      status: 'confirmed'
    }

    const domain = mapGoogleEventToDomain(fixture, targetCalendarId)
    expect(domain.isException).toBe(true)
    expect(domain.exception).toBeDefined()
    expect(domain.exception!.masterEventId).toBe('g_master_recurring')
    expect(domain.exception!.originalStartUtc).toBe('2026-08-10T02:00:00.000Z')
    expect(domain.exception!.isCancelled).toBe(false)
    expect(domain.exception!.title).toBe('Standup with Guest Speaker')
    expect(domain.exception!.dtStartUtc).toBe('2026-08-10T03:00:00.000Z')
  })

  it('should map a cancelled occurrence exception (status: cancelled)', () => {
    const fixture: GoogleCalendarApiEvent = {
      id: 'g_master_recurring_20260812T020000Z',
      recurringEventId: 'g_master_recurring',
      originalStartTime: { dateTime: '2026-08-12T09:00:00+07:00', timeZone: 'Asia/Ho_Chi_Minh' },
      status: 'cancelled'
    }

    const domain = mapGoogleEventToDomain(fixture, targetCalendarId)
    expect(domain.isException).toBe(true)
    expect(domain.exception!.masterEventId).toBe('g_master_recurring')
    expect(domain.exception!.isCancelled).toBe(true)
  })
})
