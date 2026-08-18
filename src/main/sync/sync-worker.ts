import type { ISqliteDatabase } from '../db/sqlite-driver'
import { GoogleSyncEngine } from './google-sync-engine'
import type { SyncStatus, SyncResult } from '@shared/event-model'

export class SyncWorker {
  private engine: GoogleSyncEngine
  private timer: NodeJS.Timeout | null = null
  private isSyncing = false
  private lastSyncTime?: string
  private lastError?: string

  constructor(
    private db: ISqliteDatabase,
    private clientId?: string,
    private clientSecret?: string
  ) {
    this.engine = new GoogleSyncEngine(db)
  }

  /**
   * Start periodic background sync (every 5 minutes)
   */
  start(intervalMs = 5 * 60 * 1000): void {
    if (this.timer) clearInterval(this.timer)

    // Initial sync
    setTimeout(() => {
      this.triggerSync().catch(() => {})
    }, 3000)

    this.timer = setInterval(() => {
      this.triggerSync().catch(() => {})
    }, intervalMs)
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  /**
   * Trigger immediate two-way sync
   */
  async triggerSync(): Promise<SyncResult> {
    if (this.isSyncing) {
      return { success: false, pulledCount: 0, pushedCount: 0, errorCount: 0, message: 'Sync already in progress' }
    }

    this.isSyncing = true
    try {
      const result = await this.engine.syncAll(this.clientId, this.clientSecret)
      this.lastSyncTime = new Date().toISOString()
      this.lastError = result.errorCount > 0 ? result.message : undefined
      this.isSyncing = false
      return result
    } catch (err: any) {
      this.lastError = err.message || String(err)
      this.isSyncing = false
      return { success: false, pulledCount: 0, pushedCount: 0, errorCount: 1, message: this.lastError }
    }
  }

  /**
   * Query current sync status
   */
  getStatus(): SyncStatus {
    const dirtyCountRow = this.db
      .prepare('SELECT COUNT(*) as cnt FROM events WHERE dirty = 1')
      .get<{ cnt: number }>()

    const accounts = this.db
      .prepare("SELECT * FROM accounts WHERE is_active = 1")
      .all<any>()
      .map((row) => ({
        id: row.id,
        type: row.type,
        name: row.name,
        email: row.email,
        isActive: row.is_active === 1,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))

    return {
      lastSyncTime: this.lastSyncTime,
      isSyncing: this.isSyncing,
      lastError: this.lastError,
      pendingPushesCount: dirtyCountRow?.cnt || 0,
      connectedAccounts: accounts
    }
  }
}
