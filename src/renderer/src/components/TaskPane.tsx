import React, { useState, useEffect } from 'react'
import { Plus, CheckCircle2, Circle, Trash2, Eye, EyeOff, Filter } from 'lucide-react'
import { DateTime } from 'luxon'
import type { TaskItem } from '@shared/task-model'
import { DatePicker } from './ui'

interface TaskPaneProps {
  onTasksChanged?: () => void
}

export const TaskPane: React.FC<TaskPaneProps> = ({ onTasksChanged }) => {
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [newTitle, setNewTitle] = useState('')
  const [newDueDate, setNewDueDate] = useState('')
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'today'>('all')

  const loadTasks = async () => {
    if (!window.gone?.tasks?.list) return
    try {
      const list = await window.gone.tasks.list(true)
      setTasks(list)
    } catch (err) {
      console.warn('Failed to load tasks:', err)
    }
  }

  useEffect(() => {
    loadTasks()
  }, [])

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim() || !window.gone?.tasks?.create) return

    try {
      await window.gone.tasks.create({
        title: newTitle.trim(),
        dueDate: newDueDate || undefined,
        showOnCalendar: true
      })
      setNewTitle('')
      setNewDueDate('')
      await loadTasks()
      onTasksChanged?.()
    } catch (err) {
      console.error('Failed to create task:', err)
    }
  }

  const handleToggleTask = async (task: TaskItem) => {
    if (!window.gone?.tasks?.toggle) return
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t))
    )
    try {
      await window.gone.tasks.toggle(task.id)
      onTasksChanged?.()
    } catch (err) {
      console.error('Failed to toggle task:', err)
      loadTasks()
    }
  }

  const handleToggleShowOnCalendar = async (task: TaskItem) => {
    if (!window.gone?.tasks?.update) return
    const nextVal = !task.showOnCalendar
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, showOnCalendar: nextVal } : t))
    )
    try {
      await window.gone.tasks.update(task.id, { showOnCalendar: nextVal })
      onTasksChanged?.()
    } catch (err) {
      console.error('Failed to update task:', err)
      loadTasks()
    }
  }

  const handleDeleteTask = async (id: string) => {
    if (!window.gone?.tasks?.delete) return
    setTasks((prev) => prev.filter((t) => t.id !== id))
    try {
      await window.gone.tasks.delete(id)
      onTasksChanged?.()
    } catch (err) {
      console.error('Failed to delete task:', err)
    }
  }

  const todayStr = DateTime.local().toISODate()!

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'pending') return !t.completed
    if (filter === 'completed') return t.completed
    if (filter === 'today') return t.dueDate === todayStr
    return true
  })

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Header & Filter Pills */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted flex items-center gap-1.5">
          <Filter className="h-3 w-3 text-muted" />
          Nhiệm vụ ({tasks.filter((t) => !t.completed).length})
        </span>
      </div>

      <div className="flex gap-1 text-[10px] overflow-x-auto pb-1">
        {[
          { id: 'all', label: 'Tất cả' },
          { id: 'pending', label: 'Chưa xong' },
          { id: 'today', label: 'Hôm nay' },
          { id: 'completed', label: 'Đã xong' }
        ].map((p) => (
          <button
            key={p.id}
            onClick={() => setFilter(p.id as any)}
            className={`px-2 py-1 font-medium transition-colors cursor-pointer ${
              filter === p.id
                ? 'bg-accent text-white'
                : 'bg-hover text-muted hover:text-primary'
            }`}
            style={{ borderRadius: 'var(--radius-control)' }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Inline Create Task — ghost hairline style */}
      <form
        onSubmit={handleCreateTask}
        className="border border-hairline px-3 py-2 space-y-2 transition-colors focus-within:border-accent"
        style={{ borderRadius: 'var(--radius-control)' }}
      >
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Thêm nhiệm vụ mới..."
          className="w-full bg-transparent border-none text-xs text-primary placeholder:text-muted focus:outline-none focus:ring-0 focus-visible:outline-none outline-none"
        />
        <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-hairline text-[11px]">
          <div className="flex-1 max-w-[140px]">
            <DatePicker
              value={newDueDate}
              onChange={setNewDueDate}
              placeholder="Chọn hạn"
              compact={true}
              showPresets={false}
            />
          </div>

          <button
            type="submit"
            className="gc-btn-primary px-2.5 py-1 text-xs font-semibold shrink-0 cursor-pointer"
            style={{ borderRadius: 'var(--radius-control)' }}
          >
            <Plus className="h-3 w-3" />
            <span>Thêm</span>
          </button>
        </div>
      </form>

      {/* Task List — hover rows, no bordered mini-cards */}
      <div className="flex-1 overflow-y-auto max-h-60">
        {filteredTasks.length === 0 ? (
          <div className="py-6 text-center text-[11px] text-muted">
            Không có nhiệm vụ nào.
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isDueToday = task.dueDate === todayStr
            const isOverdue =
              task.dueDate &&
              !task.completed &&
              DateTime.fromISO(task.dueDate) < DateTime.local().startOf('day')

            return (
              <div
                key={task.id}
                className="flex items-center justify-between px-2 py-1.5 hover:bg-hover text-xs transition-colors group"
                style={{ borderRadius: 'var(--radius-control)' }}
              >
                <div
                  onClick={() => handleToggleTask(task)}
                  className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer"
                >
                  {task.completed ? (
                    <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted hover:text-accent shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <span
                      className={`block truncate ${
                        task.completed
                          ? 'line-through text-muted'
                          : 'text-primary font-medium'
                      }`}
                    >
                      {task.title}
                    </span>
                    {task.dueDate && (
                      <span
                        className={`text-[10px] font-mono ${
                          isOverdue
                            ? 'text-today font-semibold'
                            : isDueToday
                            ? 'text-amber-500 dark:text-amber-400 font-semibold'
                            : 'text-muted'
                        }`}
                      >
                        Hạn: {DateTime.fromISO(task.dueDate).toFormat('dd/MM')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleToggleShowOnCalendar(task)}
                    className={`p-1 transition-colors cursor-pointer ${
                      task.showOnCalendar
                        ? 'text-accent hover:opacity-70'
                        : 'text-muted hover:text-primary'
                    }`}
                    title={
                      task.showOnCalendar
                        ? 'Đang hiển thị trên lịch (nhấn để ẩn)'
                        : 'Đang ẩn khỏi lịch (nhấn để hiện)'
                    }
                    style={{ borderRadius: 'var(--radius-control)' }}
                  >
                    {task.showOnCalendar ? (
                      <Eye className="h-3 w-3" />
                    ) : (
                      <EyeOff className="h-3 w-3" />
                    )}
                  </button>

                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-muted hover:text-today transition-all cursor-pointer"
                    title="Xóa nhiệm vụ"
                    style={{ borderRadius: 'var(--radius-control)' }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default TaskPane
