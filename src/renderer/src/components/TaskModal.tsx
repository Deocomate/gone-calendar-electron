import React, { useEffect } from 'react'
import { X, CheckSquare } from 'lucide-react'
import TaskPane from './TaskPane'

interface TaskModalProps {
  isOpen: boolean
  onClose: () => void
  onTasksChanged: () => void
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onTasksChanged
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative z-10 flex flex-col w-full max-w-lg max-h-[85vh] rounded-2xl bg-surface border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-popover">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-hairline bg-app/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <CheckSquare className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-primary">Danh sách Nhiệm vụ</h2>
              <p className="text-xs text-muted">Quản lý việc cần làm và hiển thị trên lịch</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="gc-icon-btn p-1.5 rounded-lg text-muted hover:text-primary"
            title="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          <TaskPane onTasksChanged={onTasksChanged} />
        </div>
      </div>
    </div>
  )
}

export default TaskModal
