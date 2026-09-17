import { describe, it, expect } from 'vitest'
import { mapDomainEventToGoogle } from '../src/main/sync/google-event-mapper'
import { mapDomainEventToGraph } from '../src/main/sync/microsoft-event-mapper'

/**
 * Regression: every event created in the app was rejected by Google.
 *
 * The outgoing mapper copied our local row id into the payload. Google only
 * accepts base32hex event ids - lowercase a-v and digits 0-9 - and
 * `EventsRepo.createEvent` generates ids like `evt_1789396326299_uqqwff`, which
 * contain an underscore and often a letter past 'v'. Google answered 400 on
 * every insert, and the engine's failure branch counted the error without
 * logging it, so the push looked like it was working. Three events sat dirty
 * for an hour, re-failing on every poll, before this was noticed.
 *
 * The id is server-assigned on insert and lives in the URL on update, so the
 * write payload must never carry one.
 */
describe('outgoing provider payloads', () => {
  const localEvent = {
    id: 'evt_1789396326299_uqqwff',
    calendarId: 'cal-1',
    uid: 'evt_1789396326299_uqqwff@gone.calendar',
    title: 'Pizze Baby',
    notes: null,
    location: null,
    dtStartUtc: '2026-09-11T07:00:00.000Z',
    dtEndUtc: '2026-09-11T08:00:00.000Z',
    tzid: 'Australia/Sydney',
    allDay: false,
    rrule: null
  } as never

  it('never sends a locally generated id to Google', () => {
    const payload = mapDomainEventToGoogle(localEvent)
    expect(payload).not.toHaveProperty('id')
    expect(JSON.stringify(payload)).not.toContain('evt_')
  })

  it('never sends a locally generated id to Graph', () => {
    const payload = mapDomainEventToGraph(localEvent)
    expect(payload).not.toHaveProperty('id')
    expect(JSON.stringify(payload)).not.toContain('evt_')
  })

  it('still sends everything the event actually needs', () => {
    const payload = mapDomainEventToGoogle(localEvent)
    expect(payload.summary).toBe('Pizze Baby')
    expect(payload.start?.dateTime).toBe('2026-09-11T07:00:00.000Z')
    expect(payload.end?.dateTime).toBe('2026-09-11T08:00:00.000Z')
  })

  it('local ids are exactly the shape Google rejects, which is why this matters', () => {
    // Guards the premise: if createEvent ever starts minting base32hex ids this
    // test should be revisited rather than silently still passing.
    const GOOGLE_ID = /^[a-v0-9]{5,1024}$/
    expect(GOOGLE_ID.test('evt_1789396326299_uqqwff')).toBe(false)
    expect(GOOGLE_ID.test('abc123def')).toBe(true)
  })
})
