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
      {/* Track — pill shape kept as the single rounded-full exception */}
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
        className={`relative inline-flex shrink-0 transition-colors duration-200 ease-in-out rounded-full border-2 border-transparent focus:outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent ${
          isSm ? 'h-5 w-9' : 'h-6 w-11'
        } ${checked ? 'bg-accent' : 'border-hairline! bg-hover'}`}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-block rounded-full bg-white shadow-sm transform ring-0 transition duration-200 ease-in-out ${
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
            <span className="text-xs font-medium text-primary">
              {label}
            </span>
          )}
          {description && (
            <span className="text-[11px] text-muted">
              {description}
            </span>
          )}
        </div>
      )}
    </label>
  )
}

export default ToggleSwitch
