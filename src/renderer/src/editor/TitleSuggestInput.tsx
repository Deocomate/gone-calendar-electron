import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Calendar } from '@shared/event-model'
import type { TitleSuggestion } from '@shared/title-suggestions'
import { useDisplayPreferences } from '../context/DisplayPreferencesContext'

interface TitleSuggestInputProps {
  value: string
  onChange: (value: string) => void
  /** Accepting a suggestion - the caller applies the title and the calendar. */
  onPick: (suggestion: TitleSuggestion) => void
  /** Start of the slot being filled, ISO 8601 UTC. Drives the time-of-day ranking. */
  targetStartUtc: string
  targetAllDay: boolean
  calendars: Calendar[]
  placeholder?: string
  autoFocus?: boolean
  /** Suppressed while editing an existing event - its title is already decided. */
  enabled: boolean
}

const DEBOUNCE_MS = 140
const MAX_SUGGESTIONS = 5

/**
 * The event title field, with autocomplete over what you have scheduled before.
 *
 * Ranking lives in `@shared/title-suggestions`; this only renders it and hands
 * the accepted row back. The list is contextual rather than alphabetical - it is
 * built from the slot currently in the form, so the same field offers different
 * answers at 09:00 Monday and 19:00 Saturday.
 *
 * It stays shut until something has actually been typed. Opening on focus put a
 * list over the form every single time the editor appeared, which is noise when
 * most events are not repeats of an old one.
 *
 * Each row is one line: the title, and the calendar it would move the event to.
 * The frequency and duration behind the ranking are deliberately not shown -
 * they explain the order but nobody is choosing between rows on them.
 *
 * Enter is shared with the form's submit. The active index starts at -1 so a
 * plain Enter still saves the event; it only accepts a suggestion once one has
 * been deliberately highlighted with the arrow keys.
 */
export const TitleSuggestInput: React.FC<TitleSuggestInputProps> = ({
  value,
  onChange,
  onPick,
  targetStartUtc,
  targetAllDay,
  calendars,
  placeholder,
  autoFocus,
  enabled
}) => {
  const { suggestionShowCalendarName } = useDisplayPreferences()
  const [suggestions, setSuggestions] = useState<TitleSuggestion[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)

  const calendarById = useMemo(
    () => new Map(calendars.map((c) => [c.id, c])),
    [calendars]
  )

  const hasQuery = value.trim().length > 0

  useEffect(() => {
    if (!enabled || !targetStartUtc || !hasQuery) {
      setSuggestions([])
      return
    }
    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        const res = await window.gone?.events?.suggestTitles?.({
          query: value,
          targetStartUtc,
          targetAllDay,
          limit: MAX_SUGGESTIONS
        })
        if (cancelled) return
        // A suggestion identical to what is already typed is kept rather than
        // filtered out: accepting it is how the calendar gets applied.
        setSuggestions(res ?? [])
        setActiveIndex(-1)
      } catch (err) {
        if (!cancelled) console.error('Title suggestions failed:', err)
      }
    }, DEBOUNCE_MS)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [value, targetStartUtc, targetAllDay, enabled, hasQuery])

  const accept = useCallback(
    (suggestion: TitleSuggestion) => {
      onPick(suggestion)
      // Closing here is enough to keep the list down afterwards: the fetch
      // effect never reopens it, and focus never left the input, so no `focus`
      // event is coming either. It reopens on the next keystroke.
      setIsOpen(false)
      setActiveIndex(-1)
      inputRef.current?.focus()
    },
    [onPick]
  )

  const visible = isOpen && hasQuery && suggestions.length > 0

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (!visible) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1))
    } else if ((e.key === 'Enter' || e.key === 'Tab') && activeIndex >= 0) {
      e.preventDefault()
      accept(suggestions[activeIndex])
    } else if (e.key === 'Escape') {
      // The dialog also listens for Escape; dismissing the list must not close
      // the whole editor out from under a half-written event.
      e.preventDefault()
      e.stopPropagation()
      setIsOpen(false)
      setActiveIndex(-1)
    }
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setIsOpen(true)
        }}
        onFocus={() => setIsOpen(hasQuery)}
        onBlur={() => setIsOpen(false)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        role="combobox"
        aria-expanded={visible}
        aria-autocomplete="list"
        aria-controls="gc-title-suggestions"
        aria-activedescendant={activeIndex >= 0 ? `gc-title-suggestion-${activeIndex}` : undefined}
        className="w-full bg-transparent text-[20px] font-semibold text-primary placeholder:text-muted/60 border-none outline-none focus:outline-none focus:ring-0 focus-visible:outline-none tracking-tight"
      />

      {visible && (
        <div
          id="gc-title-suggestions"
          role="listbox"
          // Keep focus in the input: blur would close the list before the click
          // on a row ever landed.
          onMouseDown={(e) => e.preventDefault()}
          className="absolute left-0 right-0 top-full z-50 mt-1.5 border border-hairline bg-dialog p-1 text-primary animate-popover select-none"
          style={{
            borderRadius: 'var(--radius-dialog)',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.18), 0 0 0 1px var(--color-border)'
          }}
        >
          {suggestions.map((s, i) => {
            const cal = calendarById.get(s.calendarId)
            return (
              <button
                key={s.title + s.calendarId}
                type="button"
                id={`gc-title-suggestion-${i}`}
                role="option"
                aria-selected={i === activeIndex}
                onClick={() => accept(s)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`flex w-full items-center gap-2 px-2 py-1.5 text-left transition-colors ${
                  i === activeIndex ? 'bg-hover' : ''
                }`}
                style={{ borderRadius: 'var(--radius-control)' }}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: cal?.color || 'var(--color-muted)' }}
                />
                <span className="min-w-0 flex-1 truncate text-xs text-primary">{s.title}</span>
                {suggestionShowCalendarName && cal && (
                  <span className="max-w-[40%] shrink-0 truncate text-[10px] text-muted">
                    {cal.name}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
