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

  let badgeStyle = 'text-slate-400 dark:text-slate-500'
  if (info.isTet) {
    badgeStyle = 'text-rose-600 dark:text-rose-400 font-bold'
  } else if (info.isFirstDay) {
    badgeStyle = 'text-indigo-600 dark:text-indigo-400 font-semibold'
  } else if (info.isFullMoon) {
    badgeStyle = 'text-amber-600 dark:text-amber-400 font-medium'
  }

  return (
    <span
      className={`text-[10px] tracking-tight ${badgeStyle} ${className}`}
      title={`Âm lịch: Ngày ${lunar.day} tháng ${lunar.month}${lunar.leap ? ' (Nhuận)' : ''} năm ${lunar.canChiYear}`}
    >
      {info.label}
    </span>
  )
}

export default LunarLabel
