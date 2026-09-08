import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ExternalLink, Pin, PinOff, Clock, MapPin, RotateCw } from 'lucide-react'
import { DateTime } from 'luxon'
import type { ExpandedOccurrence } from '@shared/event-model'
import { applyDocumentTheme, shouldUseDarkClass, type ThemeMode } from '@shared/theme-mode'
import { DEFAULT_APP_SETTINGS } from '@shared/settings-contract'
import { formatClockTime, type TimeFormatPref } from '@shared/time-format'
import i18n from '../i18n'

export const MiniApp: React.FC = () => {
  const { t } = useTranslation()
  const [occurrences, setOccurrences] = useState<ExpandedOccurrence[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState<boolean>(true)
  const [timeFormat, setTimeFormat] = useState<TimeFormatPref>(DEFAULT_APP_SETTINGS.timeFormat)

  const loadData = async () => {
    setIsLoading(true)
    try {
      if (window.gone?.mini?.getUpcoming) {
        const res = await window.gone.mini.getUpcoming(15)
        setOccurrences(res.occurrences || [])
      }
    } catch (err) {
      console.error('Failed to load mini window data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 60000)
    const loadTheme = async () => {
      try {
        const settings = await window.gone?.settings?.getAll()
        const mode = ((settings?.theme as ThemeMode) || DEFAULT_APP_SETTINGS.theme) as ThemeMode
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        applyDocumentTheme(shouldUseDarkClass(mode, prefersDark))
        const loc = settings?.locale === 'vi' || settings?.locale === 'en' ? settings.locale : 'en'
        if (loc !== i18n.language) await i18n.changeLanguage(loc)
        setTimeFormat((settings?.timeFormat as TimeFormatPref) || DEFAULT_APP_SETTINGS.timeFormat)
      } catch {
        applyDocumentTheme(false)
      }
    }
    loadTheme()
    return () => clearInterval(interval)
  }, [])

  const handleToggleAlwaysOnTop = async () => {
    if (window.gone?.mini?.setAlwaysOnTop) {
      const next = !isAlwaysOnTop
      const res = await window.gone.mini.setAlwaysOnTop(next)
      setIsAlwaysOnTop(res)
    }
  }

  const handleOpenMain = async () => {
    if (window.gone?.mini?.openMain) {
      await window.gone.mini.openMain()
    }
  }

  const formatEventTime = (occ: ExpandedOccurrence) => {
    const start = DateTime.fromISO(occ.startUtc).setZone('local')
    if (occ.allDay) return t('mini.allDay')
    const end = DateTime.fromISO(occ.endUtc).setZone('local')
    return `${formatClockTime(start, timeFormat)} - ${formatClockTime(end, timeFormat)}`
  }

  const formatEventDateHeader = (dateStr: string) => {
    const dt = DateTime.fromISO(dateStr).setZone('local')
    const today = DateTime.local()
    if (dt.hasSame(today, 'day')) return `${t('mini.today')} (${dt.toFormat('dd/MM')})`
    if (dt.hasSame(today.plus({ days: 1 }), 'day'))
      return `${t('mini.tomorrow')} (${dt.toFormat('dd/MM')})`
    return dt.toFormat('EEEE, dd/MM')
  }

  const groupedEvents: { [key: string]: ExpandedOccurrence[] } = {}
  occurrences.forEach((occ) => {
    const dayKey = DateTime.fromISO(occ.startUtc).setZone('local').toISODate() || 'unknown'
    if (!groupedEvents[dayKey]) groupedEvents[dayKey] = []
    groupedEvents[dayKey].push(occ)
  })

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-app font-sans text-primary select-none">
      <div
        className="flex shrink-0 items-center justify-between border-b border-hairline bg-surface px-3.5 py-2.5"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-accent" />
          <span className="text-xs font-semibold">Gone Calendar</span>
        </div>

        <div
          className="flex items-center gap-1.5"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <button type="button" onClick={loadData} className="gc-icon-btn p-1" title={t('mini.refresh')}>
            <RotateCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={handleToggleAlwaysOnTop}
            className={`rounded-md p-1 ${isAlwaysOnTop ? 'bg-hover text-accent' : 'gc-icon-btn p-1'}`}
            title={isAlwaysOnTop ? t('mini.unpin') : t('mini.pin')}
          >
            {isAlwaysOnTop ? <Pin className="h-3.5 w-3.5" /> : <PinOff className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={handleOpenMain}
            className="gc-icon-btn p-1"
            title={t('mini.openMain')}
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {occurrences.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted">{t('mini.noUpcoming')}</div>
        ) : (
          <div className="space-y-3">
            {Object.entries(groupedEvents).map(([dayKey, dayOccs]) => (
              <div key={dayKey} className="space-y-1.5">
                <div className="px-1 text-[11px] font-semibold tracking-wider text-muted uppercase">
                  {formatEventDateHeader(dayKey)}
                </div>
                <div className="space-y-1">
                  {dayOccs.map((occ) => (
                    <div
                      key={`${occ.eventId}_${occ.startUtc}`}
                      onClick={handleOpenMain}
                      className="cursor-pointer space-y-0.5 rounded-lg border border-hairline bg-surface p-2 text-xs transition-all hover:bg-hover"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: occ.color || '#6366f1' }}
                        />
                        <span className="flex-1 truncate font-semibold text-primary">
                          {occ.title || t('mini.untitled')}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 pl-4 text-[10px] text-muted">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-500" />
                          {formatEventTime(occ)}
                        </span>
                        {occ.location && (
                          <span className="flex items-center gap-1 truncate max-w-[120px]">
                            <MapPin className="h-3 w-3 text-slate-500" />
                            <span className="truncate">{occ.location}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-between border-t border-hairline bg-surface px-3 py-2 text-[11px] text-muted">
        <span>{t('mini.events')}</span>
        <button
          type="button"
          onClick={handleOpenMain}
          className="flex items-center gap-1 font-semibold text-accent"
        >
          <span>{t('mini.openMain')}</span>
          <ExternalLink className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}

export default MiniApp
