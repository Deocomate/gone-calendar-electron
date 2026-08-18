/**
 * Type-safe IPC channels and payloads for Gone Calendar
 */

export const IPC_CHANNELS = {
  APP: {
    GET_VERSION: 'gone:app:get-version',
    GET_LOCALE: 'gone:app:get-locale',
    SET_LOCALE: 'gone:app:set-locale',
    GET_PLATFORM: 'gone:app:get-platform'
  }
} as const

export type AppLocale = 'vi' | 'en'

export interface AppInfo {
  version: string
  locale: AppLocale
  platform: NodeJS.Platform
}

export interface GoneAPI {
  app: {
    getVersion: () => Promise<string>
    getLocale: () => Promise<AppLocale>
    setLocale: (locale: AppLocale) => Promise<boolean>
    getPlatform: () => Promise<string>
  }
}
