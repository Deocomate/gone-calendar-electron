import type { ISqliteDatabase } from '../db/sqlite-driver'
import { GoogleSyncEngine } from './google-sync-engine'
import { MicrosoftSyncEngine } from './microsoft-sync-engine'
import { CalDavSyncEngine } from './caldav-sync-engine'
import type { SyncStatus, SyncResult } from '@shared/event-model'
import { mt } from '../i18n-main'

export class SyncWorker {
  private googleEngine: GoogleSyncEngine
  private microsoftEngine: MicrosoftSyncEngine
  private caldavEngine: CalDavSyncEngine
  private timer: NodeJS.Timeout | null = null
  /** Kick-off timer from start(); tracked so stop() can cancel it before it
   *  fires a sync against a database the app is in the middle of closing. */
  private startupTimer: NodeJS.Timeout | null = null
  private isSyncing = false
  private lastSyncTime?: string
  private lastError?: string

  private currentIntervalMs = 5 * 60 * 1000

  constructor(
    private db: ISqliteDatabase,
    private googleClientId?: string,
    private googleClientSecret?: string,
    private msClientId?: string,
    private msClientSecret?: string
  ) {
    this.googleEngine = new GoogleSyncEngine(db)
    this.microsoftEngine = new MicrosoftSyncEngine(db)
    this.caldavEngine = new CalDavSyncEngine(db)
  }

  /**
   * Start periodic background sync with adaptive polling
   */
  start(intervalMs = 5 * 60 * 1000): void {
    this.currentIntervalMs = intervalMs
    if (this.timer) clearInterval(this.timer)

    // Initial sync
    if (this.startupTimer) clearTimeout(this.startupTimer)
    this.startupTimer = setTimeout(() => {
      this.startupTimer = null
      this.triggerSync().catch(() => {})
    }, 3000)

    this.timer = setInterval(() => {
      this.triggerSync().catch(() => {})
    }, this.currentIntervalMs)
  }

  /**
   * Adaptive polling policy: 20s when focused (near-instant pulls without hammering provider
   * APIs — true push notifications would need a public HTTPS webhook endpoint, which a desktop
   * app doesn't have), 5m when background/tray
   */
  setFocusState(isFocused: boolean): void {
    const nextInterval = isFocused ? 20 * 1000 : 5 * 60 * 1000
    if (this.currentIntervalMs !== nextInterval) {
      this.currentIntervalMs = nextInterval
      if (this.timer) {
        clearInterval(this.timer)
        this.timer = setInterval(() => {
          this.triggerSync().catch(() => {})
        }, this.currentIntervalMs)
      }
    }
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    if (this.startupTimer) {
      clearTimeout(this.startupTimer)
      this.startupTimer = null
    }
  }

  /** Contain an engine-level throw so one provider cannot cancel the others. */
  private engineFailure(provider: string, err: any): SyncResult {
    const message = `${provider} sync failed: ${err?.message || String(err)}`
    console.error(message)
    return { success: false, pulledCount: 0, pushedCount: 0, errorCount: 1, message }
  }

  /**
   * Trigger immediate two-way sync for Google, Microsoft, and CalDAV accounts
   */
  async triggerSync(): Promise<SyncResult> {
    if (this.isSyncing) {
      return { success: false, pulledCount: 0, pushedCount: 0, errorCount: 0, message: 'Sync already in progress' }
    }

    this.isSyncing = true
    try {
      // Run the three providers concurrently and settle independently: in
      // sequence, a slow provider delays the other two and a throw from the
      // first skips the rest entirely.
      const [googleRes, msRes, caldavRes] = await Promise.all([
        this.googleEngine
          .syncAll(this.googleClientId, this.googleClientSecret)
          .catch((err) => this.engineFailure('Google', err)),
        this.microsoftEngine
          .syncAll(this.msClientId, this.msClientSecret)
          .catch((err) => this.engineFailure('Microsoft', err)),
        this.caldavEngine.syncAll().catch((err) => this.engineFailure('CalDAV', err))
      ])

      const totalPulled = googleRes.pulledCount + msRes.pulledCount + caldavRes.pulledCount
      const totalPushed = googleRes.pushedCount + msRes.pushedCount + caldavRes.pushedCount
      const totalErrors = googleRes.errorCount + msRes.errorCount + caldavRes.errorCount

      this.lastSyncTime = new Date().toISOString()
      this.lastError = totalErrors > 0 ? `Sync completed with ${totalErrors} errors` : undefined

      return {
        success: totalErrors === 0,
        pulledCount: totalPulled,
        pushedCount: totalPushed,
        errorCount: totalErrors,
        message: mt('sync.done', { pulled: totalPulled, pushed: totalPushed })
      }
    } catch (err: any) {
      this.lastError = err.message || String(err)
      return { success: false, pulledCount: 0, pushedCount: 0, errorCount: 1, message: this.lastError }
    } finally {
      // Always release, on every exit path: a flag left set makes every later
      // poll return "sync already in progress" until the app is restarted.
      this.isSyncing = false
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
      .prepare('SELECT * FROM accounts WHERE is_active = 1')
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
