import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createSqliteDriver, type ISqliteDatabase } from '../src/main/db/sqlite-driver'
import { runMigrations, seedDefaultData } from '../src/main/db/database'
import { EventsRepo } from '../src/main/db/repos/events-repo'
import { backupDatabaseTo, defaultBackupFileName } from '../src/main/db/backup'

/**
 * The database runs in WAL mode, so copying the `.sqlite` file is not a backup -
 * committed data can still be sitting in the `-wal`. VACUUM INTO takes a read
 * transaction and writes one self-contained file, which is safe to run while the
 * app is using the database.
 */
describe('database backup', () => {
  let dir: string
  let db: ISqliteDatabase

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'gone-backup-'))
    db = createSqliteDriver(join(dir, 'source.sqlite'))
    runMigrations(db)
    seedDefaultData(db)
  })

  afterEach(() => {
    try {
      db.close()
    } catch {
      // already closed by a test
    }
    rmSync(dir, { recursive: true, force: true })
  })

  function seedEvent(title: string): string {
    const calId = db.prepare('SELECT id FROM calendars LIMIT 1').get<{ id: string }>()!.id
    return new EventsRepo(db).createEvent({
      calendarId: calId,
      title,
      dtStartUtc: '2026-05-01T09:00:00.000Z',
      dtEndUtc: '2026-05-01T10:00:00.000Z'
    }).id
  }

  it('writes a snapshot that opens as a database and holds the same rows', () => {
    seedEvent('Backed up')
    const dest = join(dir, 'snap.sqlite')

    const size = backupDatabaseTo(db, dest)

    expect(existsSync(dest)).toBe(true)
    expect(size).toBeGreaterThan(0)

    const restored = createSqliteDriver(dest)
    const row = restored
      .prepare('SELECT title FROM events LIMIT 1')
      .get<{ title: string }>()
    expect(row?.title).toBe('Backed up')
    // Schema travels with it, so the restored file needs no migration to be used.
    expect(
      restored.prepare('SELECT MAX(version) v FROM schema_migrations').get<{ v: number }>()!.v
    ).toBe(db.prepare('SELECT MAX(version) v FROM schema_migrations').get<{ v: number }>()!.v)
    restored.close()
  })

  it('captures writes that are still only in the WAL', () => {
    // No checkpoint between the write and the backup: a plain file copy would
    // miss this row.
    seedEvent('Written moments ago')
    const dest = join(dir, 'wal.sqlite')
    backupDatabaseTo(db, dest)

    const restored = createSqliteDriver(dest)
    expect(
      restored.prepare("SELECT COUNT(*) c FROM events WHERE title = 'Written moments ago'").get<{
        c: number
      }>()!.c
    ).toBe(1)
    restored.close()
  })

  it('leaves the source usable afterwards', () => {
    seedEvent('First')
    backupDatabaseTo(db, join(dir, 'snap.sqlite'))

    expect(() => seedEvent('Second')).not.toThrow()
    expect(db.prepare('SELECT COUNT(*) c FROM events').get<{ c: number }>()!.c).toBe(2)
  })

  it('overwrites an existing file, since the save dialog already confirmed it', () => {
    const dest = join(dir, 'existing.sqlite')
    writeFileSync(dest, 'not a database')
    seedEvent('Fresh')

    expect(() => backupDatabaseTo(db, dest)).not.toThrow()

    const restored = createSqliteDriver(dest)
    expect(restored.prepare('SELECT COUNT(*) c FROM events').get<{ c: number }>()!.c).toBe(1)
    restored.close()
  })

  it('survives a path containing a quote', () => {
    const dest = join(dir, "sonn's backup.sqlite")
    seedEvent('Quoted path')

    expect(() => backupDatabaseTo(db, dest)).not.toThrow()
    expect(existsSync(dest)).toBe(true)
  })

  it('names snapshots so they sort chronologically and are filesystem-safe', () => {
    const name = defaultBackupFileName(new Date('2026-09-14T19:20:31.456Z'))

    expect(name).toBe('gone-calendar-backup-2026-09-14T19-20-31.sqlite')
    expect(name).not.toMatch(/:/)
  })
})
