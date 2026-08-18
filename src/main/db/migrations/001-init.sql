-- Migration 001: Initial Schema for Gone Calendar

CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- 'local' | 'google' | 'graph' | 'caldav'
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
