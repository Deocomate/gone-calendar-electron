import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Calendar, CalendarDays, CalendarRange, Columns3, LayoutList, ChevronDown } from 'lucide-react'
import type { CalendarViewType } from '@shared/visible-range'

const VIEW_ICONS: Record<CalendarViewType, React.ReactNode> = {
  day: <Calendar className="h-4 w-4" />,
  week: <Columns3 className="h-4 w-4" />,
  month: <CalendarDays className="h-4 w-4" />,
  year: <CalendarRange className="h-4 w-4" />,
  list: <LayoutList className="h-4 w-4" />
}

const VIEWS: CalendarViewType[] = ['day', 'week', 'month', 'year', 'list']

interface ViewSwitcherProps {
  currentView: CalendarViewType
  onChange: (view: CalendarViewType) => void
}

export const ViewSwitcher: React.FC<ViewSwitcherProps> = ({ currentView, onChange }) => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="gc-btn min-w-28"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {VIEW_ICONS[currentView]}
        <span>{t(`views.${currentView}`)}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-muted transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="gc-menu right-0 mt-1" role="listbox">
          {VIEWS.map((view) => (
            <button
              key={view}
              type="button"
              role="option"
              aria-selected={view === currentView}
              onClick={() => {
                onChange(view)
                setOpen(false)
              }}
              className={`gc-menu-item ${view === currentView ? 'bg-hover font-medium' : ''}`}
            >
              {VIEW_ICONS[view]}
              <span>{t(`views.${view}`)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default ViewSwitcher
