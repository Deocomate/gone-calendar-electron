import { describe, it, expect, vi, afterEach } from 'vitest'
import { fetchWithTimeout, RequestTimeoutError, describeHttpFailure } from '../src/main/sync/http'

/**
 * Node's fetch has no default request timeout, so a stalled provider connection
 * used to hang SyncWorker's `isSyncing` flag on permanently.
 */
describe('fetchWithTimeout', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('rejects with RequestTimeoutError when the response never arrives', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => {
              const err = new Error('aborted')
              err.name = 'AbortError'
              reject(err)
            })
          })
      )
    )

    await expect(fetchWithTimeout('https://example.test/hang', {}, 20)).rejects.toBeInstanceOf(
      RequestTimeoutError
    )
  })

  it('passes a normal response straight through', async () => {
    const body = new Response('ok', { status: 200 })
    vi.stubGlobal('fetch', vi.fn(async () => body))

    const res = await fetchWithTimeout('https://example.test/ok')
    expect(res.status).toBe(200)
  })

  it('propagates a caller abort as an AbortError, not a timeout', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => {
              const err = new Error('aborted')
              err.name = 'AbortError'
              reject(err)
            })
          })
      )
    )

    const controller = new AbortController()
    const pending = fetchWithTimeout('https://example.test/slow', { signal: controller.signal }, 5000)
    controller.abort()

    await expect(pending).rejects.toSatisfy(
      (err: Error) => err.name === 'AbortError' && !(err instanceof RequestTimeoutError)
    )
  })
})

describe('describeHttpFailure', () => {
  it('includes the status and the provider body, which is where the reason is', async () => {
    const res = new Response('{"error":{"code":400,"message":"Invalid resource id value."}}', {
      status: 400,
      statusText: 'Bad Request'
    })

    const detail = await describeHttpFailure(res)

    expect(detail).toContain('400')
    expect(detail).toContain('Invalid resource id value.')
  })

  it('truncates a body long enough to be an HTML error page', async () => {
    const res = new Response('x'.repeat(5000), { status: 500, statusText: 'Server Error' })

    const detail = await describeHttpFailure(res)

    expect(detail.length).toBeLessThan(600)
    expect(detail).toContain('…')
  })

  it('still says something useful when the body cannot be read', async () => {
    const res = { status: 403, statusText: 'Forbidden', text: () => Promise.reject(new Error('gone')) }

    const detail = await describeHttpFailure(res as unknown as Response)

    expect(detail).toBe('HTTP 403 Forbidden')
  })
})
