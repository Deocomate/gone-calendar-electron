-- Migration 002: FTS5 Full Text Search & Attendees Table

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

-- Triggers to maintain FTS index in sync with events table
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
