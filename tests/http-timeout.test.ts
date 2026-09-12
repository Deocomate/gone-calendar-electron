import { describe, it, expect, vi, afterEach } from 'vitest'
import { fetchWithTimeout, RequestTimeoutError } from '../src/main/sync/http'

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
