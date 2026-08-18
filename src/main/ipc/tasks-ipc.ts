import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-contract'
import type { CreateTaskInput, UpdateTaskInput } from '@shared/task-model'
import { TasksRepo } from '../db/repos/tasks-repo'
import { getDatabase } from '../db/database'

export function registerTasksIpcHandlers(): void {
  const db = getDatabase()
  const tasksRepo = new TasksRepo(db)

  // Clear existing handlers for idempotency
  ipcMain.removeHandler(IPC_CHANNELS.TASK.LIST)
  ipcMain.removeHandler(IPC_CHANNELS.TASK.CREATE)
  ipcMain.removeHandler(IPC_CHANNELS.TASK.UPDATE)
  ipcMain.removeHandler(IPC_CHANNELS.TASK.TOGGLE)
  ipcMain.removeHandler(IPC_CHANNELS.TASK.DELETE)

  ipcMain.handle(IPC_CHANNELS.TASK.LIST, (_event, includeCompleted?: boolean) => {
    return tasksRepo.listTasks({ includeCompleted })
  })

  ipcMain.handle(IPC_CHANNELS.TASK.CREATE, (_event, input: CreateTaskInput) => {
    return tasksRepo.createTask(input)
  })

  ipcMain.handle(IPC_CHANNELS.TASK.UPDATE, (_event, id: string, input: UpdateTaskInput) => {
    return tasksRepo.updateTask(id, input)
  })

  ipcMain.handle(IPC_CHANNELS.TASK.TOGGLE, (_event, id: string) => {
    return tasksRepo.toggleTask(id)
  })

  ipcMain.handle(IPC_CHANNELS.TASK.DELETE, (_event, id: string) => {
    return tasksRepo.deleteTask(id)
  })
}
