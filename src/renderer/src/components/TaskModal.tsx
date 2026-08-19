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
    <div className="gc-overlay select-none">
      <div className="gc-dialog w-full max-w-lg max-h-[85vh]">
        {/* Header — plain icon + title, no tinted icon box */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-hairline">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-muted" />
            <div>
              <h2 className="text-sm font-semibold text-primary">Danh sách Nhiệm vụ</h2>
              <p className="text-xs text-muted">Quản lý việc cần làm và hiển thị trên lịch</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="gc-icon-btn"
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
