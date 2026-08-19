import React from 'react'

interface ResizeTimeTooltipProps {
  label: string
  x: number
  y: number
}

export const ResizeTimeTooltip: React.FC<ResizeTimeTooltipProps> = ({ label, x, y }) => {
  return (
    <div
      className="pointer-events-none fixed z-[80] rounded-[4px] border border-hairline bg-surface px-2 py-1 font-mono text-[11px] font-medium text-primary shadow-md"
      style={{ left: x + 12, top: Math.max(8, y - 32) }}
    >
      {label}
    </div>
  )
}

export default ResizeTimeTooltip
