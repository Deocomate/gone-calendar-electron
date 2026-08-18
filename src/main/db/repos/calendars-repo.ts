import type { ISqliteDatabase } from '../sqlite-driver'
import type { Calendar } from '@shared/event-model'

export interface CreateCalendarParams {
  id?: string
  accountId?: string
  name: string
  color: string
  isVisible?: boolean
  isReadOnly?: boolean
  isDefault?: boolean
}

export interface UpdateCalendarParams {
  name?: string
  color?: string
  isVisible?: boolean
  isReadOnly?: boolean
  isDefault?: boolean
}

interface CalendarRow {
  id: string
  account_id: string
  name: string
  color: string
  is_visible: number
  is_read_only: number
  is_default: number
  sync_token: string | null
  created_at: string
  updated_at: string
}

function mapRowToCalendar(row: CalendarRow): Calendar {
  return {
    id: row.id,
    accountId: row.account_id,
    name: row.name,
    color: row.color,
    isVisible: row.is_visible === 1,
    isReadOnly: row.is_read_only === 1,
    isDefault: row.is_default === 1,
    syncToken: row.sync_token || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export class CalendarsRepo {
  constructor(private db: ISqliteDatabase) {}

  listCalendars(): Calendar[] {
    const rows = this.db
      .prepare('SELECT * FROM calendars ORDER BY is_default DESC, name ASC')
      .all<CalendarRow>()
    return rows.map(mapRowToCalendar)
  }

  getCalendarById(id: string): Calendar | null {
    const row = this.db
      .prepare('SELECT * FROM calendars WHERE id = ?')
      .get<CalendarRow>(id)
    return row ? mapRowToCalendar(row) : null
  }

  createCalendar(params: CreateCalendarParams): Calendar {
    const now = new Date().toISOString()
    const id = params.id || `cal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const accountId = params.accountId || 'account-local-primary'
    const isVisible = params.isVisible ?? true ? 1 : 0
    const isReadOnly = params.isReadOnly ?? false ? 1 : 0
    const isDefault = params.isDefault ?? false ? 1 : 0

    this.db
      .prepare(
        `INSERT INTO calendars (id, account_id, name, color, is_visible, is_read_only, is_default, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(id, accountId, params.name, params.color, isVisible, isReadOnly, isDefault, now, now)

    const created = this.getCalendarById(id)
    if (!created) {
      throw new Error(`Failed to create calendar with ID ${id}`)
    }
    return created
  }

  updateCalendar(id: string, params: UpdateCalendarParams): Calendar {
    const existing = this.getCalendarById(id)
    if (!existing) {
      throw new Error(`Calendar not found: ${id}`)
    }

    const now = new Date().toISOString()
    const name = params.name ?? existing.name
    const color = params.color ?? existing.color
    const isVisible = (params.isVisible !== undefined ? params.isVisible : existing.isVisible) ? 1 : 0
    const isReadOnly = (params.isReadOnly !== undefined ? params.isReadOnly : existing.isReadOnly) ? 1 : 0
    const isDefault = (params.isDefault !== undefined ? params.isDefault : existing.isDefault) ? 1 : 0

    this.db
      .prepare(
        `UPDATE calendars
         SET name = ?, color = ?, is_visible = ?, is_read_only = ?, is_default = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(name, color, isVisible, isReadOnly, isDefault, now, id)

    return this.getCalendarById(id)!
  }

  deleteCalendar(id: string): boolean {
    const existing = this.getCalendarById(id)
    if (!existing) {
      return false
    }

    // Delete calendar (cascades to events and exceptions via FK)
    const result = this.db.prepare('DELETE FROM calendars WHERE id = ?').run(id)
    return result.changes > 0
  }
}
