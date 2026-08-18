import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { initDatabase, closeDatabase } from '../src/main/db/database'
import type { ISqliteDatabase } from '../src/main/db/sqlite-driver'
import { TasksRepo } from '../src/main/db/repos/tasks-repo'

describe('TasksRepo local tasks management', () => {
  let db: ISqliteDatabase
  let repo: TasksRepo

  beforeEach(() => {
    db = initDatabase(':memory:')
    repo = new TasksRepo(db)
  })

  afterEach(() => {
    closeDatabase()
  })

  it('should create and list local tasks', () => {
    const t1 = repo.createTask({
      title: 'Prepare quarterly review slides',
      dueDate: '2026-08-25',
      showOnCalendar: true
    })
    const t2 = repo.createTask({
      title: 'Send invoice to client',
      dueDate: '2026-08-20',
      showOnCalendar: false
    })

    expect(t1.id).toBeDefined()
    expect(t1.completed).toBe(false)
    expect(t1.showOnCalendar).toBe(true)
    expect(t2.id).toBeDefined()
    expect(t2.showOnCalendar).toBe(false)

    const all = repo.listTasks()
    expect(all).toHaveLength(2)
    // Ordered by due date ascending
    expect(all[0].title).toBe('Send invoice to client')
    expect(all[1].title).toBe('Prepare quarterly review slides')
  })

  it('should toggle task completion and filter completed tasks', () => {
    const t1 = repo.createTask({
      title: 'Review PR for CalDAV adapter'
    })

    expect(t1.completed).toBe(false)

    // Toggle to completed
    const updated = repo.toggleTask(t1.id)
    expect(updated.completed).toBe(true)

    // Filter only pending
    const pending = repo.listTasks({ includeCompleted: false })
    expect(pending).toHaveLength(0)

    // Include completed
    const all = repo.listTasks({ includeCompleted: true })
    expect(all).toHaveLength(1)
    expect(all[0].completed).toBe(true)

    // Toggle back to incomplete
    const undone = repo.toggleTask(t1.id)
    expect(undone.completed).toBe(false)
  })

  it('should update task details and delete task', () => {
    const task = repo.createTask({
      title: 'Initial Title',
      dueDate: '2026-08-22'
    })

    const updated = repo.updateTask(task.id, {
      title: 'Updated Title',
      dueDate: '2026-08-28',
      showOnCalendar: false
    })

    expect(updated.title).toBe('Updated Title')
    expect(updated.dueDate).toBe('2026-08-28')
    expect(updated.showOnCalendar).toBe(false)

    const deleted = repo.deleteTask(task.id)
    expect(deleted).toBe(true)

    const fetched = repo.getTaskById(task.id)
    expect(fetched).toBeNull()
  })
})
