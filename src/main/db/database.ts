import { join } from 'node:path'
import { createSqliteDriver, type ISqliteDatabase } from './sqlite-driver'

let dbInstance: ISqliteDatabase | null = null

const MIGRATION_001_SQL = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS calendars (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  is_visible INTEGER NOT NULL DEFAULT 1,
  is_read_only INTEGER NOT NULL DEFAULT 0,
  is_default INTEGER NOT NULL DEFAULT 0,
  sync_token TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  calendar_id TEXT NOT NULL REFERENCES calendars(id) ON DELETE CASCADE,
  uid TEXT NOT NULL,
  title TEXT NOT NULL,
  notes TEXT,
  location TEXT,
  dtstart_utc TEXT NOT NULL,
  dtend_utc TEXT NOT NULL,
  tzid TEXT NOT NULL DEFAULT 'UTC',
  all_day INTEGER NOT NULL DEFAULT 0,
  rrule TEXT,
  rdate TEXT,
  exdate TEXT,
  color TEXT,
  meeting_url TEXT,
  etag TEXT,
  dirty INTEGER NOT NULL DEFAULT 0,
  is_deleted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS event_exceptions (
  id TEXT PRIMARY KEY,
  master_event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  original_start_utc TEXT NOT NULL,
  is_cancelled INTEGER NOT NULL DEFAULT 0,
  title TEXT,
  notes TEXT,
  location TEXT,
  dtstart_utc TEXT,
  dtend_utc TEXT,
  tzid TEXT,
  color TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_state (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  calendar_id TEXT REFERENCES calendars(id) ON DELETE CASCADE,
  last_synced_at TEXT,
  sync_token TEXT,
  sync_status TEXT NOT NULL DEFAULT 'idle',
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_calendar_range ON events (calendar_id, is_deleted, dtstart_utc, dtend_utc);
CREATE INDEX IF NOT EXISTS idx_events_uid ON events (uid);
CREATE INDEX IF NOT EXISTS idx_event_exceptions_master ON event_exceptions (master_event_id, original_start_utc);
`

const MIGRATION_002_SQL = `
CREATE TABLE IF NOT EXISTS attendees (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  response_status TEXT NOT NULL DEFAULT 'needsAction',
  is_organizer INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_attendees_event_id ON attendees(event_id);

CREATE VIRTUAL TABLE IF NOT EXISTS events_fts USING fts5(
  event_id UNINDEXED,
  title,
  notes,
  location,
  content=''
);

CREATE TRIGGER IF NOT EXISTS trg_events_fts_insert AFTER INSERT ON events BEGIN
  INSERT INTO events_fts(event_id, title, notes, location)
  VALUES (new.id, new.title, COALESCE(new.notes, ''), COALESCE(new.location, ''));
END;

CREATE TRIGGER IF NOT EXISTS trg_events_fts_update AFTER UPDATE ON events BEGIN
  DELETE FROM events_fts WHERE event_id = old.id;
  INSERT INTO events_fts(event_id, title, notes, location)
  VALUES (new.id, new.title, COALESCE(new.notes, ''), COALESCE(new.location, ''));
END;

CREATE TRIGGER IF NOT EXISTS trg_events_fts_delete AFTER DELETE ON events BEGIN
  DELETE FROM events_fts WHERE event_id = old.id;
END;

-- Populate FTS table with existing events
INSERT OR IGNORE INTO events_fts(event_id, title, notes, location)
SELECT id, title, COALESCE(notes, ''), COALESCE(location, '') FROM events;
`

/**
 * Execute all schema migrations in order
 */
export function runMigrations(db: ISqliteDatabase): void {
  // Ensure schema_migrations table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `)

  const row = db.prepare('SELECT MAX(version) as max_version FROM schema_migrations').get<{ max_version: number | null }>()
  const currentVersion = row?.max_version ?? 0

  if (currentVersion < 1) {
    db.exec(MIGRATION_001_SQL)
    db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)').run(
      1,
      new Date().toISOString()
    )
  }

  if (currentVersion < 2) {
    db.exec(MIGRATION_002_SQL)
    db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)').run(
      2,
      new Date().toISOString()
    )
  }
}

/**
 * Seed default local account and primary calendar if they don't exist
 */
export function seedDefaultData(db: ISqliteDatabase): void {
  const accountCount = db.prepare('SELECT COUNT(*) as count FROM accounts').get<{ count: number }>()?.count ?? 0

  if (accountCount === 0) {
    const now = new Date().toISOString()
    const defaultAccountId = 'account-local-primary'
    const defaultCalendarId = 'calendar-local-default'

    db.prepare(
      `INSERT INTO accounts (id, type, name, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(defaultAccountId, 'local', 'Personal Account', 1, now, now)

    db.prepare(
      `INSERT INTO calendars (id, account_id, name, color, is_visible, is_read_only, is_default, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(defaultCalendarId, defaultAccountId, 'Personal Calendar', '#6366f1', 1, 0, 1, now, now)
  }
}

/**
 * Initialize SQLite database
 */
export function initDatabase(dbDirOrPath: string): ISqliteDatabase {
  if (dbInstance) {
    return dbInstance
  }

  const dbPath = dbDirOrPath === ':memory:' ? ':memory:' : dbDirOrPath.endsWith('.sqlite') || dbDirOrPath.endsWith('.db') ? dbDirOrPath : join(dbDirOrPath, 'gone-calendar.sqlite')
  const db = createSqliteDriver(dbPath)

  runMigrations(db)
  seedDefaultData(db)

  dbInstance = db
  return db
}

export function getDatabase(): ISqliteDatabase {
  if (!dbInstance) {
    throw new Error('Database has not been initialized. Call initDatabase() first.')
  }
  return dbInstance
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
  }
}
