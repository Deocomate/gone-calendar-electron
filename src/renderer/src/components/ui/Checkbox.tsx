import React from 'react'
import { Check } from 'lucide-react'

export interface CheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: React.ReactNode
  description?: string
  disabled?: boolean
  className?: string
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  className = ''
}) => {
  return (
    <label
      className={`inline-flex items-start gap-2.5 select-none cursor-pointer group ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
    >
      <div
        role="checkbox"
        aria-checked={checked}
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && onChange(!checked)}
        onKeyDown={(e) => {
          if (!disabled && (e.key === ' ' || e.key === 'Enter')) {
            e.preventDefault()
            onChange(!checked)
          }
        }}
        className={`relative flex h-4 w-4 shrink-0 items-center justify-center rounded-md border transition-all duration-150 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500 mt-0.5 ${
          checked
            ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
            : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 group-hover:border-indigo-400'
        }`}
      >
        {checked && <Check className="h-3 w-3 stroke-[3]" />}
      </div>

      {(label || description) && (
        <div className="flex flex-col text-left">
          {label && (
            <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
              {label}
            </span>
          )}
          {description && (
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              {description}
            </span>
          )}
        </div>
      )}
    </label>
  )
}

export default Checkbox
