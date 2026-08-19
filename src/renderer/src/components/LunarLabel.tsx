import React from 'react'
import { convertSolarToLunar, formatLunarLabel } from '@shared/lunar-vietnam'

interface LunarLabelProps {
  day: number
  month: number
  year: number
  className?: string
}

export const LunarLabel: React.FC<LunarLabelProps> = ({ day, month, year, className = '' }) => {
  const lunar = convertSolarToLunar(day, month, year)
  const info = formatLunarLabel(lunar)

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
      title={`Âm lịch: Ngày ${lunar.day} tháng ${lunar.month}${lunar.leap ? ' (Nhuận)' : ''} năm ${lunar.canChiYear}`}
    >
      {info.label}
    </span>
  )
}

export default LunarLabel
