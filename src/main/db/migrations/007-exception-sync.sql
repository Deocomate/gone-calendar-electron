-- Migration 007: make occurrence exceptions syncable.
--
-- Reference copy of MIGRATION_007_SQL in src/main/db/database.ts - the inline
-- constant there is what actually runs. Keep the two in step.
--
-- Occurrence exceptions (one edited or cancelled instance of a recurring
-- series) had no push-tracking columns, so they were written locally and never
-- sent to any provider. `dirty` puts them in the push set the same way events
-- use it; `provider_instance_id` caches the provider's id for the instance so a
-- repeat push does not have to re-resolve it.

ALTER TABLE event_exceptions ADD COLUMN dirty INTEGER NOT NULL DEFAULT 0;
ALTER TABLE event_exceptions ADD COLUMN etag TEXT;
ALTER TABLE event_exceptions ADD COLUMN provider_instance_id TEXT;

CREATE INDEX IF NOT EXISTS idx_event_exceptions_dirty ON event_exceptions (dirty) WHERE dirty = 1;
