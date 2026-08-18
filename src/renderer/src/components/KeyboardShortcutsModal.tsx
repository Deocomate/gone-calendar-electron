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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-slate-100">Phím tắt bàn phím (Keyboard Shortcuts)</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
          {SHORTCUT_GROUPS.map((grp) => (
            <div key={grp.title} className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {grp.title}
              </h4>
              <div className="grid gap-1.5">
                {grp.shortcuts.map((s) => (
                  <div
                    key={s.key}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-950/50 border border-slate-800/80 text-xs"
                  >
                    <span className="text-slate-300 font-medium">{s.description}</span>
                    <kbd className="px-2 py-1 bg-slate-800 border border-slate-700 text-indigo-300 rounded-lg font-mono text-[11px] font-semibold shadow-xs">
                      {s.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-sm"
          >
            Đã hiểu (Got it)
          </button>
        </div>
      </div>
    </div>
  )
}

export default KeyboardShortcutsModal
