import { existsSync, statSync, unlinkSync } from 'node:fs'
import type { ISqliteDatabase } from './sqlite-driver'

/**
 * Write a consistent snapshot of the whole database to `destPath`.
 *
 * `VACUUM INTO` is the right tool rather than copying the file: the database
 * runs in WAL mode, so the `.sqlite` on disk is only part of the story and a
 * plain copy taken mid-write can land torn or miss committed data sitting in the
 * `-wal`. VACUUM INTO takes a read transaction, so it is safe while the app is
 * running, and it writes a single compacted file with no sidecars to keep
 * together.
 *
 * The result is an ordinary SQLite database: restoring is copying it back over
 * `gone-calendar.sqlite` with the app closed.
 */
export function backupDatabaseTo(db: ISqliteDatabase, destPath: string): number {
  // VACUUM INTO refuses to overwrite, so an existing snapshot at this path is
  // cleared first - the user already confirmed the overwrite in the save dialog.
  if (existsSync(destPath)) unlinkSync(destPath)

  // The path comes from a save dialog, not from user-typed SQL, but it still
  // goes into a statement: escape the quote character so a path containing one
  // cannot terminate the literal.
  db.exec(`VACUUM INTO '${destPath.replace(/'/g, "''")}'`)

  return statSync(destPath).size
}

/** `gone-calendar-backup-2026-09-14T19-20-31.sqlite` */
export function defaultBackupFileName(now = new Date()): string {
  const stamp = now.toISOString().replace(/\.\d+Z$/, '').replace(/:/g, '-')
  return `gone-calendar-backup-${stamp}.sqlite`
}
