import { describe, it, expect } from 'vitest'
import { createSqliteDriver } from '../src/main/db/sqlite-driver'
import { runMigrations, seedDefaultData } from '../src/main/db/database'

/**
 * Migration 007 ALTERs a table that already exists in every installed copy of
 * the app, so it has to apply cleanly both to a fresh database and to one that
 * has already run 001-006 and holds real rows.
 */
describe('migration 007 (exception sync columns)', () => {
  it('applies to a fresh database', () => {
    const db = createSqliteDriver(':memory:')
    runMigrations(db)
    const cols = db.prepare('PRAGMA table_info(event_exceptions)').all<{ name: string }>()
    const names = cols.map((c) => c.name)
    expect(names).toContain('dirty')
    expect(names).toContain('etag')
    expect(names).toContain('provider_instance_id')
  })

  it('is recorded once and is idempotent across repeated runs', () => {
    const db = createSqliteDriver(':memory:')
    runMigrations(db)
    const first = db
      .prepare('SELECT version FROM schema_migrations ORDER BY version')
      .all<{ version: number }>()
      .map((r) => r.version)

    runMigrations(db)
    runMigrations(db)
    const after = db
      .prepare('SELECT version FROM schema_migrations ORDER BY version')
      .all<{ version: number }>()
      .map((r) => r.version)

    // Version-agnostic so adding migration N+1 does not break this: the set must
    // stay contiguous from 1, free of duplicates, and unchanged by re-running.
    expect(after).toEqual(first)
    expect(after).toEqual([...Array(first.length)].map((_, i) => i + 1))
  })

  it('upgrades a database left at version 6 without losing rows', () => {
    const db = createSqliteDriver(':memory:')
    runMigrations(db)
    seedDefaultData(db)

    // Rewind to the pre-007 state: drop the new columns by rebuilding the table
    // the way version 6 defined it, then re-run migrations as an upgrade would.
    // Every version at or above 7 is cleared - leaving a later one behind would
    // keep MAX(version) high enough that 007 never re-applies.
    db.exec(`
      DROP TABLE event_exceptions;
      CREATE TABLE event_exceptions (
        id TEXT PRIMARY KEY,
        master_event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        original_start_utc TEXT NOT NULL,
        is_cancelled INTEGER NOT NULL DEFAULT 0,
        title TEXT, notes TEXT, location TEXT,
        dtstart_utc TEXT, dtend_utc TEXT, tzid TEXT, color TEXT,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      DELETE FROM schema_migrations WHERE version >= 7;
    `)
    const calId = db.prepare('SELECT id FROM calendars LIMIT 1').get<{ id: string }>()!.id
    db.prepare(
      `INSERT INTO events (id, calendar_id, uid, title, dtstart_utc, dtend_utc, tzid, all_day,
                           dirty, is_deleted, created_at, updated_at)
       VALUES ('evt_legacy', ?, 'legacy@test', 'Legacy', '2026-01-01T00:00:00.000Z',
               '2026-01-01T01:00:00.000Z', 'UTC', 0, 0, 0, '', '')`
    ).run(calId)
    db.prepare(
      `INSERT INTO event_exceptions (id, master_event_id, original_start_utc, is_cancelled, created_at, updated_at)
       VALUES ('x1', 'evt_legacy', '2026-01-01T00:00:00.000Z', 1, '', '')`
    ).run()

    runMigrations(db)

    const row = db
      .prepare('SELECT id, dirty, provider_instance_id FROM event_exceptions WHERE id = ?')
      .get<{ id: string; dirty: number; provider_instance_id: string | null }>('x1')

    expect(row?.id).toBe('x1')
    // Pre-existing rows default to clean, so an upgrade does not stage a flood
    // of spurious pushes for exceptions that were already in sync.
    expect(row?.dirty).toBe(0)
    expect(row?.provider_instance_id).toBeNull()
  })
})
