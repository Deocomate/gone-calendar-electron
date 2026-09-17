-- Reference copy. The applied version is MIGRATION_014_SQL in database.ts.
--
-- Separates the provider's identifier from the local primary key so that a
-- first successful push no longer re-keys the row out from under the renderer.
-- No backfill: both code paths fall back to `id` for rows that synced earlier,
-- and updating every row would re-index each one through the FTS5 trigger.
ALTER TABLE events ADD COLUMN provider_event_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_provider_id
  ON events(calendar_id, provider_event_id)
  WHERE provider_event_id IS NOT NULL;
