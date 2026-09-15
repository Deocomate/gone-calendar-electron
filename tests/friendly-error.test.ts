import { describe, it, expect, vi, beforeEach } from 'vitest'

const errorSpy = vi.fn()
vi.mock('sonner', () => ({
  toast: { error: (...args: unknown[]) => errorSpy(...args) },
  Toaster: () => null
}))
vi.mock('../src/renderer/src/i18n', () => ({
  default: { t: (key: string) => key }
}))

const { showFriendlyError, isStaleEventError } = await import(
  '../src/renderer/src/components/ui/toast'
)

/**
 * Success toasts were removed - the calendar redrawing already says the move
 * happened - so a toast now always means something went wrong. That makes the
 * text worth keeping: the description is usually the provider's own message.
 * The app sets `user-select: none` globally, so a copy action is the only way
 * to get it out.
 */
describe('showFriendlyError', () => {
  beforeEach(() => {
    errorSpy.mockClear()
  })

  function lastCall() {
    const [title, options] = errorSpy.mock.calls.at(-1) as [
      string,
      { description?: string; action?: { label: string; onClick: () => void } }
    ]
    return { title, ...options }
  }

  it('offers a copy action carrying both the title and the detail', () => {
    showFriendlyError(new Error('Invalid resource id value.'), 'Failed to move event')

    const { title, description, action } = lastCall()
    expect(title).toBe('Failed to move event')
    expect(description).toBe('Invalid resource id value.')
    expect(action?.label).toBe('common.copy')

    const written: string[] = []
    vi.stubGlobal('navigator', { clipboard: { writeText: (t: string) => written.push(t) } })
    action!.onClick()
    expect(written[0]).toBe('Failed to move event\nInvalid resource id value.')
    vi.unstubAllGlobals()
  })

  it('does not throw when the clipboard is unavailable', () => {
    showFriendlyError(new Error('boom'), 'Failed')
    const { action } = lastCall()

    vi.stubGlobal('navigator', {})
    expect(() => action!.onClick()).not.toThrow()
    vi.unstubAllGlobals()
  })

  it('strips the Electron IPC wrapper so the copied text is the real message', () => {
    showFriendlyError(
      new Error("Error invoking remote method 'gone:event:move': Error: Event not found: evt_1")
    )

    expect(lastCall().description).toBe('Event not found: evt_1')
  })

  it('still routes a read-only failure to its own friendlier message', () => {
    showFriendlyError(new Error('Cannot modify events in read-only calendar: cal-1'))

    expect(lastCall().title).toBe('friendly.readOnlyTitle')
  })

  it('falls back to a generic message when the error carries nothing useful', () => {
    showFriendlyError(undefined)

    const { title, description } = lastCall()
    expect(title).toBe('friendly.fallback')
    expect(description).toBe('friendly.tryAgain')
  })
})

describe('isStaleEventError still behaves', () => {
  it('recognises a re-keyed row', () => {
    expect(isStaleEventError(new Error('Event not found: evt_1'))).toBe(true)
    expect(isStaleEventError(new Error('Invalid RRULE'))).toBe(false)
  })
})
