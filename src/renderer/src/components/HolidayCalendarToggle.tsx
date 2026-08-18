import React, { useState } from 'react'
import { CalendarHeart, Globe, Check, Loader2 } from 'lucide-react'
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
    <div className="space-y-2 select-none">
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <CalendarHeart className="h-3.5 w-3.5 text-rose-500 dark:text-rose-400" />
          Lịch Ngày Lễ (Holidays)
        </span>
      </div>

      <div className="space-y-1.5">
        {/* Vietnam Holidays */}
        <button
          type="button"
          onClick={() => handleToggle('vietnam')}
          disabled={loadingType === 'vietnam'}
          className={`w-full p-2 rounded-xl border text-left text-xs transition-all flex items-center justify-between gap-2 cursor-pointer ${
            isVietnamSubscribed
              ? 'bg-rose-500/10 border-rose-500/30 text-slate-800 dark:text-slate-200 shadow-xs'
              : 'bg-slate-100 hover:bg-slate-200/70 border-slate-200 text-slate-700 dark:bg-slate-900/60 dark:border-slate-800 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/40'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base leading-none shrink-0">🇻🇳</span>
            <div className="min-w-0">
              <span className="font-semibold block truncate">Lễ Tết Việt Nam</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-500 block truncate">Âm lịch & Dương lịch</span>
            </div>
          </div>

          <div className="shrink-0 flex items-center">
            {loadingType === 'vietnam' ? (
              <Loader2 className="h-3.5 w-3.5 text-rose-500 dark:text-rose-400 animate-spin" />
            ) : isVietnamSubscribed ? (
              <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-600 dark:text-rose-300 text-[10px] font-semibold flex items-center gap-1">
                <Check className="h-3 w-3" /> Đã thêm
              </span>
            ) : (
              <span className="text-[10px] text-slate-500 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-300">+ Thêm</span>
            )}
          </div>
        </button>

        {/* International Holidays */}
        <button
          type="button"
          onClick={() => handleToggle('international')}
          disabled={loadingType === 'international'}
          className={`w-full p-2 rounded-xl border text-left text-xs transition-all flex items-center justify-between gap-2 cursor-pointer ${
            isInternationalSubscribed
              ? 'bg-sky-500/10 border-sky-500/30 text-slate-800 dark:text-slate-200 shadow-xs'
              : 'bg-slate-100 hover:bg-slate-200/70 border-slate-200 text-slate-700 dark:bg-slate-900/60 dark:border-slate-800 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/40'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Globe className="h-4 w-4 text-sky-500 dark:text-sky-400 shrink-0" />
            <div className="min-w-0">
              <span className="font-semibold block truncate">International Holidays</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-500 block truncate">Global celebrations</span>
            </div>
          </div>

          <div className="shrink-0 flex items-center">
            {loadingType === 'international' ? (
              <Loader2 className="h-3.5 w-3.5 text-sky-500 dark:text-sky-400 animate-spin" />
            ) : isInternationalSubscribed ? (
              <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-600 dark:text-sky-300 text-[10px] font-semibold flex items-center gap-1">
                <Check className="h-3 w-3" /> Đã thêm
              </span>
            ) : (
              <span className="text-[10px] text-slate-500 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-300">+ Thêm</span>
            )}
          </div>
        </button>
      </div>
    </div>
  )
}

export default HolidayCalendarToggle
