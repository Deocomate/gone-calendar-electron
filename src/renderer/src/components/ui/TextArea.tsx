import React from 'react'

export interface TextAreaProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  rows?: number
  disabled?: boolean
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
  className = '',
  icon
}) => {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-slate-500 dark:text-slate-400 font-semibold mb-1.5 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
          {icon}
          {label}
        </label>
      )}

      <div
        className={`rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 p-3 transition-all focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 hover:border-slate-300 dark:hover:border-slate-700 ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <textarea
          rows={rows}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden resize-none leading-relaxed"
        />
      </div>
    </div>
  )
}

export default TextArea
