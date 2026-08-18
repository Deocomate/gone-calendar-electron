import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS, type AppLocale, type GoneAPI } from '@shared/ipc-contract'
import type { Calendar, CreateEventInput, UpdateEventInput, EventException } from '@shared/event-model'

const goneApi: GoneAPI = {
  app: {
    getVersion: () => ipcRenderer.invoke(IPC_CHANNELS.APP.GET_VERSION),
    getLocale: () => ipcRenderer.invoke(IPC_CHANNELS.APP.GET_LOCALE),
    setLocale: (locale: AppLocale) => ipcRenderer.invoke(IPC_CHANNELS.APP.SET_LOCALE, locale),
    getPlatform: () => ipcRenderer.invoke(IPC_CHANNELS.APP.GET_PLATFORM)
  },
  settings: {
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS.GET_ALL),
    get: (key) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS.GET, key),
    set: (key, value) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS.SET, key, value)
  },
  auth: {
    connectGoogle: () => ipcRenderer.invoke(IPC_CHANNELS.AUTH.CONNECT_GOOGLE),
    disconnectGoogle: (accountId) => ipcRenderer.invoke(IPC_CHANNELS.AUTH.DISCONNECT_GOOGLE, accountId),
    connectMicrosoft: () => ipcRenderer.invoke(IPC_CHANNELS.AUTH.CONNECT_MICROSOFT),
    disconnectMicrosoft: (accountId) => ipcRenderer.invoke(IPC_CHANNELS.AUTH.DISCONNECT_MICROSOFT, accountId),
    connectCalDav: (input) => ipcRenderer.invoke(IPC_CHANNELS.AUTH.CONNECT_CALDAV, input),
    disconnectCalDav: (accountId) => ipcRenderer.invoke(IPC_CHANNELS.AUTH.DISCONNECT_CALDAV, accountId),
    listAccounts: () => ipcRenderer.invoke(IPC_CHANNELS.AUTH.LIST_ACCOUNTS)
  },
  sync: {
    triggerNow: () => ipcRenderer.invoke(IPC_CHANNELS.SYNC.TRIGGER_NOW),
    getStatus: () => ipcRenderer.invoke(IPC_CHANNELS.SYNC.GET_STATUS)
  },
  calendars: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.CALENDAR.LIST),
    create: (data: { name: string; color: string }) =>
      ipcRenderer.invoke(IPC_CHANNELS.CALENDAR.CREATE, data),
    update: (id: string, data: Partial<Pick<Calendar, 'name' | 'color' | 'isVisible'>>) =>
      ipcRenderer.invoke(IPC_CHANNELS.CALENDAR.UPDATE, id, data),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.CALENDAR.DELETE, id)
  },
  events: {
    queryRange: (calendarIds: string[], startUtc: string, endUtc: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.EVENT.QUERY_RANGE, calendarIds, startUtc, endUtc),
    getById: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.EVENT.GET_BY_ID, id),
    create: (input: CreateEventInput) => ipcRenderer.invoke(IPC_CHANNELS.EVENT.CREATE, input),
    update: (id: string, input: UpdateEventInput) =>
      ipcRenderer.invoke(IPC_CHANNELS.EVENT.UPDATE, id, input),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.EVENT.DELETE, id),
    move: (input) => ipcRenderer.invoke(IPC_CHANNELS.EVENT.MOVE, input),
    copy: (input) => ipcRenderer.invoke(IPC_CHANNELS.EVENT.COPY, input),
    updateScope: (input) => ipcRenderer.invoke(IPC_CHANNELS.EVENT.UPDATE_SCOPE, input),
    deleteScope: (input) => ipcRenderer.invoke(IPC_CHANNELS.EVENT.DELETE_SCOPE, input),
    upsertException: (exception: Omit<EventException, 'id' | 'createdAt' | 'updatedAt'>) =>
      ipcRenderer.invoke(IPC_CHANNELS.EVENT.UPSERT_EXCEPTION, exception),
    search: (query: string, limit?: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.EVENT.SEARCH, query, limit),
    shareIcs: (eventId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.EVENT.SHARE_ICS, eventId)
  },
  ics: {
    importIcs: (targetCalendarId: string, icsContent: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.ICS.IMPORT, targetCalendarId, icsContent),
    exportIcs: (calendarId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.ICS.EXPORT, calendarId)
  },
  tasks: {
    list: (includeCompleted?: boolean) =>
      ipcRenderer.invoke(IPC_CHANNELS.TASK.LIST, includeCompleted),
    create: (input) => ipcRenderer.invoke(IPC_CHANNELS.TASK.CREATE, input),
    update: (id, input) => ipcRenderer.invoke(IPC_CHANNELS.TASK.UPDATE, id, input),
    toggle: (id) => ipcRenderer.invoke(IPC_CHANNELS.TASK.TOGGLE, id),
    delete: (id) => ipcRenderer.invoke(IPC_CHANNELS.TASK.DELETE, id)
  },
  mini: {
    openMain: () => ipcRenderer.invoke(IPC_CHANNELS.MINI.OPEN_MAIN),
    toggle: () => ipcRenderer.invoke(IPC_CHANNELS.MINI.TOGGLE),
    getUpcoming: (limit?: number) => ipcRenderer.invoke(IPC_CHANNELS.MINI.GET_UPCOMING, limit),
    setAlwaysOnTop: (flag: boolean) => ipcRenderer.invoke(IPC_CHANNELS.MINI.SET_ALWAYS_ON_TOP, flag)
  },
  holidays: {
    subscribe: (type: 'vietnam' | 'international') =>
      ipcRenderer.invoke(IPC_CHANNELS.HOLIDAYS.SUBSCRIBE, type),
    unsubscribe: (type: 'vietnam' | 'international') =>
      ipcRenderer.invoke(IPC_CHANNELS.HOLIDAYS.UNSUBSCRIBE, type)
  }
}

// Expose safe API to renderer via context bridge
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('gone', goneApi)
  } catch (error) {
    console.error('Failed to expose gone API in context bridge:', error)
  }
} else {
  // @ts-ignore (for non-context isolated fallback in testing)
  window.gone = goneApi
}
