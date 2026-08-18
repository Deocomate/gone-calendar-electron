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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Server className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Kết nối CalDAV</h3>
              <p className="text-[11px] text-slate-400">Nextcloud, Apple iCloud, Synology & Generic</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Provider Tabs */}
        <div className="px-6 pt-4 pb-2 bg-slate-950/40 border-b border-slate-800/60">
          <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => handleProviderSelect('nextcloud')}
              className={`flex flex-col items-center gap-1 py-2 px-1 text-[11px] font-semibold rounded-lg transition-all ${
                provider === 'nextcloud'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Cloud className="h-4 w-4" />
              <span>Nextcloud</span>
            </button>

            <button
              type="button"
              onClick={() => handleProviderSelect('icloud')}
              className={`flex flex-col items-center gap-1 py-2 px-1 text-[11px] font-semibold rounded-lg transition-all ${
                provider === 'icloud'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Calendar className="h-4 w-4" />
              <span>iCloud</span>
            </button>

            <button
              type="button"
              onClick={() => handleProviderSelect('synology')}
              className={`flex flex-col items-center gap-1 py-2 px-1 text-[11px] font-semibold rounded-lg transition-all ${
                provider === 'synology'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <HardDrive className="h-4 w-4" />
              <span>Synology</span>
            </button>

            <button
              type="button"
              onClick={() => handleProviderSelect('generic')}
              className={`flex flex-col items-center gap-1 py-2 px-1 text-[11px] font-semibold rounded-lg transition-all ${
                provider === 'generic'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
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
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* iCloud Guidance Banner */}
          {provider === 'icloud' && (
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                <Info className="h-3.5 w-3.5 text-sky-400" />
                <span>Yêu cầu Mật khẩu dành riêng cho ứng dụng</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Đăng nhập vào <span className="font-mono text-sky-400">appleid.apple.com</span> &gt; Đăng nhập và Bảo mật &gt; Mật khẩu Dành riêng cho Ứng dụng để tạo mật khẩu.
              </p>
            </div>
          )}

          {provider !== 'icloud' && (
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                Địa chỉ máy chủ CalDAV (URL) <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="https://cloud.example.com/remote.php/dav"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-hidden focus:border-indigo-500"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">
              {provider === 'icloud' ? 'Tài khoản Apple ID (Email)' : 'Tên đăng nhập (Username)'}{' '}
              <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={provider === 'icloud' ? 'user@icloud.com' : 'username'}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-hidden focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">
              {provider === 'icloud' ? 'Mật khẩu dành riêng (App-Specific Password)' : 'Mật khẩu'}{' '}
              <span className="text-rose-400">*</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-hidden focus:border-indigo-500 font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">
              Tên hiển thị tài khoản
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Tên tài khoản trong Gone Calendar"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div className="pt-3">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold shadow-lg shadow-emerald-600/20 transition-colors"
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
