import type { ISqliteDatabase } from '../sqlite-driver'
import type { TaskItem, CreateTaskInput, UpdateTaskInput } from '@shared/task-model'

interface TaskRow {
  id: string
  title: string
  due_date: string | null
  completed: number
  show_on_calendar: number
  created_at: string
  updated_at: string
}

function mapRowToTask(r: TaskRow): TaskItem {
  return {
    id: r.id,
    title: r.title,
    dueDate: r.due_date || undefined,
    completed: r.completed === 1,
    showOnCalendar: r.show_on_calendar === 1,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  }
}

export class TasksRepo {
  constructor(private db: ISqliteDatabase) {}

  listTasks(options?: { includeCompleted?: boolean }): TaskItem[] {
    const includeCompleted = options?.includeCompleted ?? true
    let query = 'SELECT * FROM tasks'
    if (!includeCompleted) {
      query += ' WHERE completed = 0'
    }
    query += ' ORDER BY completed ASC, CASE WHEN due_date IS NULL THEN 1 ELSE 0 END, due_date ASC, created_at DESC'

    const rows = this.db.prepare(query).all<TaskRow>()
    return rows.map(mapRowToTask)
  }

  getTaskById(id: string): TaskItem | null {
    const row = this.db.prepare('SELECT * FROM tasks WHERE id = ?').get<TaskRow>(id)
    return row ? mapRowToTask(row) : null
  }

  createTask(input: CreateTaskInput): TaskItem {
    const id = `task_${Math.random().toString(36).slice(2, 11)}_${Date.now()}`
    const now = new Date().toISOString()
    const showOnCalendar = input.showOnCalendar ?? true

    this.db
      .prepare(
        `INSERT INTO tasks (id, title, due_date, completed, show_on_calendar, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(id, input.title.trim(), input.dueDate || null, 0, showOnCalendar ? 1 : 0, now, now)

    const created = this.getTaskById(id)
    if (!created) {
      throw new Error(`Failed to create task ${id}`)
    }
    return created
  }

  updateTask(id: string, input: UpdateTaskInput): TaskItem {
    const existing = this.getTaskById(id)
    if (!existing) {
      throw new Error(`Task not found: ${id}`)
    }

    const now = new Date().toISOString()
    const title = input.title !== undefined ? input.title.trim() : existing.title
    const dueDate = input.dueDate !== undefined ? input.dueDate : (existing.dueDate || null)
    const completed = input.completed !== undefined ? (input.completed ? 1 : 0) : (existing.completed ? 1 : 0)
    const showOnCalendar = input.showOnCalendar !== undefined ? (input.showOnCalendar ? 1 : 0) : (existing.showOnCalendar ? 1 : 0)

    this.db
      .prepare(
        `UPDATE tasks
         SET title = ?, due_date = ?, completed = ?, show_on_calendar = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(title, dueDate, completed, showOnCalendar, now, id)

    const updated = this.getTaskById(id)
    return updated!
  }

  toggleTask(id: string): TaskItem {
    const existing = this.getTaskById(id)
    if (!existing) {
      throw new Error(`Task not found: ${id}`)
    }

    return this.updateTask(id, { completed: !existing.completed })
  }

  deleteTask(id: string): boolean {
    const res = this.db.prepare('DELETE FROM tasks WHERE id = ?').run(id)
    return res.changes > 0
  }
}
