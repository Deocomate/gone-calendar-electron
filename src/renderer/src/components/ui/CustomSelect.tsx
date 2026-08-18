import React, { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronDown, Check, Search } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
  color?: string
  icon?: React.ReactNode
  badge?: string
  description?: string
  disabled?: boolean
}

export interface CustomSelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  label?: string
  searchable?: boolean
  searchPlaceholder?: string
  disabled?: boolean
  className?: string
  align?: 'left' | 'right'
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options = [],
  placeholder = 'Chọn một mục...',
  label,
  searchable = false,
  searchPlaceholder = 'Tìm kiếm...',
  disabled = false,
  className = '',
  align = 'left'
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const selectedOption = useMemo(
    () => (options || []).find((opt) => opt.value === value),
    [options, value]
  )

  const filteredOptions = useMemo(() => {
    const list = options || []
    if (!searchable || !searchQuery.trim()) return list
    const q = searchQuery.toLowerCase().trim()
    return list.filter(
      (opt) =>
        (opt.label && opt.label.toLowerCase().includes(q)) ||
        (opt.description && opt.description.toLowerCase().includes(q)) ||
        (opt.value && opt.value.toLowerCase().includes(q))
    )
  }, [options, searchable, searchQuery])

  // Focus search input when opening
  useEffect(() => {
    if (isOpen && searchable) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 50)
    } else {
      setSearchQuery('')
    }
  }, [isOpen, searchable])

  // Click outside & Escape key
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const handleSelect = (opt: SelectOption) => {
    if (opt.disabled) return
    onChange(opt.value)
    setIsOpen(false)
  }

  return (
    <div className={`relative inline-block w-full ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-slate-500 dark:text-slate-400 font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`flex items-center justify-between gap-2 w-full px-3.5 py-2 rounded-xl border text-xs text-left transition-all select-none cursor-pointer ${
          isOpen
            ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-surface'
            : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 hover:border-slate-300 dark:hover:border-slate-700'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {selectedOption?.color && (
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0 shadow-xs"
              style={{ backgroundColor: selectedOption.color }}
            />
          )}

          {selectedOption?.icon && (
            <span className="shrink-0 text-slate-400">{selectedOption.icon}</span>
          )}

          <span
            className={`truncate font-medium ${
              selectedOption
                ? 'text-slate-800 dark:text-slate-100'
                : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>

          {selectedOption?.badge && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0">
              {selectedOption.badge}
            </span>
          )}
        </div>

        <ChevronDown
          className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-indigo-500' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute top-full z-50 mt-1.5 w-full min-w-[200px] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 shadow-2xl shadow-black/20 animate-popover ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {/* Search Box */}
          {searchable && (
            <div className="p-1.5 border-b border-slate-100 dark:border-slate-800/80 mb-1">
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
                <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full bg-transparent text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden"
                />
              </div>
            </div>
          )}

          {/* Option Items */}
          <div className="max-h-56 overflow-y-auto space-y-0.5 pr-0.5">
            {filteredOptions.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400">
                Không tìm thấy kết quả
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={opt.disabled}
                    onClick={() => handleSelect(opt)}
                    className={`flex w-full items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 font-semibold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    } ${opt.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {opt.color && (
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: opt.color }}
                        />
                      )}

                      {opt.icon && <span className="shrink-0">{opt.icon}</span>}

                      <div className="min-w-0 flex-1">
                        <div className="truncate">{opt.label}</div>
                        {opt.description && (
                          <div className="text-[10px] text-slate-400 truncate">
                            {opt.description}
                          </div>
                        )}
                      </div>

                      {opt.badge && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0">
                          {opt.badge}
                        </span>
                      )}
                    </div>

                    {isSelected && (
                      <Check className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default CustomSelect
