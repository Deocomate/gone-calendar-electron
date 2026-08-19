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
        className={`relative flex h-4 w-4 shrink-0 items-center justify-center border transition-colors duration-150 mt-0.5 focus:outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent ${
          checked
            ? 'border-accent bg-accent text-white'
            : 'border-hairline bg-surface group-hover:border-accent/50'
        }`}
        style={{ borderRadius: 'var(--radius-control)' }}
      >
        {checked && <Check className="h-3 w-3 stroke-[3]" />}
      </div>

      {(label || description) && (
        <div className="flex flex-col text-left">
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

export default Checkbox
