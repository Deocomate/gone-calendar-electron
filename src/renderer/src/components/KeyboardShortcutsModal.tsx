import React from 'react'
import { Keyboard, X } from 'lucide-react'

interface KeyboardShortcutsModalProps {
  isOpen: boolean
  onClose: () => void
}

const SHORTCUT_GROUPS = [
  {
    title: 'Điều hướng thời gian (Navigation)',
    shortcuts: [
      { key: 'T', description: 'Chuyển về Hôm nay (Go to Today)' },
      { key: 'J / →', description: 'Thời gian kế tiếp (Next period)' },
      { key: 'K / ←', description: 'Thời gian trước đó (Previous period)' }
    ]
  },
  {
    title: 'Chuyển đổi giao diện (Views)',
    shortcuts: [
      { key: '1', description: 'Xem theo Ngày (Day View)' },
      { key: '2', description: 'Xem theo Tuần (Week View)' },
      { key: '3', description: 'Xem theo Tháng (Month View)' },
      { key: '4', description: 'Xem theo Năm (Year View)' },
      { key: '5', description: 'Xem Danh sách (List View)' }
    ]
  },
  {
    title: 'Thao tác sự kiện (Actions)',
    shortcuts: [
      { key: 'N hoặc C', description: 'Tạo sự kiện mới (Create Event)' },
      { key: 'Ctrl + K hoặc /', description: 'Tìm kiếm sự kiện (Search Palette)' },
      { key: 'Esc', description: 'Đóng hộp thoại hiện tại (Close Dialog)' },
      { key: '?', description: 'Mở bảng phím tắt này (Help)' }
    ]
  }
]

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null

  return (
    <div className="gc-overlay select-none">
      <div className="gc-dialog w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-hairline bg-app px-6 py-4">
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-accent" />
            <h3 className="text-sm font-semibold text-primary">Phím tắt bàn phím</h3>
          </div>
          <button type="button" onClick={onClose} className="gc-icon-btn">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
          {SHORTCUT_GROUPS.map((grp) => (
            <div key={grp.title} className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {grp.title}
              </h4>
              <div className="grid gap-1.5">
                {grp.shortcuts.map((s) => (
                  <div
                    key={s.key}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 text-xs"
                  >
                    <span className="text-slate-700 dark:text-slate-300 font-medium">{s.description}</span>
                    <kbd className="px-2 py-1 bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-300 rounded-lg font-mono text-[11px] font-semibold shadow-xs">
                      {s.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-hairline bg-app px-6 py-3">
          <button type="button" onClick={onClose} className="gc-btn-primary">
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  )
}

export default KeyboardShortcutsModal
