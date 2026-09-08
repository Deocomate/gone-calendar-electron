-- Reference copy only. The authoritative migration is MIGRATION_004_SQL in database.ts.
-- Lunar-recurring anniversaries (giỗ / âm lịch): a "lunar master" event stores a
-- compact spec in lunar_rule and carries no rrule. Materialized instances point
-- back to their master via lunar_source_event_id.

ALTER TABLE events ADD COLUMN lunar_rule TEXT;
ALTER TABLE events ADD COLUMN lunar_source_event_id TEXT;

CREATE INDEX IF NOT EXISTS idx_events_lunar_source ON events (lunar_source_event_id);
