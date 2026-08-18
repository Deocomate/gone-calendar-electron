import ICAL from 'ical.js'
import { DateTime } from 'luxon'
import type { CreateEventInput, EventException } from '@shared/event-model'

export const MAX_ICS_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB cap

export interface ParsedIcsData {
  events: (CreateEventInput & { uid?: string })[]
  exceptions: (Omit<EventException, 'id' | 'createdAt' | 'updatedAt'> & { masterUid?: string })[]
}

/**
 * Format ICAL.Time into an ISO 8601 UTC string
 */
function icalTimeToIso(time: any): { iso: string; allDay: boolean; tzid: string } {
  if (!time) {
    const now = new Date().toISOString()
    return { iso: now, allDay: false, tzid: 'UTC' }
  }

  const allDay = time.isDate === true
  const tzid = time.timezone || (time.zone ? time.zone.tzid : 'UTC')
  const jsDate = time.toJSDate()
  const iso = DateTime.fromJSDate(jsDate, { zone: 'utc' }).toISO() || jsDate.toISOString()

  return { iso, allDay, tzid }
}

/**
 * Safely parse an iCalendar (.ics) string with size limits
 */
export function parseIcsContent(icsContent: string, targetCalendarId: string): ParsedIcsData {
  if (typeof icsContent !== 'string') {
    throw new Error('Invalid ICS content: expected string')
  }

  // Size limit validation (reject files > 5MB)
  const byteLength = Buffer.byteLength(icsContent, 'utf-8')
  if (byteLength > MAX_ICS_SIZE_BYTES) {
    throw new Error(`ICS payload exceeds size cap of 5MB (${(byteLength / (1024 * 1024)).toFixed(2)} MB)`)
  }

  if (!icsContent.trim()) {
    return { events: [], exceptions: [] }
  }

  let jcal: any[]
  try {
    jcal = ICAL.parse(icsContent)
  } catch (err: any) {
    throw new Error(`Failed to parse iCalendar format: ${err.message || String(err)}`)
  }

  const comp = new ICAL.Component(jcal)
  const vEvents = comp.getAllSubcomponents('vevent')

  const events: (CreateEventInput & { uid?: string })[] = []
  const exceptions: (Omit<EventException, 'id' | 'createdAt' | 'updatedAt'> & { masterUid?: string })[] = []

  for (const vEvent of vEvents) {
    try {
      const icalEvent = new ICAL.Event(vEvent)
      const uid = icalEvent.uid || `ics_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      const summary = icalEvent.summary || 'Untitled Event'
      const description = icalEvent.description || undefined
      const location = icalEvent.location || undefined

      const startInfo = icalTimeToIso(icalEvent.startDate)
      const endInfo = icalTimeToIso(icalEvent.endDate)

      // Check if this VEVENT is an occurrence exception (RECURRENCE-ID present)
      const recIdProp = vEvent.getFirstProperty('recurrence-id')
      if (recIdProp) {
        const recIdTime = recIdProp.getFirstValue()
        const origStartInfo = icalTimeToIso(recIdTime)
        const status = vEvent.getFirstPropertyValue('status')
        const isCancelled = String(status).toUpperCase() === 'CANCELLED'

        exceptions.push({
          masterUid: uid,
          masterEventId: '', // Will be resolved to master event ID
          originalStartUtc: origStartInfo.iso,
          isCancelled,
          title: summary,
          notes: description,
          location,
          dtStartUtc: startInfo.iso,
          dtEndUtc: endInfo.iso,
          tzid: startInfo.tzid
        })
        continue
      }

      // Check RRULE
      let rruleString: string | undefined
      const rruleProp = vEvent.getFirstProperty('rrule')
      if (rruleProp) {
        const rruleVal = rruleProp.getFirstValue()
        if (rruleVal) {
          rruleString = typeof rruleVal.toString === 'function' ? rruleVal.toString() : String(rruleVal)
        }
      }

      // Check EXDATE
      let exdateString: string | undefined
      const exdateProps = vEvent.getAllProperties('exdate')
      if (exdateProps.length > 0) {
        const exdates: string[] = []
        for (const prop of exdateProps) {
          const vals = prop.getValues()
          for (const val of vals) {
            const exInfo = icalTimeToIso(val)
            exdates.push(exInfo.iso)
          }
        }
        if (exdates.length > 0) {
          exdateString = exdates.join(',')
        }
      }

      events.push({
        calendarId: targetCalendarId,
        uid,
        title: summary,
        notes: description,
        location,
        dtStartUtc: startInfo.iso,
        dtEndUtc: endInfo.iso,
        tzid: startInfo.tzid,
        allDay: startInfo.allDay,
        rrule: rruleString,
        exdate: exdateString
      })
    } catch (veventErr) {
      console.warn('Skipping malformed VEVENT:', veventErr)
    }
  }

  return { events, exceptions }
}
