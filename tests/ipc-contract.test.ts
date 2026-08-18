import { describe, it, expect } from 'vitest'
import { IPC_CHANNELS } from '../src/shared/ipc-contract'

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
})
