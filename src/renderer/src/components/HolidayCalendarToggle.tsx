import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarHeart, Check, Loader2, ChevronDown, ChevronRight } from 'lucide-react'
import type { Calendar } from '@shared/event-model'
import { HOLIDAY_CALENDAR_META, type HolidayCalendarType } from '@shared/holiday-calendars'

interface HolidayCalendarToggleProps {
  calendars: Calendar[]
  onCalendarsChanged: () => void
}

export const HolidayCalendarToggle: React.FC<HolidayCalendarToggleProps> = ({
  calendars,
  onCalendarsChanged
}) => {
  const { t } = useTranslation()
  const [loadingType, setLoadingType] = useState<HolidayCalendarType | null>(null)
  const [isExpanded, setIsExpanded] = useState(true)

  const isVietnamSubscribed = calendars.some((c) => c.name === HOLIDAY_CALENDAR_META.vietnam.name)
  const isInternationalSubscribed = calendars.some(
    (c) => c.name === HOLIDAY_CALENDAR_META.international.name
  )

  const handleToggle = async (type: HolidayCalendarType) => {
    if (!window.gone?.holidays) return
    setLoadingType(type)

    try {
      const isSubscribed = type === 'vietnam' ? isVietnamSubscribed : isInternationalSubscribed
      if (isSubscribed) {
        await window.gone.holidays.unsubscribe(type)
      } else {
        await window.gone.holidays.subscribe(type)
      }
      onCalendarsChanged()
    } catch (err) {
      console.error(`Failed to toggle holiday calendar ${type}:`, err)
    } finally {
      setLoadingType(null)
    }
  }

  return (
    <div className="space-y-1.5 select-none">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-[11px] font-medium text-muted hover:text-primary transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <CalendarHeart className="h-3.5 w-3.5 text-muted" />
          {t('holidays.title')}
        </span>
        {isExpanded ? (
          <ChevronDown className="h-3 w-3 text-muted" />
        ) : (
          <ChevronRight className="h-3 w-3 text-muted" />
        )}
      </button>

      {isExpanded && (
        <div className="space-y-1 pt-0.5">
          {/* Vietnam Holidays */}
          <div
            onClick={() => handleToggle('vietnam')}
            className={`flex items-center justify-between px-2 py-1.5 rounded-[4px] border text-xs cursor-pointer transition-colors ${
              isVietnamSubscribed
                ? 'bg-accent/10 border-accent/30 text-primary'
                : 'bg-surface border-hairline text-muted hover:bg-hover hover:text-primary'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm shrink-0">🇻🇳</span>
              <span className="font-medium text-xs truncate">{t('holidays.vietnam')}</span>
            </div>

            <div className="shrink-0 flex items-center">
              {loadingType === 'vietnam' ? (
                <Loader2 className="h-3 w-3 text-accent animate-spin" />
              ) : isVietnamSubscribed ? (
                <span className="px-1.5 py-0.5 rounded-[3px] bg-accent/20 text-accent text-[10px] font-medium flex items-center gap-0.5">
                  <Check className="h-2.5 w-2.5" /> {t('common.on')}
                </span>
              ) : (
                <span className="text-[10px] text-muted hover:text-primary font-medium">{t('holidays.enable')}</span>
              )}
            </div>
          </div>

          {/* International Holidays */}
          <div
            onClick={() => handleToggle('international')}
            className={`flex items-center justify-between px-2 py-1.5 rounded-[4px] border text-xs cursor-pointer transition-colors ${
              isInternationalSubscribed
                ? 'bg-accent/10 border-accent/30 text-primary'
                : 'bg-surface border-hairline text-muted hover:bg-hover hover:text-primary'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm shrink-0">🌐</span>
              <span className="font-medium text-xs truncate">{t('holidays.international')}</span>
            </div>

            <div className="shrink-0 flex items-center">
              {loadingType === 'international' ? (
                <Loader2 className="h-3 w-3 text-accent animate-spin" />
              ) : isInternationalSubscribed ? (
                <span className="px-1.5 py-0.5 rounded-[3px] bg-accent/20 text-accent text-[10px] font-medium flex items-center gap-0.5">
                  <Check className="h-2.5 w-2.5" /> {t('common.on')}
                </span>
              ) : (
                <span className="text-[10px] text-muted hover:text-primary font-medium">{t('holidays.enable')}</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default HolidayCalendarToggle
