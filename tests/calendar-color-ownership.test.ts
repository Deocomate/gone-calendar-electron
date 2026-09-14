import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createSqliteDriver, type ISqliteDatabase } from '../src/main/db/sqlite-driver'
import { runMigrations, seedDefaultData } from '../src/main/db/database'
import { CalendarsRepo } from '../src/main/db/repos/calendars-repo'
import { GoogleSyncEngine } from '../src/main/sync/google-sync-engine'

/**
 * Every engine's syncCalendarList rewrote name/colour/read-only for all of its
 * calendars on every poll - 20 seconds apart while the window is focused. A
 * colour the user picked was reverted almost immediately, and because the whole
 * list is rewritten in one pass every other customisation went with it, so
 * changing one calendar looked like it changed them all.
 */
describe('calendar colour ownership', () => {
  let db: ISqliteDatabase
  let repo: CalendarsRepo

  const GOOGLE_CAL = 'cal_a@group.calendar.google.com'
  const OTHER_CAL = 'cal_b@group.calendar.google.com'

  function seedGoogleCalendars(): void {
    const now = new Date().toISOString()
    db.prepare(
      `INSERT INTO accounts (id, type, name, email, is_active, created_at, updated_at)
       VALUES ('acc_g', 'google', 'G', 'g@example.com', 1, ?, ?)`
    ).run(now, now)
    for (const id of [GOOGLE_CAL, OTHER_CAL]) {
      db.prepare(
        `INSERT INTO calendars (id, account_id, name, color, is_visible, is_read_only, is_default, created_at, updated_at)
         VALUES (?, 'acc_g', 'Seed', '#111111', 1, 0, 0, ?, ?)`
      ).run(id, now, now)
    }
  }

  function stubCalendarList(): void {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            { id: GOOGLE_CAL, summary: 'Renamed on Google', backgroundColor: '#aaaaaa', accessRole: 'owner' },
            { id: OTHER_CAL, summary: 'Other', backgroundColor: '#bbbbbb', accessRole: 'owner' }
          ]
        }),
        text: async () => ''
      })) as unknown as typeof fetch
    )
  }

  const colorOf = (id: string): string =>
    db.prepare('SELECT color FROM calendars WHERE id = ?').get<{ color: string }>(id)!.color
  const nameOf = (id: string): string =>
    db.prepare('SELECT name FROM calendars WHERE id = ?').get<{ name: string }>(id)!.name

  beforeEach(() => {
    db = createSqliteDriver(':memory:')
    runMigrations(db)
    seedDefaultData(db)
    repo = new CalendarsRepo(db)
    seedGoogleCalendars()
  })

  afterEach(() => vi.unstubAllGlobals())

  it('keeps a user-picked colour across a calendar-list sync', async () => {
    repo.updateCalendar(GOOGLE_CAL, { color: '#ff0000' })
    stubCalendarList()

    await new GoogleSyncEngine(db).syncCalendarList('acc_g', 'token')

    expect(colorOf(GOOGLE_CAL), 'the user picked this colour; sync must not revert it').toBe(
      '#ff0000'
    )
  })

  it('does not touch other calendars when one is customised', async () => {
    repo.updateCalendar(GOOGLE_CAL, { color: '#ff0000' })
    stubCalendarList()

    await new GoogleSyncEngine(db).syncCalendarList('acc_g', 'token')

    // The untouched calendar still tracks the provider.
    expect(colorOf(OTHER_CAL)).toBe('#bbbbbb')
  })

  it('still tracks the provider colour for calendars the user has not customised', async () => {
    stubCalendarList()
    await new GoogleSyncEngine(db).syncCalendarList('acc_g', 'token')

    expect(colorOf(GOOGLE_CAL)).toBe('#aaaaaa')
    expect(colorOf(OTHER_CAL)).toBe('#bbbbbb')
  })

  it('keeps syncing the name even when the colour is user-owned', async () => {
    repo.updateCalendar(GOOGLE_CAL, { color: '#ff0000' })
    stubCalendarList()

    await new GoogleSyncEngine(db).syncCalendarList('acc_g', 'token')

    expect(nameOf(GOOGLE_CAL), 'a rename on the provider should still arrive').toBe(
      'Renamed on Google'
    )
  })

  it('does not mark a colour custom when only visibility changes', async () => {
    repo.updateCalendar(GOOGLE_CAL, { isVisible: false })
    stubCalendarList()

    await new GoogleSyncEngine(db).syncCalendarList('acc_g', 'token')

    // Toggling visibility is not a colour choice, so the provider still wins.
    expect(colorOf(GOOGLE_CAL)).toBe('#aaaaaa')
  })

  it('keeps the flag set across further non-colour edits', () => {
    repo.updateCalendar(GOOGLE_CAL, { color: '#ff0000' })
    repo.updateCalendar(GOOGLE_CAL, { isVisible: false })

    expect(repo.getCalendarById(GOOGLE_CAL)!.colorIsCustom).toBe(true)
    expect(colorOf(GOOGLE_CAL)).toBe('#ff0000')
  })
})
