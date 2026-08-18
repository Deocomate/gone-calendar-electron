import React from 'react'

export interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  description?: string
  disabled?: boolean
  size?: 'sm' | 'md'
  className?: string
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  size = 'md',
  className = ''
}) => {
  const isSm = size === 'sm'

  return (
    <label
      className={`inline-flex items-center gap-3 select-none cursor-pointer ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
    >
      <div
        role="switch"
        aria-checked={checked}
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && onChange(!checked)}
        onKeyDown={(e) => {
          if (!disabled && (e.key === ' ' || e.key === 'Enter')) {
            e.preventDefault()
            onChange(!checked)
          }
        }}
        className={`relative inline-flex shrink-0 transition-colors duration-200 ease-in-out rounded-full border-2 border-transparent focus:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500 ${
          isSm ? 'h-5 w-9' : 'h-6 w-11'
        } ${checked ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-block rounded-full bg-white shadow-md transform ring-0 transition duration-200 ease-in-out ${
            isSm ? 'h-4 w-4' : 'h-5 w-5'
          } ${
            checked
              ? isSm
                ? 'translate-x-4'
                : 'translate-x-5'
              : 'translate-x-0'
          }`}
        />
      </div>

      {(label || description) && (
        <div className="flex flex-col">
          {label && (
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
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

export default ToggleSwitch
