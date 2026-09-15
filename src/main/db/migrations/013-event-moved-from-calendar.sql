-- Reference copy. The applied version is MIGRATION_013_SQL in database.ts.
--
-- Remembers the calendar an event was pushed to, so a local calendar change can
-- be replayed at the provider as a move rather than as an update aimed at a
-- calendar that has never held the event.
ALTER TABLE events ADD COLUMN moved_from_calendar_id TEXT;
