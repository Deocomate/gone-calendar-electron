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
        <label className="block text-slate-500 dark:text-slate-400 font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
          {label}
        </label>
      )}

      <div
        className={`flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 p-1 transition-all focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <button
          type="button"
          disabled={!canDecrement}
          onClick={handleDecrement}
          className={`h-7 w-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
            !canDecrement ? 'opacity-30 cursor-not-allowed hover:bg-transparent' : ''
          }`}
        >
          <Minus className="h-3.5 w-3.5" />
        </button>

        <div className="flex items-center justify-center flex-1 px-2">
          {prefix && <span className="text-xs text-slate-400 mr-1">{prefix}</span>}
          <input
            type="text"
            disabled={disabled}
            value={localStr}
            onChange={(e) => setLocalStr(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-12 bg-transparent text-center text-xs font-mono font-semibold text-slate-800 dark:text-slate-100 focus:outline-hidden"
          />
          {suffix && <span className="text-xs text-slate-400 ml-1">{suffix}</span>}
        </div>

        <button
          type="button"
          disabled={!canIncrement}
          onClick={handleIncrement}
          className={`h-7 w-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
            !canIncrement ? 'opacity-30 cursor-not-allowed hover:bg-transparent' : ''
          }`}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

export default NumberInput
