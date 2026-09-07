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
  MaterializeLunarInput,
  DetachLunarInput,
  SyncStatus,
  SyncResult,
  SyncConflict
} from './event-model'
import type { AppSettings } from './settings-contract'

export const IPC_CHANNELS = {
  APP: {
    GET_VERSION: 'gone:app:get-version',
    GET_LOCALE: 'gone:app:get-locale',
    SET_LOCALE: 'gone:app:set-locale',
    GET_PLATFORM: 'gone:app:get-platform',
    PICK_BACKGROUND_IMAGE: 'gone:app:pick-background-image'
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
    CONNECT_CALDAV: 'gone:auth:connect-caldav',
    DISCONNECT_CALDAV: 'gone:auth:disconnect-caldav',
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
    UPSERT_EXCEPTION: 'gone:event:upsert-exception',
    MATERIALIZE_LUNAR: 'gone:event:materialize-lunar',
    DETACH_LUNAR: 'gone:event:detach-lunar',
    SEARCH: 'gone:event:search',
    SHARE_ICS: 'gone:event:share-ics',
    LIST_CONFLICTS: 'gone:event:list-conflicts',
    RESOLVE_CONFLICT: 'gone:event:resolve-conflict'
  },
  ICS: {
    IMPORT: 'gone:ics:import',
    EXPORT: 'gone:ics:export'
  },
  MINI: {
    OPEN_MAIN: 'gone:mini:open-main',
    TOGGLE: 'gone:mini:toggle',
    GET_UPCOMING: 'gone:mini:get-upcoming',
    SET_ALWAYS_ON_TOP: 'gone:mini:set-always-on-top'
  },
  HOLIDAYS: {
    SUBSCRIBE: 'gone:holidays:subscribe',
    UNSUBSCRIBE: 'gone:holidays:unsubscribe'
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

export interface ConnectCalDavInput {
  provider: 'nextcloud' | 'icloud' | 'synology' | 'generic'
  serverUrl?: string
  username: string
  password: string
  name?: string
}

export interface GoneAPI {
  app: {
    getVersion: () => Promise<string>
    getLocale: () => Promise<AppLocale>
    setLocale: (locale: AppLocale) => Promise<boolean>
    getPlatform: () => Promise<string>
    pickBackgroundImage: () => Promise<{ dataUrl: string } | null>
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
    connectCalDav: (input: ConnectCalDavInput) => Promise<{ success: boolean; account?: CalendarAccount; message?: string }>
    disconnectCalDav: (accountId: string) => Promise<boolean>
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
    materializeLunar: (input: MaterializeLunarInput) => Promise<{ count: number }>
    detachLunar: (input: DetachLunarInput) => Promise<{ count: number }>
    search: (query: string, limit?: number) => Promise<CalendarEvent[]>
    shareIcs: (eventId: string) => Promise<{ success: boolean; filePath?: string; icsContent?: string; message?: string }>
    listConflicts: () => Promise<SyncConflict[]>
    resolveConflict: (eventId: string, resolution: 'keepMine' | 'keepTheirs') => Promise<boolean>
  }
  ics: {
    importIcs: (targetCalendarId: string, icsContent: string) => Promise<IcsImportResult>
    exportIcs: (calendarId: string) => Promise<string>
  },
  mini: {
    openMain: () => Promise<void>
    toggle: () => Promise<void>
    getUpcoming: (limit?: number) => Promise<{ occurrences: ExpandedOccurrence[] }>
    setAlwaysOnTop: (flag: boolean) => Promise<boolean>
  },
  holidays: {
    subscribe: (type: 'vietnam' | 'international') => Promise<{ calendarId: string; count: number }>
    unsubscribe: (type: 'vietnam' | 'international') => Promise<boolean>
  }
}
