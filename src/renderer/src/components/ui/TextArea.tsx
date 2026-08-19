import React from 'react'

export interface TextAreaProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  rows?: number
  disabled?: boolean
  /** 'ghost' = transparent, hairline on hover/focus (default).
   *  'boxed' = bg-surface + hairline always (settings-like). */
  variant?: 'ghost' | 'boxed'
  className?: string
  icon?: React.ReactNode
}

export const TextArea: React.FC<TextAreaProps> = ({
  value,
  onChange,
  placeholder,
  label,
  rows = 3,
  disabled = false,
  variant = 'ghost',
  className = '',
  icon
}) => {
  const isGhost = variant === 'ghost'

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-[12px] font-normal text-muted mb-1.5 flex items-center gap-1.5">
          {icon}
          {label}
        </label>
      )}

      <div
        className={`flex items-start px-2.5 py-1.5 transition-colors duration-100 ${
          isGhost
            ? 'bg-transparent border border-transparent hover:border-hairline hover:bg-hover/30 focus-within:border-accent/40 focus-within:bg-transparent'
            : 'bg-surface border border-hairline focus-within:border-accent'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        style={{ borderRadius: 'var(--radius-control)' }}
      >
        {icon && !label && (
          <span className="mr-1.5 mt-0.5 text-muted shrink-0">{icon}</span>
        )}
        <textarea
          rows={rows}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-xs text-primary placeholder:text-muted border-none outline-none focus:outline-none focus:ring-0 focus-visible:outline-none resize-none leading-relaxed p-0 m-0"
        />
      </div>
    </div>
  )
}

export default TextArea
