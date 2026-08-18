export interface TaskItem {
  id: string
  title: string
  dueDate?: string // YYYY-MM-DD format
  completed: boolean
  showOnCalendar: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateTaskInput {
  title: string
  dueDate?: string
  showOnCalendar?: boolean
}

export interface UpdateTaskInput {
  title?: string
  dueDate?: string | null
  completed?: boolean
  showOnCalendar?: boolean
}

export interface ThemeConfig {
  mode: 'dark' | 'light' | 'system'
  accentColor: string
  customBgUrl?: string
  bgOverlayOpacity: number // 0.0 to 1.0 (default 0.75)
  bgBlur: number // px (default 0)
}
