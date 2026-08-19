import React, { useState, useEffect } from 'react'
import { Minus, Plus } from 'lucide-react'

export interface NumberInputProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  prefix?: string
  suffix?: string
  label?: string
  disabled?: boolean
  className?: string
}

export const NumberInput: React.FC<NumberInputProps> = ({
  value,
  onChange,
  min,
  max,
  step = 1,
  prefix,
  suffix,
  label,
  disabled = false,
  className = ''
}) => {
  const [localStr, setLocalStr] = useState(String(value ?? 0))

  useEffect(() => {
    setLocalStr(String(value ?? 0))
  }, [value])

  const handleDecrement = () => {
    if (disabled) return
    const next = (value ?? 0) - step
    if (min !== undefined && next < min) return
    onChange(next)
  }

  const handleIncrement = () => {
    if (disabled) return
    const next = (value ?? 0) + step
    if (max !== undefined && next > max) return
    onChange(next)
  }

  const handleBlur = () => {
    let num = parseFloat(localStr)
    if (isNaN(num)) num = min !== undefined ? min : 0
    if (min !== undefined && num < min) num = min
    if (max !== undefined && num > max) num = max
    onChange(num)
    setLocalStr(String(num))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      handleIncrement()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      handleDecrement()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      handleBlur()
    }
  }

  const canDecrement = !disabled && (min === undefined || value > min)
  const canIncrement = !disabled && (max === undefined || value < max)

  return (
    <div className={`inline-block ${className}`}>
      {label && (
        <label className="block text-[12px] font-normal text-muted mb-1.5">
          {label}
        </label>
      )}

      <div
        className={`flex items-center border border-hairline bg-surface p-1 transition-colors duration-100 focus-within:border-accent ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        style={{ borderRadius: 'var(--radius-control)' }}
      >
        <button
          type="button"
          disabled={!canDecrement}
          onClick={handleDecrement}
          className={`h-6 w-6 flex items-center justify-center text-muted hover:text-primary hover:bg-hover transition-colors cursor-pointer ${
            !canDecrement ? 'opacity-30 cursor-not-allowed hover:bg-transparent' : ''
          }`}
          style={{ borderRadius: 'var(--radius-control)' }}
        >
          <Minus className="h-3.5 w-3.5" />
        </button>

        <div className="flex items-center justify-center flex-1 px-2">
          {prefix && <span className="text-xs text-muted mr-1">{prefix}</span>}
          <input
            type="text"
            disabled={disabled}
            value={localStr}
            onChange={(e) => setLocalStr(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-12 bg-transparent text-center text-xs font-mono font-semibold text-primary focus:outline-none"
          />
          {suffix && <span className="text-xs text-muted ml-1">{suffix}</span>}
        </div>

        <button
          type="button"
          disabled={!canIncrement}
          onClick={handleIncrement}
          className={`h-6 w-6 flex items-center justify-center text-muted hover:text-primary hover:bg-hover transition-colors cursor-pointer ${
            !canIncrement ? 'opacity-30 cursor-not-allowed hover:bg-transparent' : ''
          }`}
          style={{ borderRadius: 'var(--radius-control)' }}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

export default NumberInput
