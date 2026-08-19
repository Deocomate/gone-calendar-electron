import React from 'react'
import { X } from 'lucide-react'
import type { RecurringEditScope } from '@shared/event-model'

interface RecurringScopeDialogProps {
  isOpen: boolean
  title: string
  action: 'edit' | 'delete'
  onConfirm: (scope: RecurringEditScope) => void
  onCancel: () => void
}

export const RecurringScopeDialog: React.FC<RecurringScopeDialogProps> = ({
  isOpen,
  title,
  action,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null

  const isDelete = action === 'delete'

  const options: { scope: RecurringEditScope; label: string; hint: string }[] = [
    {
      scope: 'this',
      label: 'Chỉ sự kiện này',
      hint: 'Các sự kiện khác trong chuỗi lặp sẽ không bị ảnh hưởng'
    },
    {
      scope: 'future',
      label: 'Sự kiện này và các sự kiện sau',
      hint: 'Áp dụng cho lần lặp này và tất cả các lần lặp tiếp theo'
    },
    {
      scope: 'all',
      label: 'Tất cả sự kiện trong chuỗi',
      hint: 'Áp dụng cho toàn bộ chuỗi lặp từ trước đến nay'
    }
  ]

  return (
    <div className="gc-overlay select-none">
      <div className="gc-dialog w-full max-w-sm p-5">
        <button type="button" onClick={onCancel} className="gc-icon-btn absolute top-3 right-3">
          <X className="h-4 w-4" />
        </button>

        {/* Header — no icon box, just text */}
        <div className="mb-4 pr-6">
          <h3 className="text-sm font-semibold text-primary mb-0.5">
            {isDelete ? 'Xóa sự kiện lặp lại' : 'Chỉnh sửa sự kiện lặp lại'}
          </h3>
          <p className="text-xs text-muted truncate max-w-[280px]">"{title}"</p>
        </div>

        <p className="text-xs text-muted mb-4">
          {isDelete
            ? 'Bạn muốn xóa chỉ lần lặp này hay tất cả các lần lặp trong chuỗi?'
            : 'Bạn muốn áp dụng thay đổi cho lần lặp này hay tất cả các lần lặp trong chuỗi?'}
        </p>

        {/* Three full-width text rows — hover bg-hover, no icon boxes */}
        <div className="space-y-0.5">
          {options.map(({ scope, label, hint }) => (
            <button
              key={scope}
              onClick={() => onConfirm(scope)}
              className="w-full flex flex-col px-3 py-2.5 text-left hover:bg-hover transition-colors cursor-pointer group"
              style={{ borderRadius: 'var(--radius-control)' }}
            >
              <span className="text-xs font-medium text-primary group-hover:text-primary">
                {label}
              </span>
              <span className="text-[11px] text-muted">
                {hint}
              </span>
            </button>
          ))}
        </div>

        {/* Cancel — text button only */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs text-muted hover:text-primary transition-colors cursor-pointer"
          >
            Hủy bỏ
          </button>
        </div>
      </div>
    </div>
  )
}

export default RecurringScopeDialog
