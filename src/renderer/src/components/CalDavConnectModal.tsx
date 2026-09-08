import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Server,
  Cloud,
  HardDrive,
  Globe,
  Calendar,
  Info,
  X
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
  const { t } = useTranslation()
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
      setErrorMsg(t('caldav.needCredentials'))
      return
    }

    if (provider !== 'icloud' && !serverUrl.trim()) {
      setErrorMsg(t('caldav.needServer'))
      return
    }

    if (!window.gone?.auth?.connectCalDav) {
      setErrorMsg('CalDAV API ' + t('caldav.unavailable'))
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
        setSuccessMsg(t('caldav.connected'))
        setTimeout(() => {
          onConnected()
          onClose()
        }, 1200)
      } else {
        setErrorMsg(t('caldav.failed', { msg: res.message }))
      }
    } catch (err: any) {
      setErrorMsg(t('caldav.errorPrefix', { msg: err.message || String(err) }))
    } finally {
      setIsLoading(false)
    }
  }

  const PROVIDERS = [
    { id: 'nextcloud' as ProviderType, label: 'Nextcloud', icon: <Cloud className="h-4 w-4" /> },
    { id: 'icloud' as ProviderType, label: 'iCloud', icon: <Calendar className="h-4 w-4" /> },
    { id: 'synology' as ProviderType, label: 'Synology', icon: <HardDrive className="h-4 w-4" /> },
    { id: 'generic' as ProviderType, label: 'Custom', icon: <Globe className="h-4 w-4" /> }
  ]

  return (
    <div className="gc-overlay select-none">
      <div className="gc-dialog w-full max-w-md max-h-[90vh]">
        {/* Header — plain title, no emerald icon box */}
        <div className="px-5 py-3 border-b border-hairline flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-muted" />
            <div>
              <h3 className="text-sm font-semibold text-primary">{t('caldav.title')}</h3>
              <p className="text-[11px] text-muted">Nextcloud, Apple iCloud, Synology & Generic</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="gc-icon-btn"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Provider Tabs — quiet segmented control: selected = bg-surface + hairline */}
        <div className="px-5 pt-4 pb-2 border-b border-hairline">
          <div
            className="grid grid-cols-4 gap-1 p-1 bg-hover"
            style={{ borderRadius: 'var(--radius-control)' }}
          >
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleProviderSelect(p.id)}
                className={`flex flex-col items-center gap-1 py-2 px-1 text-[11px] font-medium transition-colors cursor-pointer ${
                  provider === p.id
                    ? 'bg-surface border border-hairline text-primary shadow-sm'
                    : 'text-muted hover:text-primary'
                }`}
                style={{ borderRadius: 'var(--radius-control)' }}
              >
                {p.icon}
                <span>{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="px-5 py-4 overflow-y-auto space-y-3 flex-1 text-xs">
          {/* Error message — hairline row, no slab */}
          {errorMsg && (
            <div
              className="px-3 py-2 border border-today/40 text-today text-xs flex items-center gap-2"
              style={{ borderRadius: 'var(--radius-control)' }}
            >
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Success message */}
          {successMsg && (
            <div
              className="px-3 py-2 border border-hairline text-accent text-xs"
              style={{ borderRadius: 'var(--radius-control)' }}
            >
              {successMsg}
            </div>
          )}

          {/* iCloud Guidance */}
          {provider === 'icloud' && (
            <div
              className="p-3 border border-hairline bg-app text-primary space-y-1"
              style={{ borderRadius: 'var(--radius-control)' }}
            >
              <div className="flex items-center gap-1.5 font-semibold text-xs">
                <Info className="h-3.5 w-3.5 text-muted" />
                <span>{t('caldav.appPasswordRequired')}</span>
              </div>
              <p className="text-[11px] text-muted leading-relaxed">
                appleid.apple.com &gt; Sign-In and Security &gt; App-Specific Passwords
              </p>
            </div>
          )}

          {/* Boxed fields for settings-like layout */}
          {provider !== 'icloud' && (
            <TextInput
              label={t('caldav.serverUrl')}
              required
              variant="boxed"
              value={serverUrl}
              onChange={setServerUrl}
              placeholder="https://cloud.example.com/remote.php/dav"
              prefixIcon={<Server className="h-3.5 w-3.5" />}
            />
          )}

          <TextInput
            label={provider === 'icloud' ? t('caldav.appleId') : t('caldav.username')}
            required
            variant="boxed"
            value={username}
            onChange={setUsername}
            placeholder={provider === 'icloud' ? 'user@icloud.com' : 'username'}
            prefixIcon={<Globe className="h-3.5 w-3.5" />}
          />

          <TextInput
            label={provider === 'icloud' ? t('caldav.appPassword') : t('caldav.password')}
            type="password"
            required
            variant="boxed"
            value={password}
            onChange={setPassword}
            placeholder="••••••••••••"
          />

          <TextInput
            label={t('caldav.displayName')}
            variant="boxed"
            value={displayName}
            onChange={setDisplayName}
            placeholder={t('caldav.displayNameHint')}
            prefixIcon={<Calendar className="h-3.5 w-3.5" />}
          />

          {/* Submit — gc-btn-primary (accent), no emerald gradient */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="gc-btn-primary w-full py-2 disabled:opacity-50 cursor-pointer"
              style={{ borderRadius: 'var(--radius-control)' }}
            >
              {isLoading ? t('caldav.checking') : t('caldav.connect')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CalDavConnectModal
