import { ipcMain } from 'electron'
import { IPC_CHANNELS, type ConnectCalDavInput } from '@shared/ipc-contract'
import { getDatabase } from '../db/database'
import { GoogleOAuthManager } from '../oauth/google-oauth'
import { MicrosoftOAuthManager } from '../oauth/microsoft-oauth'
import { SecureStore } from '../secure-store'
import { normalizeCalDavUrl } from '../sync/caldav-discover'
import { CalDavAdapter } from '../sync/caldav-adapter'
import { SyncWorker } from '../sync/sync-worker'
import { ReminderScheduler } from '../notifications/reminder-scheduler'
import type { CalendarAccount } from '@shared/event-model'

let syncWorkerInstance: SyncWorker | null = null
let reminderSchedulerInstance: ReminderScheduler | null = null

export function getSyncWorker(): SyncWorker | null {
  return syncWorkerInstance
}

export function initSyncAndReminders(
  googleClientId?: string,
  googleClientSecret?: string,
  msClientId?: string,
  msClientSecret?: string
): void {
  const db = getDatabase()
  syncWorkerInstance = new SyncWorker(
    db,
    googleClientId,
    googleClientSecret,
    msClientId,
    msClientSecret
  )
  syncWorkerInstance.start()

  reminderSchedulerInstance = new ReminderScheduler(db)
  reminderSchedulerInstance.start()
}

export function registerAuthSyncIpcHandlers(): void {
  const db = getDatabase()
  const googleOAuth = new GoogleOAuthManager(db)
  const msOAuth = new MicrosoftOAuthManager(db)
  const secureStore = new SecureStore(db)

  if (!syncWorkerInstance) {
    const googleClientId = process.env.GOOGLE_OAUTH_CLIENT_ID
    const googleClientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
    const msClientId = process.env.MICROSOFT_CLIENT_ID
    const msClientSecret = process.env.MICROSOFT_CLIENT_SECRET
    initSyncAndReminders(googleClientId, googleClientSecret, msClientId, msClientSecret)
  }

  ipcMain.removeHandler(IPC_CHANNELS.AUTH.CONNECT_GOOGLE)
  ipcMain.removeHandler(IPC_CHANNELS.AUTH.DISCONNECT_GOOGLE)
  ipcMain.removeHandler(IPC_CHANNELS.AUTH.CONNECT_MICROSOFT)
  ipcMain.removeHandler(IPC_CHANNELS.AUTH.DISCONNECT_MICROSOFT)
  ipcMain.removeHandler(IPC_CHANNELS.AUTH.CONNECT_CALDAV)
  ipcMain.removeHandler(IPC_CHANNELS.AUTH.DISCONNECT_CALDAV)
  ipcMain.removeHandler(IPC_CHANNELS.AUTH.LIST_ACCOUNTS)
  ipcMain.removeHandler(IPC_CHANNELS.SYNC.TRIGGER_NOW)
  ipcMain.removeHandler(IPC_CHANNELS.SYNC.GET_STATUS)

  // Google OAuth
  ipcMain.handle(IPC_CHANNELS.AUTH.CONNECT_GOOGLE, async () => {
    try {
      const activeClientId = process.env.GOOGLE_OAUTH_CLIENT_ID || 'dummy_google_id.apps.googleusercontent.com'
      const activeClientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET

      const result = await googleOAuth.startAuthFlow(activeClientId, activeClientSecret)
      if (syncWorkerInstance) {
        syncWorkerInstance.triggerSync().catch(() => {})
      }
      return { success: true, account: result.account }
    } catch (err: any) {
      return { success: false, message: err.message || String(err) }
    }
  })

  ipcMain.handle(IPC_CHANNELS.AUTH.DISCONNECT_GOOGLE, (_event, accountId: string) => {
    try {
      googleOAuth.disconnectAccount(accountId)
      return true
    } catch {
      return false
    }
  })

  // Microsoft OAuth
  ipcMain.handle(IPC_CHANNELS.AUTH.CONNECT_MICROSOFT, async () => {
    try {
      const activeClientId = process.env.MICROSOFT_CLIENT_ID || 'dummy_microsoft_client_id'
      const activeClientSecret = process.env.MICROSOFT_CLIENT_SECRET

      const result = await msOAuth.startAuthFlow(activeClientId, activeClientSecret)
      if (syncWorkerInstance) {
        syncWorkerInstance.triggerSync().catch(() => {})
      }
      return { success: true, account: result.account }
    } catch (err: any) {
      return { success: false, message: err.message || String(err) }
    }
  })

  ipcMain.handle(IPC_CHANNELS.AUTH.DISCONNECT_MICROSOFT, (_event, accountId: string) => {
    try {
      msOAuth.disconnectAccount(accountId)
      return true
    } catch {
      return false
    }
  })

  // CalDAV Connection
  ipcMain.handle(IPC_CHANNELS.AUTH.CONNECT_CALDAV, async (_event, input: ConnectCalDavInput) => {
    try {
      if (!secureStore.isAvailable()) {
        throw new Error('OS Keyring encryption is unavailable. Cannot store credentials securely.')
      }

      const normalizedUrl = normalizeCalDavUrl(input.provider, input.serverUrl, input.username)
      const adapter = new CalDavAdapter({
        url: normalizedUrl,
        username: input.username,
        password: input.password
      })

      // Test discovery against server
      const calendars = await adapter.discoverCalendars()
      if (calendars.length === 0) {
        console.warn('CalDAV connected but no calendar collection discovered at base URL.')
      }

      const accountId = `acc_caldav_${Buffer.from(normalizedUrl).toString('hex').slice(0, 10)}`
      const displayName = input.name || `${input.provider.toUpperCase()} (${input.username})`
      const now = new Date().toISOString()

      // Store credentials encrypted in SecureStore
      secureStore.storeToken(accountId, {
        url: normalizedUrl,
        username: input.username,
        password: input.password,
        provider: input.provider
      })

      // Upsert account
      db.prepare(
        `INSERT INTO accounts (id, type, name, email, is_active, created_at, updated_at)
         VALUES (?, 'caldav', ?, ?, 1, ?, ?)
         ON CONFLICT(id) DO UPDATE SET name = excluded.name, email = excluded.email, is_active = 1, updated_at = excluded.updated_at`
      ).run(accountId, displayName, input.username, now, now)

      if (syncWorkerInstance) {
        syncWorkerInstance.triggerSync().catch(() => {})
      }

      return {
        success: true,
        account: {
          id: accountId,
          type: 'caldav' as const,
          name: displayName,
          email: input.username,
          isActive: true,
          createdAt: now,
          updatedAt: now
        }
      }
    } catch (err: any) {
      return { success: false, message: err.message || String(err) }
    }
  })

  ipcMain.handle(IPC_CHANNELS.AUTH.DISCONNECT_CALDAV, (_event, accountId: string) => {
    try {
      secureStore.deleteToken(accountId)
      const now = new Date().toISOString()
      db.prepare('UPDATE accounts SET is_active = 0, updated_at = ? WHERE id = ?').run(now, accountId)
      return true
    } catch {
      return false
    }
  })

  // Accounts & Sync
  ipcMain.handle(IPC_CHANNELS.AUTH.LIST_ACCOUNTS, (): CalendarAccount[] => {
    const rows = db.prepare('SELECT * FROM accounts').all<any>()
    return rows.map((r) => ({
      id: r.id,
      type: r.type,
      name: r.name,
      email: r.email,
      isActive: r.is_active === 1,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }))
  })

  ipcMain.handle(IPC_CHANNELS.SYNC.TRIGGER_NOW, async () => {
    if (syncWorkerInstance) {
      return await syncWorkerInstance.triggerSync()
    }
    return { success: false, pulledCount: 0, pushedCount: 0, errorCount: 1, message: 'Sync worker not initialized' }
  })

  ipcMain.handle(IPC_CHANNELS.SYNC.GET_STATUS, () => {
    if (syncWorkerInstance) {
      return syncWorkerInstance.getStatus()
    }
    return {
      isSyncing: false,
      pendingPushesCount: 0,
      connectedAccounts: []
    }
  })
}
