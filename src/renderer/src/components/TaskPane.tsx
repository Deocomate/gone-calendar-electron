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
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <Filter className="h-3 w-3 text-slate-400 dark:text-slate-500" />
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
            className={`px-2 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              filter === p.id
                ? 'bg-accent font-semibold text-white'
                : 'bg-hover text-muted hover:text-primary'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Inline Create Task */}
      <form
        onSubmit={handleCreateTask}
        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/90 space-y-2"
      >
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Thêm nhiệm vụ mới..."
          className="w-full bg-transparent border-none text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden"
        />
        <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-slate-200 dark:border-slate-800/60 text-[11px]">
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
            className="gc-btn-primary px-2.5 py-1.5 text-xs font-semibold rounded-lg shrink-0 cursor-pointer"
          >
            <Plus className="h-3 w-3" />
            <span>Thêm</span>
          </button>
        </div>
      </form>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5 max-h-60">
        {filteredTasks.length === 0 ? (
          <div className="py-6 text-center text-[11px] text-slate-400 dark:text-slate-500">
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
                className="flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/50 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800/80 text-xs transition-colors group"
              >
                <div
                  onClick={() => handleToggleTask(task)}
                  className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer"
                >
                  {task.completed ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-slate-400 dark:text-slate-500 hover:text-indigo-500 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <span
                      className={`block truncate ${
                        task.completed
                          ? 'line-through text-slate-400 dark:text-slate-500'
                          : 'text-slate-800 dark:text-slate-200 font-medium'
                      }`}
                    >
                      {task.title}
                    </span>
                    {task.dueDate && (
                      <span
                        className={`text-[10px] font-mono ${
                          isOverdue
                            ? 'text-rose-500 dark:text-rose-400 font-semibold'
                            : isDueToday
                            ? 'text-amber-500 dark:text-amber-400 font-semibold'
                            : 'text-slate-400 dark:text-slate-500'
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
                    className={`p-1 rounded-md transition-colors cursor-pointer ${
                      task.showOnCalendar
                        ? 'text-indigo-500 dark:text-indigo-400 hover:text-indigo-600'
                        : 'text-slate-400 hover:text-slate-600 dark:text-slate-600 dark:hover:text-slate-400'
                    }`}
                    title={
                      task.showOnCalendar
                        ? 'Đang hiển thị trên lịch (nhấn để ẩn)'
                        : 'Đang ẩn khỏi lịch (nhấn để hiện)'
                    }
                  >
                    {task.showOnCalendar ? (
                      <Eye className="h-3 w-3" />
                    ) : (
                      <EyeOff className="h-3 w-3" />
                    )}
                  </button>

                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-400 transition-opacity cursor-pointer"
                    title="Xóa nhiệm vụ"
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
