import React from 'react'
import { Calendar, Layers, Repeat, X } from 'lucide-react'
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

  return (
    <div className="gc-overlay select-none">
      <div className="gc-dialog w-full max-w-md p-6">
        <button type="button" onClick={onCancel} className="gc-icon-btn absolute top-3 right-3">
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${isDelete ? 'bg-rose-500/20 text-rose-500 dark:text-rose-400' : 'bg-indigo-500/20 text-indigo-500 dark:text-indigo-400'}`}>
            <Repeat className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {isDelete ? 'Xóa sự kiện lặp lại' : 'Chỉnh sửa sự kiện lặp lại'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[280px]">
              "{title}"
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 mb-5">
          {isDelete
            ? 'Bạn muốn xóa chỉ lần lặp này hay tất cả các lần lặp trong chuỗi?'
            : 'Bạn muốn áp dụng thay đổi cho lần lặp này hay tất cả các lần lặp trong chuỗi?'}
        </p>

        <div className="space-y-2.5">
          <button
            onClick={() => onConfirm('this')}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 text-left transition-all group cursor-pointer"
          >
            <div className="h-8 w-8 rounded-lg bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                Chỉ sự kiện này (Only this event)
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Các sự kiện khác trong chuỗi lặp sẽ không bị ảnh hưởng
              </div>
            </div>
          </button>

          <button
            onClick={() => onConfirm('future')}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 text-left transition-all group cursor-pointer"
          >
            <div className="h-8 w-8 rounded-lg bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                Sự kiện này và các sự kiện sau (This and future)
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Áp dụng cho lần lặp này và tất cả các lần lặp tiếp theo
              </div>
            </div>
          </button>

          <button
            onClick={() => onConfirm('all')}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 text-left transition-all group cursor-pointer"
          >
            <div className="h-8 w-8 rounded-lg bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Repeat className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                Tất cả sự kiện trong chuỗi (All events in series)
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Áp dụng cho toàn bộ chuỗi lặp từ trước đến nay
              </div>
            </div>
          </button>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
          >
            Hủy bỏ (Cancel)
          </button>
        </div>
      </div>
    </div>
  )
}

export default RecurringScopeDialog
