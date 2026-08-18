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
      ipcRenderer.invoke(IPC_CHANNELS.EVENT.UPSERT_EXCEPTION, exception)
  },
  ics: {
    importIcs: (targetCalendarId: string, icsContent: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.ICS.IMPORT, targetCalendarId, icsContent),
    exportIcs: (calendarId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.ICS.EXPORT, calendarId)
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
