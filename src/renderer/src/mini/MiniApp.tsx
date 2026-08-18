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
import { applyDocumentTheme, shouldUseDarkClass, type ThemeMode } from '@shared/theme-mode'
import { DEFAULT_APP_SETTINGS } from '@shared/settings-contract'
import { DatePicker } from '../components/ui'

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
    const interval = setInterval(loadData, 60000)
    const loadTheme = async () => {
      try {
        const settings = await window.gone?.settings?.getAll()
        const mode = ((settings?.theme as ThemeMode) || DEFAULT_APP_SETTINGS.theme) as ThemeMode
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        applyDocumentTheme(shouldUseDarkClass(mode, prefersDark))
      } catch {
        applyDocumentTheme(false)
      }
    }
    loadTheme()
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
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-app font-sans text-primary select-none">
      <div
        className="flex shrink-0 items-center justify-between border-b border-hairline bg-surface px-3.5 py-2.5"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-accent" />
          <span className="text-xs font-semibold">Gone Calendar</span>
        </div>

        <div className="flex items-center gap-1.5" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <button type="button" onClick={loadData} className="gc-icon-btn p-1" title="Làm mới">
            <RotateCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={handleToggleAlwaysOnTop}
            className={`rounded-md p-1 ${isAlwaysOnTop ? 'bg-hover text-accent' : 'gc-icon-btn p-1'}`}
            title={isAlwaysOnTop ? 'Bỏ ghim cửa sổ' : 'Ghim trên cùng'}
          >
            {isAlwaysOnTop ? <Pin className="h-3.5 w-3.5" /> : <PinOff className="h-3.5 w-3.5" />}
          </button>
          <button type="button" onClick={handleOpenMain} className="gc-icon-btn p-1" title="Mở Lịch chính">
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 border-b border-hairline bg-surface p-1 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('events')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 font-medium ${
            activeTab === 'events' ? 'bg-accent text-white' : 'text-muted hover:bg-hover hover:text-primary'
          }`}
        >
          <CalendarIcon className="h-3.5 w-3.5" />
          <span>Sự kiện ({occurrences.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('tasks')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 font-medium ${
            activeTab === 'tasks' ? 'bg-accent text-white' : 'text-muted hover:bg-hover hover:text-primary'
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
              <div className="py-12 text-center text-xs text-muted">
                Không có sự kiện sắp tới trong 7 ngày tới.
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(groupedEvents).map(([dayKey, dayOccs]) => (
                  <div key={dayKey} className="space-y-1.5">
                    <div className="px-1 text-[11px] font-semibold tracking-wider text-muted uppercase">
                      {formatEventDateHeader(dayKey)}
                    </div>
                    <div className="space-y-1">
                      {dayOccs.map((occ) => (
                        <div
                          key={`${occ.eventId}_${occ.startUtc}`}
                          onClick={handleOpenMain}
                          className="cursor-pointer space-y-0.5 rounded-lg border border-hairline bg-surface p-2 text-xs transition-all hover:bg-hover"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{ backgroundColor: occ.color || '#6366f1' }}
                            />
                            <span className="flex-1 truncate font-semibold text-primary">
                              {occ.title || '(Không có tiêu đề)'}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 pl-4 text-[10px] text-muted">
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
            <form onSubmit={handleAddTask} className="flex flex-col gap-1.5 rounded-lg border border-hairline bg-surface p-2">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Thêm nhiệm vụ nhanh..."
                className="w-full border-none bg-transparent text-xs text-primary placeholder:text-muted focus:outline-hidden"
              />
              <div className="flex items-center justify-between gap-2 border-t border-hairline pt-1">
                <div className="flex-1 max-w-[130px]">
                  <DatePicker
                    value={newTaskDueDate}
                    onChange={setNewTaskDueDate}
                    placeholder="Hạn chót"
                    compact={true}
                    showPresets={false}
                  />
                </div>
                <button type="submit" className="gc-btn-primary px-2.5 py-1 text-[11px]">
                  <Plus className="h-3 w-3" />
                  <span>Thêm</span>
                </button>
              </div>
            </form>

            {/* Task Items */}
            <div className="space-y-1">
              {tasks.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted">
                  Không có nhiệm vụ nào.
                </div>
              ) : (
                tasks.map((t) => (
                  <div
                    key={t.id}
                    className="group flex items-center justify-between rounded-lg border border-hairline bg-surface p-2 text-xs transition-colors hover:bg-hover"
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
                        className={`truncate ${t.completed ? 'text-muted line-through' : 'text-primary'}`}
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
      <div className="flex shrink-0 items-center justify-between border-t border-hairline bg-surface px-3 py-2 text-[11px] text-muted">
        <span>Cửa sổ mini</span>
        <button
          type="button"
          onClick={handleOpenMain}
          className="flex items-center gap-1 font-semibold text-accent"
        >
          <span>Mở Gone Calendar</span>
          <ExternalLink className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}

export default MiniApp
