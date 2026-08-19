import React, { useState } from 'react'
import { Eye, EyeOff, X } from 'lucide-react'

export interface TextInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  type?: 'text' | 'password' | 'email' | 'url'
  /** 'ghost' = transparent, 1px hairline on hover/focus (default, page-like).
   *  'boxed' = bg-surface + 1px hairline always visible (settings-like). */
  variant?: 'ghost' | 'boxed'
  prefixIcon?: React.ReactNode
  suffixIcon?: React.ReactNode
  clearable?: boolean
  disabled?: boolean
  required?: boolean
  error?: string
  autoFocus?: boolean
  className?: string
  inputClassName?: string
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
}

export const TextInput: React.FC<TextInputProps> = ({
  value,
  onChange,
  placeholder,
  label,
  type = 'text',
  variant = 'ghost',
  prefixIcon,
  suffixIcon,
  clearable = false,
  disabled = false,
  required = false,
  error,
  autoFocus = false,
  className = '',
  inputClassName = '',
  onKeyDown
}) => {
  const [showPassword, setShowPassword] = useState(false)

  const actualType = type === 'password' ? (showPassword ? 'text' : 'password') : type

  const handleClear = () => {
    onChange('')
  }

  const isGhost = variant === 'ghost'

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-[12px] font-normal text-muted mb-1.5">
          {label} {required && <span className="text-today">*</span>}
        </label>
      )}

      <div
        className={`flex items-center px-2.5 py-1.5 transition-colors duration-100 ${
          isGhost
            ? 'bg-transparent border border-transparent hover:border-hairline hover:bg-hover/30 focus-within:border-hairline focus-within:bg-hover/20'
            : 'bg-surface border border-hairline focus-within:border-accent'
        } ${error ? 'border-today!' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        style={{ borderRadius: 'var(--radius-control)' }}
      >
        {prefixIcon && (
          <span className="mr-1.5 text-muted shrink-0">{prefixIcon}</span>
        )}

        <input
          type={actualType}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          onKeyDown={onKeyDown}
          className={`w-full bg-transparent text-xs text-primary placeholder:text-muted border-none outline-none focus:outline-none focus:ring-0 focus-visible:outline-none ${inputClassName}`}
        />

        {clearable && value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="p-0.5 text-muted hover:text-primary transition-colors ml-1 shrink-0 cursor-pointer"
            title="Xóa"
            style={{ borderRadius: 'var(--radius-control)' }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        {type === 'password' && !disabled && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="p-0.5 text-muted hover:text-primary transition-colors ml-1 shrink-0 cursor-pointer"
            title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            style={{ borderRadius: 'var(--radius-control)' }}
          >
            {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        )}

        {suffixIcon && !clearable && type !== 'password' && (
          <span className="ml-2 text-muted shrink-0">{suffixIcon}</span>
        )}
      </div>

      {error && <p className="mt-1 text-[11px] text-today">{error}</p>}
    </div>
  )
}

export default TextInput
