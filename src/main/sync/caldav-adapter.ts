import { fetchWithTimeout } from './http'
import { generateIcs } from '../ics/write-ics'
import {
  parseCalDavMultistatus,
  extractXmlTagValue,
  type CalDavCalendarDescriptor
} from './caldav-discover'
import type { Calendar, CalendarEvent, EventException } from '@shared/event-model'

export interface CalDavCredentials {
  url: string
  username: string
  password: string
}

export class CalDavAdapter {
  private authHeader: string

  constructor(private creds: CalDavCredentials) {
    const token = Buffer.from(`${creds.username}:${creds.password}`).toString('base64')
    this.authHeader = `Basic ${token}`
  }

  /**
   * Helper: Dispatch CalDAV HTTP request with Basic Auth
   */
  private async request(
    url: string,
    method: string,
    body?: string,
    headers: Record<string, string> = {}
  ): Promise<Response> {
    return fetchWithTimeout(url, {
      method,
      headers: {
        Authorization: this.authHeader,
        ...headers
      },
      body
    })
  }

  /**
   * Discover calendar collections via PROPFIND
   */
  async discoverCalendars(): Promise<CalDavCalendarDescriptor[]> {
    const propfindXml = `<?xml version="1.0" encoding="utf-8" ?>
<D:propfind xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav" xmlns:CS="http://calendarserver.org/ns/">
  <D:prop>
    <D:resourcetype/>
    <D:displayname/>
    <C:calendar-description/>
    <C:calendar-color/>
    <CS:getctag/>
    <D:sync-token/>
    <D:current-user-privilege-set/>
  </D:prop>
</D:propfind>`

    const res = await this.request(this.creds.url, 'PROPFIND', propfindXml, {
      Depth: '1',
      'Content-Type': 'application/xml; charset=utf-8'
    })

    if (!res.ok && res.status !== 207) {
      throw new Error(`CalDAV discovery failed with HTTP ${res.status}: ${await res.text()}`)
    }

    const xml = await res.text()
    return parseCalDavMultistatus(xml, this.creds.url)
  }

  /**
   * Pull all ICS events from a calendar collection via CalDAV REPORT
   */
  async pullCalendarEvents(calendarUrl: string): Promise<{
    rawIcsList: { href: string; ics: string; etag?: string }[]
  }> {
    const reportXml = `<?xml version="1.0" encoding="utf-8" ?>
<C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop>
    <D:getetag/>
    <C:calendar-data/>
  </D:prop>
  <C:filter>
    <C:comp-filter name="VCALENDAR">
      <C:comp-filter name="VEVENT"/>
    </C:comp-filter>
  </C:filter>
</C:calendar-query>`

    const res = await this.request(calendarUrl, 'REPORT', reportXml, {
      Depth: '1',
      'Content-Type': 'application/xml; charset=utf-8'
    })

    if (!res.ok && res.status !== 207) {
      throw new Error(`CalDAV event query failed with HTTP ${res.status}: ${await res.text()}`)
    }

    const xml = await res.text()
    const responseRegex = /<(?:[a-zA-Z0-9_-]+:)?response(?:[\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?response>/gi
    const responses = xml.match(responseRegex) || []

    const rawIcsList: { href: string; ics: string; etag?: string }[] = []

    for (const resp of responses) {
      const href = extractXmlTagValue(resp, 'href')
      const ics = extractXmlTagValue(resp, 'calendar-data')
      const etag = extractXmlTagValue(resp, 'getetag')

      if (ics && href) {
        rawIcsList.push({ href, ics, etag })
      }
    }

    return { rawIcsList }
  }

  /**
   * Push an event to CalDAV collection via PUT
   */
  async pushEvent(
    calendar: Calendar,
    event: CalendarEvent,
    exceptions: EventException[] = []
  ): Promise<{ success: boolean; etag?: string; conflict?: boolean }> {
    // A CalDAV series lives in one resource, so per-occurrence overrides and
    // cancellations have to travel with the master as RECURRENCE-ID components;
    // omitting them silently strips the occurrence edit from the push.
    const icsContent = generateIcs(calendar, [event], exceptions)
    const eventUrl = `${calendar.id.replace(/\/+$/, '')}/${encodeURIComponent(event.uid || event.id)}.ics`

    const headers: Record<string, string> = {
      'Content-Type': 'text/calendar; charset=utf-8'
    }
    if (event.etag) {
      headers['If-Match'] = event.etag
    }

    const res = await this.request(eventUrl, 'PUT', icsContent, headers)

    if (!res.ok && res.status !== 201 && res.status !== 204) {
      if (res.status === 412) {
        return { success: false, conflict: true }
      }
      throw new Error(`CalDAV PUT failed: HTTP ${res.status}`)
    }

    const newEtag = res.headers.get('ETag') || undefined
    return { success: true, etag: newEtag }
  }

  /**
   * Delete an event from CalDAV collection via DELETE
   */
  async deleteEvent(calendarUrl: string, eventUid: string): Promise<boolean> {
    const eventUrl = `${calendarUrl.replace(/\/+$/, '')}/${encodeURIComponent(eventUid)}.ics`
    const res = await this.request(eventUrl, 'DELETE')
    return res.ok || res.status === 404
  }
}

