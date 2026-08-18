import React, { useState } from 'react'
import { CalendarHeart, Check, Loader2, ChevronDown, ChevronRight } from 'lucide-react'
import type { Calendar } from '@shared/event-model'

interface HolidayCalendarToggleProps {
  calendars: Calendar[]
  onCalendarsChanged: () => void
}

export const HolidayCalendarToggle: React.FC<HolidayCalendarToggleProps> = ({
  calendars,
  onCalendarsChanged
}) => {
  const [loadingType, setLoadingType] = useState<'vietnam' | 'international' | null>(null)
  const [isExpanded, setIsExpanded] = useState(true)

  const isVietnamSubscribed = calendars.some((c) => c.name === 'Ngày lễ Việt Nam')
  const isInternationalSubscribed = calendars.some((c) => c.name === 'International Holidays')

  const handleToggle = async (type: 'vietnam' | 'international') => {
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
        className="w-full flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <CalendarHeart className="h-3.5 w-3.5 text-rose-500 dark:text-rose-400" />
          Lịch Ngày Lễ
        </span>
        {isExpanded ? (
          <ChevronDown className="h-3 w-3 text-slate-400" />
        ) : (
          <ChevronRight className="h-3 w-3 text-slate-400" />
        )}
      </button>

      {isExpanded && (
        <div className="space-y-1 pt-0.5">
          {/* Vietnam Holidays */}
          <div
            onClick={() => handleToggle('vietnam')}
            className={`flex items-center justify-between px-2 py-1.5 rounded-lg border text-xs cursor-pointer transition-all ${
              isVietnamSubscribed
                ? 'bg-rose-500/10 border-rose-500/30 text-slate-800 dark:text-slate-200'
                : 'bg-hover border-hairline text-muted hover:text-primary'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm shrink-0">🇻🇳</span>
              <span className="font-medium text-xs truncate">Lễ Tết Việt Nam</span>
            </div>

            <div className="shrink-0 flex items-center">
              {loadingType === 'vietnam' ? (
                <Loader2 className="h-3 w-3 text-rose-500 animate-spin" />
              ) : isVietnamSubscribed ? (
                <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-600 dark:text-rose-300 text-[10px] font-semibold flex items-center gap-0.5">
                  <Check className="h-2.5 w-2.5" /> Đã bật
                </span>
              ) : (
                <span className="text-[10px] text-muted hover:text-primary font-medium">+ Bật</span>
              )}
            </div>
          </div>

          {/* International Holidays */}
          <div
            onClick={() => handleToggle('international')}
            className={`flex items-center justify-between px-2 py-1.5 rounded-lg border text-xs cursor-pointer transition-all ${
              isInternationalSubscribed
                ? 'bg-sky-500/10 border-sky-500/30 text-slate-800 dark:text-slate-200'
                : 'bg-hover border-hairline text-muted hover:text-primary'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm shrink-0">🌐</span>
              <span className="font-medium text-xs truncate">Lễ Quốc tế</span>
            </div>

            <div className="shrink-0 flex items-center">
              {loadingType === 'international' ? (
                <Loader2 className="h-3 w-3 text-sky-500 animate-spin" />
              ) : isInternationalSubscribed ? (
                <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-600 dark:text-sky-300 text-[10px] font-semibold flex items-center gap-0.5">
                  <Check className="h-2.5 w-2.5" /> Đã bật
                </span>
              ) : (
                <span className="text-[10px] text-muted hover:text-primary font-medium">+ Bật</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default HolidayCalendarToggle
