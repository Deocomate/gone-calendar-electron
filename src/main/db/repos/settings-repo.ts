import type { ISqliteDatabase } from '../sqlite-driver'
import { DEFAULT_APP_SETTINGS, type AppSettings } from '@shared/settings-contract'

export class SettingsRepo {
  constructor(private db: ISqliteDatabase) {}

  getAllSettings(): AppSettings {
    const rows = this.db.prepare('SELECT key, value FROM settings').all<{ key: string; value: string }>()
    const settings: Record<string, any> = { ...DEFAULT_APP_SETTINGS }

    for (const row of rows) {
      try {
        settings[row.key] = JSON.parse(row.value)
      } catch {
        settings[row.key] = row.value
      }
    }

    return settings as AppSettings
  }

  getSetting<K extends keyof AppSettings>(key: K): AppSettings[K] {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get<{ value: string }>(key)
    if (!row) {
      return DEFAULT_APP_SETTINGS[key]
    }
    try {
      return JSON.parse(row.value) as AppSettings[K]
    } catch {
      return row.value as unknown as AppSettings[K]
    }
  }

  setSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): boolean {
    const now = new Date().toISOString()
    const serialized = JSON.stringify(value)

    this.db
      .prepare(
        `INSERT INTO settings (key, value, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
      )
      .run(key, serialized, now)

    return true
  }
}
