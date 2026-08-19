import React, { useState } from 'react'
import { Plus, X, CheckCircle2, XCircle, HelpCircle, Clock, Mail } from 'lucide-react'
import type { Attendee, AttendeeResponseStatus } from '@shared/event-model'
import { TextInput } from './ui'

interface AttendeeInputProps {
  attendees: Attendee[]
  onChange: (attendees: Attendee[]) => void
}

export const AttendeeInput: React.FC<AttendeeInputProps> = ({ attendees, onChange }) => {
  const [emailInput, setEmailInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleAdd = () => {
    const email = emailInput.trim()
    if (!email) return

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Email không hợp lệ')
      return
    }

    if (attendees.some((a) => a.email.toLowerCase() === email.toLowerCase())) {
      setError('Người tham gia đã tồn tại')
      return
    }

    setError(null)
    onChange([
      ...attendees,
      {
        email,
        responseStatus: 'needsAction'
      }
    ])
    setEmailInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  const handleRemove = (emailToRemove: string) => {
    onChange(attendees.filter((a) => a.email !== emailToRemove))
  }

  const renderStatusBadge = (status?: AttendeeResponseStatus) => {
    switch (status) {
      case 'accepted':
        return (
          <span className="flex items-center gap-1 text-[10px] text-accent">
            <CheckCircle2 className="h-3 w-3" />
            Đã đồng ý
          </span>
        )
      case 'declined':
        return (
          <span className="flex items-center gap-1 text-[10px] text-today">
            <XCircle className="h-3 w-3" />
            Từ chối
          </span>
        )
      case 'tentative':
        return (
          <span className="flex items-center gap-1 text-[10px] text-amber-500 dark:text-amber-400">
            <HelpCircle className="h-3 w-3" />
            Tạm thời
          </span>
        )
      case 'needsAction':
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] text-muted">
            <Clock className="h-3 w-3" />
            Chờ phản hồi
          </span>
        )
    }
  }

  return (
    <div className="space-y-1.5 w-full">
      <div className="flex items-center gap-1">
        <div className="flex-1 min-w-0">
          <TextInput
            type="email"
            value={emailInput}
            onChange={(val) => {
              setEmailInput(val)
              if (error) setError(null)
            }}
            onKeyDown={handleKeyDown}
            placeholder="Thêm người tham gia (email)..."
            prefixIcon={<Mail className="h-3.5 w-3.5" />}
            error={error || undefined}
          />
        </div>
        {/* Add button — sleek ghost action */}
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-muted hover:text-primary hover:bg-hover transition-colors rounded-[3px] shrink-0 cursor-pointer"
          style={{ borderRadius: 'var(--radius-control)' }}
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Thêm</span>
        </button>
      </div>

      {attendees.length > 0 && (
        <div className="space-y-0.5 max-h-36 overflow-y-auto">
          {attendees.map((att) => (
            <div
              key={att.email}
              className="flex items-center justify-between px-2.5 py-2 border border-hairline text-xs hover:bg-hover transition-colors"
              style={{ borderRadius: 'var(--radius-control)' }}
            >
              <div className="flex items-center gap-2 min-w-0">
                {/* Muted initial on bg-hover, no indigo avatar circle */}
                <div
                  className="h-6 w-6 bg-hover border border-hairline flex items-center justify-center font-bold text-muted text-[10px] shrink-0"
                  style={{ borderRadius: 'var(--radius-control)' }}
                >
                  {att.displayName ? att.displayName[0].toUpperCase() : att.email[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  {att.displayName && (
                    <div className="font-medium text-primary truncate">{att.displayName}</div>
                  )}
                  <div className="text-[11px] text-muted font-mono truncate">{att.email}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {renderStatusBadge(att.responseStatus)}
                <button
                  type="button"
                  onClick={() => handleRemove(att.email)}
                  className="p-1 text-muted hover:text-today transition-colors cursor-pointer"
                  style={{ borderRadius: 'var(--radius-control)' }}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AttendeeInput
