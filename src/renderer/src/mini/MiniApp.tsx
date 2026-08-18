import React, { useState, useEffect } from 'react'
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Circle,
  Plus,
  ExternalLink,
  Pin,
  PinOff,
  Clock,
  MapPin,
  Trash2,
  RotateCw
} from 'lucide-react'
import { DateTime } from 'luxon'
import type { ExpandedOccurrence } from '@shared/event-model'
import type { TaskItem } from '@shared/task-model'

export const MiniApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'events' | 'tasks'>('events')
  const [occurrences, setOccurrences] = useState<ExpandedOccurrence[]>([])
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState<boolean>(true)
  const [newTaskTitle, setNewTaskTitle] = useState<string>('')
  const [newTaskDueDate, setNewTaskDueDate] = useState<string>('')

  const loadData = async () => {
    setIsLoading(true)
    try {
      if (window.gone?.mini?.getUpcoming) {
        const res = await window.gone.mini.getUpcoming(15)
        setOccurrences(res.occurrences || [])
        setTasks(res.tasks || [])
      }
    } catch (err) {
      console.error('Failed to load mini window data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // Poll every 60 seconds
    const interval = setInterval(loadData, 60000)
    return () => clearInterval(interval)
  }, [])

  const handleToggleAlwaysOnTop = async () => {
    if (window.gone?.mini?.setAlwaysOnTop) {
      const next = !isAlwaysOnTop
      const res = await window.gone.mini.setAlwaysOnTop(next)
      setIsAlwaysOnTop(res)
    }
  }

  const handleOpenMain = async () => {
    if (window.gone?.mini?.openMain) {
      await window.gone.mini.openMain()
    }
  }

  const handleToggleTask = async (task: TaskItem) => {
    if (!window.gone?.tasks?.toggle) return
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t))
    )
    try {
      await window.gone.tasks.toggle(task.id)
    } catch (err) {
      console.error('Failed to toggle task:', err)
      loadData()
    }
  }

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim() || !window.gone?.tasks?.create) return

    try {
      const created = await window.gone.tasks.create({
        title: newTaskTitle.trim(),
        dueDate: newTaskDueDate || undefined,
        showOnCalendar: true
      })
      setTasks((prev) => [created, ...prev])
      setNewTaskTitle('')
      setNewTaskDueDate('')
    } catch (err) {
      console.error('Failed to create task:', err)
    }
  }

  const handleDeleteTask = async (id: string) => {
    if (!window.gone?.tasks?.delete) return
    setTasks((prev) => prev.filter((t) => t.id !== id))
    try {
      await window.gone.tasks.delete(id)
    } catch (err) {
      console.error('Failed to delete task:', err)
    }
  }

  const formatEventTime = (occ: ExpandedOccurrence) => {
    const start = DateTime.fromISO(occ.startUtc).setZone('local')
    if (occ.allDay) {
      return 'Cả ngày'
    }
    const end = DateTime.fromISO(occ.endUtc).setZone('local')
    return `${start.toFormat('HH:mm')} - ${end.toFormat('HH:mm')}`
  }

  const formatEventDateHeader = (dateStr: string) => {
    const dt = DateTime.fromISO(dateStr).setZone('local')
    const today = DateTime.local()

    if (dt.hasSame(today, 'day')) {
      return 'Hôm nay (' + dt.toFormat('dd/MM') + ')'
    }
    if (dt.hasSame(today.plus({ days: 1 }), 'day')) {
      return 'Ngày mai (' + dt.toFormat('dd/MM') + ')'
    }
    return dt.toFormat('EEEE, dd/MM')
  }

  // Group events by day
  const groupedEvents: { [key: string]: ExpandedOccurrence[] } = {}
  occurrences.forEach((occ) => {
    const dayKey = DateTime.fromISO(occ.startUtc).setZone('local').toISODate() || 'unknown'
    if (!groupedEvents[dayKey]) groupedEvents[dayKey] = []
    groupedEvents[dayKey].push(occ)
  })

  return (
    <div className="h-screen w-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-hidden border border-slate-800 rounded-none shadow-2xl">
      {/* Title / Draggable Bar */}
      <div
        className="px-3.5 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0 cursor-move"
        style={{ WebkitAppRegion: 'drag' } as any}
      >
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
          <span className="text-xs font-bold text-slate-200">Gone Calendar</span>
        </div>

        <div className="flex items-center gap-1.5" style={{ WebkitAppRegion: 'no-drag' } as any}>
          <button
            onClick={loadData}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors"
            title="Làm mới"
          >
            <RotateCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleToggleAlwaysOnTop}
            className={`p-1 rounded-md transition-colors ${
              isAlwaysOnTop
                ? 'text-indigo-400 bg-indigo-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title={isAlwaysOnTop ? 'Bỏ ghim cửa sổ' : 'Ghim trên cùng'}
          >
            {isAlwaysOnTop ? <Pin className="h-3.5 w-3.5" /> : <PinOff className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={handleOpenMain}
            className="p-1 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-md transition-colors"
            title="Mở Lịch chính"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center bg-slate-900/40 p-1 border-b border-slate-800/80 text-xs shrink-0">
        <button
          onClick={() => setActiveTab('events')}
          className={`flex-1 py-1.5 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'events'
              ? 'bg-indigo-600 text-white shadow-xs font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <CalendarIcon className="h-3.5 w-3.5" />
          <span>Sự kiện ({occurrences.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex-1 py-1.5 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'tasks'
              ? 'bg-indigo-600 text-white shadow-xs font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>Nhiệm vụ ({tasks.filter((t) => !t.completed).length})</span>
        </button>
      </div>

      {/* Content Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {activeTab === 'events' && (
          <div>
            {occurrences.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                Không có sự kiện sắp tới trong 7 ngày tới.
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(groupedEvents).map(([dayKey, dayOccs]) => (
                  <div key={dayKey} className="space-y-1.5">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                      {formatEventDateHeader(dayKey)}
                    </div>
                    <div className="space-y-1">
                      {dayOccs.map((occ) => (
                        <div
                          key={`${occ.eventId}_${occ.startUtc}`}
                          onClick={handleOpenMain}
                          className="p-2 rounded-xl bg-slate-900/70 hover:bg-slate-800/80 border border-slate-800/80 text-xs cursor-pointer transition-all space-y-0.5 group"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{ backgroundColor: occ.color || '#6366f1' }}
                            />
                            <span className="font-semibold text-slate-200 truncate flex-1 group-hover:text-indigo-300">
                              {occ.title || '(Không có tiêu đề)'}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[10px] text-slate-400 pl-4">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-slate-500" />
                              {formatEventTime(occ)}
                            </span>
                            {occ.location && (
                              <span className="flex items-center gap-1 truncate max-w-[120px]">
                                <MapPin className="h-3 w-3 text-slate-500" />
                                <span className="truncate">{occ.location}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-3">
            {/* Inline Add Task Form */}
            <form onSubmit={handleAddTask} className="flex flex-col gap-1.5 bg-slate-900/60 p-2 rounded-xl border border-slate-800">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Thêm nhiệm vụ nhanh..."
                className="w-full bg-transparent border-none text-xs text-slate-200 placeholder:text-slate-500 focus:outline-hidden"
              />
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
                <input
                  type="date"
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-md px-2 py-0.5 text-[10px] text-slate-300 focus:outline-hidden"
                />
                <button
                  type="submit"
                  className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-[11px] font-semibold flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  <span>Thêm</span>
                </button>
              </div>
            </form>

            {/* Task Items */}
            <div className="space-y-1">
              {tasks.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  Không có nhiệm vụ nào.
                </div>
              ) : (
                tasks.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-900/50 hover:bg-slate-800/50 border border-slate-800/80 text-xs transition-colors group"
                  >
                    <div
                      onClick={() => handleToggleTask(t)}
                      className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                    >
                      {t.completed ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      ) : (
                        <Circle className="h-4 w-4 text-slate-500 hover:text-indigo-400 shrink-0" />
                      )}
                      <span
                        className={`truncate ${
                          t.completed ? 'line-through text-slate-500' : 'text-slate-200'
                        }`}
                      >
                        {t.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {t.dueDate && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          {DateTime.fromISO(t.dueDate).toFormat('dd/MM')}
                        </span>
                      )}
                      <button
                        onClick={() => handleDeleteTask(t.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-400 transition-opacity"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
        <span>Cửa sổ mini</span>
        <button
          onClick={handleOpenMain}
          className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
        >
          <span>Mở Gone Calendar</span>
          <ExternalLink className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}

export default MiniApp
