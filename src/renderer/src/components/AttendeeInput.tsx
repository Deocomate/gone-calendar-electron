import React, { useState } from 'react'
import { Plus, X, CheckCircle2, XCircle, HelpCircle, Clock } from 'lucide-react'
import type { Attendee, AttendeeResponseStatus } from '@shared/event-model'

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

    // Simple email regex validation
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
          <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md font-medium">
            <CheckCircle2 className="h-3 w-3" />
            Đã đồng ý
          </span>
        )
      case 'declined':
        return (
          <span className="flex items-center gap-1 text-[10px] text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded-md font-medium">
            <XCircle className="h-3 w-3" />
            Từ chối
          </span>
        )
      case 'tentative':
        return (
          <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-md font-medium">
            <HelpCircle className="h-3 w-3" />
            Tạm thời
          </span>
        )
      case 'needsAction':
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded-md font-medium">
            <Clock className="h-3 w-3" />
            Chờ phản hồi
          </span>
        )
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="email"
            value={emailInput}
            onChange={(e) => {
              setEmailInput(e.target.value)
              if (error) setError(null)
            }}
            onKeyDown={handleKeyDown}
            placeholder="Thêm người tham gia (email)..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-hidden focus:border-indigo-500"
          />
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Thêm</span>
        </button>
      </div>

      {error && <p className="text-[11px] text-rose-400">{error}</p>}

      {attendees.length > 0 && (
        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
          {attendees.map((att) => (
            <div
              key={att.email}
              className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-6 w-6 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                  {att.displayName ? att.displayName[0].toUpperCase() : att.email[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  {att.displayName && (
                    <div className="font-medium text-slate-200 truncate">{att.displayName}</div>
                  )}
                  <div className="text-[11px] text-slate-400 font-mono truncate">{att.email}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {renderStatusBadge(att.responseStatus)}
                <button
                  type="button"
                  onClick={() => handleRemove(att.email)}
                  className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors"
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
