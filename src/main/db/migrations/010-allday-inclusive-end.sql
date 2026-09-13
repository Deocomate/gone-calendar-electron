-- Migration 010: repair all-day ends imported in the provider's exclusive form.
--
-- Reference copy of MIGRATION_010_SQL in src/main/db/database.ts - the inline
-- constant there is what runs. Keep the two in step.
--
-- Every interchange format (RFC 5545 DTEND;VALUE=DATE, Google end.date, Graph
-- end with isAllDay) uses an EXCLUSIVE end for all-day events. The app stores an
-- INCLUSIVE end - 23:59:59.999 of the final day - which is what the editor
-- writes and what the views render. The importers stored the provider value
-- verbatim, so every imported all-day event covered one extra day.
--
-- Only rows still in the exclusive shape are rewritten; locally created rows
-- already end at 23:59:59.999.

UPDATE events
SET dtend_utc = strftime('%Y-%m-%dT23:59:59.999Z', datetime(dtend_utc, '-1 day'))
WHERE all_day = 1
  AND dtend_utc LIKE '%T00:00:00.000Z'
  AND dtend_utc > dtstart_utc;
