/**
 * Type-safe IPC channels, payloads, and API signatures for Gone Calendar
 */

import type {
  Calendar,
  CalendarEvent,
  EventException,
  ExpandedOccurrence,
  CreateEventInput,
  UpdateEventInput
} from './event-model'
import type { AppSettings } from './settings-contract'

export const IPC_CHANNELS = {
  APP: {
    GET_VERSION: 'gone:app:get-version',
    GET_LOCALE: 'gone:app:get-locale',
    SET_LOCALE: 'gone:app:set-locale',
    GET_PLATFORM: 'gone:app:get-platform'
  },
  SETTINGS: {
    GET_ALL: 'gone:settings:get-all',
    GET: 'gone:settings:get',
    SET: 'gone:settings:set'
  },
  CALENDAR: {
    LIST: 'gone:calendar:list',
    CREATE: 'gone:calendar:create',
    UPDATE: 'gone:calendar:update',
    DELETE: 'gone:calendar:delete'
  },
  EVENT: {
    QUERY_RANGE: 'gone:event:query-range',
    GET_BY_ID: 'gone:event:get-by-id',
    CREATE: 'gone:event:create',
    UPDATE: 'gone:event:update',
    DELETE: 'gone:event:delete',
    UPSERT_EXCEPTION: 'gone:event:upsert-exception'
  },
  ICS: {
    IMPORT: 'gone:ics:import',
    EXPORT: 'gone:ics:export'
  }
} as const

export type AppLocale = 'vi' | 'en'

export interface AppInfo {
  version: string
  locale: AppLocale
  platform: NodeJS.Platform
}

export interface IcsImportResult {
  success: boolean
  importedCount: number
  errorCount: number
  message?: string
}

export interface GoneAPI {
  app: {
    getVersion: () => Promise<string>
    getLocale: () => Promise<AppLocale>
    setLocale: (locale: AppLocale) => Promise<boolean>
    getPlatform: () => Promise<string>
  }
  settings: {
    getAll: () => Promise<AppSettings>
    get: <K extends keyof AppSettings>(key: K) => Promise<AppSettings[K]>
    set: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<boolean>
  }
  calendars: {
    list: () => Promise<Calendar[]>
    create: (data: { name: string; color: string }) => Promise<Calendar>
    update: (id: string, data: Partial<Pick<Calendar, 'name' | 'color' | 'isVisible'>>) => Promise<Calendar>
    delete: (id: string) => Promise<boolean>
  }
  events: {
    queryRange: (calendarIds: string[], startUtc: string, endUtc: string) => Promise<ExpandedOccurrence[]>
    getById: (id: string) => Promise<{ event: CalendarEvent; exceptions: EventException[] } | null>
    create: (input: CreateEventInput) => Promise<CalendarEvent>
    update: (id: string, input: UpdateEventInput) => Promise<CalendarEvent>
    delete: (id: string) => Promise<boolean>
    upsertException: (exception: Omit<EventException, 'id' | 'createdAt' | 'updatedAt'>) => Promise<EventException>
  }
  ics: {
    importIcs: (targetCalendarId: string, icsContent: string) => Promise<IcsImportResult>
    exportIcs: (calendarId: string) => Promise<string>
  }
}
