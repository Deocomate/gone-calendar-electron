import { describe, it, expect } from 'vitest'
import { IPC_CHANNELS, type AppLocale, type GoneAPI } from '../src/shared/ipc-contract'

describe('IPC Channels and Contracts', () => {
  it('should define structured and valid IPC channels', () => {
    expect(IPC_CHANNELS.APP.GET_VERSION).toBe('gone:app:get-version')
    expect(IPC_CHANNELS.APP.GET_LOCALE).toBe('gone:app:get-locale')
    expect(IPC_CHANNELS.APP.SET_LOCALE).toBe('gone:app:set-locale')
    expect(IPC_CHANNELS.APP.GET_PLATFORM).toBe('gone:app:get-platform')
  })

  it('should enforce channels prefix naming convention', () => {
    Object.values(IPC_CHANNELS.APP).forEach((channel) => {
      expect(channel.startsWith('gone:app:')).toBe(true)
    })
  })

  it('should support valid AppLocale values', () => {
    const validLocales: AppLocale[] = ['vi', 'en']
    expect(validLocales).toContain('vi')
    expect(validLocales).toContain('en')
  })

  it('should fulfill GoneAPI contract mock implementation', async () => {
    let mockLocale: AppLocale = 'vi'
    const mockGone: GoneAPI = {
      app: {
        getVersion: async () => '0.1.0',
        getLocale: async () => mockLocale,
        setLocale: async (loc: AppLocale) => {
          if (loc === 'vi' || loc === 'en') {
            mockLocale = loc
            return true
          }
          return false
        },
        getPlatform: async () => 'win32'
      }
    }

    expect(await mockGone.app.getVersion()).toBe('0.1.0')
    expect(await mockGone.app.getLocale()).toBe('vi')
    expect(await mockGone.app.setLocale('en')).toBe(true)
    expect(await mockGone.app.getLocale()).toBe('en')
    expect(await mockGone.app.getPlatform()).toBe('win32')
  })
})

