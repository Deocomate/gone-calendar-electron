import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Users,
  Plus,
  RotateCw,
  Trash2,
  X,
  Clock,
  ShieldCheck,
  Server
} from 'lucide-react'
import type { CalendarAccount, SyncStatus } from '@shared/event-model'
import CalDavConnectModal from './CalDavConnectModal'
import { toast, showFriendlyError } from './ui'

interface AccountManagerModalProps {
  isOpen: boolean
  onClose: () => void
  onAccountsChanged: () => void
}

export const AccountManagerModal: React.FC<AccountManagerModalProps> = ({
  isOpen,
  onClose,
  onAccountsChanged
}) => {
  const { t } = useTranslation()
  const [accounts, setAccounts] = useState<CalendarAccount[]>([])
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [isCalDavModalOpen, setIsCalDavModalOpen] = useState<boolean>(false)

  const loadData = async () => {
    if (!window.gone?.auth || !window.gone?.sync) return
    try {
      const accList = await window.gone.auth.listAccounts()
      setAccounts(accList)
      const status = await window.gone.sync.getStatus()
      setSyncStatus(status)
    } catch (err) {
      console.error('Failed to load accounts/sync status:', err)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleConnectGoogle = async () => {
    if (!window.gone?.auth) return
    setIsLoading(true)
    setActionMessage(t('accounts.openingGoogle'))
    try {
      const res = await window.gone.auth.connectGoogle()
      if (res.success) {
        setActionMessage(t('accounts.googleConnected'))
        await loadData()
        onAccountsChanged()
      } else {
        setActionMessage(t('accounts.connectFailed', { msg: res.message }))
      }
    } catch (err: any) {
      setActionMessage(t('accounts.error', { msg: err.message }))
    } finally {
      setIsLoading(false)
      setTimeout(() => setActionMessage(null), 5000)
    }
  }

  const handleConnectMicrosoft = async () => {
    if (!window.gone?.auth) return
    setIsLoading(true)
    setActionMessage(t('accounts.openingMicrosoft'))
    try {
      const res = await window.gone.auth.connectMicrosoft()
      if (res.success) {
        setActionMessage(t('accounts.microsoftConnected'))
        await loadData()
        onAccountsChanged()
      } else {
        setActionMessage(t('accounts.connectFailed', { msg: res.message }))
      }
    } catch (err: any) {
      setActionMessage(t('accounts.error', { msg: err.message }))
    } finally {
      setIsLoading(false)
      setTimeout(() => setActionMessage(null), 5000)
    }
  }

  const handleDisconnect = async (acc: CalendarAccount) => {
    if (!confirm(t('accounts.disconnectConfirm', { name: acc.name }))) return
    if (!window.gone?.auth) return

    try {
      if (acc.type === 'google') {
        await window.gone.auth.disconnectGoogle(acc.id)
      } else if (acc.type === 'graph') {
        await window.gone.auth.disconnectMicrosoft(acc.id)
      } else if (acc.type === 'caldav') {
        await window.gone.auth.disconnectCalDav(acc.id)
      }
      await loadData()
      onAccountsChanged()
      toast.success(t('accounts.disconnected'), { description: acc.name })
    } catch (err: any) {
      showFriendlyError(err, t('accounts.disconnectFailed'))
    }
  }

  const handleSyncNow = async () => {
    if (!window.gone?.sync) return
    setIsLoading(true)
    setActionMessage(t('accounts.syncingNow'))
    try {
      const res = await window.gone.sync.triggerNow()
      setActionMessage(res.message || t('accounts.syncDone'))
      await loadData()
      onAccountsChanged()
    } catch (err: any) {
      setActionMessage(t('accounts.syncFailed', { msg: err.message }))
    } finally {
      setIsLoading(false)
      setTimeout(() => setActionMessage(null), 4000)
    }
  }

  return (
    <div className="gc-overlay select-none">
      <div className="gc-dialog w-full max-w-lg max-h-[85vh]">
        {/* Header — plain icon, no indigo icon box */}
        <div className="px-5 py-3 border-b border-hairline flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted" />
            <div>
              <h3 className="text-sm font-semibold text-primary">{t('accounts.title')}</h3>
              <p className="text-[11px] text-muted">Google Calendar, CalDAV, Microsoft 365</p>
            </div>
          </div>

          <button onClick={onClose} className="gc-icon-btn">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Action toast — muted bg-hover, not indigo banner */}
          {actionMessage && (
            <div
              className="px-3 py-2 bg-hover border border-hairline text-primary text-xs flex items-center justify-between"
              style={{ borderRadius: 'var(--radius-control)' }}
            >
              <span>{actionMessage}</span>
              <button onClick={() => setActionMessage(null)} className="text-muted hover:text-primary">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Sync Status — one row section, not a card */}
          <div
            className="flex items-center justify-between border border-hairline px-4 py-3"
            style={{ borderRadius: 'var(--radius-control)' }}
          >
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-primary font-medium text-xs">
                <ShieldCheck className="h-3.5 w-3.5 text-accent" />
                <span>{t('accounts.syncStatus')}</span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-muted">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {syncStatus?.lastSyncTime
                    ? t('accounts.lastSync', { time: new Date(syncStatus.lastSyncTime).toLocaleTimeString() })
                    : t('accounts.neverSynced')}
                </span>
                {syncStatus && syncStatus.pendingPushesCount > 0 && (
                  <span className="text-amber-500 dark:text-amber-400 font-mono">
                    {t('accounts.pendingPushes', { count: syncStatus.pendingPushesCount })}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={handleSyncNow}
              disabled={isLoading}
              className="gc-btn disabled:opacity-50"
            >
              <RotateCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{t('accounts.syncNow')}</span>
            </button>
          </div>

          {/* Accounts List — hover rows, no bordered mini-cards */}
          <div>
            <p className="text-xs text-muted mb-2">
              {t('accounts.linked', { count: accounts.length })}
            </p>

            <div className="space-y-0.5">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className="flex items-center justify-between px-3 py-2 hover:bg-hover transition-colors"
                  style={{ borderRadius: 'var(--radius-control)' }}
                >
                  <div className="flex items-center gap-3">
                    {/* Muted initial avatar, no indigo/google color fills */}
                    <div
                      className="h-7 w-7 bg-hover border border-hairline flex items-center justify-center font-bold text-muted text-[11px] uppercase"
                      style={{ borderRadius: 'var(--radius-control)' }}
                    >
                      {acc.type === 'google' ? 'G' : acc.type === 'graph' ? 'M' : acc.type === 'caldav' ? 'C' : 'L'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-primary text-xs">{acc.name}</span>
                        {/* Type as muted text, no colored chip */}
                        <span className="text-[10px] text-muted">
                          {acc.type === 'google' ? 'Google' : acc.type === 'graph' ? 'Microsoft' : acc.type === 'caldav' ? 'CalDAV' : 'Local'}
                        </span>
                      </div>
                      {acc.email && (
                        <span className="text-[11px] text-muted font-mono">{acc.email}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {(acc.type === 'google' || acc.type === 'graph' || acc.type === 'caldav') && (
                      <button
                        onClick={() => handleDisconnect(acc)}
                        className="p-1.5 text-muted hover:text-today transition-colors cursor-pointer"
                        title={t('accounts.disconnect')}
                        style={{ borderRadius: 'var(--radius-control)' }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {acc.type === 'local' && (
                      <span className="text-[11px] text-muted font-medium px-2 py-1 bg-hover"
                        style={{ borderRadius: 'var(--radius-control)' }}>
                        {t('accounts.default')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Connect buttons — outline gc-btn, no gradient */}
          <div className="pt-1 space-y-1.5">
            <button
              onClick={handleConnectGoogle}
              disabled={isLoading}
              className="gc-btn w-full justify-center disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              <span>{t('accounts.connectGoogle')}</span>
            </button>

            <button
              onClick={handleConnectMicrosoft}
              disabled={isLoading}
              className="gc-btn w-full justify-center disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              <span>{t('accounts.connectMicrosoft')}</span>
            </button>

            <button
              onClick={() => setIsCalDavModalOpen(true)}
              disabled={isLoading}
              className="gc-btn w-full justify-center disabled:opacity-50"
            >
              <Server className="h-4 w-4" />
              <span>{t('accounts.connectCaldav')}</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-hairline flex justify-end">
          <button onClick={onClose} className="gc-btn">
            {t('common.close')}
          </button>
        </div>
      </div>

      {/* CalDAV Connect Modal */}
      <CalDavConnectModal
        isOpen={isCalDavModalOpen}
        onClose={() => setIsCalDavModalOpen(false)}
        onConnected={() => {
          loadData()
          onAccountsChanged()
        }}
      />
    </div>
  )
}

export default AccountManagerModal
