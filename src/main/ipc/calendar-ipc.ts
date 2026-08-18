import { ipcMain } from 'electron'
import { IPC_CHANNELS, type IcsImportResult } from '@shared/ipc-contract'
import type { CreateEventInput, UpdateEventInput, EventException } from '@shared/event-model'
import { CalendarsRepo } from '../db/repos/calendars-repo'
import { EventsRepo, ReadOnlyCalendarError } from '../db/repos/events-repo'
import { getDatabase } from '../db/database'
import { parseIcsContent } from '../ics/parse-ics'
import { generateIcs } from '../ics/write-ics'

export function registerCalendarIpcHandlers(): void {
  const db = getDatabase()
  const calendarsRepo = new CalendarsRepo(db)
  const eventsRepo = new EventsRepo(db)

  // Clear existing handlers for idempotency
  ipcMain.removeHandler(IPC_CHANNELS.CALENDAR.LIST)
  ipcMain.removeHandler(IPC_CHANNELS.CALENDAR.CREATE)
  ipcMain.removeHandler(IPC_CHANNELS.CALENDAR.UPDATE)
  ipcMain.removeHandler(IPC_CHANNELS.CALENDAR.DELETE)

  ipcMain.removeHandler(IPC_CHANNELS.EVENT.QUERY_RANGE)
  ipcMain.removeHandler(IPC_CHANNELS.EVENT.GET_BY_ID)
  ipcMain.removeHandler(IPC_CHANNELS.EVENT.CREATE)
  ipcMain.removeHandler(IPC_CHANNELS.EVENT.UPDATE)
  ipcMain.removeHandler(IPC_CHANNELS.EVENT.DELETE)
  ipcMain.removeHandler(IPC_CHANNELS.EVENT.UPSERT_EXCEPTION)

  ipcMain.removeHandler(IPC_CHANNELS.ICS.IMPORT)
  ipcMain.removeHandler(IPC_CHANNELS.ICS.EXPORT)

  // 1. Calendar handlers
  ipcMain.handle(IPC_CHANNELS.CALENDAR.LIST, () => {
    return calendarsRepo.listCalendars()
  })

  ipcMain.handle(
    IPC_CHANNELS.CALENDAR.CREATE,
    (_event, data: { name: string; color: string }) => {
      return calendarsRepo.createCalendar({
        name: data.name,
        color: data.color
      })
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.CALENDAR.UPDATE,
    (_event, id: string, data: { name?: string; color?: string; isVisible?: boolean }) => {
      return calendarsRepo.updateCalendar(id, data)
    }
  )

  ipcMain.handle(IPC_CHANNELS.CALENDAR.DELETE, (_event, id: string) => {
    return calendarsRepo.deleteCalendar(id)
  })

  // 2. Event handlers
  ipcMain.handle(
    IPC_CHANNELS.EVENT.QUERY_RANGE,
    (_event, calendarIds: string[], startUtc: string, endUtc: string) => {
      return eventsRepo.queryEventsByRange(calendarIds, startUtc, endUtc)
    }
  )

  ipcMain.handle(IPC_CHANNELS.EVENT.GET_BY_ID, (_event, id: string) => {
    return eventsRepo.getEventById(id)
  })

  ipcMain.handle(IPC_CHANNELS.EVENT.CREATE, (_event, input: CreateEventInput) => {
    try {
      return eventsRepo.createEvent(input)
    } catch (err: any) {
      if (err instanceof ReadOnlyCalendarError) {
        throw new Error(`Write rejected: ${err.message}`)
      }
      throw err
    }
  })

  ipcMain.handle(IPC_CHANNELS.EVENT.UPDATE, (_event, id: string, input: UpdateEventInput) => {
    try {
      return eventsRepo.updateEvent(id, input)
    } catch (err: any) {
      if (err instanceof ReadOnlyCalendarError) {
        throw new Error(`Write rejected: ${err.message}`)
      }
      throw err
    }
  })

  ipcMain.handle(IPC_CHANNELS.EVENT.DELETE, (_event, id: string) => {
    try {
      return eventsRepo.deleteEvent(id)
    } catch (err: any) {
      if (err instanceof ReadOnlyCalendarError) {
        throw new Error(`Delete rejected: ${err.message}`)
      }
      throw err
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.EVENT.UPSERT_EXCEPTION,
    (_event, exception: Omit<EventException, 'id' | 'createdAt' | 'updatedAt'>) => {
      try {
        return eventsRepo.upsertException(exception)
      } catch (err: any) {
        if (err instanceof ReadOnlyCalendarError) {
          throw new Error(`Exception write rejected: ${err.message}`)
        }
        throw err
      }
    }
  )

  ipcMain.handle(IPC_CHANNELS.EVENT.MOVE, (_event, input: any) => {
    try {
      return eventsRepo.moveEvent(input)
    } catch (err: any) {
      if (err instanceof ReadOnlyCalendarError) {
        throw new Error(`Move rejected: ${err.message}`)
      }
      throw err
    }
  })

  ipcMain.handle(IPC_CHANNELS.EVENT.COPY, (_event, input: any) => {
    try {
      return eventsRepo.copyEvent(input)
    } catch (err: any) {
      if (err instanceof ReadOnlyCalendarError) {
        throw new Error(`Copy rejected: ${err.message}`)
      }
      throw err
    }
  })

  ipcMain.handle(IPC_CHANNELS.EVENT.UPDATE_SCOPE, (_event, input: any) => {
    try {
      return eventsRepo.updateRecurringScope(input)
    } catch (err: any) {
      if (err instanceof ReadOnlyCalendarError) {
        throw new Error(`Recurring update rejected: ${err.message}`)
      }
      throw err
    }
  })

  ipcMain.handle(IPC_CHANNELS.EVENT.DELETE_SCOPE, (_event, input: any) => {
    try {
      return eventsRepo.deleteRecurringScope(input)
    } catch (err: any) {
      if (err instanceof ReadOnlyCalendarError) {
        throw new Error(`Recurring delete rejected: ${err.message}`)
      }
      throw err
    }
  })

  // 3. ICS Import / Export handlers
  ipcMain.handle(
    IPC_CHANNELS.ICS.IMPORT,
    (_event, targetCalendarId: string, icsContent: string): IcsImportResult => {
      try {
        const cal = calendarsRepo.getCalendarById(targetCalendarId)
        if (!cal) {
          return { success: false, importedCount: 0, errorCount: 0, message: 'Calendar not found' }
        }
        if (cal.isReadOnly) {
          return {
            success: false,
            importedCount: 0,
            errorCount: 0,
            message: 'Cannot import events into a read-only calendar'
          }
        }

        const parsed = parseIcsContent(icsContent, targetCalendarId)
        let importedCount = 0
        let errorCount = 0

        const uidToEventId = new Map<string, string>()

        // Insert events in a transaction
        db.transaction(() => {
          for (const ev of parsed.events) {
            try {
              const created = eventsRepo.createEvent(ev)
              if (ev.uid) {
                uidToEventId.set(ev.uid, created.id)
              }
              importedCount++
            } catch (evErr) {
              console.warn('Failed to import single event:', evErr)
              errorCount++
            }
          }

          for (const ex of parsed.exceptions) {
            const masterId = ex.masterUid ? uidToEventId.get(ex.masterUid) : undefined
            if (masterId) {
              try {
                eventsRepo.upsertException({
                  ...ex,
                  masterEventId: masterId
                })
              } catch (exErr) {
                console.warn('Failed to import event exception:', exErr)
              }
            }
          }
        })()

        return {
          success: true,
          importedCount,
          errorCount,
          message: `Successfully imported ${importedCount} events (${errorCount} errors)`
        }
      } catch (err: any) {
        return {
          success: false,
          importedCount: 0,
          errorCount: 1,
          message: `ICS import failed: ${err.message || String(err)}`
        }
      }
    }
  )

  ipcMain.handle(IPC_CHANNELS.ICS.EXPORT, (_event, calendarId: string) => {
    const cal = calendarsRepo.getCalendarById(calendarId)
    if (!cal) {
      throw new Error(`Calendar not found: ${calendarId}`)
    }

    // Get master events
    const masterEvents = db
      .prepare('SELECT * FROM events WHERE calendar_id = ? AND is_deleted = 0')
      .all<any>(calendarId)
      .map((row) => ({
        id: row.id,
        calendarId: row.calendar_id,
        uid: row.uid,
        title: row.title,
        notes: row.notes,
        location: row.location,
        dtStartUtc: row.dtstart_utc,
        dtEndUtc: row.dtend_utc,
        tzid: row.tzid,
        allDay: row.all_day === 1,
        rrule: row.rrule,
        rdate: row.rdate,
        exdate: row.exdate,
        color: row.color,
        meetingUrl: row.meeting_url,
        dirty: row.dirty === 1,
        isDeleted: row.is_deleted === 1,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))

    const exceptions: EventException[] = []
    for (const me of masterEvents) {
      exceptions.push(...eventsRepo.getExceptionsForEvent(me.id))
    }

    return generateIcs(cal, masterEvents, exceptions)
  })
}
