import i18n from '../i18n'
import React from 'react'
import { convertSolarToLunar, formatLunarLabel } from '@shared/lunar-vietnam'

interface LunarLabelProps {
  day: number
  month: number
  year: number
  className?: string
  /** Show the lunar month even on an ordinary day (used for Monday in Week view). */
  forceMonth?: boolean
  /** Always show day/month, spelled out (day X, month Y) - for List view's full date line. */
  full?: boolean
}

export const LunarLabel: React.FC<LunarLabelProps> = ({
  day,
  month,
  year,
  className = '',
  forceMonth = false,
  full = false
}) => {
  const lunar = convertSolarToLunar(day, month, year)
  const info = formatLunarLabel(lunar)
  const label = full
    ? i18n.t('ui.lunarFull', { day: lunar.day, month: lunar.month, leap: lunar.leap ? i18n.t('ui.lunarLeap') : '' })
    : forceMonth && !info.isFirstDay && !info.isFullMoon
      ? `${lunar.day}/${lunar.month}${lunar.leap ? '*' : ''}`
      : info.label

  let badgeStyle = 'text-muted'
  if (info.isTet) {
    badgeStyle = 'font-bold text-today'
  } else if (info.isFirstDay) {
    badgeStyle = 'font-semibold text-accent'
  } else if (info.isFullMoon) {
    badgeStyle = 'font-medium text-amber-600 dark:text-amber-400'
  }

  return (
    <span
      className={`text-[10px] tabular-nums tracking-tight ${badgeStyle} ${className}`}
      title={i18n.t('ui.lunarTooltip', { day: lunar.day, month: lunar.month, leap: lunar.leap ? i18n.t('ui.lunarLeap') : '', year: lunar.canChiYear })}
    >
      {label}
    </span>
  )
}

export default LunarLabel
