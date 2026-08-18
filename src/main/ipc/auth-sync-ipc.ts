import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-contract'
import { getDatabase } from '../db/database'
import { GoogleOAuthManager } from '../oauth/google-oauth'
import { SyncWorker } from '../sync/sync-worker'
import { ReminderScheduler } from '../notifications/reminder-scheduler'
import type { CalendarAccount } from '@shared/event-model'

let syncWorkerInstance: SyncWorker | null = null
let reminderSchedulerInstance: ReminderScheduler | null = null

export function getSyncWorker(): SyncWorker | null {
  return syncWorkerInstance
}

export function initSyncAndReminders(clientId?: string, clientSecret?: string): void {
  const db = getDatabase()
  syncWorkerInstance = new SyncWorker(db, clientId, clientSecret)
  syncWorkerInstance.start()

  reminderSchedulerInstance = new ReminderScheduler(db)
  reminderSchedulerInstance.start()
}

export function registerAuthSyncIpcHandlers(clientId?: string, clientSecret?: string): void {
  const db = getDatabase()
  const oauthManager = new GoogleOAuthManager(db)

  if (!syncWorkerInstance) {
    initSyncAndReminders(clientId, clientSecret)
  }

  ipcMain.removeHandler(IPC_CHANNELS.AUTH.CONNECT_GOOGLE)
  ipcMain.removeHandler(IPC_CHANNELS.AUTH.DISCONNECT_GOOGLE)
  ipcMain.removeHandler(IPC_CHANNELS.AUTH.LIST_ACCOUNTS)
  ipcMain.removeHandler(IPC_CHANNELS.SYNC.TRIGGER_NOW)
  ipcMain.removeHandler(IPC_CHANNELS.SYNC.GET_STATUS)

  ipcMain.handle(IPC_CHANNELS.AUTH.CONNECT_GOOGLE, async () => {
    try {
      const activeClientId = clientId || process.env.GOOGLE_OAUTH_CLIENT_ID || 'dummy_client_id.apps.googleusercontent.com'
      const activeClientSecret = clientSecret || process.env.GOOGLE_OAUTH_CLIENT_SECRET

      const result = await oauthManager.startAuthFlow(activeClientId, activeClientSecret)
      // Trigger initial sync after connection
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
      oauthManager.disconnectAccount(accountId)
      return true
    } catch {
      return false
    }
  })

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
