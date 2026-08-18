/**
 * Type-safe IPC channels, payloads, and API signatures for Gone Calendar
 */

import type {
  Calendar,
  CalendarAccount,
  CalendarEvent,
  EventException,
  ExpandedOccurrence,
  CreateEventInput,
  UpdateEventInput,
  MoveEventInput,
  CopyEventInput,
  UpdateRecurringScopeInput,
  DeleteRecurringScopeInput,
  SyncStatus,
  SyncResult
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
  AUTH: {
    CONNECT_GOOGLE: 'gone:auth:connect-google',
    DISCONNECT_GOOGLE: 'gone:auth:disconnect-google',
    CONNECT_MICROSOFT: 'gone:auth:connect-microsoft',
    DISCONNECT_MICROSOFT: 'gone:auth:disconnect-microsoft',
    LIST_ACCOUNTS: 'gone:auth:list-accounts'
  },
  SYNC: {
    TRIGGER_NOW: 'gone:sync:trigger-now',
    GET_STATUS: 'gone:sync:get-status'
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
    MOVE: 'gone:event:move',
    COPY: 'gone:event:copy',
    UPDATE_SCOPE: 'gone:event:update-scope',
    DELETE_SCOPE: 'gone:event:delete-scope',
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
  auth: {
    connectGoogle: () => Promise<{ success: boolean; account?: CalendarAccount; message?: string }>
    disconnectGoogle: (accountId: string) => Promise<boolean>
    connectMicrosoft: () => Promise<{ success: boolean; account?: CalendarAccount; message?: string }>
    disconnectMicrosoft: (accountId: string) => Promise<boolean>
    listAccounts: () => Promise<CalendarAccount[]>
  }
  sync: {
    triggerNow: () => Promise<SyncResult>
    getStatus: () => Promise<SyncStatus>
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
    move: (input: MoveEventInput) => Promise<CalendarEvent>
    copy: (input: CopyEventInput) => Promise<CalendarEvent>
    updateScope: (input: UpdateRecurringScopeInput) => Promise<boolean>
    deleteScope: (input: DeleteRecurringScopeInput) => Promise<boolean>
    upsertException: (exception: Omit<EventException, 'id' | 'createdAt' | 'updatedAt'>) => Promise<EventException>
  }
  ics: {
    importIcs: (targetCalendarId: string, icsContent: string) => Promise<IcsImportResult>
    exportIcs: (calendarId: string) => Promise<string>
  }
}
