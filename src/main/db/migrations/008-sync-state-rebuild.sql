-- Migration 008: make sync_state actually writable.
--
-- Reference copy of MIGRATION_008_SQL in src/main/db/database.ts - the inline
-- constant there is what runs. Keep the two in step.
--
-- As created in 001, sync_state has no `updated_at` column, NOT NULL `id` and
-- `account_id` columns the writer never supplies, and no unique constraint on
-- `calendar_id` for ON CONFLICT. The sync-token upsert therefore always threw,
-- and since it shares a transaction with the pulled events it rolled back the
-- entire page: any calendar returning nextSyncToken on its first page imported
-- zero events.

CREATE TABLE sync_state_new (
  calendar_id TEXT PRIMARY KEY REFERENCES calendars(id) ON DELETE CASCADE,
  account_id TEXT,
  last_synced_at TEXT,
  sync_token TEXT,
  sync_status TEXT NOT NULL DEFAULT 'idle',
  error_message TEXT,
  updated_at TEXT
);

INSERT OR IGNORE INTO sync_state_new
  (calendar_id, account_id, last_synced_at, sync_token, sync_status, error_message)
SELECT calendar_id, account_id, last_synced_at, sync_token, sync_status, error_message
FROM sync_state
WHERE calendar_id IS NOT NULL;

DROP TABLE sync_state;
ALTER TABLE sync_state_new RENAME TO sync_state;
