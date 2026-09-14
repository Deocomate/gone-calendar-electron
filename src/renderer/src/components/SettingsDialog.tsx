import React from 'react'
import { useTranslation } from 'react-i18next'
import {
  X,
  Users,
  SlidersHorizontal,
  Palette,
  CalendarRange,
  CalendarDays
} from 'lucide-react'
import type { Calendar } from '@shared/event-model'
import type { ThemeConfig, ThemeMode } from '@shared/theme-mode'
import type { DisplayPreferences } from '../context/DisplayPreferencesContext'
import { NumberInput, CustomSelect } from './ui'
import AppearanceSettings from './AppearanceSettings'
import HolidayCalendarToggle from './HolidayCalendarToggle'
import { CALENDAR_COLOR_PALETTE } from '../lib/calendar-colors'

export type SettingsTab = 'general' | 'appearance' | 'view' | 'calendars'

export const SETTINGS_TABS: { id: SettingsTab; icon: typeof SlidersHorizontal }[] = [
  { id: 'general', icon: SlidersHorizontal },
  { id: 'appearance', icon: Palette },
  { id: 'view', icon: CalendarRange },
  { id: 'calendars', icon: CalendarDays }
]

interface SettingsDialogProps {
  isOpen: boolean
  tab: SettingsTab
  onTabChange: (tab: SettingsTab) => void
  onClose: () => void

  language: string
  onToggleLanguage: () => void
  showLunar: boolean
  onToggleLunar: (next: boolean) => void
  showWeekNumbers: boolean
  onToggleWeekNumbers: (next: boolean) => void
  showMiniCalendar: boolean
  onToggleMiniCalendar: (next: boolean) => void
  timeFormat: DisplayPreferences['timeFormat']
  onChangeTimeFormat: (next: DisplayPreferences['timeFormat']) => void

  themeMode: ThemeMode
  onSetThemeMode: (mode: ThemeMode) => void
  onThemeChanged: (theme: ThemeConfig) => void

  dayStartHour: number
  onChangeDayStartHour: (next: number) => void
  hourBlockSize: DisplayPreferences['hourBlockSize']
  onChangeHourBlockSize: (next: DisplayPreferences['hourBlockSize']) => void
  secondaryTimezone: string
  onChangeSecondaryTimezone: (next: string) => void
  timezoneNames: string[]
  autoHideHeader: boolean
  onToggleAutoHideHeader: (next: boolean) => void

  calendars: Calendar[]
  colorPickerCalId: string | null
  onColorPickerToggle: (id: string | null) => void
  onToggleCalendarVisibility: (cal: Calendar) => void
  onChangeCalendarColor: (cal: Calendar, hex: string) => void
  onCalendarsChanged: () => void
  onManageAccounts: () => void

  appVersion: string
  platform: string
}

/** One labelled setting on its own row. Keeps every tab visually consistent. */
const Row: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({
  label,
  hint,
  children
}) => (
  <div className="flex items-center justify-between gap-4 border-b border-hairline py-2.5 last:border-b-0">
    <div className="min-w-0">
      <div className="text-sm text-primary">{label}</div>
      {hint && <div className="mt-0.5 text-xs text-muted">{hint}</div>}
    </div>
    <div className="shrink-0">{children}</div>
  </div>
)

const Toggle: React.FC<{ on: boolean; onChange: (next: boolean) => void }> = ({ on, onChange }) => {
  const { t } = useTranslation()
  return (
    <button type="button" className={on ? 'gc-btn-primary' : 'gc-btn'} onClick={() => onChange(!on)}>
      {on ? t('common.on') : t('common.off')}
    </button>
  )
}

export const SettingsDialog: React.FC<SettingsDialogProps> = (props) => {
  const { t } = useTranslation()
  if (!props.isOpen) return null

  return (
    <div className="gc-overlay" onMouseDown={props.onClose}>
      {/* max-h on the shell plus a min-h-0 scroll body: the previous dialog was
          max-h-[90vh] with overflow-hidden and no inner scroller, so any content
          past the fold was clipped and simply unreachable. */}
      <div
        className="gc-dialog w-full max-w-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-hairline px-4 py-3">
          <h3 className="text-sm font-semibold text-primary">{t('settings.title')}</h3>
          <button type="button" onClick={props.onClose} className="gc-icon-btn">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex min-h-0 flex-1">
          {/* Vertical rail: four tabs read better stacked than crowded into a
              horizontal strip, and it leaves room for more later. */}
          <nav className="w-40 shrink-0 overflow-y-auto border-r border-hairline p-2">
            {SETTINGS_TABS.map(({ id, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => props.onTabChange(id)}
                className={`mb-0.5 flex w-full items-center gap-2 rounded-[3px] px-2 py-1.5 text-left text-xs transition-colors ${
                  props.tab === id
                    ? 'bg-hover font-medium text-primary'
                    : 'text-muted hover:bg-hover hover:text-primary'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  {t(`settings.tab${id[0].toUpperCase()}${id.slice(1)}`)}
                </span>
              </button>
            ))}
          </nav>

          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto px-5 py-4">
            {props.tab === 'general' && (
              <div>
                <Row label={t('settings.language')}>
                  <button type="button" className="gc-btn" onClick={props.onToggleLanguage}>
                    {props.language === 'vi' ? 'Tiếng Việt' : 'English'}
                  </button>
                </Row>
                <Row label={t('settings.timeFormat')}>
                  <div className="flex gap-1">
                    {(['24h', '12h'] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        className={props.timeFormat === opt ? 'gc-btn-primary' : 'gc-btn'}
                        onClick={() => props.onChangeTimeFormat(opt)}
                      >
                        {opt === '24h' ? t('settings.timeFormat24h') : t('settings.timeFormat12h')}
                      </button>
                    ))}
                  </div>
                </Row>
                <Row label={t('settings.lunar')}>
                  <Toggle on={props.showLunar} onChange={props.onToggleLunar} />
                </Row>
                <Row label={t('settings.weekNumbers')}>
                  <Toggle on={props.showWeekNumbers} onChange={props.onToggleWeekNumbers} />
                </Row>
                <Row label={t('settings.showMiniCalendar')}>
                  <Toggle on={props.showMiniCalendar} onChange={props.onToggleMiniCalendar} />
                </Row>
                <Row label={t('settings.version')}>
                  <span className="font-mono text-xs text-muted">
                    v{props.appVersion} ({props.platform})
                  </span>
                </Row>
              </div>
            )}

            {props.tab === 'appearance' && (
              <AppearanceSettings
                mode={props.themeMode}
                onSetMode={props.onSetThemeMode}
                onThemeChanged={props.onThemeChanged}
              />
            )}

            {props.tab === 'view' && (
              <div>
                <Row label={t('settings.dayStartHour')} hint={t('settings.dayStartHourHint')}>
                  <NumberInput
                    value={props.dayStartHour}
                    onChange={(v) =>
                      props.onChangeDayStartHour(Math.max(0, Math.min(23, Math.round(v))))
                    }
                    min={0}
                    max={23}
                    suffix="h"
                  />
                </Row>
                <Row label={t('settings.hourBlockSize')}>
                  <div className="flex gap-1">
                    {(['small', 'medium', 'large'] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        className={props.hourBlockSize === opt ? 'gc-btn-primary' : 'gc-btn'}
                        onClick={() => props.onChangeHourBlockSize(opt)}
                      >
                        {t(`settings.hourBlockSize${opt[0].toUpperCase()}${opt.slice(1)}`)}
                      </button>
                    ))}
                  </div>
                </Row>
                <Row
                  label={t('settings.secondaryTimezone')}
                  hint={t('settings.secondaryTimezoneHint')}
                >
                  <div className="w-52">
                    <CustomSelect
                      value={props.secondaryTimezone}
                      onChange={props.onChangeSecondaryTimezone}
                      searchable
                      placeholder={t('settings.secondaryTimezoneNone')}
                      options={[
                        { value: '', label: t('settings.secondaryTimezoneNone') },
                        ...props.timezoneNames.map((tz) => ({
                          value: tz,
                          label: tz.replace(/_/g, ' ')
                        }))
                      ]}
                    />
                  </div>
                </Row>
                <Row label={t('settings.autoHideHeader')}>
                  <Toggle on={props.autoHideHeader} onChange={props.onToggleAutoHideHeader} />
                </Row>
              </div>
            )}

            {props.tab === 'calendars' && (
              <div className="space-y-4">
                <div>
                  <div className="mb-1 text-xs font-medium text-muted">
                    {t('settings.myCalendars')}
                  </div>
                  {props.calendars.length > 0 ? (
                    props.calendars.map((cal) => (
                      <div
                        key={cal.id}
                        className="relative flex items-center gap-2 rounded-[3px] px-1 py-1.5 text-xs text-primary transition-colors hover:bg-hover"
                      >
                        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            checked={cal.isVisible}
                            onChange={() => props.onToggleCalendarVisibility(cal)}
                            className="h-3.5 w-3.5 cursor-pointer rounded-[3px] accent-accent"
                          />
                          <button
                            type="button"
                            title={t('settings.changeColor')}
                            onClick={(e) => {
                              e.preventDefault()
                              props.onColorPickerToggle(
                                props.colorPickerCalId === cal.id ? null : cal.id
                              )
                            }}
                            className="h-2.5 w-2.5 shrink-0 cursor-pointer rounded-full ring-offset-1 transition-all hover:ring-2 hover:ring-hairline"
                            style={{ backgroundColor: cal.color }}
                          />
                          <span className="flex-1 truncate font-medium">{cal.name}</span>
                        </label>
                        {cal.isReadOnly && (
                          <span className="rounded-[3px] bg-hover px-1.5 py-0.5 text-[9px] font-medium text-muted">
                            {t('common.readOnlyShort')}
                          </span>
                        )}

                        {props.colorPickerCalId === cal.id && (
                          <div
                            className="absolute top-full left-0 z-20 mt-1 grid grid-cols-8 gap-1.5 border border-hairline bg-surface p-2 shadow-lg"
                            style={{ borderRadius: 'var(--radius-control)' }}
                          >
                            {CALENDAR_COLOR_PALETTE.map((hex) => {
                              const usedByOther = props.calendars.some(
                                (other) =>
                                  other.id !== cal.id &&
                                  other.color?.toLowerCase() === hex.toLowerCase()
                              )
                              return (
                                <button
                                  key={hex}
                                  type="button"
                                  onClick={() => props.onChangeCalendarColor(cal, hex)}
                                  className="relative h-5 w-5 shrink-0 cursor-pointer rounded-full transition-transform hover:scale-110"
                                  style={{
                                    backgroundColor: hex,
                                    outline:
                                      cal.color === hex ? '2px solid var(--color-border)' : 'none',
                                    outlineOffset: '1px'
                                  }}
                                  title={usedByOther ? `${hex} (${t('settings.colorInUse')})` : hex}
                                >
                                  {usedByOther && (
                                    <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full border border-hairline bg-surface" />
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="px-1 py-1.5 text-xs text-muted">{t('settings.noCalendars')}</div>
                  )}
                </div>

                <HolidayCalendarToggle
                  calendars={props.calendars}
                  onCalendarsChanged={props.onCalendarsChanged}
                />

                <button
                  type="button"
                  className="gc-btn w-full justify-center"
                  onClick={props.onManageAccounts}
                >
                  <Users className="h-4 w-4" />
                  <span>{t('settings.manageAccounts')}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <footer className="flex shrink-0 justify-end border-t border-hairline px-4 py-3">
          <button type="button" className="gc-btn-primary" onClick={props.onClose}>
            {t('common.close')}
          </button>
        </footer>
      </div>
    </div>
  )
}

export default SettingsDialog
