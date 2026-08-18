import React, { useState } from 'react'
import { Eye, EyeOff, X } from 'lucide-react'

export interface TextInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  type?: 'text' | 'password' | 'email' | 'url'
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

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-slate-500 dark:text-slate-400 font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <div
        className={`group flex items-center rounded-xl border bg-slate-50 dark:bg-slate-950/70 px-3 py-2 transition-all focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 ${
          error
            ? 'border-rose-500 dark:border-rose-500'
            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {prefixIcon && (
          <span className="mr-2 text-slate-400 dark:text-slate-500 shrink-0">
            {prefixIcon}
          </span>
        )}

        <input
          type={actualType}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          onKeyDown={onKeyDown}
          className={`w-full bg-transparent text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden ${inputClassName}`}
        />

        {clearable && value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="p-0.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors ml-1 shrink-0 cursor-pointer"
            title="Xóa"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        {type === 'password' && !disabled && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="p-0.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors ml-1 shrink-0 cursor-pointer"
            title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          >
            {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        )}

        {suffixIcon && !clearable && type !== 'password' && (
          <span className="ml-2 text-slate-400 dark:text-slate-500 shrink-0">
            {suffixIcon}
          </span>
        )}
      </div>

      {error && <p className="mt-1 text-[11px] text-rose-500 dark:text-rose-400">{error}</p>}
    </div>
  )
}

export default TextInput
