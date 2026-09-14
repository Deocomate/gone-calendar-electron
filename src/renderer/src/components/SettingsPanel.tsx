import React from 'react'
import { useTranslation } from 'react-i18next'
import {
  X,
  Users,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Palette,
  CalendarRange,
  CalendarDays,
  Keyboard,
  AlertTriangle,
  Sun,
  Moon,
  Monitor,
  Globe,
  HardDriveDownload
} from 'lucide-react'
import type { Calendar } from '@shared/event-model'
import type { ThemeConfig, ThemeMode } from '@shared/theme-mode'
import type { DisplayPreferences } from '../context/DisplayPreferencesContext'
import { NumberInput, CustomSelect, toast } from './ui'
import AppearanceSettings from './AppearanceSettings'
import HolidayCalendarToggle from './HolidayCalendarToggle'
import { CALENDAR_COLOR_PALETTE } from '../lib/calendar-colors'

/** `null` is the panel's root list; anything else is the one level below it. */
export type SettingsSection = 'general' | 'appearance' | 'view' | 'calendars'

const SECTIONS: { id: SettingsSection; icon: typeof SlidersHorizontal }[] = [
  { id: 'appearance', icon: Palette },
  { id: 'general', icon: SlidersHorizontal },
  { id: 'view', icon: CalendarRange },
  { id: 'calendars', icon: CalendarDays }
]

interface SettingsPanelProps {
  isOpen: boolean
  section: SettingsSection | null
  onSectionChange: (section: SettingsSection | null) => void
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

  onOpenShortcuts: () => void
  conflictCount?: number
  onOpenConflicts?: () => void

  appVersion: string
  platform: string
}

/** One labelled control. Consistent rhythm across every section. */
const Row: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({
  label,
  hint,
  children
}) => (
  <div className="flex items-start justify-between gap-3 border-b border-hairline py-3 last:border-b-0">
    <div className="min-w-0 pt-0.5">
      <div className="text-sm text-primary">{label}</div>
      {hint && <div className="mt-0.5 text-xs leading-snug text-muted">{hint}</div>}
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

export const SettingsPanel: React.FC<SettingsPanelProps> = (props) => {
  const { t } = useTranslation()
  if (!props.isOpen) return null

  const atRoot = props.section === null

  return (
    // Same presentation as the event editor's side panel: a light scrim with the
    // sheet sliding in from the right, rather than a centred modal.
    <div className="fixed inset-0 z-50 select-none bg-black/10" onMouseDown={props.onClose}>
      <div
        className="gc-slide-right absolute top-0 right-0 flex h-full w-full max-w-[400px] flex-col overflow-hidden border-l border-hairline bg-surface text-primary shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center gap-1 border-b border-hairline px-2 py-2.5">
          {!atRoot && (
            <button
              type="button"
              className="gc-icon-btn"
              onClick={() => props.onSectionChange(null)}
              aria-label={t('common.back')}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          <h3 className={`flex-1 truncate text-sm font-semibold ${atRoot ? 'px-2' : ''}`}>
            {atRoot
              ? t('settings.title')
              : t(`settings.tab${props.section![0].toUpperCase()}${props.section!.slice(1)}`)}
          </h3>
          <button type="button" onClick={props.onClose} className="gc-icon-btn">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {atRoot ? (
            <div className="p-2">
              {props.conflictCount ? (
                <button
                  type="button"
                  className="mb-1 flex w-full items-center gap-2.5 rounded-[3px] px-2.5 py-2.5 text-left text-sm text-primary transition-colors hover:bg-hover"
                  onClick={() => {
                    props.onOpenConflicts?.()
                    props.onClose()
                  }}
                >
                  <AlertTriangle className="h-4 w-4 shrink-0 text-today" />
                  <span className="flex-1 truncate">
                    {t('sync.conflictsMenuItem', { count: props.conflictCount })}
                  </span>
                </button>
              ) : null}

              {SECTIONS.map(({ id, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => props.onSectionChange(id)}
                  className="flex w-full items-center gap-2.5 rounded-[3px] px-2.5 py-2.5 text-left text-sm text-primary transition-colors hover:bg-hover"
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted" />
                  <span className="flex-1 truncate">
                    {t(`settings.tab${id[0].toUpperCase()}${id.slice(1)}`)}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted" />
                </button>
              ))}

              <div className="my-2 border-t border-hairline" />

              {/* Quick toggles - the things worth reaching without drilling in. */}
              <div className="flex items-center gap-1 px-2.5 py-2">
                <span className="mr-auto text-sm text-primary">{t('settings.theme')}</span>
                {(
                  [
                    { id: 'light' as const, icon: Sun },
                    { id: 'dark' as const, icon: Moon },
                    { id: 'system' as const, icon: Monitor }
                  ] as const
                ).map(({ id, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    title={t(`settings.themeMode${id[0].toUpperCase()}${id.slice(1)}`)}
                    className={`rounded-[3px] p-1.5 transition-colors ${
                      props.themeMode === id
                        ? 'bg-hover text-primary'
                        : 'text-muted hover:text-primary'
                    }`}
                    onClick={() => props.onSetThemeMode(id)}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="flex w-full items-center gap-2.5 rounded-[3px] px-2.5 py-2.5 text-left text-sm text-primary transition-colors hover:bg-hover"
                onClick={props.onToggleLanguage}
              >
                <Globe className="h-4 w-4 shrink-0 text-muted" />
                <span className="flex-1 truncate">{t('settings.language')}</span>
                <span className="shrink-0 text-xs text-muted">
                  {props.language === 'vi' ? 'Tiếng Việt' : 'English'}
                </span>
              </button>

              <button
                type="button"
                className="flex w-full items-center gap-2.5 rounded-[3px] px-2.5 py-2.5 text-left text-sm text-primary transition-colors hover:bg-hover"
                onClick={() => {
                  props.onOpenShortcuts()
                  props.onClose()
                }}
              >
                <Keyboard className="h-4 w-4 shrink-0 text-muted" />
                <span className="flex-1 truncate">{t('actions.keyboard')}</span>
              </button>

              <button
                type="button"
                className="flex w-full items-center gap-2.5 rounded-[3px] px-2.5 py-2.5 text-left text-sm text-primary transition-colors hover:bg-hover"
                onClick={async () => {
                  const result = await window.gone?.app?.backupDatabase?.()
                  if (!result) return
                  if (result.success) {
                    toast.success(t('settings.backupDone'), { description: result.filePath })
                  } else if (result.message && result.message !== 'cancelled') {
                    toast.error(t('settings.backupFailed'), { description: result.message })
                  }
                }}
              >
                <HardDriveDownload className="h-4 w-4 shrink-0 text-muted" />
                <span className="flex-1 truncate">{t('settings.backup')}</span>
              </button>

              <div className="px-2.5 pt-3 pb-1 font-mono text-[11px] text-muted">
                v{props.appVersion} ({props.platform})
              </div>
            </div>
          ) : (
            <div className="px-4 py-2">
              {props.section === 'general' && (
                <div>
                  <Row label={t('settings.timeFormat')}>
                    <div className="flex gap-1">
                      {(['24h', '12h'] as const).map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          className={props.timeFormat === opt ? 'gc-btn-primary' : 'gc-btn'}
                          onClick={() => props.onChangeTimeFormat(opt)}
                        >
                          {opt === '24h'
                            ? t('settings.timeFormat24h')
                            : t('settings.timeFormat12h')}
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
                </div>
              )}

              {props.section === 'appearance' && (
                <div className="py-2">
                  <AppearanceSettings
                    mode={props.themeMode}
                    onSetMode={props.onSetThemeMode}
                    onThemeChanged={props.onThemeChanged}
                  />
                </div>
              )}

              {props.section === 'view' && (
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
                  <Row label={t('settings.autoHideHeader')}>
                    <Toggle on={props.autoHideHeader} onChange={props.onToggleAutoHideHeader} />
                  </Row>
                  {/* Full width: a searchable zone list needs the room. */}
                  <div className="border-b border-hairline py-3 last:border-b-0">
                    <div className="text-sm text-primary">{t('settings.secondaryTimezone')}</div>
                    <div className="mt-0.5 mb-2 text-xs leading-snug text-muted">
                      {t('settings.secondaryTimezoneHint')}
                    </div>
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
                </div>
              )}

              {props.section === 'calendars' && (
                <div className="space-y-4 py-2">
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
                              className="absolute top-full right-0 z-20 mt-1 grid grid-cols-8 gap-1.5 border border-hairline bg-surface p-2 shadow-lg"
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
                                        cal.color === hex
                                          ? '2px solid var(--color-border)'
                                          : 'none',
                                      outlineOffset: '1px'
                                    }}
                                    title={
                                      usedByOther ? `${hex} (${t('settings.colorInUse')})` : hex
                                    }
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
                      <div className="px-1 py-1.5 text-xs text-muted">
                        {t('settings.noCalendars')}
                      </div>
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
          )}
        </div>
      </div>
    </div>
  )
}

export default SettingsPanel
