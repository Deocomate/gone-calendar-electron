-- Reference copy only - the applied migration lives in database.ts (MIGRATION_006_SQL).
ALTER TABLE events ADD COLUMN has_conflict INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_events_has_conflict ON events (has_conflict) WHERE has_conflict = 1;
