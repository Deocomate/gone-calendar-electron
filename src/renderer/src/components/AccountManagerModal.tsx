import React, { useState, useEffect } from 'react'
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
    setActionMessage('Đang mở trình duyệt để xác thực với Google...')
    try {
      const res = await window.gone.auth.connectGoogle()
      if (res.success) {
        setActionMessage('✓ Kết nối Google Calendar thành công!')
        await loadData()
        onAccountsChanged()
      } else {
        setActionMessage(`Kết nối thất bại: ${res.message}`)
      }
    } catch (err: any) {
      setActionMessage(`Lỗi: ${err.message}`)
    } finally {
      setIsLoading(false)
      setTimeout(() => setActionMessage(null), 5000)
    }
  }

  const handleConnectMicrosoft = async () => {
    if (!window.gone?.auth) return
    setIsLoading(true)
    setActionMessage('Đang mở trình duyệt để xác thực với Microsoft...')
    try {
      const res = await window.gone.auth.connectMicrosoft()
      if (res.success) {
        setActionMessage('✓ Kết nối Microsoft 365 / Outlook thành công!')
        await loadData()
        onAccountsChanged()
      } else {
        setActionMessage(`Kết nối thất bại: ${res.message}`)
      }
    } catch (err: any) {
      setActionMessage(`Lỗi: ${err.message}`)
    } finally {
      setIsLoading(false)
      setTimeout(() => setActionMessage(null), 5000)
    }
  }

  const handleDisconnect = async (acc: CalendarAccount) => {
    if (!confirm(`Bạn có chắc chắn muốn ngắt kết nối tài khoản "${acc.name}"?`)) return
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
      toast.success('Đã ngắt kết nối tài khoản', { description: acc.name })
    } catch (err: any) {
      showFriendlyError(err, 'Lỗi ngắt kết nối tài khoản')
    }
  }

  const handleSyncNow = async () => {
    if (!window.gone?.sync) return
    setIsLoading(true)
    setActionMessage('Đang tiến hành đồng bộ hai chiều...')
    try {
      const res = await window.gone.sync.triggerNow()
      setActionMessage(res.message || 'Đồng bộ hoàn tất')
      await loadData()
      onAccountsChanged()
    } catch (err: any) {
      setActionMessage(`Đồng bộ thất bại: ${err.message}`)
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
              <h3 className="text-sm font-semibold text-primary">Quản lý Tài khoản & Đồng bộ</h3>
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
                <span>Trạng thái đồng bộ</span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-muted">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {syncStatus?.lastSyncTime
                    ? `Lần cuối: ${new Date(syncStatus.lastSyncTime).toLocaleTimeString()}`
                    : 'Chưa đồng bộ'}
                </span>
                {syncStatus && syncStatus.pendingPushesCount > 0 && (
                  <span className="text-amber-500 dark:text-amber-400 font-mono">
                    ({syncStatus.pendingPushesCount} thay đổi offline chờ đẩy)
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
              <span>Đồng bộ ngay</span>
            </button>
          </div>

          {/* Accounts List — hover rows, no bordered mini-cards */}
          <div>
            <p className="text-xs text-muted mb-2">
              Tài khoản đã liên kết ({accounts.length})
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
                        title="Ngắt kết nối tài khoản"
                        style={{ borderRadius: 'var(--radius-control)' }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {acc.type === 'local' && (
                      <span className="text-[11px] text-muted font-medium px-2 py-1 bg-hover"
                        style={{ borderRadius: 'var(--radius-control)' }}>
                        Mặc định
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
              <span>Kết nối Google Calendar (OAuth 2.0)</span>
            </button>

            <button
              onClick={handleConnectMicrosoft}
              disabled={isLoading}
              className="gc-btn w-full justify-center disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              <span>Kết nối Microsoft 365 / Outlook (OAuth 2.0)</span>
            </button>

            <button
              onClick={() => setIsCalDavModalOpen(true)}
              disabled={isLoading}
              className="gc-btn w-full justify-center disabled:opacity-50"
            >
              <Server className="h-4 w-4" />
              <span>Kết nối CalDAV (Nextcloud / iCloud / Synology)</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-hairline flex justify-end">
          <button onClick={onClose} className="gc-btn">
            Đóng
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
