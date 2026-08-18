import React, { useState, useEffect } from 'react'
import {
  Users,
  Plus,
  RotateCw,
  Trash2,
  X,
  Clock,
  ShieldCheck
} from 'lucide-react'
import type { CalendarAccount, SyncStatus } from '@shared/event-model'

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

  const handleDisconnect = async (acc: CalendarAccount) => {
    if (!confirm(`Bạn có chắc chắn muốn ngắt kết nối tài khoản "${acc.name}"?`)) return
    if (!window.gone?.auth) return

    try {
      await window.gone.auth.disconnectGoogle(acc.id)
      await loadData()
      onAccountsChanged()
    } catch (err: any) {
      alert(`Lỗi ngắt kết nối: ${err.message}`)
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
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Quản lý Tài khoản & Đồng bộ</h3>
              <p className="text-[11px] text-slate-400">Google Calendar, Offline Queue & OS Reminders</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {actionMessage && (
            <div className="p-3 bg-indigo-600/20 border border-indigo-500/40 rounded-xl text-indigo-200 text-xs flex items-center justify-between">
              <span>{actionMessage}</span>
              <button onClick={() => setActionMessage(null)}>
                <X className="h-3.5 w-3.5 text-indigo-300" />
              </button>
            </div>
          )}

          {/* Sync Status Banner */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-slate-200 font-semibold">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Trạng thái đồng bộ</span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {syncStatus?.lastSyncTime
                    ? `Lần cuối: ${new Date(syncStatus.lastSyncTime).toLocaleTimeString()}`
                    : 'Chưa đồng bộ'}
                </span>
                {syncStatus && syncStatus.pendingPushesCount > 0 && (
                  <span className="text-amber-400 font-mono">
                    ({syncStatus.pendingPushesCount} thay đổi offline chờ đẩy)
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={handleSyncNow}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-lg border border-slate-700 font-medium transition-colors"
            >
              <RotateCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Đồng bộ ngay</span>
            </button>
          </div>

          {/* Accounts List */}
          <div>
            <label className="block text-slate-400 font-semibold mb-2.5 uppercase tracking-wider text-[10px]">
              Tài khoản đã liên kết ({accounts.length})
            </label>

            <div className="space-y-2">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-slate-200 uppercase">
                      {acc.type === 'google' ? 'G' : 'L'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-200">{acc.name}</span>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                            acc.type === 'google'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                          }`}
                        >
                          {acc.type.toUpperCase()}
                        </span>
                      </div>
                      {acc.email && (
                        <span className="text-[11px] text-slate-400 font-mono">{acc.email}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {acc.type === 'google' && (
                      <button
                        onClick={() => handleDisconnect(acc)}
                        className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Ngắt kết nối tài khoản"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                    {acc.type === 'local' && (
                      <span className="text-[11px] text-slate-500 font-medium px-2 py-1 bg-slate-900 rounded-md">
                        Mặc định
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add Provider Options */}
          <div className="pt-2">
            <button
              onClick={handleConnectGoogle}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-semibold shadow-lg shadow-rose-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              <span>Kết nối Google Calendar (OAuth 2.0)</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
          >
            Đóng (Close)
          </button>
        </div>
      </div>
    </div>
  )
}

export default AccountManagerModal
