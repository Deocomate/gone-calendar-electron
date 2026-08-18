import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS, type AppLocale, type GoneAPI } from '@shared/ipc-contract'

const goneApi: GoneAPI = {
  app: {
    getVersion: () => ipcRenderer.invoke(IPC_CHANNELS.APP.GET_VERSION),
    getLocale: () => ipcRenderer.invoke(IPC_CHANNELS.APP.GET_LOCALE),
    setLocale: (locale: AppLocale) => ipcRenderer.invoke(IPC_CHANNELS.APP.SET_LOCALE, locale),
    getPlatform: () => ipcRenderer.invoke(IPC_CHANNELS.APP.GET_PLATFORM)
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
