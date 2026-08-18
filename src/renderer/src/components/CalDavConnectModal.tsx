import React, { useState } from 'react'
import {
  Calendar,
  X,
  Server,
  Cloud,
  HardDrive,
  Globe,
  Info,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react'
import type { ConnectCalDavInput } from '@shared/ipc-contract'
import { TextInput } from './ui'

interface CalDavConnectModalProps {
  isOpen: boolean
  onClose: () => void
  onConnected: () => void
}

type ProviderType = 'nextcloud' | 'icloud' | 'synology' | 'generic'

export const CalDavConnectModal: React.FC<CalDavConnectModalProps> = ({
  isOpen,
  onClose,
  onConnected
}) => {
  const [provider, setProvider] = useState<ProviderType>('nextcloud')
  const [serverUrl, setServerUrl] = useState<string>('')
  const [username, setUsername] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [displayName, setDisplayName] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  if (!isOpen) return null

  const handleProviderSelect = (p: ProviderType) => {
    setProvider(p)
    setErrorMsg(null)
    setSuccessMsg(null)

    if (p === 'icloud') {
      setServerUrl('https://caldav.icloud.com')
      if (!displayName) setDisplayName('iCloud Calendar')
    } else if (p === 'nextcloud') {
      setServerUrl('https://cloud.example.com/remote.php/dav')
      if (!displayName) setDisplayName('Nextcloud Calendar')
    } else if (p === 'synology') {
      setServerUrl('https://synology.local:5001/caldav')
      if (!displayName) setDisplayName('Synology Calendar')
    } else {
      setServerUrl('https://caldav.example.com')
      if (!displayName) setDisplayName('Custom CalDAV')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      setErrorMsg('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.')
      return
    }

    if (provider !== 'icloud' && !serverUrl.trim()) {
      setErrorMsg('Vui lòng nhập địa chỉ máy chủ CalDAV.')
      return
    }

    if (!window.gone?.auth?.connectCalDav) {
      setErrorMsg('API CalDAV không khả dụng.')
      return
    }

    setIsLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      const input: ConnectCalDavInput = {
        provider,
        serverUrl: provider === 'icloud' ? undefined : serverUrl.trim(),
        username: username.trim(),
        password: password.trim(),
        name: displayName.trim() || `${provider.toUpperCase()} (${username.trim()})`
      }

      const res = await window.gone.auth.connectCalDav(input)

      if (res.success) {
        setSuccessMsg('✓ Kết nối CalDAV thành công!')
        setTimeout(() => {
          onConnected()
          onClose()
        }, 1200)
      } else {
        setErrorMsg(`Kết nối thất bại: ${res.message}`)
      }
    } catch (err: any) {
      setErrorMsg(`Lỗi kết nối: ${err.message || String(err)}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="gc-overlay select-none">
      <div className="gc-dialog w-full max-w-md max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Server className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Kết nối CalDAV</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Nextcloud, Apple iCloud, Synology & Generic</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Provider Tabs */}
        <div className="px-6 pt-4 pb-2 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800/60">
          <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => handleProviderSelect('nextcloud')}
              className={`flex flex-col items-center gap-1 py-2 px-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                provider === 'nextcloud'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50'
              }`}
            >
              <Cloud className="h-4 w-4" />
              <span>Nextcloud</span>
            </button>

            <button
              type="button"
              onClick={() => handleProviderSelect('icloud')}
              className={`flex flex-col items-center gap-1 py-2 px-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                provider === 'icloud'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50'
              }`}
            >
              <Calendar className="h-4 w-4" />
              <span>iCloud</span>
            </button>

            <button
              type="button"
              onClick={() => handleProviderSelect('synology')}
              className={`flex flex-col items-center gap-1 py-2 px-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                provider === 'synology'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50'
              }`}
            >
              <HardDrive className="h-4 w-4" />
              <span>Synology</span>
            </button>

            <button
              type="button"
              onClick={() => handleProviderSelect('generic')}
              className={`flex flex-col items-center gap-1 py-2 px-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                provider === 'generic'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50'
              }`}
            >
              <Globe className="h-4 w-4" />
              <span>Tùy chỉnh</span>
            </button>
          </div>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500 dark:text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-600 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 dark:text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* iCloud Guidance Banner */}
          {provider === 'icloud' && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                <Info className="h-3.5 w-3.5 text-sky-500 dark:text-sky-400" />
                <span>Yêu cầu Mật khẩu dành riêng cho ứng dụng</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Đăng nhập vào <span className="font-mono text-sky-600 dark:text-sky-400">appleid.apple.com</span> &gt; Đăng nhập và Bảo mật &gt; Mật khẩu Dành riêng cho Ứng dụng để tạo mật khẩu.
              </p>
            </div>
          )}

          {provider !== 'icloud' && (
            <div>
              <TextInput
                label="Địa chỉ máy chủ CalDAV (URL)"
                required
                value={serverUrl}
                onChange={setServerUrl}
                placeholder="https://cloud.example.com/remote.php/dav"
                prefixIcon={<Server className="h-3.5 w-3.5" />}
              />
            </div>
          )}

          <div>
            <TextInput
              label={provider === 'icloud' ? 'Tài khoản Apple ID (Email)' : 'Tên đăng nhập (Username)'}
              required
              value={username}
              onChange={setUsername}
              placeholder={provider === 'icloud' ? 'user@icloud.com' : 'username'}
              prefixIcon={<Globe className="h-3.5 w-3.5" />}
            />
          </div>

          <div>
            <TextInput
              label={provider === 'icloud' ? 'Mật khẩu dành riêng (App-Specific Password)' : 'Mật khẩu'}
              type="password"
              required
              value={password}
              onChange={setPassword}
              placeholder="••••••••••••"
            />
          </div>

          <div>
            <TextInput
              label="Tên hiển thị tài khoản"
              value={displayName}
              onChange={setDisplayName}
              placeholder="Tên tài khoản trong Gone Calendar"
              prefixIcon={<Calendar className="h-3.5 w-3.5" />}
            />
          </div>

          <div className="pt-3">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold shadow-lg shadow-emerald-600/20 transition-colors cursor-pointer"
            >
              {isLoading ? 'Đang kiểm tra kết nối...' : 'Xác thực & Kết nối CalDAV'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CalDavConnectModal
