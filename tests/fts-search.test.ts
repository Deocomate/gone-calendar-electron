import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { initDatabase, closeDatabase } from '../src/main/db/database'
import type { ISqliteDatabase } from '../src/main/db/sqlite-driver'
import { EventsRepo } from '../src/main/db/repos/events-repo'

describe('SQLite FTS5 Full-Text Search and Attendees', () => {
  let db: ISqliteDatabase
  let repo: EventsRepo
  const calId = 'calendar-local-default'

  beforeEach(() => {
    db = initDatabase(':memory:')
    repo = new EventsRepo(db)
  })

  afterEach(() => {
    closeDatabase()
  })

  it('should search events by matching keyword in title, location, or notes', () => {
    repo.createEvent({
      calendarId: calId,
      title: 'Quarterly Strategic Planning Session',
      notes: 'Review Q3 OKRs and roadmap deliverables',
      location: 'Executive Boardroom Hanoi',
      dtStartUtc: '2026-08-20T09:00:00.000Z',
      dtEndUtc: '2026-08-20T11:00:00.000Z',
      tzid: 'Asia/Ho_Chi_Minh'
    })

    repo.createEvent({
      calendarId: calId,
      title: 'Dentist Checkup',
      notes: 'Routine cleaning appointment',
      location: 'Clinic 24 Pasteur',
      dtStartUtc: '2026-08-21T14:00:00.000Z',
      dtEndUtc: '2026-08-21T15:00:00.000Z',
      tzid: 'Asia/Ho_Chi_Minh'
    })

    // Search by title keyword
    const res1 = repo.searchEvents('Strategic')
    expect(res1).toHaveLength(1)
    expect(res1[0].title).toBe('Quarterly Strategic Planning Session')

    // Search by notes keyword
    const res2 = repo.searchEvents('deliverables')
    expect(res2).toHaveLength(1)
    expect(res2[0].title).toBe('Quarterly Strategic Planning Session')

    // Search by location keyword
    const res3 = repo.searchEvents('Pasteur')
    expect(res3).toHaveLength(1)
    expect(res3[0].title).toBe('Dentist Checkup')

    // Non-existent search query
    const res4 = repo.searchEvents('NonExistentTerm999')
    expect(res4).toHaveLength(0)
  })

  it('should keep FTS5 index synchronized on event update and delete', () => {
    const created = repo.createEvent({
      calendarId: calId,
      title: 'Frontend Sprint Kickoff',
      notes: 'Discuss Electron Vite bundling',
      location: 'Virtual Zoom Room',
      dtStartUtc: '2026-08-22T10:00:00.000Z',
      dtEndUtc: '2026-08-22T11:00:00.000Z'
    })

    expect(repo.searchEvents('Bundling')).toHaveLength(1)

    // Update notes
    repo.updateEvent(created.id, {
      notes: 'Refactor SQLite database migrations and FTS triggers'
    })

    // Old term no longer matches
    expect(repo.searchEvents('Bundling')).toHaveLength(0)
    // New term matches
    expect(repo.searchEvents('Migrations')).toHaveLength(1)

    // Delete event
    repo.deleteEvent(created.id)
    expect(repo.searchEvents('Kickoff')).toHaveLength(0)
  })

  it('should persist and retrieve attendees with response statuses', () => {
    const created = repo.createEvent({
      calendarId: calId,
      title: 'Architecture Review with Team',
      dtStartUtc: '2026-08-23T15:00:00.000Z',
      dtEndUtc: '2026-08-23T16:00:00.000Z',
      attendees: [
        {
          email: 'alice@company.com',
          displayName: 'Alice Architect',
          responseStatus: 'accepted',
          isOrganizer: true
        },
        {
          email: 'bob@company.com',
          displayName: 'Bob Backend',
          responseStatus: 'tentative'
        }
      ]
    })

    const fetched = repo.getEventById(created.id)
    expect(fetched).toBeDefined()
    expect(fetched!.event.attendees).toHaveLength(2)

    const alice = fetched!.event.attendees!.find((a) => a.email === 'alice@company.com')
    expect(alice).toBeDefined()
    expect(alice!.displayName).toBe('Alice Architect')
    expect(alice!.responseStatus).toBe('accepted')
    expect(alice!.isOrganizer).toBe(true)

    // Update attendees
    repo.updateEvent(created.id, {
      attendees: [
        {
          email: 'alice@company.com',
          responseStatus: 'accepted'
        },
        {
          email: 'carol@company.com',
          displayName: 'Carol Cloud',
          responseStatus: 'needsAction'
        }
      ]
    })

    const updated = repo.getEventById(created.id)
    expect(updated!.event.attendees).toHaveLength(2)
    expect(updated!.event.attendees!.some((a) => a.email === 'carol@company.com')).toBe(true)
    expect(updated!.event.attendees!.some((a) => a.email === 'bob@company.com')).toBe(false)
  })
})
