-- Migration 011: let an occurrence override differ from its series in all-day-ness.
--
-- Reference copy of MIGRATION_011_SQL in src/main/db/database.ts - the inline
-- constant there is what runs. Keep the two in step.
--
-- Google and Outlook both allow converting a single occurrence of an all-day
-- series into a timed one (and back). event_exceptions could not express that,
-- so expand-occurrences fell back to the master's flag and those occurrences
-- kept rendering in the all-day bar despite carrying real start/end times.
--
-- NULL means "inherit from the master", which is what every existing row does.

ALTER TABLE event_exceptions ADD COLUMN all_day INTEGER;

-- Backfill overrides already imported from a provider. Calendars now hold sync
-- tokens, so an incremental pull will never revisit these rows and they would
-- otherwise keep inheriting the series' all-day flag forever. An override of an
-- all-day series whose stored times are not a whole-day span (midnight to
-- 23:59:59.999) is a timed occurrence.
UPDATE event_exceptions
SET all_day = 0
WHERE all_day IS NULL
  AND is_cancelled = 0
  AND dtstart_utc IS NOT NULL
  AND dtend_utc IS NOT NULL
  AND master_event_id IN (SELECT id FROM events WHERE all_day = 1)
  AND NOT (dtstart_utc LIKE '%T00:00:00.000Z' AND dtend_utc LIKE '%T23:59:59.999Z');
