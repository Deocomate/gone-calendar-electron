-- Migration 009: make the occurrence-exception index UNIQUE.
--
-- Reference copy of MIGRATION_009_SQL in src/main/db/database.ts - the inline
-- constant there is what runs. Keep the two in step.
--
-- 001 created idx_event_exceptions_master as a plain index, but both provider
-- pulls upsert onto those columns with ON CONFLICT(master_event_id,
-- original_start_utc). SQLite requires a UNIQUE index for that, so every page of
-- events containing a recurring-occurrence exception threw, rolled back its
-- transaction, and aborted the whole calendar.

DELETE FROM event_exceptions
WHERE rowid NOT IN (
  SELECT MAX(rowid) FROM event_exceptions GROUP BY master_event_id, original_start_utc
);

DROP INDEX IF EXISTS idx_event_exceptions_master;

CREATE UNIQUE INDEX idx_event_exceptions_master
  ON event_exceptions (master_event_id, original_start_utc);
