import { describe, it, expect } from 'vitest'
import {
  mapGraphEventToDomain,
  mapDomainEventToGraph,
  type MicrosoftGraphApiEvent
} from '../src/main/sync/microsoft-event-mapper'

describe('Microsoft Graph Event Mapper', () => {
  const calendarId = 'cal_graph_personal'

  it('should map a single timed Microsoft Graph event to domain event and back', () => {
    const fixture: MicrosoftGraphApiEvent = {
      id: 'ms_event_901',
      subject: 'Architecture Alignment Sync',
      body: { contentType: 'text', content: 'Discuss Graph adapter architecture' },
      bodyPreview: 'Discuss Graph adapter architecture',
      location: { displayName: 'Microsoft Teams Meeting' },
      start: { dateTime: '2026-08-18T10:00:00.0000000', timeZone: 'UTC' },
      end: { dateTime: '2026-08-18T11:00:00.0000000', timeZone: 'UTC' },
      isAllDay: false,
      onlineMeeting: { joinUrl: 'https://teams.microsoft.com/l/meetup-join/123' },
      '@odata.etag': 'W/"abc123etag"'
    }

    const domain = mapGraphEventToDomain(fixture, calendarId)
    expect(domain.isException).toBe(false)
    expect(domain.event).toBeDefined()
    expect(domain.event!.title).toBe('Architecture Alignment Sync')
    expect(domain.event!.notes).toBe('Discuss Graph adapter architecture')
    expect(domain.event!.location).toBe('Microsoft Teams Meeting')
    expect(domain.event!.meetingUrl).toBe('https://teams.microsoft.com/l/meetup-join/123')
    expect(domain.event!.allDay).toBe(false)
    expect(domain.event!.dtStartUtc).toBe('2026-08-18T10:00:00.000Z')
    expect(domain.event!.dtEndUtc).toBe('2026-08-18T11:00:00.000Z')

    const backToGraph = mapDomainEventToGraph(domain.event! as any)
    expect(backToGraph.subject).toBe('Architecture Alignment Sync')
    expect(backToGraph.body?.content).toBe('Discuss Graph adapter architecture')
  })

  it('should map an all-day Graph event', () => {
    const fixture: MicrosoftGraphApiEvent = {
      id: 'ms_event_allday',
      subject: 'Public Holiday',
      start: { dateTime: '2026-09-02T00:00:00.0000000', timeZone: 'UTC' },
      end: { dateTime: '2026-09-03T00:00:00.0000000', timeZone: 'UTC' },
      isAllDay: true
    }

    const domain = mapGraphEventToDomain(fixture, calendarId)
    expect(domain.isException).toBe(false)
    expect(domain.event!.allDay).toBe(true)
    expect(domain.event!.dtStartUtc).toBe('2026-09-02T00:00:00.000Z')
  })

  it('should map a series master Graph event with recurrence', () => {
    const fixture: MicrosoftGraphApiEvent = {
      id: 'ms_master_recurring',
      subject: 'Bi-Weekly Review',
      start: { dateTime: '2026-08-04T15:00:00.0000000', timeZone: 'UTC' },
      end: { dateTime: '2026-08-04T16:00:00.0000000', timeZone: 'UTC' },
      type: 'seriesMaster',
      recurrence: {
        pattern: { type: 'weekly', interval: 2, daysOfWeek: ['tuesday'] },
        range: { type: 'noEnd', startDate: '2026-08-04' }
      }
    }

    const domain = mapGraphEventToDomain(fixture, calendarId)
    expect(domain.isException).toBe(false)
    expect(domain.event!.rrule).toBe('FREQ=WEEKLY;INTERVAL=2;BYDAY=TU')
  })

  it('should map an occurrence exception from Graph', () => {
    const fixture: MicrosoftGraphApiEvent = {
      id: 'ms_exc_01',
      subject: 'Moved Bi-Weekly Review',
      type: 'exception',
      seriesMasterId: 'ms_master_recurring',
      start: { dateTime: '2026-08-18T16:00:00.0000000', timeZone: 'UTC' },
      end: { dateTime: '2026-08-18T17:00:00.0000000', timeZone: 'UTC' }
    }

    const domain = mapGraphEventToDomain(fixture, calendarId)
    expect(domain.isException).toBe(true)
    expect(domain.exception).toBeDefined()
    expect(domain.exception!.masterEventId).toBe('ms_master_recurring')
    expect(domain.exception!.title).toBe('Moved Bi-Weekly Review')
    expect(domain.exception!.dtStartUtc).toBe('2026-08-18T16:00:00.000Z')
    expect(domain.exception!.isCancelled).toBe(false)
  })

  it('should map a cancelled occurrence exception from Graph', () => {
    const fixture: MicrosoftGraphApiEvent = {
      id: 'ms_exc_cancelled',
      type: 'exception',
      seriesMasterId: 'ms_master_recurring',
      isCancelled: true,
      start: { dateTime: '2026-09-01T15:00:00.0000000', timeZone: 'UTC' },
      end: { dateTime: '2026-09-01T16:00:00.0000000', timeZone: 'UTC' }
    }

    const domain = mapGraphEventToDomain(fixture, calendarId)
    expect(domain.isException).toBe(true)
    expect(domain.exception!.isCancelled).toBe(true)
    expect(domain.exception!.masterEventId).toBe('ms_master_recurring')
  })
})
