-- Reference copy only. The authoritative migration is MIGRATION_005_SQL in database.ts.
-- The tasks / to-do subsystem was removed from the app.

DROP INDEX IF EXISTS idx_tasks_due_date;
DROP INDEX IF EXISTS idx_tasks_completed;
DROP TABLE IF EXISTS tasks;
