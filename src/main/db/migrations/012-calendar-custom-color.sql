-- Migration 012: stop provider syncs from reverting user-picked calendar colours.
--
-- Reference copy of MIGRATION_012_SQL in src/main/db/database.ts - the inline
-- constant there is what runs. Keep the two in step.
--
-- Every engine's syncCalendarList rewrites name/colour/read-only for all of its
-- calendars on every poll (20s apart while focused). A colour the user picked
-- was reverted almost immediately, and since the whole list is rewritten in one
-- pass, every other customisation went with it - so changing one calendar
-- looked like it changed them all.
--
-- With this flag set, the pull leaves that calendar's colour alone and keeps
-- refreshing everything else.

ALTER TABLE calendars ADD COLUMN color_is_custom INTEGER NOT NULL DEFAULT 0;
