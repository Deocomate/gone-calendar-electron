import { describe, it, expect } from 'vitest'
import { isStaleEventError } from '../src/renderer/src/components/ui/toast'

/**
 * A successful first push replaces the local `evt_...` id with the one the
 * provider assigns. Anything the renderer is still holding by the old id then
 * fails with "Event not found" - which is not a failure the user caused or can
 * act on, so it is detected and turned into a refresh rather than an error.
 */
describe('isStaleEventError', () => {
  it('recognises the repo message that a re-keyed row produces', () => {
    expect(isStaleEventError(new Error('Event not found: evt_1789438784609_ikftmn'))).toBe(true)
  })

  it('recognises it through the Electron IPC wrapper', () => {
    // What actually reaches the renderer is the message wrapped by ipcRenderer.
    const wrapped = new Error(
      "Error invoking remote method 'gone:event:move': Error: Event not found: evt_123_abc"
    )
    expect(isStaleEventError(wrapped)).toBe(true)
  })

  it('covers the copy and recurring paths too', () => {
    expect(isStaleEventError(new Error('Source event not found: evt_1'))).toBe(true)
    expect(isStaleEventError(new Error('Master event not found: evt_2'))).toBe(true)
  })

  it('accepts a bare string, since IPC errors are not always Error objects', () => {
    expect(isStaleEventError('Event not found: evt_9')).toBe(true)
  })

  it('leaves real failures alone so they still surface as errors', () => {
    expect(isStaleEventError(new Error('Cannot modify events in read-only calendar: cal-1'))).toBe(
      false
    )
    expect(isStaleEventError(new Error('Invalid RRULE'))).toBe(false)
    expect(isStaleEventError(new Error('Calendar not found'))).toBe(false)
    expect(isStaleEventError(undefined)).toBe(false)
    expect(isStaleEventError(null)).toBe(false)
  })
})
